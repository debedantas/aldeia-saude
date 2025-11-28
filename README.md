# AldeIA Saúde

Web app que transforma relatos livres de saúde em dados estruturados, analisa padrões da comunidade e prevê riscos para apoiar decisões do AIS e líderes da aldeia.

## Principais objetivos

- Validar a eficácia da arquitetura de Inteligência Artificial proposta no cenário de monitoramento de saúde em comunidades indígenas.
- Avaliar a capacidade do sistema em converter dados não estruturadosem informações epidemiológicas estruturadas
- Mensurar precisão na extração de variáveis críticas como sintomas, gravidade e contexto
- Verificar a confiabilidade dos modelos preditivos na classificação de riscos individuais e comunitários

## Contribuições

- Reduz a dependência de registros médicos manuais e formulários, atacando erros, incompletudes e perda de informação em contextos remotos onde o AIS está sobrecarregado.
- Aproveita relatos livres (orais ou textuais) e aplica IA para transcrever, estruturar e analisar automaticamente os dados de saúde da comunidade.
- Acelera o processo de registro e organização dos casos, eliminando retrabalho e reduzindo não conformidades comuns em registros convencionais.
- Usa modelos preditivos treinados com dados específicos da própria aldeia para identificar riscos e padrões reais do contexto local.
- Transforma relatos dispersos em informação útil e centrada na comunidade, produzindo análises e alertas que refletem a realidade da população indígena.
- Fortalece a tomada de decisão no território ao fornecer insights contextualizados para o AIS e líderes locais.

## Roadmap de Implementação

### Fase 0 — Preparação e alinhamento:

- Definição do escopo do MVP:

  - Receber relato (voz/texto)
  - Extrair dados estruturados (idade, sintomas, duração, gravidade)
  - Predição de risco (baixo/moderado/alto)
  - Dashboard com contagens e alertas
  - Relatório diário/semanal (texto).

- Definição da plataforma: **Web** → Interface + Back-end
  - Back-end: Python com FastAPI
  - Banco: PostgreSQL
  - ASR: Gemini
  - NLU + Sumarização: Gemini
  - Modelo preditivo: scikit-learn
  - Frontend: React

### Fase 1 — Fundamentos de engenharia:

- Criação do repositório Git + Estrutrução do projeto
- Criar glossário para os dados estruturados
  - Deve ter pelo menos `id`, `nome_canonico`, `sinonimos`
- Criar regras de gravidade para os sintomas
- Criar esquema dos dados: `cases`, `structured_data`, `risk_scores`, `alerts`, `reports`

### Fase 2 — Módulo de entrada (voz/texto):

- Endpoint `POST /ingest/text`
- Endpoint de upload de áudio `POST /ingest/audio`
- Validação mínima com pelo menos 5 dados mockados de texto e áudio
  - Os textos e transcrições precisam estar sendo salvos
  - Upload de áudio deve retornar `job_id`, transcrição deve aparecer em `GET /ingest/{id}`

### Fase 3 — NLU: extração de dados estruturados:

- Criação do prompt de extração com técnicas de Prompt Engineering, retorno **sempre** em JSON.
  - Impor validação dos sintomas (mapeamento do glossário)
- Normalização:
  - Mapear sintomas para symptoms.id (ex.: “tosse seca” → tosse)
  - Duration parser (ex.: “2 dias”, “desde ontem” → ISO8601 intervalo)
- Validação de esquema (pydantic) + fallback:
  - Se JSON inválido, reprompt breve; se falhar, roteio para validação humana (tela posterior)
  - Endpoint `POST /nlu/extract` e automação após ingest.
- Testar com no mínimo 5 dados mockados

### Fase 4 — Modelo preditivo de risco:

- Engenharia de features:
- `num_sintomas`, `idade`, `grupo_etario`, `gravidade_sugerida`, `duração_dias`, `sintomas_chave` (binários: febre, dispneia, diarreia)
- indicadores recentes: `freq_sintoma_area_48h`.
- Rótulos: inicial com heurísticas clínicas simples (regra-ouro)
- Treino: regressão logística / árvore (sklearn), calibrar probabilidades
- Explainability: coeficientes (logística) ou feature importance (árvore)
- Classe de risco: baixo (<0.33), moderado (0.33–0.66), alto (>0.66)
- Endpoint `POST /risk/score` + job automático pós-NLU.
- Detecção de clusters (comunitário):
  - Regras simples: N casos do mesmo sintoma na mesma microárea em 48/72h
  - Endpoint `POST /risk/community`
- Entregáves: `risk_scores persistidos`, alertas calculados
- Aceite: outputs com probabilidade e justificativa curta por caso

### Fase 5 — Dashboard:

- Home widgets:
  - “Situação agora”: nº de casos hoje, casos de risco, alertas abertos.
  - “Tendências semanais”: linha/área por sintoma principal.
  - “Áreas”: lista de áreas (sem geografia complexa).
  - Lista de casos com filtros (data, sintoma, risco).
  - Detalhe do caso: narrativa original, estruturado, risco, justificativa, histórico.
  - Alertas: aba com timeline e status.
    - Regras de alerta:
      - Individual: risco alto → alerta vermelho; moderado + crianças <5/idosos → laranja.
      - Comunitário: cluster sintoma X em área Y → amarelo/laranja.

### Fase 6 — Relatórios:

- Endpoint GET /reports?range=week|day.
- Pipeline: consultas agregadas → prompt com highlights → LLM → texto curto.
- Modelo de relatório: visão geral (nº casos, % risco), top sintomas, áreas afetadas, alertas gerados, recomendações curtas.
  - Aceite: relatório legível em 1 página, sem “alucinações” (usa só dados do sistema).

### Fase 7 - Testes:

- Testes unitários: Funções de parsing, normalização de sintomas, validação JSON, regras de cluster.
- Testes de integração: ingestão → NLU → risco → alerta → dashboard → relatório.
- Testes de usabilidade:
  - Tarefas: registrar relato por voz, localizar alerta, gerar relatório.
- Testes de qualidade de IA
  - NLU: Precisão de extração de sintomas (amostra rotulada).
  - Predição: curva ROC/AUC (com rótulos heurísticos); revisar explicabilidade.
  - Sumarização: checklist factual (dados do relatório ≡ banco).
