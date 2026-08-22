import json
import os
import sqlite3

DB_PATH = os.path.join(os.path.dirname(__file__), "recipes.db")


def get_connection():
    return sqlite3.connect(DB_PATH)


def init_db():
    conn = get_connection()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS recipes (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            text TEXT NOT NULL,
            ingredients TEXT NOT NULL DEFAULT '[]',
            steps TEXT NOT NULL DEFAULT '[]',
            vector TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
            updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        )
        """
    )
    conn.execute(
        """
        CREATE TRIGGER IF NOT EXISTS recipes_updated_at
        AFTER UPDATE ON recipes
        FOR EACH ROW
        BEGIN
            UPDATE recipes
            SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
            WHERE id = OLD.id;
        END
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
            content TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        )
        """
    )
    conn.commit()
    conn.close()


def update_recipe(
    recipe_id: str, title: str, text: str, ingredients: list, steps: list, vector: list
) -> bool:
    conn = get_connection()
    cursor = conn.execute(
        """
        UPDATE recipes
        SET title = ?, text = ?, ingredients = ?, steps = ?, vector = ?
        WHERE id = ?
        """,
        (
            title,
            text,
            json.dumps(ingredients),
            json.dumps(steps),
            json.dumps(vector),
            recipe_id,
        ),
    )
    conn.commit()
    updated = cursor.rowcount > 0
    conn.close()
    return updated

def delete_recipe(recipe_id: str) -> bool:
    conn = get_connection()
    cursor = conn.execute("DELETE FROM recipes WHERE id = ?", (recipe_id,))
    conn.commit()
    deleted = cursor.rowcount > 0
    conn.close()
    return deleted