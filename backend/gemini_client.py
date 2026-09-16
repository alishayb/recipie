import json
import os
import re

from fastapi import HTTPException

try:
    from google import genai
except ImportError:
    genai = None

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
