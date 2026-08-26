import { fetchComRetry } from "./http.js";
import type { AmostraPreco, ItemCatalogo } from "../types.js";

const BASE = "https://dadosabertos.compras.gov.br";

interface PdmResponse {
  resultado: Array<{ codigoPdm: number; nomePdm: string }>;
}

interface CatalogoResponse {
  resultado: Array<{
    codigoItem: number;
    descricaoItem: string;
    codigoGrupo: number;
    nomeGrupo: string;
    codigoClasse: number;
    nomeClasse: string;
  }>;
}

interface PrecoResponse {
  resultado: Array<{
    idCompra: string | number;
    dataCompra: string;
    precoUnitario: number;
    quantidade: number;
    niFornecedor: string;
  }>;
}

const DIACRITICOS = /[̀-ͯ]/g;

function normalizar(texto: string): string[] {
  const semAcento = texto.normalize("NFD").replace(DIACRITICOS, "").toLowerCase();
  return semAcento.match(/[a-z0-9]+/g) ?? [];
}

const PALAVRAS_IGNORADAS = new Set([
  "de",
  "da",
  "do",
  "com",
  "para",
  "sem",
  "e",
  "a",
  "o",
  "em",
  "ate",
  "superior",
  "inferior",
]);

function tokensRelevantes(texto: string): Set<string> {
  return new Set(normalizar(texto).filter((t) => !PALAVRAS_IGNORADAS.has(t) && t.length > 2));
}

/**
 * Tanto a descrição de itens do PNCP quanto os nomes de item do catálogo CATMAT seguem o
 * padrão "{NOME DO PRODUTO}, atributo: valor, atributo: valor..." (confirmado com dados
 * reais, ex: "Notebook alimentação: bivolt automática, ..." / "MEMÓRIA RAM, APLICAÇÃO: ...").
 * O nome do produto é o trecho antes da primeira vírgula ou dois-pontos.
 */
function prefixoProduto(texto: string): string {
  const corte = texto.search(/[,:]/);
  return corte === -1 ? texto : texto.slice(0, corte);
}

/** Pontua candidatos pela fração das palavras do nome do candidato que aparecem no conjunto de referência. */
function melhorCandidatoPorCobertura<T>(tokensReferencia: Set<string>, candidatos: T[], textoDe: (c: T) => string): T | null {
  let melhor: T | null = null;
  let melhorCobertura = 0;

  for (const candidato of candidatos) {
    const tokensCandidato = normalizar(textoDe(candidato)).filter((t) => !PALAVRAS_IGNORADAS.has(t) && t.length > 2);
    if (tokensCandidato.length === 0) continue;
    const acertos = tokensCandidato.filter((t) => tokensReferencia.has(t)).length;
    const cobertura = acertos / tokensCandidato.length;
    // full coverage first, then prefer the more specific (longer) name among ties
    if (cobertura > melhorCobertura || (cobertura === melhorCobertura && cobertura > 0 && tokensCandidato.length > 0)) {
      if (cobertura > melhorCobertura) {
        melhorCobertura = cobertura;
        melhor = candidato;
      }
    }
  }

  return melhorCobertura > 0 ? melhor : null;
}

/** Pontua candidatos pela quantidade de palavras do texto do candidato que também aparecem na descrição do edital. */
function melhorCandidato<T>(tokensEdital: Set<string>, candidatos: T[], textoDe: (c: T) => string): T | null {
  let melhor: T | null = null;
  let melhorPontuacao = 0;

  for (const candidato of candidatos) {
    const tokensCandidato = normalizar(textoDe(candidato));
    let pontuacao = 0;
    for (const t of tokensCandidato) {
      if (tokensEdital.has(t)) pontuacao++;
    }
    if (pontuacao > melhorPontuacao) {
      melhorPontuacao = pontuacao;
      melhor = candidato;
    }
  }

  return melhorPontuacao > 0 ? melhor : null;
}

async function listarPdmsPorGrupo(codigoGrupo: number): Promise<Array<{ codigoPdm: number; nomePdm: string }>> {
  const url = new URL(`${BASE}/modulo-material/3_consultarPdmMaterial`);
  url.searchParams.set("codigoGrupo", String(codigoGrupo));
  url.searchParams.set("pagina", "1");
  url.searchParams.set("tamanhoPagina", "500");

  const resp = await fetchComRetry(url, { headers: { Accept: "application/json" } });
  if (!resp.ok) throw new Error(`Catálogo CATMAT (PDM) falhou: HTTP ${resp.status}`);
  const data = (await resp.json()) as PdmResponse;
  return data.resultado;
}

async function listarItensPorPdm(codigoPdm: number): Promise<ItemCatalogo[]> {
  const url = new URL(`${BASE}/modulo-material/4_consultarItemMaterial`);
  url.searchParams.set("codigoPdm", String(codigoPdm));
  url.searchParams.set("pagina", "1");
  url.searchParams.set("tamanhoPagina", "200");

  const resp = await fetchComRetry(url, { headers: { Accept: "application/json" } });
  if (!resp.ok) throw new Error(`Catálogo CATMAT (itens) falhou: HTTP ${resp.status}`);
  const data = (await resp.json()) as CatalogoResponse;
  return data.resultado;
}

export interface ResultadoCasamento {
  item: ItemCatalogo;
  pdmNome: string;
}

/**
 * Casa a descrição livre de um item de edital com um item específico do catálogo CATMAT,
 * em duas etapas: primeiro acha o PDM (nome genérico do produto, ex. "NOTEBOOK") mais
 * parecido, depois o item concreto (com atributos) mais parecido dentro desse PDM.
 * Isso evita varrer milhares de itens do grupo inteiro a cada execução.
 */
export async function casarItemCatalogo(descricaoEdital: string, codigoGrupo: number): Promise<ResultadoCasamento | null> {
  const tokensEdital = tokensRelevantes(descricaoEdital);
  if (tokensEdital.size === 0) return null;

  const pdms = await listarPdmsPorGrupo(codigoGrupo);
  const tokensPrefixo = tokensRelevantes(prefixoProduto(descricaoEdital));
  // O nome do produto (antes da 1ª vírgula/dois-pontos) é o sinal mais forte pra achar o PDM
  // certo — evita que atributos genéricos (ex: "memória", "ram") atropelem o nome do produto
  // em si (ex: "notebook") na pontuação.
  const pdm = melhorCandidatoPorCobertura(tokensPrefixo, pdms, (p) => p.nomePdm) ?? melhorCandidato(tokensEdital, pdms, (p) => p.nomePdm);
  if (!pdm) return null;

  const itens = await listarItensPorPdm(pdm.codigoPdm);
  const item = melhorCandidato(tokensEdital, itens, (i) => i.descricaoItem) ?? itens[0] ?? null;
  if (!item) return null;

  return { item, pdmNome: pdm.nomePdm };
}

export async function consultarPrecosPraticados(codigoItemCatalogo: number, tamanhoPagina = 100): Promise<AmostraPreco[]> {
  const url = new URL(`${BASE}/modulo-pesquisa-preco/1_consultarMaterial`);
  url.searchParams.set("tipo", "codigoItemCatalogo");
  url.searchParams.set("codigo", String(codigoItemCatalogo));
  url.searchParams.set("pagina", "1");
  url.searchParams.set("tamanhoPagina", String(tamanhoPagina));

  const resp = await fetchComRetry(url, { headers: { Accept: "application/json" } });
  if (!resp.ok) throw new Error(`Preços praticados falhou: HTTP ${resp.status}`);
  const data = (await resp.json()) as PrecoResponse;

  return data.resultado.map((r) => ({
    idCompra: String(r.idCompra),
    dataCompra: r.dataCompra,
    precoUnitario: r.precoUnitario,
    quantidade: r.quantidade,
    niFornecedor: r.niFornecedor,
  }));
}
