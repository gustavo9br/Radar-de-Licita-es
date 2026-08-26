import type { AmostraPreco, EstatisticaPreco } from "../types.js";

const LIMITE_ALERTA = 0.15; // 15% acima da média = alerta de sobrepreço
const LIMITE_ABAIXO = 0.15; // 15% abaixo da média

export function calcularEstatisticas(amostras: AmostraPreco[], valorEdital: number): EstatisticaPreco {
  if (amostras.length === 0) {
    return {
      media: null,
      minimo: null,
      maximo: null,
      quantidadeAmostras: 0,
      percentualDiferenca: null,
      status: "SEM_DADOS",
    };
  }

  const precos = amostras.map((a) => a.precoUnitario);
  const media = precos.reduce((soma, p) => soma + p, 0) / precos.length;
  const minimo = Math.min(...precos);
  const maximo = Math.max(...precos);
  const percentualDiferenca = ((valorEdital - media) / media) * 100;

  let status: EstatisticaPreco["status"];
  if (percentualDiferenca > LIMITE_ALERTA * 100) {
    status = "ALERTA_SOBREPRECO";
  } else if (percentualDiferenca < -LIMITE_ABAIXO * 100) {
    status = "ABAIXO_DA_MEDIA";
  } else {
    status = "DENTRO_DA_MEDIA";
  }

  return {
    media,
    minimo,
    maximo,
    quantidadeAmostras: amostras.length,
    percentualDiferenca,
    status,
  };
}
