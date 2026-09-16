import io
import json
import os
import sqlite3
import uuid
from typing import Annotated

from auth import verify_token
from db import delete_recipe, get_connection, update_recipe
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from gemini_client import (
    extract_gemini_text,
    extract_recipes_from_text,
    get_embedding_vector,
)
from pydantic import BaseModel
from vector_store import vector_store

try:
    from google import genai
except ImportError:
    genai = None

try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None


class SaveRecipeRequest(BaseModel):
    title: str
    text: str
    ingredients: list[str] = []
    steps: list[str] = []


router = APIRouter(dependencies=[Depends(verify_token)])


def save_recipe(
    user_id: str,
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
            "INSERT INTO recipes (id, user_id, title, text, ingredients, steps, vector) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                recipe_id,
                user_id,
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
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update FAISS search index: {exc}",
        ) from exc

    return {"status": "ok", "title": title.strip()}


def search_recipes(user_id: str, query: str, limit: int = 3):
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
                "SELECT title, text FROM recipes WHERE id = ? AND user_id = ?",
                (recipe_id, user_id),
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
        matches.append({"title": title, "text": text, "similarity": similarity})

    matches.sort(key=lambda item: item["similarity"], reverse=True)
    return matches[:limit]


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


@router.post("/upload-pdf")
async def upload_pdf(file: Annotated[UploadFile, File()]):
    recipes = await parse_pdf_text(file)
    return {"text": format_recipes_as_text(recipes), "recipes": recipes}


@router.post("/upload-image")
async def upload_image(file: Annotated[UploadFile, File()]):
    recipes = await extract_image_text(file)
    return {"text": format_recipes_as_text(recipes), "recipes": recipes}


@router.post("/save-recipe")
async def save_recipe_endpoint(
    request: SaveRecipeRequest, uid: str = Depends(verify_token)
):
    return save_recipe(
        uid, request.title, request.text, request.ingredients, request.steps
    )


@router.get("/recipes")
def get_recipes(uid: str = Depends(verify_token)):
    conn = get_connection()
    rows = conn.execute(
        "SELECT id, title, text, ingredients, steps, created_at, updated_at FROM recipes WHERE user_id = ? ORDER BY created_at DESC",
        (uid,),
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


@router.get("/recipe/{recipe_id}")
async def get_recipe(recipe_id: str, uid: str = Depends(verify_token)):
    conn = get_connection()
    row = conn.execute(
        "SELECT id, title, text, ingredients, steps, created_at, updated_at FROM recipes WHERE id = ? AND user_id = ?",
        (recipe_id, uid),
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


@router.put("/recipes/{recipe_id}")
async def update_recipes(
    recipe_id: str, request: SaveRecipeRequest, uid: str = Depends(verify_token)
):
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
            uid,
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


@router.delete("/recipes/{recipe_id}")
def delete_recipe_endpoint(recipe_id: str, uid: str = Depends(verify_token)):
    try:
        deleted = delete_recipe(recipe_id, uid)
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