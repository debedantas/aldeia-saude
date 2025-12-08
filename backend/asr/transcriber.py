"""
Módulo de transcrição de áudio usando Google Gemini
"""
import os
import google.generativeai as genai
from pathlib import Path


class AudioTranscriber:
    def __init__(self):
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY não encontrada no .env")

        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.5-flash')

        # Carregar prompt de transcrição
        prompt_path = Path(__file__).parent.parent / \
            "prompts" / "asr_prompt.txt"
        with open(prompt_path, 'r', encoding='utf-8') as f:
            self.prompt_template = f.read()

    def transcrever_audio(self, audio_path: str) -> str:
        """
        Transcreve áudio usando Gemini com prompt enriquecido para reconhecer
        vocabulário indígena Yanomami
        """

        # Upload do arquivo de áudio
        audio_file = genai.upload_file(path=audio_path)

        # Gerar transcrição
        response = self.model.generate_content(
            [self.prompt_template, audio_file])

        # Limpar o arquivo temporário do Gemini
        genai.delete_file(audio_file.name)

        transcricao = response.text.strip()
        return transcricao
