import io
import json
import os
import re
import sqlite3
import uuid
from typing import Annotated

from db import delete_recipe, get_connection, init_db, update_recipe
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from vector_store import VectorStore

try:
    from google import genai
except ImportError:  # pragma: no cover - handled at runtime
    genai = None

try:
    from pypdf import PdfReader
except ImportError:  # pragma: no cover - handled at runtime
    PdfReader = None

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

app = FastAPI(title="Recipe Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str


class AskRequest(BaseModel):
    question: str


# Initialization
init_db()

vector_store = VectorStore(
    index_path=os.path.join(os.path.dirname(__file__), "recipes.faiss"),
    mapping_path=os.path.join(os.path.dirname(__file__), "recipes.faiss.json"),
)
vector_store.load()


def get_gemini_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="Missing GEMINI_API_KEY. Add it to your .env file.",
        )

    if genai is None:
        raise HTTPException(
            status_code=500,
            detail="google-genai package is not installed.",
        )

    return genai.Client(api_key=api_key)


def get_embedding_vector(text: str):
    if not text or not text.strip():
        raise ValueError("Recipe text cannot be empty.")

    client = get_gemini_client()

    configured_model = os.getenv("GEMINI_EMBEDDING_MODEL", "").strip()
    if not configured_model:
        raise ValueError(
            f"Invalid GEMINI_EMBEDDING_MODEL '{configured_model}'. "
            "Only 'gemini-embedding-2' is supported."
        )

    try:
        response = client.models.embed_content(model=configured_model, contents=text)
    except Exception as exc:  # pragma: no cover - depends on current Gemini API
        raise ValueError(
            f"Failed to generate embedding with {configured_model}: {exc}"
        ) from exc

    embeddings = getattr(response, "embeddings", None)
    if embeddings:
        first = embeddings[0]
        if hasattr(first, "values"):
            return list(first.values)
        if isinstance(first, dict):
            values = first.get("values")
            if values is not None:
                return list(values)

    data = getattr(response, "data", None)
    if data:
        first = data[0]
        if hasattr(first, "embedding"):
            values = getattr(first.embedding, "values", None)
            if values is not None:
                return list(values)
        if isinstance(first, dict):
            embedding = first.get("embedding")
            if isinstance(embedding, dict):
                values = embedding.get("values")
                if values is not None:
                    return list(values)
            if isinstance(embedding, list):
                return list(embedding)

    raise ValueError("Gemini embedding response did not contain vector values.")


class SaveRecipeRequest(BaseModel):
    title: str
    text: str
    ingredients: list[str] = []
    steps: list[str] = []


def save_recipe(
    title: str,
    text: str,
    ingredients: list[str] | None = None,
    steps: list[str] | None = None,
):
    if not title or not title.strip():
        raise HTTPException(status_code=400, detail="Recipe title is required.")
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Recipe text is required.")

    try:
        vector = get_embedding_vector(text)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to generate embedding for recipe: {exc}",
        ) from exc

    recipe_id = str(uuid.uuid4())

    try:
        conn = get_connection()
        conn.execute(
            "INSERT INTO recipes (id, title, text, ingredients, steps, vector) VALUES (?, ?, ?, ?, ?, ?)",
            (
                recipe_id,
                title.strip(),
                text,
                json.dumps(ingredients or []),
                json.dumps(steps or []),
                json.dumps(list(vector)),
            ),
        )
        conn.commit()
        conn.close()
    except sqlite3.Error as exc:
        raise HTTPException(
            status_code=500, detail=f"Failed to save recipe: {exc}"
        ) from exc

    try:
        vector_store.add(vector, recipe_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc
    except Exception as exc:  # pragma: no cover - depends on FAISS runtime state
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update FAISS search index: {exc}",
        ) from exc

    return {"status": "ok", "title": title.strip()}


def search_recipes(query: str, limit: int = 3):
    if not query or not query.strip():
        raise HTTPException(status_code=400, detail="Search query is required.")

    try:
        query_vector = get_embedding_vector(query)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to generate embedding for the search query: {exc}",
        ) from exc

    results = vector_store.search(query_vector, limit=limit)

    matches = []
    for recipe_id, distance in results:
        try:
            conn = get_connection()
            row = conn.execute(
                "SELECT title, text FROM recipes WHERE id = ?",
                (recipe_id,),
            ).fetchone()
            conn.close()
        except sqlite3.Error as exc:
            raise HTTPException(
                status_code=500, detail=f"Failed to load recipe data: {exc}"
            ) from exc

        if row is None:
            continue

        title, text = row
        similarity = 1.0 / (1.0 + distance)
        matches.append(
            {
                "title": title,
                "text": text,
                "similarity": similarity,
            }
        )

    matches.sort(key=lambda item: item["similarity"], reverse=True)
    return matches[:limit]


def extract_gemini_text(response):
    text = getattr(response, "text", None)
    if text is not None:
        return text

    candidates = getattr(response, "candidates", None)
    if candidates:
        first_candidate = candidates[0]
        content = getattr(first_candidate, "content", None)
        parts = getattr(content, "parts", None)
        if parts:
            return "".join(
                getattr(part, "text", "") or ""
                for part in parts
                if getattr(part, "text", None)
            )

    return ""


def format_recipes_as_text(recipes: list[dict]) -> str:
    if not isinstance(recipes, list):
        return ""

    blocks = []
    for recipe in recipes:
        if not isinstance(recipe, dict):
            continue

        title = str(recipe.get("title") or "Untitled Recipe").strip()
        ingredients = recipe.get("ingredients") or []
        steps = recipe.get("steps") or []

        lines = [title]

        if ingredients:
            lines.append("")
            lines.append("Ingredients:")
            for ingredient in ingredients:
                clean_ingredient = str(ingredient).strip()
                if clean_ingredient:
                    lines.append(f"- {clean_ingredient}")

        if steps:
            lines.append("")
            lines.append("Steps:")
            for index, step in enumerate(steps, start=1):
                clean_step = str(step).strip()
                if clean_step:
                    lines.append(f"{index}. {clean_step}")

        block = "\n".join(lines).strip()
        if block:
            blocks.append(block)

    return "\n\n---\n\n".join(blocks)


def extract_recipes_from_text(raw_text: str) -> list[dict]:
    cleaned_text = (raw_text or "").strip()
    if not cleaned_text:
        return []

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="Missing GEMINI_API_KEY. Add it to your .env file.",
        )

    if genai is None:
        raise HTTPException(
            status_code=500,
            detail="google-genai package is not installed.",
        )

    model_name = os.getenv("GEMINI_MODEL")
    prompt = (
        "Review the recipe text below and identify every recipe described. "
        "Return valid JSON only as an array of objects. Each object must match this schema: "
        '{"title": "string", "ingredients": ["string"], "steps": ["string"]}. '
        "If no recipe content is present, return [] exactly. Do not wrap the output in markdown fences.\n\n"
        f"Recipe text:\n{cleaned_text}"
    )

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(model=model_name, contents=prompt)
        response_text = extract_gemini_text(response)
        if not response_text or not response_text.strip():
            return []

        normalized = response_text.strip()
        normalized = re.sub(r"^```(?:json)?\s*", "", normalized, flags=re.IGNORECASE)
        normalized = re.sub(r"\s*```$", "", normalized, flags=re.IGNORECASE)

        try:
            parsed = json.loads(normalized)
        except json.JSONDecodeError:
            return []

        if not isinstance(parsed, list):
            return []

        recipes = []
        for item in parsed:
            if not isinstance(item, dict):
                continue

            title = item.get("title")
            ingredients = item.get("ingredients")
            steps = item.get("steps")
            if not isinstance(title, str):
                continue

            ingredients_list = ingredients if isinstance(ingredients, list) else []
            steps_list = steps if isinstance(steps, list) else []

            recipes.append(
                {
                    "title": title.strip() or "Untitled Recipe",
                    "ingredients": [
                        str(ingredient).strip()
                        for ingredient in ingredients_list
                        if str(ingredient).strip()
                    ],
                    "steps": [
                        str(step).strip() for step in steps_list if str(step).strip()
                    ],
                }
            )

        return recipes
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to extract recipe data from text: {exc}",
        ) from exc


async def parse_pdf_text(uploaded_file: UploadFile) -> list[dict]:
    if uploaded_file is None:
        raise HTTPException(status_code=400, detail="No file was uploaded.")

    filename = uploaded_file.filename or ""
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    if PdfReader is None:
        raise HTTPException(status_code=500, detail="pypdf is not installed.")

    raw_bytes = await uploaded_file.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Uploaded PDF is empty.")

    try:
        reader = PdfReader(io.BytesIO(raw_bytes))
        pages = []
        for page in reader.pages:
            extracted = page.extract_text() or ""
            pages.append(extracted)
        full_text = "\n\n".join(page for page in pages if page.strip())
        if not full_text.strip():
            raise ValueError("No text could be extracted from the PDF.")
        return extract_recipes_from_text(full_text)
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to parse PDF text: {exc}",
        ) from exc


async def extract_image_text(uploaded_file: UploadFile) -> list[dict]:
    if uploaded_file is None:
        raise HTTPException(status_code=400, detail="No file was uploaded.")

    filename = uploaded_file.filename or ""
    if not filename:
        raise HTTPException(
            status_code=400, detail="Uploaded image is missing a filename."
        )

    if genai is None:
        raise HTTPException(
            status_code=500,
            detail="google-genai package is not installed.",
        )

    raw_bytes = await uploaded_file.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Uploaded image is empty.")

    lower_name = filename.lower()
    suffix_to_mime = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
    }
    mime_type = uploaded_file.content_type or ""
    resolved_mime = None
    for suffix, candidate in suffix_to_mime.items():
        if lower_name.endswith(suffix):
            resolved_mime = candidate
            break
    if not resolved_mime and mime_type in suffix_to_mime.values():
        resolved_mime = mime_type

    if not resolved_mime:
        raise HTTPException(
            status_code=400,
            detail="Unsupported image format. Please upload a PNG, JPG, JPEG, or WebP image.",
        )

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="Missing GEMINI_API_KEY. Add it to your .env file.",
        )

    model_name = os.getenv("GEMINI_MODEL")
    image_part = {
        "inline_data": {
            "mime_type": resolved_mime,
            "data": raw_bytes,
        }
    }
    prompt = (
        "Extract all visible recipe content from this image. "
        "Transcribe the title, ingredients, and steps if present. "
        "If any section is unclear, preserve the visible text and label uncertainty briefly. "
        "Return only the extracted recipe text."
    )

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=model_name,
            contents=[prompt, image_part],
        )
        extracted = extract_gemini_text(response)
        if not extracted.strip():
            raise ValueError("Gemini returned no text for the uploaded image.")
        return extract_recipes_from_text(extracted.strip())
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to extract text from image: {exc}",
        ) from exc


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/messages")
def get_messages():
    conn = get_connection()
    rows = conn.execute(
        "SELECT id, role, content, created_at FROM messages ORDER BY created_at ASC"
    ).fetchall()
    conn.close()
    return [
        {
            "id": row[0],
            "role": row[1],
            "content": row[2],
            "created_at": row[3],
        }
        for row in rows
    ]


@app.post("/chat")
async def chat(request: ChatRequest):
    api_key = os.getenv("GEMINI_API_KEY")
    model_name = os.getenv("GEMINI_MODEL")

    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="Missing GEMINI_API_KEY. Add it to your .env file.",
        )

    if genai is None:
        raise HTTPException(
            status_code=500,
            detail="google-genai package is not installed.",
        )

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=model_name,
            contents=request.message,
        )

        text = extract_gemini_text(response)
        if not text:
            raise ValueError("Gemini returned an empty response.")

        return {"response": text}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to generate a response from Gemini: {exc}",
        ) from exc


@app.post("/ask")
async def ask(request: AskRequest):
    if not request.question or not request.question.strip():
        raise HTTPException(status_code=400, detail="Question is required.")

    matches = search_recipes(request.question, limit=3)

    if not matches:
        context_block = "No related recipe context was found in the database."
    else:
        context_block = "\n\n---\n\n".join(
            f"Recipe: {match['title']}\n\n{match['text']}" for match in matches
        )

    prompt = (
        "You are a recipe assistant. Use the recipe context below to answer the user's question. "
        "If the answer is not present in the provided recipes, say so clearly.\n\n"
        f"Recipe context:\n{context_block}\n\n"
        f"Question: {request.question}\n\nAnswer:"
    )

    api_key = os.getenv("GEMINI_API_KEY")
    model_name = os.getenv("GEMINI_MODEL")

    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="Missing GEMINI_API_KEY. Add it to your .env file.",
        )

    if genai is None:
        raise HTTPException(
            status_code=500,
            detail="google-genai package is not installed.",
        )

    try:
        conn = get_connection()
        conn.execute(
            "INSERT INTO messages (role, content) VALUES (?, ?)",
            ("user", request.question),
        )
        conn.commit()
        conn.close()

        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(model=model_name, contents=prompt)
        answer = extract_gemini_text(response)
        if not answer:
            raise ValueError("Gemini returned an empty response.")

        conn = get_connection()
        conn.execute(
            "INSERT INTO messages (role, content) VALUES (?, ?)",
            ("assistant", answer),
        )
        conn.commit()
        conn.close()

        return {"answer": answer}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to generate an answer from Gemini: {exc}",
        ) from exc


@app.post("/upload-pdf")
async def upload_pdf(file: Annotated[UploadFile, File()]):
    recipes = await parse_pdf_text(file)
    return {
        "text": format_recipes_as_text(recipes),
        "recipes": recipes,
    }


@app.post("/upload-image")
async def upload_image(file: Annotated[UploadFile, File()]):
    recipes = await extract_image_text(file)
    return {
        "text": format_recipes_as_text(recipes),
        "recipes": recipes,
    }


@app.post("/save-recipe")
async def save_recipe_endpoint(request: SaveRecipeRequest):
    result = save_recipe(
        request.title, request.text, request.ingredients, request.steps
    )
    return result


@app.get("/recipes")
def get_recipes():
    conn = get_connection()
    rows = conn.execute(
        "SELECT id, title, text, ingredients, steps, created_at, updated_at FROM recipes ORDER BY created_at DESC"
    ).fetchall()
    conn.close()
    return [
        {
            "id": row[0],
            "title": row[1],
            "text": row[2],
            "ingredients": json.loads(row[3]),
            "steps": json.loads(row[4]),
            "created_at": row[5],
            "updated_at": row[6],
        }
        for row in rows
    ]


@app.get("/recipe/{recipe_id}")
async def get_recipe(recipe_id: str):
    print(">> get recipe", recipe_id)
    conn = get_connection()
    row = conn.execute(
        "SELECT id, title, text, ingredients, steps, created_at, updated_at FROM recipes WHERE id = ?",
        (recipe_id,),
    ).fetchone()
    conn.close()

    if row is None:
        raise HTTPException(status_code=404, detail="Recipe not found.")

    return {
        "id": row[0],
        "title": row[1],
        "text": row[2],
        "ingredients": json.loads(row[3]),
        "steps": json.loads(row[4]),
        "created_at": row[5],
        "updated_at": row[6],
    }


@app.put("/recipes/{recipe_id}")
async def update_recipes(recipe_id: str, request: SaveRecipeRequest):
    if not request.title or not request.title.strip():
        raise HTTPException(status_code=400, detail="Recipe title is required.")
    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="Recipe text is required.")

    try:
        vector = get_embedding_vector(request.text)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to generate embedding for recipe: {exc}",
        ) from exc

    try:
        updated = update_recipe(
            recipe_id,
            request.title.strip(),
            request.text,
            request.ingredients,
            request.steps,
            vector,
        )
    except sqlite3.Error as exc:
        raise HTTPException(
            status_code=500, detail=f"Failed to update recipe: {exc}"
        ) from exc

    if not updated:
        raise HTTPException(status_code=404, detail="Recipe not found.")

    try:
        vector_store.rebuild()
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to rebuild FAISS search index: {exc}",
        ) from exc

    return {"status": "ok", "title": request.title.strip()}


@app.delete("/recipes/{recipe_id}")
def delete_recipe_endpoint(recipe_id: str):
    try:
        deleted = delete_recipe(recipe_id)
    except sqlite3.Error as exc:
        raise HTTPException(
            status_code=500, detail=f"Failed to delete recipe: {exc}"
        ) from exc

    if not deleted:
        raise HTTPException(status_code=404, detail="Recipe not found.")

    try:
        vector_store.rebuild()
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to rebuild FAISS search index: {exc}",
        ) from exc

    return {"status": "ok", "deleted_id": recipe_id}
