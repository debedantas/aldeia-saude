"""
AldeIA Saúde - Backend API
FastAPI Application
"""
from api.routes import ingest, cases, explanation
from api.database.session import init_db
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
from dotenv import load_dotenv
from pathlib import Path

# Carregar variáveis de ambiente ANTES de importar os módulos
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)


# Inicializar FastAPI
app = FastAPI(
    title="AldeIA Saúde API",
    description="Sistema RAG para processamento de relatos de saúde com vocabulário Yanomami",
    version="1.0.0"
)

# Configurar CORS para permitir requisições do frontend React
# Como não estamos usando credenciais/cookies, podemos liberar origem *
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializar banco de dados


@app.on_event("startup")
def startup_event():
    """Inicializa o banco de dados na inicialização da aplicação"""
    init_db()


# Registrar rotas
app.include_router(ingest.router)
app.include_router(cases.router)
app.include_router(explanation.router)


@app.get("/")
def root():
    """Endpoint raiz - informações da API"""
    return {
        "message": "AldeIA Saúde API",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "texto": "POST /api/relatos/texto",
            "audio": "POST /api/relatos/audio",
            "listar": "GET /api/relatos",
            "buscar": "GET /api/relatos/{id}"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
