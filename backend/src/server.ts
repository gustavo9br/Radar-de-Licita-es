import "dotenv/config";
import cors from "cors";
import express from "express";
import { pncpRouter } from "./routes/pncp.js";
import { precosRouter } from "./routes/precos.js";
import { pipelineRouter } from "./routes/pipeline.js";
import { registrosRouter } from "./routes/registros.js";

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/pncp", pncpRouter);
app.use("/api/precos", precosRouter);
app.use("/api/pipeline", pipelineRouter);
app.use("/api/registros", registrosRouter);

app.listen(port, () => {
  console.log(`radar-licitacoes backend rodando em http://localhost:${port}`);
});
