---
description: "Project-wide rules for the Recipe Assistant backend and API validation. Use when working in the repo, editing FastAPI routes, Gemini integration, or validating endpoint behavior."
applyTo: "**/*"
---

# Recipe Assistant AI instructions

## Manual validation rule

- When validating an endpoint for this project, prefer the manual Swagger UI at `http://localhost:8000/docs` unless the user explicitly says otherwise.
- Provide the exact request headers, JSON payload, and expected success response shape instead of starting or testing the server automatically.
- Do not run live endpoint requests or curl commands on behalf of the user.
- You do not need to check for compiler or syntax error
