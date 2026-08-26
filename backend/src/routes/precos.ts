import { Router } from "express";
import { CATEGORIAS } from "../lib/categorias.js";

export const precosRouter = Router();

precosRouter.get("/categorias", (_req, res) => {
  res.json({ categorias: CATEGORIAS });
});
