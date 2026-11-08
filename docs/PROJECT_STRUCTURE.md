# Project structure

- `frontend/`: React application and browser-side API client.
- `backend/app/api/`: FastAPI route modules.
- `backend/app/core/`: configuration and cross-cutting concerns.
- `backend/app/db/`: SQLAlchemy base, engine, and session lifecycle.
- `backend/app/models/`: SQLAlchemy entities (to be added in the data-model phase).
- `backend/app/schemas/`: Pydantic request/response schemas.
- `backend/app/services/`: business logic, kept separate from route handlers.

The API is versioned under `/api/v1`. The database URL is assembled from environment variables; credentials are not hard-coded into source files.
