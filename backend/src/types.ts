export interface Edital {
  id: string;
  titulo: string;
  descricao: string;
  orgaoNome: string;
  uf: string;
  municipioNome: string;
  modalidadeNome: string;
  dataPublicacao: string;
  valorGlobal: number | null;
  numeroControlePNCP: string;
  cnpj: string;
  ano: string;
  sequencial: string;
}

export interface ItemEdital {
  numeroItem: number;
  descricao: string;
  valorUnitarioEstimado: number;
  valorTotal: number;
  quantidade: number;
  unidadeMedida: string;
}

export interface Categoria {
  id: string;
  nome: string;
  codigoGrupo: number;
}

export interface ItemCatalogo {
  codigoItem: number;
  descricaoItem: string;
  codigoGrupo: number;
  nomeGrupo: string;
  codigoClasse: number;
  nomeClasse: string;
}

export interface AmostraPreco {
  idCompra: string;
  dataCompra: string;
  precoUnitario: number;
  quantidade: number;
  niFornecedor: string;
}

export type StatusComparacao = "ALERTA_SOBREPRECO" | "DENTRO_DA_MEDIA" | "ABAIXO_DA_MEDIA" | "SEM_DADOS";

export interface EstatisticaPreco {
  media: number | null;
  minimo: number | null;
  maximo: number | null;
  quantidadeAmostras: number;
  percentualDiferenca: number | null;
  status: StatusComparacao;
}

export interface RegistroAnalise {
  id?: string;
  editalId: string;
  numeroControlePNCP: string;
  orgaoNome: string;
  uf: string;
  itemDescricao: string;
  quantidadeEdital: number;
  valorUnitarioEdital: number;
  codigoItemCatalogo: number;
  descricaoCatalogo: string;
  precoMedioPraticado: number | null;
  precoMinPraticado: number | null;
  precoMaxPraticado: number | null;
  quantidadeAmostras: number;
  percentualDiferenca: number | null;
  status: StatusComparacao;
  linkPNCP: string;
  dataAnalise: string;
}

export type PipelineNodeId =
  | "item_selecionado"
  | "buscar_catalogo"
  | "consultar_precos"
  | "calcular_estatisticas"
  | "salvar_airtable"
  | "atualizar_painel";

export type PipelineNodeStatus = "running" | "success" | "error";

export interface PipelineEvent {
  node: PipelineNodeId;
  status: PipelineNodeStatus;
  mensagem: string;
  dados?: unknown;
}

export interface PipelineInput {
  categoriaId: string;
  edital: Edital;
  item: ItemEdital;
}
