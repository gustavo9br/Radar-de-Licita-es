import type { PipelineEvent, PipelineNodeId } from "../lib/types";
import type { EstadoPipeline } from "../hooks/usePipelineStream";

interface NoDefinicao {
  id: PipelineNodeId;
  label: string;
  icone: string;
}

const NOS: NoDefinicao[] = [
  { id: "item_selecionado", label: "Item selecionado", icone: "📋" },
  { id: "buscar_catalogo", label: "Buscar no catálogo CATMAT", icone: "🔎" },
  { id: "consultar_precos", label: "Consultar preços praticados", icone: "💰" },
  { id: "calcular_estatisticas", label: "Calcular estatísticas", icone: "📊" },
  { id: "salvar_airtable", label: "Salvar no Airtable", icone: "🗄️" },
  { id: "atualizar_painel", label: "Atualizar painel", icone: "✅" },
];

interface PipelineCanvasProps {
  estado: EstadoPipeline;
  nodeStates: Partial<Record<PipelineNodeId, PipelineEvent>>;
}

function statusDoNo(estadoGeral: EstadoPipeline, evento: PipelineEvent | undefined): "idle" | "running" | "success" | "error" {
  if (evento) return evento.status;
  if (estadoGeral === "ocioso") return "idle";
  return "idle";
}

export function PipelineCanvas({ estado, nodeStates }: PipelineCanvasProps) {
  return (
    <div className="pipeline-canvas">
      {NOS.map((no, i) => {
        const evento = nodeStates[no.id];
        const status = statusDoNo(estado, evento);
        return (
          <div className="pipeline-no-wrap" key={no.id}>
            <div className={`pipeline-no pipeline-no--${status}`}>
              <div className="pipeline-no__icone">{no.icone}</div>
              <div className="pipeline-no__corpo">
                <div className="pipeline-no__label">{no.label}</div>
                <div className="pipeline-no__mensagem">{evento?.mensagem ?? "Aguardando..."}</div>
              </div>
              <div className="pipeline-no__status">
                {status === "running" && <span className="spinner" />}
                {status === "success" && <span className="check">✓</span>}
                {status === "error" && <span className="cross">✕</span>}
              </div>
            </div>
            {i < NOS.length - 1 && <div className={`pipeline-conector pipeline-conector--${status === "success" ? "ativo" : "idle"}`} />}
          </div>
        );
      })}
    </div>
  );
}
