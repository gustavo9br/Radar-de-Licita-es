import type { RegistroAnalise, StatusComparacao } from "../lib/types";

interface ResultsTableProps {
  registros: RegistroAnalise[];
  apenasAlerta: boolean;
  carregando: boolean;
  onAlternarFiltro: (valor: boolean) => void;
  onExcluir: (id: string) => void;
}

const STATUS_LABEL: Record<StatusComparacao, string> = {
  ALERTA_SOBREPRECO: "Alerta de sobrepreço",
  DENTRO_DA_MEDIA: "Dentro da média",
  ABAIXO_DA_MEDIA: "Abaixo da média",
  SEM_DADOS: "Sem dados de preço",
};

function formatarMoeda(valor: number | null): string {
  if (valor === null) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarPercentual(valor: number | null): string {
  if (valor === null) return "—";
  const sinal = valor > 0 ? "+" : "";
  return `${sinal}${valor.toFixed(1)}%`;
}

export function ResultsTable({ registros, apenasAlerta, carregando, onAlternarFiltro, onExcluir }: ResultsTableProps) {
  return (
    <section className="painel-resultados">
      <div className="painel-resultados__header">
        <h2>Análises salvas</h2>
        <label className="filtro-alerta">
          <input type="checkbox" checked={apenasAlerta} onChange={(e) => onAlternarFiltro(e.target.checked)} />
          Mostrar só alertas de sobrepreço
        </label>
      </div>

      {carregando && <p className="texto-vazio">Carregando...</p>}
      {!carregando && registros.length === 0 && <p className="texto-vazio">Nenhuma análise salva ainda.</p>}

      {!carregando && registros.length > 0 && (
        <div className="tabela-scroll">
          <table className="tabela-registros">
            <thead>
              <tr>
                <th>Item</th>
                <th>Órgão / UF</th>
                <th>Valor edital</th>
                <th>Preço médio praticado</th>
                <th>Diferença</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.id}>
                  <td className="tabela-registros__descricao">
                    <a href={r.linkPNCP} target="_blank" rel="noreferrer">{r.itemDescricao.slice(0, 70)}</a>
                  </td>
                  <td>{r.orgaoNome} / {r.uf}</td>
                  <td>{formatarMoeda(r.valorUnitarioEdital)}</td>
                  <td>{formatarMoeda(r.precoMedioPraticado)} <span className="amostras">({r.quantidadeAmostras} amostras)</span></td>
                  <td>{formatarPercentual(r.percentualDiferenca)}</td>
                  <td>
                    <span className={`badge badge--${r.status.toLowerCase()}`}>{STATUS_LABEL[r.status]}</span>
                  </td>
                  <td>
                    <button className="botao-excluir" onClick={() => r.id && onExcluir(r.id)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
