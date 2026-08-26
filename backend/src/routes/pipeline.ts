import { randomUUID } from "node:crypto";
import { Router, type Response } from "express";
import { encontrarCategoria } from "../lib/categorias.js";
import { casarItemCatalogo, consultarPrecosPraticados } from "../lib/comprasClient.js";
import { calcularEstatisticas } from "../lib/compare.js";
import { salvarRegistro } from "../lib/airtableClient.js";
import type { PipelineEvent, PipelineInput, PipelineNodeId, RegistroAnalise } from "../types.js";

export const pipelineRouter = Router();

const execucoesPendentes = new Map<string, { input: PipelineInput; criadoEm: number }>();
const TTL_MS = 2 * 60 * 1000;

function limparExpirados() {
  const agora = Date.now();
  for (const [id, exec] of execucoesPendentes) {
    if (agora - exec.criadoEm > TTL_MS) execucoesPendentes.delete(id);
  }
}

pipelineRouter.post("/iniciar", (req, res) => {
  if (req.header("x-app-token") !== process.env.APP_TOKEN) {
    res.status(401).json({ erro: "Token do app inválido ou ausente." });
    return;
  }

  const input = req.body as PipelineInput;
  if (!input?.categoriaId || !input?.edital || !input?.item) {
    res.status(400).json({ erro: "Corpo inválido: categoriaId, edital e item são obrigatórios." });
    return;
  }

  limparExpirados();
  const runId = randomUUID();
  execucoesPendentes.set(runId, { input, criadoEm: Date.now() });
  res.json({ runId });
});

function emitir(res: Response, node: PipelineNodeId, status: PipelineEvent["status"], mensagem: string, dados?: unknown) {
  const evento: PipelineEvent = { node, status, mensagem, dados };
  res.write(`data: ${JSON.stringify(evento)}\n\n`);
}

pipelineRouter.get("/stream/:runId", async (req, res) => {
  const exec = execucoesPendentes.get(req.params.runId);
  execucoesPendentes.delete(req.params.runId);

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  if (!exec) {
    emitir(res, "item_selecionado", "error", "Execução não encontrada ou expirada. Tente novamente.");
    res.end();
    return;
  }

  const { edital, item, categoriaId } = exec.input;
  const categoria = encontrarCategoria(categoriaId);
  if (!categoria) {
    emitir(res, "item_selecionado", "error", `Categoria '${categoriaId}' desconhecida.`);
    res.end();
    return;
  }

  emitir(res, "item_selecionado", "success", `Item #${item.numeroItem}: ${item.descricao.slice(0, 80)}`, item);

  try {
    emitir(res, "buscar_catalogo", "running", `Buscando produto correspondente no catálogo CATMAT ('${categoria.nome}')...`);
    const casamento = await casarItemCatalogo(item.descricao, categoria.codigoGrupo);

    if (!casamento) {
      emitir(res, "buscar_catalogo", "error", "Nenhum item do catálogo teve palavras em comum com a descrição do edital.");
      res.end();
      return;
    }
    const match = casamento.item;
    emitir(
      res,
      "buscar_catalogo",
      "success",
      `PDM "${casamento.pdmNome}" → item CATMAT #${match.codigoItem}: ${match.descricaoItem.slice(0, 80)}`,
      match,
    );

    emitir(res, "consultar_precos", "running", "Consultando compras públicas recentes desse item...");
    const amostras = await consultarPrecosPraticados(match.codigoItem);
    emitir(res, "consultar_precos", "success", `${amostras.length} compra(s) encontrada(s).`, { quantidade: amostras.length });

    emitir(res, "calcular_estatisticas", "running", "Calculando média, mínimo e máximo...");
    const stats = calcularEstatisticas(amostras, item.valorUnitarioEstimado);
    emitir(res, "calcular_estatisticas", "success", statusParaMensagem(stats.status, stats.percentualDiferenca), stats);

    emitir(res, "salvar_airtable", "running", "Salvando análise no Airtable...");
    const registro: RegistroAnalise = {
      editalId: edital.id,
      numeroControlePNCP: edital.numeroControlePNCP,
      orgaoNome: edital.orgaoNome,
      uf: edital.uf,
      itemDescricao: item.descricao,
      quantidadeEdital: item.quantidade,
      valorUnitarioEdital: item.valorUnitarioEstimado,
      codigoItemCatalogo: match.codigoItem,
      descricaoCatalogo: match.descricaoItem,
      precoMedioPraticado: stats.media,
      precoMinPraticado: stats.minimo,
      precoMaxPraticado: stats.maximo,
      quantidadeAmostras: stats.quantidadeAmostras,
      percentualDiferenca: stats.percentualDiferenca,
      status: stats.status,
      linkPNCP: `https://pncp.gov.br/app/editais/${edital.cnpj}/${edital.ano}/${edital.sequencial}`,
      dataAnalise: new Date().toISOString(),
    };
    const salvo = await salvarRegistro(registro);
    emitir(res, "salvar_airtable", "success", "Registro salvo com sucesso.", salvo);

    emitir(res, "atualizar_painel", "success", "Pipeline concluído.");
  } catch (err) {
    emitir(res, "salvar_airtable", "error", (err as Error).message);
  } finally {
    res.end();
  }
});

function statusParaMensagem(status: string, percentual: number | null): string {
  if (status === "SEM_DADOS") return "Nenhuma compra recente encontrada pra esse item — sem base de comparação.";
  const pct = percentual !== null ? Math.abs(percentual).toFixed(1) : "?";
  if (status === "ALERTA_SOBREPRECO") return `Valor do edital está ${pct}% acima da média praticada pelo governo.`;
  if (status === "ABAIXO_DA_MEDIA") return `Valor do edital está ${pct}% abaixo da média praticada pelo governo.`;
  return `Valor do edital está dentro da média (diferença de ${pct}%).`;
}
