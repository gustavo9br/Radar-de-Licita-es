import type { Edital } from "../lib/types";

interface LicitacaoResultsProps {
  editais: Edital[];
  editalSelecionadoId: string | null;
  onSelecionar: (edital: Edital) => void;
}

function formatarMoeda(valor: number | null): string {
  if (valor === null) return "não informado";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function LicitacaoResults({ editais, editalSelecionadoId, onSelecionar }: LicitacaoResultsProps) {
  if (editais.length === 0) {
    return <p className="texto-vazio">Nenhum edital encontrado. Tente outro termo de busca.</p>;
  }

  return (
    <div className="lista-editais">
      {editais.map((edital) => (
        <button
          key={edital.id}
          className={`card-edital ${edital.id === editalSelecionadoId ? "card-edital--selecionado" : ""}`}
          onClick={() => onSelecionar(edital)}
        >
          <div className="card-edital__titulo">{edital.titulo}</div>
          <div className="card-edital__descricao">{edital.descricao}</div>
          <div className="card-edital__meta">
            <span>{edital.orgaoNome}</span>
            <span>{edital.municipioNome} / {edital.uf}</span>
            <span>{edital.modalidadeNome}</span>
            <span>{formatarMoeda(edital.valorGlobal)}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
