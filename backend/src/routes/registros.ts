import { Router } from "express";
import { excluirRegistro, listarRegistros } from "../lib/airtableClient.js";

export const registrosRouter = Router();

registrosRouter.get("/", async (req, res) => {
  const apenasAlerta = req.query.apenasAlerta === "true";
  try {
    const registros = await listarRegistros(apenasAlerta);
    res.json({ registros });
  } catch (err) {
    res.status(502).json({ erro: (err as Error).message });
  }
});

registrosRouter.delete("/:id", async (req, res) => {
  try {
    await excluirRegistro(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(502).json({ erro: (err as Error).message });
  }
});
