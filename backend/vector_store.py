import json
import os

import faiss
import numpy as np
from db import get_connection


class VectorStore:
    def __init__(self, index_path: str, mapping_path: str):
        self.index_path = index_path
        self.mapping_path = mapping_path
        self.index = None
        self.position_to_recipe_id = []

    def _normalize(self, vector):
        arr = np.asarray(vector, dtype=np.float32)
        if arr.ndim == 1:
            arr = arr.reshape(1, -1)
        faiss.normalize_L2(arr)
        return arr

    def persist(self):
        if self.index is None:
            return
        try:
            faiss.write_index(self.index, self.index_path)
        except Exception:
            pass
        try:
            with open(self.mapping_path, "w", encoding="utf-8") as handle:
                json.dump(self.position_to_recipe_id, handle)
        except OSError:
            pass

    def load(self):
        if os.path.exists(self.index_path):
            try:
                loaded_index = faiss.read_index(self.index_path)
            except Exception:
                loaded_index = None

            if loaded_index is not None:
                self.index = loaded_index
                try:
                    with open(self.mapping_path, "r", encoding="utf-8") as handle:
                        mapping = json.load(handle)
                    if isinstance(mapping, list) and len(mapping) == self.index.ntotal:
                        self.position_to_recipe_id = list(mapping)
                        return
                except (FileNotFoundError, OSError, ValueError, TypeError):
                    pass

        self.rebuild()

    def rebuild(self):
        """Re-read all recipes from the DB, re-embed, and rebuild the FAISS
        index from scratch. Used on cold start (no cached index) and after
        any recipe update, since IndexFlatL2 can't update/remove a single
        vector in place."""
        conn = get_connection()
        rows = conn.execute(
            "SELECT id, vector FROM recipes ORDER BY created_at"
        ).fetchall()
        conn.close()

        recipe_ids = []
        vectors = []
        for recipe_id, vector_json in rows:
            try:
                stored_vector = json.loads(vector_json)
            except (TypeError, ValueError):
                continue
            if not isinstance(stored_vector, list) or not stored_vector:
                continue
            recipe_ids.append(recipe_id)
            vectors.append(np.asarray(stored_vector, dtype=np.float32))

        if not vectors:
            self.index = faiss.IndexFlatL2(1)
            self.position_to_recipe_id = []
            self.persist()
            return

        matrix = np.vstack(vectors).astype(np.float32)
        faiss.normalize_L2(matrix)
        self.index = faiss.IndexFlatL2(matrix.shape[1])
        self.index.add(matrix)
        self.position_to_recipe_id = recipe_ids
        self.persist()

    def add(self, vector, recipe_id: str):
        normalized = self._normalize(vector).reshape(-1)

        if self.index is None or self.index.ntotal == 0:
            self.index = faiss.IndexFlatL2(len(normalized))
            self.position_to_recipe_id = []
        elif self.index.d != len(normalized):
            raise ValueError(
                "Stored embedding dimension does not match the FAISS index. "
                "Please rebuild the index."
            )

        self.index.add(normalized.reshape(1, -1))
        self.position_to_recipe_id.append(recipe_id)
        self.persist()

    def search(self, query_vector, limit: int = 3):
        if self.index is None or self.index.ntotal == 0:
            return []

        normalized_query = self._normalize(query_vector)
        search_limit = min(limit, self.index.ntotal)
        distances, indices = self.index.search(normalized_query, search_limit)

        results = []
        for distance, position in zip(distances[0], indices[0]):
            if position < 0:
                continue
            try:
                recipe_id = self.position_to_recipe_id[int(position)]
            except (IndexError, TypeError, ValueError):
                continue
            results.append((recipe_id, float(distance)))

        return results
