# AldeIA Saúde

Web app que usa RAG (Retrieval-Augmented Generation) para transformar relatos de saúde (áudio ou texto) com vocabulário indígena Yanomami em dados estruturados, gerando explicações médicas contextualizadas.

## Principais objetivos

- Processar relatos livres de saúde e extrair informações estruturadas utilizando Inteligência Artificial.
- Integrar vocabulário indígena Yanomami através de RAG para mapear termos nativos aos sintomas relatados.
- Gerar explicações médicas baseadas nos dados estruturados.
- Visualizar casos registrados em dashboard básico para monitoramento.

## Contribuições

- Reduz a dependência de registros médicos manuais e formulários, atacando erros, incompletudes e perda de informação em contextos remotos onde o AIS (Agente Indígena de Saúde) está sobrecarregado.
- Aproveita relatos livres (orais ou textuais) e aplica IA para transcrever e estruturar automaticamente os dados de saúde.
- Preserva e valoriza o vocabulário indígena Yanomami, mapeando termos nativos relacionados à saúde.
- Acelera o processo de registro e organização dos casos, eliminando retrabalho e reduzindo não conformidades comuns em registros convencionais.
- Fornece explicações médicas contextualizadas baseadas nos sintomas identificados.
- Transforma relatos dispersos em informação útil e centrada na comunidade, produzindo análises que refletem a realidade da população indígena.
- Facilita o acompanhamento de casos através de dashboard visual, para fortalecer a visão do AIS.

## Arquitetura do Sistema

### Tecnologias Utilizadas

- **Backend**: Python com FastAPI
- **LLM**: Google Gemini (transcrição de áudio e estruturação dos dados)
- **RAG**: LangChain + FAISS (indexação do vocabulário Yanomami)
- **Embeddings**: HuggingFace (sentence-transformers)
- **PDF Parser**: PyPDF
- **Frontend**: React (interface web)
- **Banco**: SQLite

## Roadmap de Implementação

### Fase 1 — RAG e Processamento de Base de Conhecimento

- Criar PDF com vocabulário indígena + sintoma biomédico
- Carregar PDF
- Criar pipeline de limpeza de texto
- Implementar chunking e embeddings (HuggingFace)
- Indexar conhecimento no FAISS
- Configurar retrieval semântico

### Fase 2 — Módulo de Entrada (Áudio/Texto)

- Endpoint para entrada de texto: `POST /api/relatos/texto`
- Endpoint para upload de áudio: `POST /api/relatos/audio`
- Transcrição de áudio usando Gemini com prompt enriquecido (vocabulário Yanomami)
- Armazenamento dos relatos brutos no banco
- Validação mínima com pelo menos 5 dados mockados de texto e áudio

### Fase 3 — Estruturação de Dados com RAG

- Criar prompt de extração estruturada em JSON
- Integrar RAG para buscar termos indígenas relacionados aos sintomas
- Extrair: sintomas (pt-br), termos nativos correspondentes, significados
- Normalizar sintomas identificados
- Endpoint: `POST /api/relatos/estruturar`
- Salvar dados estruturados no banco
- Testar com no mínimo 5 dados mockados

**Schema de saída esperado:**

```json
{
  "relato_original": "string",
  "sintomas_identificados_ptbr": ["sintoma1", "sintoma2"],
  "correspondencia_indigena": [
    {
      "termo_nativo": "termo yanomami",
      "significado_aproximado": "tradução",
      "contexto_cultural_saude": "explicação"
    }
  ],
  "categoria_sintoma": "categoria",
  "idade_paciente": "string ou null",
  "duracao_sintomas": "string ou null"
}
```

### Fase 4 — Geração de Explicações Médicas

- Criar prompt para explicação médica baseada nos sintomas estruturados
- Usar Gemini para gerar explicação contextualizada
- Incluir gravidade e recomendações básicas
- Endpoint: `POST /api/relatos/explicar`
- Salvar explicação vinculada ao caso

### Fase 5 — Interface e Dashboard

- Tela de entrada: formulário de texto + upload de áudio (pode enviar um arquivo de áudio ou gravar na hora)
- Tela de visualização do caso individual:
  - Relato original
  - Dados estruturados
    - Sintomas médicos
    - Termos indígenas e explicação do que eles significam naquele contexto
    - Data/hora do caso
  - Explicação médica
- Dashboard básico:
  - Total de casos registrados
  - Sintomas mais frequentes
  - Lista de casos recentes com filtros (data, sintoma)

### Fase 6 — Testes e Validação

- Testes de integração: entrada → estruturação → explicação → exibição
- Validação do RAG: verificar se termos indígenas corretos são recuperados
- Validação do ASR: verificar se está reconhecendo as palavras indígenas
- Validação da estruturação: comparar com casos anotados manualmente
- Testes de usabilidade: registrar relato por voz e texto

## Estrutura do Banco de Dados

```sql
-- Tabela de relatos brutos
cases (
  id,
  relato_original,
  tipo_entrada (audio/texto),
  created_at
)

-- Tabela de dados estruturados
structured_data (
  id,
  case_id,
  sintomas_ptbr,
  termos_indigenas,
  categoria_sintoma,
  significado_aproximado,
  contexto_cultural_saude
)

-- Tabela de explicações médicas
medical_explanations (
  id,
  case_id,
  explicacao,
  gravidade_sugerida,
  created_at
)
```

## Como Executar

### Pré-requisitos

- Python 3.8+
- Node.js 16+ (para o frontend)
- PostgreSQL

### Backend (MVP atual - linha de comando)

```bash
# Instalar dependências
pip install -r requirements.txt

# Configurar .env com GOOGLE_API_KEY
cp .env.example .env

# Adicionar arquivo Saude_Yanomami.pdf

# Executar
python main.py
```
