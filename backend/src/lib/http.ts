/**
 * As APIs de dados abertos do governo (PNCP, Compras.gov.br) falham de forma
 * intermitente sob uso normal (confirmado durante o desenvolvimento: a mesma
 * chamada falha e, segundos depois, funciona sem nenhuma mudança) — a própria
 * documentação da comunidade recomenda backoff para consumidores. Em vez de
 * propagar esse soluço passageiro como erro pro usuário, tentamos de novo
 * algumas vezes antes de desistir.
 */
const ATRASOS_MS = [500, 1500, 3000];

export async function fetchComRetry(url: string | URL, options?: RequestInit, tentativas = ATRASOS_MS.length + 1): Promise<Response> {
  let ultimoErro: unknown;

  for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
    try {
      const resposta = await fetch(url, options);
      if (resposta.ok || resposta.status < 500) return resposta;
      ultimoErro = new Error(`HTTP ${resposta.status}`);
    } catch (err) {
      ultimoErro = err;
    }

    if (tentativa < tentativas) {
      await new Promise((resolve) => setTimeout(resolve, ATRASOS_MS[tentativa - 1] ?? 3000));
    }
  }

  throw ultimoErro instanceof Error ? ultimoErro : new Error(String(ultimoErro));
}
