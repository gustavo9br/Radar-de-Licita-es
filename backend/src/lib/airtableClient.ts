import type { RegistroAnalise } from "../types.js";

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
}

interface AirtableListResponse {
  records: AirtableRecord[];
  offset?: string;
}

function config() {
  const token = process.env.AIRTABLE_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const tableName = process.env.AIRTABLE_TABLE_NAME;
  if (!token || !baseId || !tableName) {
    throw new Error("Airtable não configurado: defina AIRTABLE_TOKEN, AIRTABLE_BASE_ID e AIRTABLE_TABLE_NAME.");
  }
  return { token, baseId, tableName };
}

function endpoint(recordId?: string) {
  const { baseId, tableName } = config();
  const base = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;
  return recordId ? `${base}/${recordId}` : base;
}

function headers() {
  const { token } = config();
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function paraCampos(registro: RegistroAnalise): Record<string, unknown> {
  const campos: Record<string, unknown> = {
    EditalId: registro.editalId,
    NumeroControlePNCP: registro.numeroControlePNCP,
    OrgaoNome: registro.orgaoNome,
    UF: registro.uf,
    ItemDescricao: registro.itemDescricao,
    QuantidadeEdital: registro.quantidadeEdital,
    ValorUnitarioEdital: registro.valorUnitarioEdital,
    CodigoItemCatalogo: registro.codigoItemCatalogo,
    DescricaoCatalogo: registro.descricaoCatalogo,
    QuantidadeAmostras: registro.quantidadeAmostras,
    Status: registro.status,
    LinkPNCP: registro.linkPNCP,
    DataAnalise: registro.dataAnalise,
  };
  if (registro.precoMedioPraticado !== null) campos.PrecoMedioPraticado = registro.precoMedioPraticado;
  if (registro.precoMinPraticado !== null) campos.PrecoMinPraticado = registro.precoMinPraticado;
  if (registro.precoMaxPraticado !== null) campos.PrecoMaxPraticado = registro.precoMaxPraticado;
  if (registro.percentualDiferenca !== null) campos.PercentualDiferenca = registro.percentualDiferenca;
  return campos;
}

function deCampos(record: AirtableRecord): RegistroAnalise {
  const f = record.fields;
  return {
    id: record.id,
    editalId: String(f.EditalId ?? ""),
    numeroControlePNCP: String(f.NumeroControlePNCP ?? ""),
    orgaoNome: String(f.OrgaoNome ?? ""),
    uf: String(f.UF ?? ""),
    itemDescricao: String(f.ItemDescricao ?? ""),
    quantidadeEdital: Number(f.QuantidadeEdital ?? 0),
    valorUnitarioEdital: Number(f.ValorUnitarioEdital ?? 0),
    codigoItemCatalogo: Number(f.CodigoItemCatalogo ?? 0),
    descricaoCatalogo: String(f.DescricaoCatalogo ?? ""),
    precoMedioPraticado: f.PrecoMedioPraticado != null ? Number(f.PrecoMedioPraticado) : null,
    precoMinPraticado: f.PrecoMinPraticado != null ? Number(f.PrecoMinPraticado) : null,
    precoMaxPraticado: f.PrecoMaxPraticado != null ? Number(f.PrecoMaxPraticado) : null,
    quantidadeAmostras: Number(f.QuantidadeAmostras ?? 0),
    percentualDiferenca: f.PercentualDiferenca != null ? Number(f.PercentualDiferenca) : null,
    status: (f.Status as RegistroAnalise["status"]) ?? "SEM_DADOS",
    linkPNCP: String(f.LinkPNCP ?? ""),
    dataAnalise: String(f.DataAnalise ?? ""),
  };
}

export async function salvarRegistro(registro: RegistroAnalise): Promise<RegistroAnalise> {
  const resp = await fetch(endpoint(), {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ fields: paraCampos(registro) }),
  });
  if (!resp.ok) {
    const detalhe = await resp.text();
    throw new Error(`Airtable recusou o registro: HTTP ${resp.status} — ${detalhe}`);
  }
  const record = (await resp.json()) as AirtableRecord;
  return deCampos(record);
}

export async function listarRegistros(apenasAlerta = false): Promise<RegistroAnalise[]> {
  const url = new URL(endpoint());
  url.searchParams.set("sort[0][field]", "DataAnalise");
  url.searchParams.set("sort[0][direction]", "desc");
  if (apenasAlerta) {
    url.searchParams.set("filterByFormula", "{Status} = 'ALERTA_SOBREPRECO'");
  }

  const resp = await fetch(url, { headers: headers() });
  if (!resp.ok) {
    const detalhe = await resp.text();
    throw new Error(`Airtable recusou a listagem: HTTP ${resp.status} — ${detalhe}`);
  }
  const data = (await resp.json()) as AirtableListResponse;
  return data.records.map(deCampos);
}

export async function excluirRegistro(id: string): Promise<void> {
  const resp = await fetch(endpoint(id), { method: "DELETE", headers: headers() });
  if (!resp.ok) {
    const detalhe = await resp.text();
    throw new Error(`Airtable recusou a exclusão: HTTP ${resp.status} — ${detalhe}`);
  }
}
