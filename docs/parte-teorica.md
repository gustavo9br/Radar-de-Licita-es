# Parte Teórica — Radar de Licitações x Preço Praticado

**Disciplina:** Integração de APIs
**Projeto:** Central Inteligente de Integração — Radar de Licitações

## 1. Contextualização do problema

O Brasil publica dezenas de milhares de editais de licitação por mês através do **PNCP** (Portal Nacional de Contratações Públicas), a plataforma centralizadora criada pela Lei nº 14.133/2021 (Nova Lei de Licitações). Cada edital estima um valor unitário para cada item que pretende comprar — mas esse valor é definido isoladamente pelo órgão, a partir de pesquisas de mercado próprias, sem visibilidade automática sobre o que a própria administração pública já paga por itens equivalentes em outros lugares do país.

Na prática, isso gera dois problemas conectados:

- Para **fiscais, auditores e órgãos de controle**, identificar indícios de sobrepreço exige cruzar manualmente o edital com bases de preços históricas — um trabalho lento, disperso entre sistemas diferentes, e que na prática só é feito por amostragem.
- Para **fornecedores e gestores públicos**, não existe uma forma simples de saber, no momento em que um edital é publicado, se o valor estimado está compatível com o que o mercado público já pratica.

Ambos os problemas têm a mesma causa raiz: os dados existem (são públicos), mas estão em sistemas diferentes, sem integração entre si.

## 2. Descrição da solução proposta

O **Radar de Licitações** é uma aplicação web que integra a busca de editais do PNCP com o histórico de preços pagos pela administração pública federal (Compras.gov.br), automatizando o cruzamento que hoje seria manual.

O usuário busca um termo (ex.: "notebook"), escolhe uma categoria e um edital retornado pela busca. Ao selecionar um item específico desse edital, a aplicação dispara um pipeline automatizado — visualizado na tela como um fluxo de nós que acendem em sequência, no estilo de ferramentas de automação (n8n, Zapier) — que:

1. Identifica, no catálogo de materiais do governo (CATMAT), o produto específico que corresponde à descrição livre do item do edital;
2. Consulta o histórico de compras públicas recentes desse produto;
3. Calcula estatísticas (média, mínimo, máximo, quantidade de amostras) e compara com o valor estimado no edital;
4. Classifica o resultado (`ALERTA_SOBREPRECO`, `DENTRO_DA_MEDIA`, `ABAIXO_DA_MEDIA` ou `SEM_DADOS`);
5. Persiste o resultado consolidado numa base Airtable;
6. Atualiza o painel de análises, disponível para consulta e gerenciamento (filtro por alerta, exclusão de registros).

A visualização em pipeline não é só estética: ela expõe, passo a passo, o que normalmente ficaria escondido dentro de uma função — cada chamada de API, cada transformação de dado e o resultado de cada etapa, o que tem valor tanto didático (é o próprio objetivo da disciplina) quanto prático (o usuário entende de onde veio cada número mostrado).

## 3. APIs utilizadas e justificativa da escolha

| API | Papel na aplicação | Autenticação |
|---|---|---|
| **PNCP** (Portal Nacional de Contratações Públicas) | Busca de editais e consulta dos itens de uma contratação | Nenhuma (consulta pública) |
| **Compras.gov.br — Dados Abertos** | Catálogo de materiais (CATMAT) e preços praticados pela administração pública federal | Nenhuma (consulta pública) |
| **Airtable** | Persistência das análises geradas (banco de dados no-code) | Personal Access Token (Bearer) |

A escolha das duas primeiras APIs não foi arbitrária: ambas fazem parte do mesmo ecossistema de dados abertos de compras governamentais, mas são publicadas por sistemas diferentes, com formatos e granularidades diferentes — o que é exatamente o cenário que a disciplina pede (sistemas isolados que precisam ser conectados pra virar informação útil). Ao integrá-las, a aplicação cria algo que nenhuma das duas oferece isoladamente: uma resposta direta à pergunta "esse valor de edital está caro?".

O Airtable foi escolhido como banco no-code por ser o exemplo citado no enunciado do trabalho, ter uma API REST simples e bem documentada, e permitir que qualquer pessoa (mesmo sem acesso ao código) visualize e edite os dados salvos diretamente pela interface do Airtable.

## 4. Fluxo de integração entre os sistemas

```
Frontend (React)                Backend (Node/Express)              APIs externas
      │                                 │                                  │
      ├── busca por termo ─────────────▶│── GET /api/search ──────────────▶│ PNCP
      │◀── lista de editais ────────────┤◀─────────────────────────────────┤
      │                                 │                                  │
      ├── escolhe edital ──────────────▶│── GET .../itens ────────────────▶│ PNCP
      │◀── itens do edital ─────────────┤◀─────────────────────────────────┤
      │                                 │                                  │
      ├── "Analisar preço" ────────────▶│  POST /api/pipeline/iniciar      │
      │◀── runId ───────────────────────┤                                  │
      ├── abre stream SSE ─────────────▶│                                  │
      │                                 ├── busca PDM/item no catálogo ───▶│ Compras.gov.br
      │                                 ├── busca preços praticados ──────▶│ Compras.gov.br
      │                                 ├── calcula estatísticas (local)  │
      │                                 ├── salva registro ────────────────▶│ Airtable
      │◀── eventos por etapa (SSE) ─────┤                                  │
      │                                 │                                  │
      ├── GET /api/registros ──────────▶│── GET registros ────────────────▶│ Airtable
      │◀── tabela atualizada ───────────┤◀─────────────────────────────────┤
```

O backend nunca expõe diretamente as APIs externas ao frontend: ele atua como um **gateway de integração**, que busca os dados, trata e normaliza os formatos (cada API tem sua própria convenção de nomes de campo), calcula as estatísticas derivadas e só então entrega ao frontend um formato único e consistente.

Um detalhe de tratamento de dados relevante: o catálogo CATMAT do Compras.gov.br não oferece busca textual confiável (testado durante o desenvolvimento — o parâmetro de busca por descrição da API oficial não retorna resultado mesmo para termos exatos). Por isso o casamento entre a descrição livre do item do edital e o catálogo é feito em duas etapas dentro do próprio backend: primeiro contra o PDM (nome genérico do produto, ex. "NOTEBOOK" — um conjunto pequeno, de dezenas a poucas centenas de registros por categoria), depois contra os itens específicos dentro desse PDM (com atributos técnicos). Essa cascata evita ter que baixar catálogos de até 15 mil itens a cada consulta, e é onde a maior parte da "manipulação e tratamento de dados" pedida pelo trabalho acontece.

## 5. Estratégia de autenticação e segurança

- **PNCP e Compras.gov.br**: são APIs de dados abertos, sem autenticação para consulta — uma integração legítima não precisa inventar autenticação onde a fonte não exige.
- **Airtable**: autenticado via Personal Access Token (Bearer), armazenado exclusivamente como variável de ambiente do backend. O token nunca é enviado ao frontend nem versionado no repositório (`.env` está no `.gitignore`; `.env.example` documenta as variáveis sem valores reais).
- **Endpoint de disparo do pipeline**: protegido por um token de aplicação (`APP_TOKEN`), enviado pelo frontend no header `X-App-Token`. Como o frontend é uma aplicação pública do lado do cliente, esse token embutido no bundle é visível a quem inspecionar o JavaScript — ele funciona como uma barreira básica contra automação/abuso casual, não como autenticação forte de usuário. Uma evolução natural (fora do escopo deste trabalho) seria adicionar login de usuário e emitir tokens de sessão de curta duração.
- **CORS**: o backend só aceita requisições da origem configurada do frontend (`FRONTEND_ORIGIN`), reduzindo a superfície de uso indevido da API a partir de outros domínios.
- **Execuções do pipeline** (`POST /iniciar` → `GET /stream/:runId`) usam um identificador de execução (`runId`) aleatório e de uso único, com expiração curta — evitando que alguém dispare execuções de pipeline arbitrárias apenas conhecendo a URL do stream.

## 6. Forma de armazenamento e manipulação dos dados

Os dados não são simplesmente repassados das APIs externas para a tela: cada execução do pipeline produz um **registro derivado**, calculado a partir de dados de duas fontes diferentes:

- do PNCP: descrição, quantidade e valor unitário estimado do item;
- do Compras.gov.br: uma lista de compras públicas individuais (preço unitário, data, fornecedor) do produto casado no catálogo — que o backend agrega (média, mínimo, máximo, quantidade de amostras) antes de qualquer exibição, já que a API de origem não entrega essa agregação pronta.

Esse registro consolidado — não os dados brutos — é o que fica persistido no Airtable, numa tabela com os campos descritos no `README.md`. Isso torna o Airtable a fonte de verdade do **histórico de análises** já feitas (o que o usuário quer consultar depois), enquanto o PNCP e o Compras.gov.br continuam sendo consultados ao vivo a cada nova busca (não há necessidade de espelhar o catálogo inteiro localmente).

## 7. Aspectos relacionados à LGPD, ética e governança das integrações

- **Dados pessoais**: as três fontes utilizadas (PNCP, Compras.gov.br, e os registros que a aplicação salva) tratam exclusivamente de **dados públicos institucionais** — editais, itens de compra, CNPJs de órgãos públicos e de fornecedores (pessoa jurídica), e preços. Não há coleta, armazenamento ou tratamento de dados pessoais de pessoas físicas, o que mantém o projeto fora do núcleo de aplicação mais sensível da LGPD. Ainda assim, o CNPJ de fornecedor retornado pela API de preços praticados é um dado identificável de uma empresa; a aplicação não faz nenhum uso secundário desse dado além de exibi-lo como parte da amostra de preço, e não o associa a nenhuma pessoa física.
- **Uso ético dos dados**: o objetivo declarado da aplicação — comparar valores de edital com preços já praticados pelo próprio governo — é um uso alinhado ao princípio da **publicidade e do controle social** previsto na própria Lei de Licitações e na Lei de Acesso à Informação. A aplicação não reidentifica, não infere e não expõe informação além da que já é pública nas fontes originais.
- **Governança da integração**: o backend centraliza e documenta explicitamente quais campos de cada API são consumidos e para qual finalidade (evitando "coleta por conveniência" de campos não utilizados), respeita os limites de paginação e evita requisições desnecessárias às APIs de governo (cascata PDM → item em vez de varredura completa do catálogo), e não realiza nenhuma operação de escrita/alteração sobre PNCP ou Compras.gov.br — apenas consulta. A única escrita da aplicação é no Airtable, sob controle direto do próprio usuário/dono da base.
- **Transparência com o usuário final**: cada registro salvo mantém um link direto (`LinkPNCP`) para o edital de origem no portal oficial, permitindo que qualquer pessoa verifique a informação na fonte primária em vez de confiar cegamente no cálculo da aplicação — importante quando o resultado é um "alerta de sobrepreço" que pode impactar a reputação de um órgão ou fornecedor.
