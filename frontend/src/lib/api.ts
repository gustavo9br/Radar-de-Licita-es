import type { Categoria, Edital, ItemEdital, PipelineInput, RegistroAnalise } from "./types";

// Caminhos relativos de propósito: em dev, o Vite proxya /api pro backend
// (vite.config.ts); em produção, front e back ficam no mesmo domínio e o
// Traefik roteia /api pro backend (docker-compose.prod.yml). Assim a imagem
// do frontend funciona em qualquer domínio, sem precisar embutir URL no build.
const APP_TOKEN = import.meta.env.VITE_APP_TOKEN ?? "";

async function tratarResposta<T>(resp: Response): Promise<T> {
  if (!resp.ok) {
    const corpo = await resp.json().catch(() => ({ erro: resp.statusText }));
    throw new Error(corpo.erro ?? `Erro HTTP ${resp.status}`);
  }
  return resp.json() as Promise<T>;
}

export async function buscarEditais(termo: string, uf?: string): Promise<Edital[]> {
  const params = new URLSearchParams({ q: termo });
  if (uf) params.set("uf", uf);
  const { editais } = await tratarResposta<{ editais: Edital[] }>(await fetch(`/api/pncp/search?${params}`));
  return editais;
}

export async function buscarItensEdital(edital: Edital): Promise<ItemEdital[]> {
  const params = new URLSearchParams({ cnpj: edital.cnpj, ano: edital.ano, sequencial: edital.sequencial });
  const { itens } = await tratarResposta<{ itens: ItemEdital[] }>(await fetch(`/api/pncp/itens?${params}`));
  return itens;
}

export async function listarCategorias(): Promise<Categoria[]> {
  const { categorias } = await tratarResposta<{ categorias: Categoria[] }>(await fetch("/api/precos/categorias"));
  return categorias;
}

export async function iniciarPipeline(input: PipelineInput): Promise<string> {
  const resp = await fetch("/api/pipeline/iniciar", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-App-Token": APP_TOKEN },
    body: JSON.stringify(input),
  });
  const { runId } = await tratarResposta<{ runId: string }>(resp);
  return runId;
}

export function streamUrlPipeline(runId: string): string {
  return `/api/pipeline/stream/${runId}`;
}

export async function listarRegistros(apenasAlerta = false): Promise<RegistroAnalise[]> {
  const params = apenasAlerta ? "?apenasAlerta=true" : "";
  const { registros } = await tratarResposta<{ registros: RegistroAnalise[] }>(await fetch(`/api/registros${params}`));
  return registros;
}

export async function excluirRegistro(id: string): Promise<void> {
  const resp = await fetch(`/api/registros/${id}`, { method: "DELETE" });
  if (!resp.ok && resp.status !== 204) {
    const corpo = await resp.json().catch(() => ({ erro: resp.statusText }));
    throw new Error(corpo.erro ?? `Erro HTTP ${resp.status}`);
  }
}
