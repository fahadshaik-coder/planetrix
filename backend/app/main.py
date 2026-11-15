"""ASGI application entry point: uvicorn app.main:app."""

from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes.health import router as health_router
from app.api.routes.scientific import router as scientific_router
from app.api.routes.discovery import router as discovery_router
from app.config import get_settings
from app.api.routes.profiles import router as profiles_router
from app.api.routes.sites import router as sites_router


def create_app() -> FastAPI:
    """Construct the FastAPI application without network or dataset side effects."""
    settings = get_settings()
    application = FastAPI(
        title="PLANETRIX API",
        description="Planetary analog discovery & mission experiment suitability platform.",
        version="0.2.0",
        debug=settings.debug,
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["http://127.0.0.1:5173", "http://localhost:5173", "*"],
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )
    application.include_router(health_router)
    application.include_router(scientific_router)
    application.include_router(discovery_router)
    application.include_router(profiles_router)
    application.include_router(sites_router)

    explorer_dir = Path(__file__).resolve().parent / "web"
    application.mount("/explorer-assets", StaticFiles(directory=explorer_dir), name="explorer-assets")

    # Mount Vite Three.js production assets if built
    frontend_dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"
    if (frontend_dist / "assets").exists():
        application.mount("/assets", StaticFiles(directory=frontend_dist / "assets"), name="frontend-assets")

    @application.get("/explorer", include_in_schema=False)
    def explorer() -> FileResponse:
        """Dependency-free browser fallback, served by FastAPI."""
        return FileResponse(explorer_dir / "index.html")

    @application.get("/", include_in_schema=False)
    def root() -> FileResponse:
        """Serve the modern 3D NASA WebGL Observatory if built, else fallback."""
        if (frontend_dist / "index.html").exists():
            return FileResponse(frontend_dist / "index.html")
        return FileResponse(explorer_dir / "index.html")

    @application.get("/3d", include_in_schema=False)
    def three_d() -> FileResponse:
        """Direct route to the 3D NASA WebGL Observatory."""
        if (frontend_dist / "index.html").exists():
            return FileResponse(frontend_dist / "index.html")
        return FileResponse(explorer_dir / "index.html")

    return application


app = create_app()
