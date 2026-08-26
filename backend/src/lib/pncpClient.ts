import { fetchComRetry } from "./http.js";
import type { Edital, ItemEdital } from "../types.js";

const SEARCH_BASE = "https://pncp.gov.br/api/search/";
const ITENS_BASE = "https://pncp.gov.br/api/pncp/v1/orgaos";

interface PncpSearchItem {
  numero_controle_pncp: string;
  title: string;
  description: string;
  orgao_nome: string;
  uf: string;
  municipio_nome: string;
  modalidade_licitacao_nome: string;
  data_publicacao_pncp: string;
  valor_global: number | null;
  orgao_cnpj: string;
  ano: string;
  numero_sequencial: string;
  item_url: string;
}

interface PncpSearchResponse {
  items: PncpSearchItem[];
  total?: number;
}

function mapEdital(raw: PncpSearchItem): Edital {
  return {
    id: raw.numero_controle_pncp,
    titulo: raw.title,
    descricao: raw.description?.trim() ?? "",
    orgaoNome: raw.orgao_nome,
    uf: raw.uf,
    municipioNome: raw.municipio_nome,
    modalidadeNome: raw.modalidade_licitacao_nome,
    dataPublicacao: raw.data_publicacao_pncp,
    valorGlobal: raw.valor_global,
    numeroControlePNCP: raw.numero_controle_pncp,
    cnpj: raw.orgao_cnpj,
    ano: raw.ano,
    sequencial: raw.numero_sequencial,
  };
}

export async function buscarEditais(termo: string, uf?: string, pagina = 1, tamPagina = 10): Promise<Edital[]> {
  const url = new URL(SEARCH_BASE);
  url.searchParams.set("q", termo);
  url.searchParams.set("tipos_documento", "edital");
  url.searchParams.set("pagina", String(pagina));
  url.searchParams.set("tam_pagina", String(tamPagina));

  const resp = await fetchComRetry(url, { headers: { Accept: "application/json" } });
  if (!resp.ok) {
    throw new Error(`PNCP search falhou: HTTP ${resp.status}`);
  }
  const data = (await resp.json()) as PncpSearchResponse;
  let editais = (data.items ?? []).map(mapEdital);

  if (uf) {
    const ufUpper = uf.toUpperCase();
    editais = editais.filter((e) => e.uf?.toUpperCase() === ufUpper);
  }

  return editais;
}

export async function buscarItensEdital(cnpj: string, ano: string, sequencial: string): Promise<ItemEdital[]> {
  const url = `${ITENS_BASE}/${cnpj}/compras/${ano}/${sequencial}/itens`;
  const resp = await fetchComRetry(url, { headers: { Accept: "application/json" } });
  if (!resp.ok) {
    throw new Error(`PNCP itens falhou: HTTP ${resp.status}`);
  }
  const data = (await resp.json()) as Array<{
    numeroItem: number;
    descricao: string;
    valorUnitarioEstimado: number;
    valorTotal: number;
    quantidade: number;
    unidadeMedida: string;
  }>;

  return data.map((it) => ({
    numeroItem: it.numeroItem,
    descricao: it.descricao,
    valorUnitarioEstimado: it.valorUnitarioEstimado,
    valorTotal: it.valorTotal,
    quantidade: it.quantidade,
    unidadeMedida: it.unidadeMedida,
  }));
}
