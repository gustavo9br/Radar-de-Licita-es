import type { Categoria } from "../types.js";

// Grupos reais do catálogo CATMAT (compras.gov.br), curados pra cobrir os tipos
// de item mais comuns em licitações. Confirmados via
// GET /modulo-material/1_consultarGrupoMaterial.
export const CATEGORIAS: Categoria[] = [
  { id: "informatica", nome: "Informática", codigoGrupo: 70 },
  { id: "mobiliario", nome: "Mobiliário", codigoGrupo: 71 },
  { id: "escritorio", nome: "Material de Escritório", codigoGrupo: 75 },
  { id: "limpeza", nome: "Material de Limpeza", codigoGrupo: 79 },
  { id: "veiculos", nome: "Veículos", codigoGrupo: 23 },
  { id: "combustiveis", nome: "Combustíveis e Lubrificantes", codigoGrupo: 91 },
];

export function encontrarCategoria(id: string): Categoria | undefined {
  return CATEGORIAS.find((c) => c.id === id);
}
