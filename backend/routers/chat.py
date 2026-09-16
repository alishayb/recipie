import os

from auth import verify_token
from db import get_connection
from fastapi import APIRouter, Depends, HTTPException
from gemini_client import extract_gemini_text
from pydantic import BaseModel
from routers.recipe import search_recipes

try:
    from google import genai
except ImportError:
    genai = None

router = APIRouter(dependencies=[Depends(verify_token)])


class ChatRequest(BaseModel):
    message: str


class AskRequest(BaseModel):
    question: str


@router.get("/messages")
def get_messages(uid: str = Depends(verify_token)):
    conn = get_connection()
    rows = conn.execute(
        "SELECT id, role, content, created_at FROM messages WHERE user_id = ? ORDER BY created_at ASC",
        (uid,),
    ).fetchall()
    conn.close()
    return [
        {"id": row[0], "role": row[1], "content": row[2], "created_at": row[3]}
        for row in rows
    ]


@router.post("/chat")
async def chat(request: ChatRequest, uid: str = Depends(verify_token)):
    api_key = os.getenv("GEMINI_API_KEY")
    model_name = os.getenv("GEMINI_MODEL")

    if not api_key:
        raise HTTPException(
            status_code=500, detail="Missing GEMINI_API_KEY. Add it to your .env file."
        )

    if genai is None:
        raise HTTPException(
            status_code=500, detail="google-genai package is not installed."
        )

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=model_name, contents=request.message
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


@router.post("/ask")
async def ask(request: AskRequest, uid: str = Depends(verify_token)):
    if not request.question or not request.question.strip():
        raise HTTPException(status_code=400, detail="Question is required.")

    matches = search_recipes(uid, request.question, limit=3)

    if not matches:
        context_block = "No related recipe context was found in the database."
    else:
        context_block = "\n\n---\n\n".join(
            f"Recipe: {match['title']}\n\n{match['text']}" for match in matches
        )

    prompt = (
        "You are a recipe assistant for the user's personal recipe collection.\n\n"
        "RULES:\n"
        "1. When the user asks for a recipe or what to cook, answer ONLY using the recipe "
        "context provided below. Do not invent or pull in outside recipes.\n"
        "2. If no matching recipe exists in the context, say clearly that it's not in their "
        "collection, then ask if they'd like a suggestion from outside their cookbook "
        "(general internet/LLM knowledge). Do not provide the outside suggestion yet — "
        "wait for their confirmation.\n"
        "3. If the user confirms they want an outside suggestion, give a BRIEF recipe "
        "suggestion (not grounded in their collection), and make clear it's not from "
        "their saved recipes.\n"
        "4. When discussing details of a specific recipe (steps, ingredients, equipment), "
        "if the user mentions they don't have a particular ingredient or piece of "
        "equipment, suggest a reasonable substitution or workaround.\n\n"
        f"Recipe context:\n{context_block}\n\n"
        f"Question: {request.question}\n\nAnswer:"
    )

    api_key = os.getenv("GEMINI_API_KEY")
    model_name = os.getenv("GEMINI_MODEL")

    if not api_key:
        raise HTTPException(
            status_code=500, detail="Missing GEMINI_API_KEY. Add it to your .env file."
        )

    if genai is None:
        raise HTTPException(
            status_code=500, detail="google-genai package is not installed."
        )

    try:
        conn = get_connection()
        conn.execute(
            "INSERT INTO messages (user_id, role, content) VALUES (?, ?, ?)",
            (uid, "user", request.question),
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
            "INSERT INTO messages (user_id, role, content) VALUES (?, ?, ?)",
            (uid, "assistant", answer),
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
