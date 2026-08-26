import { useState, type FormEvent } from "react";
import type { Categoria } from "../lib/types";

const UFS = [
  "",
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
  "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
  "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

interface SearchFormProps {
  categorias: Categoria[];
  categoriaId: string;
  onCategoriaChange: (categoriaId: string) => void;
  carregando: boolean;
  onBuscar: (termo: string, uf: string) => void;
}

export function SearchForm({ categorias, categoriaId, onCategoriaChange, carregando, onBuscar }: SearchFormProps) {
  const [termo, setTermo] = useState("");
  const [uf, setUf] = useState("");

  function aoSubmeter(e: FormEvent) {
    e.preventDefault();
    if (!termo.trim() || !categoriaId) return;
    onBuscar(termo.trim(), uf);
  }

  return (
    <form className="search-form" onSubmit={aoSubmeter}>
      <input
        className="search-form__termo"
        type="text"
        placeholder="O que a sua empresa vende? (ex: notebook, cadeira, veículo...)"
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
      />
      <select value={categoriaId} onChange={(e) => onCategoriaChange(e.target.value)}>
        {categorias.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </select>
      <select value={uf} onChange={(e) => setUf(e.target.value)}>
        <option value="">Todas as UFs</option>
        {UFS.filter(Boolean).map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </select>
      <button type="submit" disabled={carregando || !termo.trim()}>
        {carregando ? "Buscando..." : "Buscar editais"}
      </button>
    </form>
  );
}
