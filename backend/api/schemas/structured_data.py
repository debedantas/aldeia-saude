"""
Schemas for structured data
"""
from pydantic import BaseModel
from typing import Optional


class StructuredDataUpdateRequest(BaseModel):
    """Schema para atualização de dados estruturados"""
    paciente_nome: Optional[str] = None
    paciente_sexo: Optional[str] = None
    sintomas_identificados_ptbr: Optional[str] = None
    correspondencia_indigena: Optional[str] = None
    categoria_sintoma: Optional[str] = None
    idade_paciente: Optional[str] = None
    duracao_sintomas: Optional[str] = None
    fator_desencadeante: Optional[str] = None
    temperatura_graus: Optional[float] = None
    pressao_arterial: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "paciente_nome": "João Silva",
                "paciente_sexo": "M",
                "idade_paciente": "45 anos",
                "temperatura_graus": 38.5,
                "pressao_arterial": "120/80"
            }
        }
