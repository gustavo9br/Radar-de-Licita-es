import type { ItemEdital } from "../lib/types";

interface ItemPickerProps {
  itens: ItemEdital[];
  carregando: boolean;
  desabilitado: boolean;
  onAnalisar: (item: ItemEdital) => void;
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ItemPicker({ itens, carregando, desabilitado, onAnalisar }: ItemPickerProps) {
  if (carregando) return <p className="texto-vazio">Carregando itens do edital...</p>;
  if (itens.length === 0) return null;

  return (
    <table className="tabela-itens">
      <thead>
        <tr>
          <th>#</th>
          <th>Descrição</th>
          <th>Qtd.</th>
          <th>Valor unit. estimado</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {itens.map((item) => (
          <tr key={item.numeroItem}>
            <td>{item.numeroItem}</td>
            <td className="tabela-itens__descricao">{item.descricao}</td>
            <td>{item.quantidade} {item.unidadeMedida}</td>
            <td>{formatarMoeda(item.valorUnitarioEstimado)}</td>
            <td>
              <button disabled={desabilitado} onClick={() => onAnalisar(item)}>
                Analisar preço
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
