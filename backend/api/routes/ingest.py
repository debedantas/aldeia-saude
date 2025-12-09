"""
Rotas para ingestão de dados (texto e áudio)
"""
from fastapi import APIRouter, File, UploadFile, HTTPException, BackgroundTasks
from pathlib import Path

from ..schemas.case import RelatoTextoRequest, CaseResponse
from ..repositories import CaseRepository
from ..services.asr_service import ASRService
from ..tasks import structure_case_task

router = APIRouter(prefix="/api/relatos", tags=["Relatos"])

# Diretório para armazenar áudios
AUDIO_DIR = Path("asr/audio_samples")
AUDIO_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/texto", response_model=CaseResponse)
async def criar_relato_texto(request: RelatoTextoRequest, background_tasks: BackgroundTasks):
    """
    Endpoint para criar um relato a partir de texto

    - **relato**: Texto livre descrevendo os sintomas
    """
    try:
        # Inicializar repositório
        repository = CaseRepository()

        # Salvar no banco
        case_id = repository.create(
            relato_original=request.relato,
            tipo_entrada="texto"
        )

        # Disparar estruturação em background
        background_tasks.add_task(structure_case_task, case_id)

        # Buscar caso criado
        caso = repository.find_by_id(case_id)

        return CaseResponse(
            case_id=caso["id"],
            status=caso["status"],
            id=caso["id"],
            relato_original=caso["relato_original"],
            tipo_entrada=caso["tipo_entrada"],
            audio_path=caso["audio_path"],
            created_at=caso["created_at"],
            message="Relato registrado. Estruturação em andamento."
        )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao salvar relato: {str(e)}")


@router.post("/audio", response_model=CaseResponse)
async def criar_relato_audio(
    background_tasks: BackgroundTasks,
    audio: UploadFile = File(...,
                             description="Arquivo de áudio (mp3, wav, m4a, etc)")
):
    """
    Endpoint para criar um relato a partir de áudio

    - **audio**: Arquivo de áudio contendo o relato

    O áudio será:
    1. Salvo localmente
    2. Transcrito usando Google Gemini com prompt enriquecido para reconhecer vocabulário Yanomami
    3. A transcrição será salva no banco junto com o caminho do áudio
    4. Estruturação dos dados será processada em background
    """
    audio_path = None
    try:
        # Inicializar serviços
        repository = CaseRepository()
        asr_service = ASRService()

        # Salvar arquivo de áudio
        audio_filename = f"{len(list(AUDIO_DIR.glob('*')))+1}_{audio.filename}"
        audio_path = AUDIO_DIR / audio_filename

        with open(audio_path, "wb") as f:
            content = await audio.read()
            f.write(content)

        # Transcrever áudio usando Gemini
        transcricao = asr_service.transcrever_audio(str(audio_path))

        # Salvar no banco
        case_id = repository.create(
            relato_original=transcricao,
            tipo_entrada="audio",
            audio_path=str(audio_path)
        )

        # Disparar estruturação em background
        background_tasks.add_task(structure_case_task, case_id)

        # Buscar caso criado
        caso = repository.find_by_id(case_id)

        return CaseResponse(
            case_id=caso["id"],
            status=caso["status"],
            id=caso["id"],
            relato_original=caso["relato_original"],
            tipo_entrada=caso["tipo_entrada"],
            audio_path=caso["audio_path"],
            created_at=caso["created_at"],
            message="Áudio transcrito e registrado. Estruturação em andamento."
        )

    except Exception as e:
        # Limpar arquivo se houver erro
        if audio_path and audio_path.exists():
            audio_path.unlink()
        raise HTTPException(
            status_code=500, detail=f"Erro ao processar áudio: {str(e)}")
