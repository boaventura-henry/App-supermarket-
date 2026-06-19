# Predicao Lista

## Objetivo

A tela `Predicao Lista` estima quando produtos comprados pelo usuario autenticado podem voltar a ser necessarios. O calculo e local, explicavel e nao usa IA externa ou API paga.

## Fontes de dados

- Produtos carregados do Supabase para as listas proprias do usuario.
- Somente produtos marcados como comprados (`purchased/isBought`).
- Listas compartilhadas recebidas de outros usuarios nao entram no calculo.
- O `localStorage` nao e usado como fonte principal de dados de negocio.

## Regra de calculo

1. Normaliza o nome do produto, removendo acentos, diferencas de caixa e espacos duplicados.
2. Agrupa os registros comprados pelo nome normalizado.
3. Consolida a quantidade comprada por mes.
4. Calcula a quantidade media entre os meses com compra.
5. Calcula os intervalos, em meses, entre compras consecutivas.
6. Usa a media dos intervalos para estimar o proximo mes.

Recomendacoes:

- previsao vencida ou no mes atual: `Comprar agora`;
- previsao no mes seguinte: `Provavel no proximo mes`;
- previsao posterior: `Provavel em X meses`;
- apenas um mes com compra: `Sem dados suficientes para previsao confiavel`.

## Confianca

- `baixo`: menos de tres meses com compras;
- `medio`: tres ou mais meses com compras;
- `alto`: quatro ou mais meses e variacao media dos intervalos de ate um mes.

## Filtros

- Produto.
- Supermercado.
- Periodo: 6, 12, 24 meses ou todo o historico disponivel.

## Limitacoes

- O modelo `Product` ainda nao possui `purchased_at`. A previsao usa o timestamp de criacao do produto como referencia mensal para registros marcados como comprados.
- Excluir listas/produtos remove evidencias futuras para a previsao.
- Uma unica ocorrencia nao permite calcular recorrencia.
- A previsao e uma ajuda de planejamento, nao uma garantia de consumo futuro.

## Exemplo

Se arroz aparece como comprado nos meses 1, 3 e 5, os intervalos sao de dois meses. O proximo mes previsto sera o mes 7, com confianca media.

## Testes manuais

1. Criar produtos de mesmo nome em listas proprias diferentes.
2. Marcar os produtos como comprados.
3. Abrir `Predicao Lista` e conferir o agrupamento.
4. Confirmar que listas compartilhadas recebidas nao alteram o resultado.
5. Testar filtros de produto, supermercado e periodo.
6. Conferir empty state quando nao houver itens comprados.
7. Conferir tema claro/escuro em mobile e desktop.
