# Roteiro do Vídeo Pitch (até 4 minutos)

Estrutura pensada pra caber nos ~4 minutos, com tempo maior pra demonstração (é a parte que mais convence). Ajuste o texto pro seu jeito de falar — isso aqui é um guia, não um script pra decorar.

## 0:00 – 0:30 — O problema

> "Todo mês o governo brasileiro publica dezenas de milhares de editais de licitação no PNCP. Cada edital estima um preço pra cada item que quer comprar — mas esse valor é definido isoladamente, sem visibilidade automática sobre o que a própria administração pública já paga por itens parecidos em outros lugares do país. Pra saber se um edital está com sobrepreço, hoje isso teria que ser cruzado manualmente, item por item, entre sistemas diferentes."

## 0:30 – 1:00 — A solução, em uma frase

> "Eu construí o Radar de Licitações: um app que busca editais no PNCP e cruza automaticamente com o histórico de preços que o governo já pagou por aquele mesmo item, sinalizando quando o valor do edital foge da média. E em vez de esconder isso numa chamada de API só, eu decidi mostrar o processo acontecendo na tela, como um fluxo de automação — tipo n8n — pra deixar visível cada etapa da integração."

*(Mostrar a tela inicial da aplicação.)*

## 1:00 – 1:30 — Arquitetura e APIs

> "A arquitetura é simples: um frontend em React que fala só com o meu backend em Node, e o backend é quem integra duas APIs públicas do governo — a API de consulta do PNCP, pra buscar os editais e os itens, e a API de dados abertos do Compras.gov.br, pra puxar o catálogo de materiais e o histórico de preços praticados. O resultado de cada análise fica salvo no Airtable, que funciona como banco de dados no-code."

*(Mostrar rapidamente o diagrama do fluxo de integração, do README ou da parte teórica.)*

## 1:30 – 2:45 — Demonstração ao vivo

> "Deixa eu mostrar funcionando. Vou buscar 'notebook'..."

- Digitar um termo de busca (ex: "notebook"), escolher categoria "Informática", clicar em buscar.
- Mostrar a lista de editais reais retornados do PNCP.
- Escolher um edital, mostrar os itens com a descrição e o valor estimado.
- Clicar em "Analisar preço" num item.
- **Deixar a câmera nos nós do pipeline acendendo em sequência** — esse é o momento mais importante do vídeo: mostrar o "Buscando no catálogo CATMAT", "Consultando preços praticados", "Calculando estatísticas", "Salvando no Airtable" acontecendo ao vivo.
- Mostrar o resultado: preço médio calculado, percentual de diferença, status (alerta / dentro da média).
- Mostrar a tabela de análises salvas embaixo, com o filtro "só alertas de sobrepreço".
- (Opcional) Abrir o Airtable numa aba e mostrar o registro que acabou de ser salvo, pra reforçar que é uma integração de verdade, não uma simulação.

## 2:45 – 3:15 — Principais desafios

> "O maior desafio técnico não foi conectar as APIs — foi fazer o casamento entre a descrição livre do item do edital e o catálogo oficial do governo. A busca por texto da API de preços simplesmente não funciona direito. Resolvi isso com uma cascata em duas etapas: primeiro acho o produto genérico — tipo 'notebook' — dentro de um catálogo bem menor, e só depois busco o item específico com os atributos técnicos dentro desse grupo. Isso evitou ter que varrer catálogos de mais de 15 mil itens a cada busca, e deixou o resultado muito mais preciso."

## 3:15 – 3:45 — Benefícios pro negócio

> "Pra quem fiscaliza compra pública — controladorias, órgãos de controle, jornalismo de dados — isso transforma um trabalho manual de cruzar planilhas num clique. Pra fornecedores, dá uma noção rápida se vale a pena participar de um edital. E o mais importante: os dois lados da comparação são 100% dados públicos oficiais, então qualquer resultado pode ser conferido na fonte — o app sempre guarda o link direto pro edital original."

## 3:45 – 4:00 — Fechamento

> "Esse foi o Radar de Licitações — integração real de duas APIs públicas do governo, automação de ponta a ponta e persistência no-code, tudo visível em tempo real na tela. Obrigado!"

---

**Checklist antes de gravar:**
- [ ] Backend e frontend rodando localmente (ou acessando o link publicado)
- [ ] Airtable configurado e com pelo menos 1 registro de exemplo já salvo (evita mostrar tabela vazia)
- [ ] Testar o termo de busca que vai usar no vídeo ANTES de gravar, pra garantir que o edital escolhido tem itens com correspondência boa no catálogo
- [ ] Vídeo publicado no YouTube (público ou não listado), Loom ou Google Drive, com o link testado antes de enviar
