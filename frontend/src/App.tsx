import { useCallback, useEffect, useState } from "react";
import { SearchForm } from "./components/SearchForm";
import { LicitacaoResults } from "./components/LicitacaoResults";
import { ItemPicker } from "./components/ItemPicker";
import { PipelineCanvas } from "./components/PipelineCanvas";
import { ResultsTable } from "./components/ResultsTable";
import { usePipelineStream } from "./hooks/usePipelineStream";
import { buscarEditais, buscarItensEdital, excluirRegistro, listarCategorias, listarRegistros } from "./lib/api";
import type { Categoria, Edital, ItemEdital, RegistroAnalise } from "./lib/types";

export default function App() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaId, setCategoriaId] = useState<string>("");

  const [editais, setEditais] = useState<Edital[]>([]);
  const [buscandoEditais, setBuscandoEditais] = useState(false);
  const [erroBusca, setErroBusca] = useState<string | null>(null);

  const [editalSelecionado, setEditalSelecionado] = useState<Edital | null>(null);
  const [itens, setItens] = useState<ItemEdital[]>([]);
  const [carregandoItens, setCarregandoItens] = useState(false);

  const [registros, setRegistros] = useState<RegistroAnalise[]>([]);
  const [apenasAlerta, setApenasAlerta] = useState(false);
  const [carregandoRegistros, setCarregandoRegistros] = useState(false);

  const carregarRegistros = useCallback(async (filtro: boolean) => {
    setCarregandoRegistros(true);
    try {
      setRegistros(await listarRegistros(filtro));
    } catch {
      // painel de resultados é best-effort; a mensagem de erro do pipeline já cobre o essencial
    } finally {
      setCarregandoRegistros(false);
    }
  }, []);

  const { nodeStates, estado: estadoPipeline, erroGeral, executar } = usePipelineStream(() => carregarRegistros(apenasAlerta));

  useEffect(() => {
    listarCategorias().then((cs) => {
      setCategorias(cs);
      setCategoriaId(cs[0]?.id ?? "");
    });
    carregarRegistros(false);
  }, [carregarRegistros]);

  async function aoBuscar(termo: string, uf: string) {
    setBuscandoEditais(true);
    setErroBusca(null);
    setEditalSelecionado(null);
    setItens([]);
    try {
      setEditais(await buscarEditais(termo, uf || undefined));
    } catch (err) {
      setErroBusca((err as Error).message);
    } finally {
      setBuscandoEditais(false);
    }
  }

  async function aoSelecionarEdital(edital: Edital) {
    setEditalSelecionado(edital);
    setItens([]);
    setCarregandoItens(true);
    try {
      setItens(await buscarItensEdital(edital));
    } finally {
      setCarregandoItens(false);
    }
  }

  function aoAnalisar(item: ItemEdital) {
    if (!editalSelecionado || !categoriaId) return;
    executar({ categoriaId, edital: editalSelecionado, item });
  }

  async function aoExcluir(id: string) {
    await excluirRegistro(id);
    carregarRegistros(apenasAlerta);
  }

  function aoAlternarFiltro(valor: boolean) {
    setApenasAlerta(valor);
    carregarRegistros(valor);
  }

  return (
    <div className="app">
      <header className="app__header">
        <h1>Radar de Licitações</h1>
        <p>Compara o valor estimado de itens de editais do PNCP com o preço médio pago pela administração pública federal.</p>
      </header>

      <SearchForm
        categorias={categorias}
        categoriaId={categoriaId}
        onCategoriaChange={setCategoriaId}
        carregando={buscandoEditais}
        onBuscar={aoBuscar}
      />
      {erroBusca && <p className="mensagem-erro">{erroBusca}</p>}

      {editais.length > 0 && (
        <section className="secao">
          <h2>Editais encontrados</h2>
          <LicitacaoResults editais={editais} editalSelecionadoId={editalSelecionado?.id ?? null} onSelecionar={aoSelecionarEdital} />
        </section>
      )}

      {editalSelecionado && (
        <section className="secao">
          <h2>Itens de "{editalSelecionado.titulo}"</h2>
          <ItemPicker itens={itens} carregando={carregandoItens} desabilitado={estadoPipeline === "executando"} onAnalisar={aoAnalisar} />
        </section>
      )}

      {estadoPipeline !== "ocioso" && (
        <section className="secao">
          <h2>Pipeline de análise</h2>
          <PipelineCanvas estado={estadoPipeline} nodeStates={nodeStates} />
          {erroGeral && <p className="mensagem-erro">{erroGeral}</p>}
        </section>
      )}

      <ResultsTable
        registros={registros}
        apenasAlerta={apenasAlerta}
        carregando={carregandoRegistros}
        onAlternarFiltro={aoAlternarFiltro}
        onExcluir={aoExcluir}
      />
    </div>
  );
}
