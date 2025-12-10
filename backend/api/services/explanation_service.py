"""
Serviço para geração de explicações médicas usando Google Gemini
"""
import os
import json
from pathlib import Path
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()


class ExplanationService:
    """Serviço para gerar narrativas médicas e explicações"""

    _instance = None
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self.api_key = os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError("GOOGLE_API_KEY não encontrada no .env")

        # Inicializar LLM
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=self.api_key,
            temperature=0.3,
            convert_system_message_to_human=True
        )

        # Carregar prompt
        self.prompt_template = self._carregar_prompt()

        ExplanationService._initialized = True

    def _carregar_prompt(self) -> str:
        """Carrega o prompt de explicação do arquivo"""
        prompt_path = Path(__file__).parent.parent.parent / \
            "prompts" / "explanation_prompt.txt"
        with open(prompt_path, 'r', encoding='utf-8') as f:
            return f.read()

    def gerar_explicacao(self, structured_data: dict) -> dict:
        """
        Gera explicação médica baseada nos dados estruturados

        Args:
            structured_data: Dicionário com dados estruturados do caso

        Returns:
            dict: Narrativa clínica, gravidade e recomendações
        """
        try:
            # Preparar dados do paciente
            patient_data = f"""
Nome: {structured_data.get('paciente_nome') or 'Não informado'}
Sexo: {structured_data.get('paciente_sexo') or 'Não informado'}
Idade: {structured_data.get('idade_paciente') or 'Não informada'}
"""

            # Preparar sintomas
            sintomas_raw = structured_data.get('sintomas_identificados_ptbr', '[]')
            try:
                sintomas_list = json.loads(sintomas_raw) if isinstance(sintomas_raw, str) else sintomas_raw
                symptoms = "\n".join([f"- {s}" for s in sintomas_list]) if sintomas_list else "Nenhum sintoma identificado"
            except:
                symptoms = sintomas_raw or "Nenhum sintoma identificado"

            # Preparar termos indígenas
            correspondencia_raw = structured_data.get('correspondencia_indigena', '[]')
            try:
                correspondencia_list = json.loads(correspondencia_raw) if isinstance(correspondencia_raw, str) else correspondencia_raw
                if correspondencia_list:
                    indigenous_terms = "\n".join([
                        f"- {term.get('termo_nativo', 'N/A')}: {term.get('significado_aproximado', 'N/A')} ({term.get('contexto_cultural_saude', 'N/A')})"
                        for term in correspondencia_list
                    ])
                else:
                    indigenous_terms = "Nenhum termo indígena identificado"
            except:
                indigenous_terms = "Nenhum termo indígena identificado"

            # Preparar contexto clínico
            clinical_context = f"""
Categoria de sintoma: {structured_data.get('categoria_sintoma') or 'Não categorizado'}
Duração dos sintomas: {structured_data.get('duracao_sintomas') or 'Não informada'}
Fator desencadeante: {structured_data.get('fator_desencadeante') or 'Não identificado'}
Temperatura: {structured_data.get('temperatura_graus') or 'Não aferida'}°C
Pressão arterial: {structured_data.get('pressao_arterial') or 'Não aferida'}
"""

            # Montar prompt completo
            prompt = self.prompt_template.format(
                patient_data=patient_data,
                symptoms=symptoms,
                indigenous_terms=indigenous_terms,
                clinical_context=clinical_context
            )

            # Invocar LLM
            response = self.llm.invoke(prompt)
            resposta_texto = response.content

            # Limpar markdown
            resposta_limpa = resposta_texto.strip()
            if resposta_limpa.startswith("```json"):
                resposta_limpa = resposta_limpa[7:]
            if resposta_limpa.startswith("```"):
                resposta_limpa = resposta_limpa[3:]
            if resposta_limpa.endswith("```"):
                resposta_limpa = resposta_limpa[:-3]
            resposta_limpa = resposta_limpa.strip()

            # Parse JSON
            resultado = json.loads(resposta_limpa)

            # Serializar recomendações como JSON string
            recomendacoes_json = json.dumps(
                resultado.get("recomendacoes", []),
                ensure_ascii=False
            )

            return {
                "narrativa_clinica": resultado.get("narrativa_clinica"),
                "gravidade_sugerida": resultado.get("gravidade_sugerida"),
                "justificativa_gravidade": resultado.get("justificativa_gravidade"),
                "recomendacoes": recomendacoes_json
            }

        except Exception as e:
            raise RuntimeError(f"Erro ao gerar explicação: {str(e)}")
