# AldeIA Saúde

Web app que usa RAG (Retrieval-Augmented Generation) para transformar relatos de saúde (áudio ou texto) com vocabulário indígena Yanomami em dados estruturados, gerando explicações médicas contextualizadas.

## Visão Geral do MVP

### Fluxo Principal

1. **Ingestão de Dados** (`POST /api/relatos/texto` ou `/audio`)

   - Recebe relato em texto livre ou áudio
   - Áudio é transcrito usando Google Gemini com prompt enriquecido para vocabulário Yanomami
   - Relato original é salvo imediatamente no banco (SQLite com SQLAlchemy)
   - Sistema retorna rapidamente o `case_id`

2. **Estruturação de Dados** (Próxima fase - em background)

   - LLM processa o relato e extrai dados estruturados:
     - **Dados do Paciente**: nome, idade (texto descritivo), sexo (M/F/Indefinido)
     - **Sintomas**: descrição em português, termos indígenas, categoria
     - **Dados Clínicos**: duração dos sintomas, fator desencadeante, temperatura (°C), pressão arterial
   - RAG busca termos Yanomami relacionados na base de conhecimento (FAISS)
   - Dados estruturados são salvos vinculados ao caso

3. **Geração de Explicações Médicas** (Fase futura)

   - Com base nos dados estruturados, LLM gera explicação contextualizada
   - Inclui nível de gravidade e recomendações básicas

4. **Visualização** (Frontend React - Fase 5)
   - Dashboard com casos recentes e estatísticas
   - Detalhes do caso: relato original + dados estruturados + explicação

### Arquitetura Técnica Atual

- **Backend**: FastAPI com SQLAlchemy ORM
- **Banco de Dados**: SQLite com 3 tabelas principais:
  - `cases`: Relatos originais (áudio/texto)
  - `structured_data`: Dados extraídos via LLM + RAG
  - `medical_explanations`: Explicações geradas
- **Repository Pattern**: Camada de acesso a dados desacoplada
- **LLM**: Google Gemini (transcrição e estruturação)
- **RAG**: LangChain + FAISS + HuggingFace embeddings
- **Documento Base**: `Saude_Yanomami.pdf` indexado com vocabulário indígena

### Status Atual

✅ **Fase 1**: RAG implementado (indexação do PDF Yanomami)  
✅ **Fase 2**: Ingestão de texto e áudio com transcrição  
✅ **Infraestrutura**: SQLAlchemy + Repository Pattern  
🔴 **Fase 3**: Estruturação de dados (próxima)  
🔴 **Fase 4**: Explicações médicas  
🔴 **Fase 5**: Interface web

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

### Estrutura do Projeto

```
aldeia-saude/
│
├── backend/
│   ├── main.py                          # Aplicação FastAPI principal
│   ├── requirements.txt                 # Dependências Python
│   │
│   ├── api/
│   │   ├── routes/
│   │   │   ├── ingest.py               # Endpoints de entrada (texto/áudio)
│   │   │   ├── cases.py                # Endpoints de consulta de casos
│   │   │   ├── structure.py            # (Fase 3) Estruturação de dados
│   │   │   └── explanation.py          # (Fase 4) Geração de explicações
│   │   │
│   │   ├── schemas/
│   │   │   ├── case.py                 # Schemas Pydantic de casos
│   │   │   ├── structured_case.py      # (Fase 3) Schema de dados estruturados
│   │   │   └── explanation.py          # (Fase 4) Schema de explicações
│   │   │
│   │   ├── services/
│   │   │   ├── asr_service.py          # Transcrição de áudio (Gemini)
│   │   │   ├── rag_service.py          # (Fase 3) Serviço RAG
│   │   │   ├── structure_service.py    # (Fase 3) Estruturação com LLM
│   │   │   └── explanation_service.py  # (Fase 4) Geração de explicações
│   │   │
│   │   ├── database/
│   │   │   ├── connection.py           # Conexão e operações SQLite
│   │   │   └── aldeia_saude.db         # Banco de dados (gerado)
│   │   │
│   │   └── utils/
│   │       ├── text_cleaning.py        # Limpeza de texto
│   │       └── validation.py           # Validações
│   │
│   ├── rag/
│   │   ├── rag_pipeline.py             # Pipeline RAG completo
│   │   └── faiss_index/                # Índice vetorial (gerado)
│   │
│   ├── asr/
│   │   ├── transcriber.py              # Classe de transcrição (legado)
│   │   └── audio_samples/              # Áudios enviados (gerado)
│   │
│   └── prompts/
│       ├── asr_prompt.txt              # Prompt de transcrição com vocabulário Yanomami
│       ├── nlu_prompt.txt              # (Fase 3) Prompt de extração estruturada
│       └── explanation_prompt.txt      # (Fase 4) Prompt de explicação médica
│
├── frontend/                            # (Fase 5) Interface React
│   └── README.md
│
├── data/
│   └── Saude_Yanomami.pdf              # Documento base de conhecimento
│
├── .env                                 # Variáveis de ambiente (não versionado)
├── .env.example                         # Template de configuração
├── .gitignore
└── README.md
```

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
  "paciente_nome": "string ou null",
  "paciente_sexo": "M | F | Indefinido",
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
  "duracao_sintomas": "string ou null",
  "fator_desencadeante": "string ou null",
  "temperatura_graus": "float ou null",
  "pressao_arterial": "string ou null"
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
  -- Dados do paciente
  paciente_nome,
  paciente_sexo (M/F/Indefinido),
  -- Sintomas
  sintomas_ptbr,
  termos_indigenas,
  categoria_sintoma,
  -- Dados clínicos
  idade_paciente,
  duracao_sintomas,
  fator_desencadeante,
  temperatura_graus,
  pressao_arterial,
  created_at
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
- Node.js 16+ (para o frontend - Fase 5)

### 1. Testar RAG (Fase 1) - Linha de comando

```bash
# Navegar para o backend
cd backend

# Instalar dependências
pip install -r requirements.txt

# Configurar .env com GOOGLE_API_KEY
cp ../.env.example ../.env

# Adicionar arquivo Saude_Yanomami.pdf na pasta data/
# Copiar: data/Saude_Yanomami.pdf

# Executar teste do RAG
python rag/rag_pipeline.py
```

### 2. API FastAPI (Fase 2) - Endpoints de entrada de dados

```bash
# Navegar para o backend (se ainda não estiver)
cd backend

# Instalar dependências (se ainda não instalou)
pip install -r requirements.txt

# Configurar .env (se ainda não configurou)
cp ../.env.example ../.env

# Executar servidor FastAPI
python main.py
# OU
uvicorn main:app --reload

# Servidor disponível em: http://localhost:8000
# Documentação Swagger: http://localhost:8000/docs
```

#### Testando os endpoints no Swagger

1. Acesse `http://localhost:8000/docs`
2. Teste o endpoint `POST /api/relatos/texto`:

   - Clique em "Try it out"
   - Insira um relato de exemplo:
     ```json
     {
       "relato": "Estou com dor de cabeça forte há 3 dias e febre à noite"
     }
     ```
   - Clique em "Execute"

3. Teste o endpoint `POST /api/relatos/audio`:

   - Clique em "Try it out"
   - Faça upload de um arquivo de áudio (mp3, wav, m4a)
   - Clique em "Execute"
   - O áudio será transcrito automaticamente usando Gemini

4. Liste os relatos com `GET /api/relatos`
