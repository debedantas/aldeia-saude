"""
Schemas Pydantic para validação de dados
"""
from pydantic import BaseModel
from typing import Optional


class RelatoTextoRequest(BaseModel):
    """Schema para entrada de relato via texto"""
    relato: str

    class Config:
        json_schema_extra = {
            "example": {
                "relato": "Estou com dor de cabeça forte há 3 dias e febre à noite"
            }
        }


class CaseResponse(BaseModel):
    """Schema de resposta para um caso criado"""
    case_id: int
    status: str
    id: int
    relato_original: str
    tipo_entrada: str
    audio_path: Optional[str] = None
    created_at: str
    message: str
