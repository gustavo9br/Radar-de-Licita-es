import type { Categoria, Edital, ItemEdital, PipelineInput, RegistroAnalise } from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
const APP_TOKEN = import.meta.env.VITE_APP_TOKEN ?? "";

async function tratarResposta<T>(resp: Response): Promise<T> {
  if (!resp.ok) {
    const corpo = await resp.json().catch(() => ({ erro: resp.statusText }));
    throw new Error(corpo.erro ?? `Erro HTTP ${resp.status}`);
  }
  return resp.json() as Promise<T>;
}

export async function buscarEditais(termo: string, uf?: string): Promise<Edital[]> {
  const url = new URL(`${API_URL}/api/pncp/search`);
  url.searchParams.set("q", termo);
  if (uf) url.searchParams.set("uf", uf);
  const { editais } = await tratarResposta<{ editais: Edital[] }>(await fetch(url));
  return editais;
}

export async function buscarItensEdital(edital: Edital): Promise<ItemEdital[]> {
  const url = new URL(`${API_URL}/api/pncp/itens`);
  url.searchParams.set("cnpj", edital.cnpj);
  url.searchParams.set("ano", edital.ano);
  url.searchParams.set("sequencial", edital.sequencial);
  const { itens } = await tratarResposta<{ itens: ItemEdital[] }>(await fetch(url));
  return itens;
}

export async function listarCategorias(): Promise<Categoria[]> {
  const { categorias } = await tratarResposta<{ categorias: Categoria[] }>(await fetch(`${API_URL}/api/precos/categorias`));
  return categorias;
}

export async function iniciarPipeline(input: PipelineInput): Promise<string> {
  const resp = await fetch(`${API_URL}/api/pipeline/iniciar`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-App-Token": APP_TOKEN },
    body: JSON.stringify(input),
  });
  const { runId } = await tratarResposta<{ runId: string }>(resp);
  return runId;
}

export function streamUrlPipeline(runId: string): string {
  return `${API_URL}/api/pipeline/stream/${runId}`;
}

export async function listarRegistros(apenasAlerta = false): Promise<RegistroAnalise[]> {
  const url = new URL(`${API_URL}/api/registros`);
  if (apenasAlerta) url.searchParams.set("apenasAlerta", "true");
  const { registros } = await tratarResposta<{ registros: RegistroAnalise[] }>(await fetch(url));
  return registros;
}

export async function excluirRegistro(id: string): Promise<void> {
  const resp = await fetch(`${API_URL}/api/registros/${id}`, { method: "DELETE" });
  if (!resp.ok && resp.status !== 204) {
    const corpo = await resp.json().catch(() => ({ erro: resp.statusText }));
    throw new Error(corpo.erro ?? `Erro HTTP ${resp.status}`);
  }
}
