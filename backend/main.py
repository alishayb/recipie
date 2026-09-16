import os

import firebase_admin
from db import init_db
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from firebase_admin import credentials
from routers import chat, recipe
from vector_store import vector_store

cred = credentials.Certificate("recipie-firebase-service-acc-key.json")
firebase_admin.initialize_app(cred)

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
allowed_origins = os.getenv("ALLOWED_ORIGINS").split(",")

init_db()
vector_store.load()

app = FastAPI(title="Recipe Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(recipe.router)
app.include_router(chat.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
