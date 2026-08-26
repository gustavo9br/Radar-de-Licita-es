# Radar de Licitações — Edital x Preço Praticado

Projeto da disciplina **Integração de APIs**. Um painel visual, no estilo de um fluxo de automação (n8n/Zapier), que busca licitações públicas no PNCP e cruza o valor estimado de cada item com o preço médio efetivamente pago pela administração pública federal por aquele mesmo tipo de item — sinalizando indícios de sobrepreço.

## Descrição da aplicação

O usuário digita um termo (ex: "notebook") e escolhe uma categoria. O app busca editais publicados no **PNCP**, lista os itens de um edital escolhido e, ao clicar em "Analisar preço" num item, dispara um pipeline automatizado que:

1. Casa a descrição livre do item com um produto específico do catálogo do governo (**CATMAT**, via Compras.gov.br);
2. Busca o histórico de compras públicas recentes desse produto;
3. Calcula a média, o mínimo e o máximo pago por ele, e compara com o valor estimado no edital;
4. Salva o resultado consolidado numa base **Airtable**;
5. Atualiza o painel de análises salvas.

Cada uma dessas etapas aparece como um nó que acende em tempo real na tela (via Server-Sent Events), como um fluxo de automação — dando visibilidade ao que normalmente aconteceria "escondido" numa chamada de API comum.

## APIs utilizadas e justificativa

- **[PNCP — Portal Nacional de Contratações Públicas](https://pncp.gov.br/api/consulta/swagger-ui/index.html)**: fonte oficial de editais/licitações do governo brasileiro. Sem autenticação para consulta.
  - Busca por palavra-chave: `GET /api/search/?q={termo}&tipos_documento=edital`
  - Itens de uma contratação: `GET /api/pncp/v1/orgaos/{cnpj}/compras/{ano}/{sequencial}/itens`
- **[Compras.gov.br — Dados Abertos](https://dadosabertos.compras.gov.br/swagger-ui/index.html)**: preços efetivamente pagos pela administração pública federal, por item do catálogo CATMAT. Sem autenticação para consulta.
  - Catálogo (PDM → item): `GET /modulo-material/3_consultarPdmMaterial` e `GET /modulo-material/4_consultarItemMaterial`
  - Preços praticados: `GET /modulo-pesquisa-preco/1_consultarMaterial?tipo=codigoItemCatalogo&codigo={id}`
- **[Airtable](https://airtable.com/developers/web/api/introduction)**: banco de dados no-code usado pra persistir cada análise. Autenticação via Personal Access Token (Bearer), usado somente no backend.

Escolhi as duas primeiras porque estão no mesmo universo de dados públicos de compras governamentais — o que dá uma narrativa concreta (detectar indício de sobrepreço em edital) em vez de uma integração artificial de APIs sem relação entre si.

## Fluxo de integração

```
Usuário            Backend (Node/Express)              APIs externas
  │                        │                                  │
  ├─ busca "notebook" ────▶│─ GET /api/search ───────────────▶│ PNCP
  │◀── lista de editais ───┤◀─────────────────────────────────┤
  │                        │                                  │
  ├─ escolhe um edital ───▶│─ GET .../itens ─────────────────▶│ PNCP
  │◀── itens do edital ────┤◀─────────────────────────────────┤
  │                        │                                  │
  ├─ "Analisar preço" ────▶│ POST /api/pipeline/iniciar        │
  │◀── runId ──────────────┤                                  │
  │                        │                                  │
  ├─ abre SSE /stream/:id ▶│                                  │
  │                        ├─ busca PDM/item no catálogo ────▶│ Compras.gov.br
  │                        ├─ busca preços praticados ───────▶│ Compras.gov.br
  │                        ├─ calcula média/min/máx (local)   │
  │                        ├─ salva registro ─────────────────▶│ Airtable
  │◀── eventos por nó ─────┤                                  │
  │                        │                                  │
  ├─ GET /api/registros ──▶│─ GET registros ─────────────────▶│ Airtable
  │◀── tabela atualizada ──┤◀─────────────────────────────────┤
```

O casamento entre a descrição livre do edital e o catálogo CATMAT é feito em duas etapas (PDM → item), em vez de baixar o catálogo inteiro (que passa de 15 mil itens em algumas categorias): primeiro acha o produto genérico (ex. "NOTEBOOK") entre as poucas centenas de PDMs da categoria, depois o item específico (com os atributos técnicos) dentro desse PDM. Veja `backend/src/lib/comprasClient.ts`.

## Autenticação e segurança

- PNCP e Compras.gov.br: consulta pública, sem token.
- Airtable: Personal Access Token guardado só no backend (variável de ambiente); o frontend nunca fala diretamente com o Airtable nem com as APIs de governo, sempre através do nosso backend (esconde credenciais, permite tratar erros de forma uniforme).
- Frontend e backend ficam no mesmo domínio em produção (o Traefik roteia `/api` pro backend e o resto pro frontend — veja `docker-compose.prod.yml`), e em dev o Vite proxya `/api` pro backend (`vite.config.ts`). O frontend nunca precisa saber a URL do backend, só caminhos relativos — a mesma imagem do frontend funciona em qualquer domínio, sem rebuild.
- O disparo do pipeline (`POST /api/pipeline/iniciar`) exige um header `X-App-Token`. Como o frontend é uma SPA pública, esse token embutido no bundle é uma barreira básica contra abuso automatizado, não uma autenticação forte de usuário — isso está documentado explicitamente na parte teórica.

## Estrutura do repositório

```
radar-licitacoes/
  backend/     API Node/Express (TypeScript): proxy das APIs externas, matching de catálogo,
               cálculo de estatísticas, orquestração do pipeline (SSE), integração com Airtable
  frontend/    React + Vite + TypeScript: formulário de busca, canvas do pipeline, tabela de resultados
  docs/
    parte-teorica.md   Entregável 1 (parte teórica) do trabalho
  docker-compose.dev.yml     roda backend+frontend juntos localmente (containers)
  docker-compose.prod.yml    stack de produção (Traefik + Docker Swarm) — local, não versionado (contém segredos)
  .github/workflows/deploy.yml   build + push das imagens pro GHCR a cada push em main
```

## Configuração da base no Airtable

Crie uma base com uma tabela (ex: `Analises`) com estes campos:

| Campo | Tipo |
|---|---|
| EditalId, NumeroControlePNCP, OrgaoNome, UF, ItemDescricao, DescricaoCatalogo, LinkPNCP | Single line text / Long text |
| QuantidadeEdital, ValorUnitarioEdital, CodigoItemCatalogo, PrecoMedioPraticado, PrecoMinPraticado, PrecoMaxPraticado, QuantidadeAmostras, PercentualDiferenca | Number |
| Status | Single select (`ALERTA_SOBREPRECO`, `DENTRO_DA_MEDIA`, `ABAIXO_DA_MEDIA`, `SEM_DADOS`) |
| DataAnalise | Date (com hora) |

Gere um Personal Access Token em [airtable.com/create/tokens](https://airtable.com/create/tokens) com escopos `data.records:read` e `data.records:write` sobre essa base.

## Como rodar localmente

**Pré-requisitos**: Node.js 20+, uma base Airtable configurada (acima). Em dev, o Vite já proxya `/api` pro backend (`vite.config.ts`) — não precisa configurar URL nenhuma no frontend além do token.

1. Backend:
   ```
   cd backend
   cp .env.example .env    # preencha AIRTABLE_TOKEN, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME e escolha um APP_TOKEN
   npm install
   npm run dev              # http://localhost:3001
   ```
2. Frontend:
   ```
   cd frontend
   cp .env.example .env     # VITE_APP_TOKEN precisa ser igual ao APP_TOKEN do backend
   npm install
   npm run dev               # http://localhost:5173
   ```
3. Acesse `http://localhost:5173`, busque um termo (ex: "notebook"), escolha um edital, escolha um item e clique em "Analisar preço".

Alternativa via Docker: `cp .env.example .env` na raiz (mesmo valor do `APP_TOKEN` do backend) e `docker compose -f docker-compose.dev.yml up --build`.

## Deploy em produção

Domínio: **https://radar-licitacoes.gustavomartins.dev**. Mesmo padrão do [omni-ai](../../IA%20Generativa%20Aplicada%20ao%20Desenvolvimento%20Junho/omni-ai): a cada push em `main`, o GitHub Actions builda e publica as imagens de backend/frontend no GHCR (`ghcr.io/gustavo9br/radar-licitacoes-backend`/`-frontend`). O deploy em si é manual, numa stack Docker Swarm (Portainer), atrás do Traefik já existente na VPS — front e back no **mesmo domínio**, com o Traefik roteando por path: `/api` vai pro backend, o resto vai pro frontend (prioridade mais alta na regra do backend pra ela ganhar do catch-all do frontend). Isso evita CORS entre os dois e deixa a imagem do frontend independente de domínio.

> `docker-compose.prod.yml` contém valores reais (token do Airtable, `APP_TOKEN`) e por isso está no `.gitignore` — não é versionado no repositório. O que fica documentado aqui é a arquitetura pra recriar o deploy, não o arquivo literal.

**1. Pacotes do GHCR nascem privados** mesmo com o repo público — em GitHub → seu perfil → Packages → `radar-licitacoes-backend`/`radar-licitacoes-frontend` → Package settings → Change visibility (ou cadastre uma credencial do GHCR em Portainer → Registries).

**2. Criar a stack no Portainer** com o conteúdo de `docker-compose.prod.yml`, na mesma rede Docker externa (`externa`) do Traefik já existente na VPS.

**3. Depois do primeiro deploy**, apontar o DNS de `radar-licitacoes.gustavomartins.dev` pra VPS (se ainda não apontar) e aguardar o Traefik emitir o certificado via Let's Encrypt.

**4. Atualizar depois de um novo push**: no Portainer, "Update the stack" com re-pull da imagem (tags são `:latest`).

> Link da aplicação publicada: **https://radar-licitacoes.gustavomartins.dev**

## Prints da aplicação

> _A adicionar após os primeiros testes da interface._
