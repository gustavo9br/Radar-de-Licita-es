import { Router } from "express";
import { buscarEditais, buscarItensEdital } from "../lib/pncpClient.js";

export const pncpRouter = Router();

pncpRouter.get("/search", async (req, res) => {
  const termo = String(req.query.q ?? "").trim();
  const uf = req.query.uf ? String(req.query.uf) : undefined;
  const pagina = Number(req.query.pagina ?? 1);

  if (!termo) {
    res.status(400).json({ erro: "Parâmetro 'q' é obrigatório." });
    return;
  }

  try {
    const editais = await buscarEditais(termo, uf, pagina, 15);
    res.json({ editais });
  } catch (err) {
    res.status(502).json({ erro: (err as Error).message });
  }
});

pncpRouter.get("/itens", async (req, res) => {
  const cnpj = String(req.query.cnpj ?? "");
  const ano = String(req.query.ano ?? "");
  const sequencial = String(req.query.sequencial ?? "");

  if (!cnpj || !ano || !sequencial) {
    res.status(400).json({ erro: "Parâmetros 'cnpj', 'ano' e 'sequencial' são obrigatórios." });
    return;
  }

  try {
    const itens = await buscarItensEdital(cnpj, ano, sequencial);
    res.json({ itens });
  } catch (err) {
    res.status(502).json({ erro: (err as Error).message });
  }
});
