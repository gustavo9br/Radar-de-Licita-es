import { useCallback, useRef, useState } from "react";
import { iniciarPipeline, streamUrlPipeline } from "../lib/api";
import type { PipelineEvent, PipelineInput, PipelineNodeId } from "../lib/types";

export type EstadoPipeline = "ocioso" | "executando" | "concluido" | "erro";

export function usePipelineStream(aoConcluir?: () => void) {
  const [nodeStates, setNodeStates] = useState<Partial<Record<PipelineNodeId, PipelineEvent>>>({});
  const [estado, setEstado] = useState<EstadoPipeline>("ocioso");
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const executar = useCallback(
    async (input: PipelineInput) => {
      esRef.current?.close();
      setNodeStates({});
      setErroGeral(null);
      setEstado("executando");

      let runId: string;
      try {
        runId = await iniciarPipeline(input);
      } catch (err) {
        setErroGeral((err as Error).message);
        setEstado("erro");
        return;
      }

      const es = new EventSource(streamUrlPipeline(runId));
      esRef.current = es;

      es.onmessage = (ev) => {
        const evento = JSON.parse(ev.data) as PipelineEvent;
        setNodeStates((prev) => ({ ...prev, [evento.node]: evento }));

        if (evento.status === "error") {
          setErroGeral(evento.mensagem);
          setEstado("erro");
          es.close();
        } else if (evento.node === "atualizar_painel" && evento.status === "success") {
          setEstado("concluido");
          es.close();
          aoConcluir?.();
        }
      };

      es.onerror = () => {
        es.close();
        setEstado((atual) => (atual === "executando" ? "erro" : atual));
      };
    },
    [aoConcluir],
  );

  return { nodeStates, estado, erroGeral, executar };
}
