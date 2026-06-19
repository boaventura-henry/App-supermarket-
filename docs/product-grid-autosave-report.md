# Auto-save da grid de produtos

## Escopo

O auto-save atua somente na linha em edicao e nos campos:

- quantidade;
- valor unitario;
- marca;
- supermercado.

## Funcionamento

- A linha entra em edicao pelo botao de lapis ou pelos valores editaveis.
- Ao mudar para outro campo da mesma linha, o campo alterado e persistido e a edicao permanece aberta.
- Ao perder o foco da linha, clicar fora, selecionar outra linha ou desmontar a tela, a linha alterada tenta salvar automaticamente.
- O botao Salvar continua disponivel como acao explicita.
- O botao Cancelar restaura os valores recebidos do produto e impede o auto-save daquela edicao.
- Apenas uma linha fica em edicao por vez.

## Controle de chamadas

- Antes de salvar, o frontend compara o rascunho com os valores atuais.
- Se nao houver alteracao real, nenhuma chamada ao Supabase e realizada.
- Uma promessa em andamento e reutilizada para impedir gravacoes simultaneas da mesma linha.
- Os inputs ficam temporariamente desabilitados durante a gravacao.

## Estados visuais

- `Salvando...`: requisicao em andamento.
- `Salvo`: gravacao concluida.
- `Erro ao salvar`: falha na gravacao, com mensagem amigavel na linha.

## Erros e validacao

- Quantidade e valor unitario aceitam vazio.
- Valores invalidos mantem a linha em erro e nao chamam o Supabase.
- Falhas do Supabase permanecem visiveis na linha e tambem atualizam o diagnostico existente.
- Nao ha falha silenciosa.

## Historico de preco

O fluxo continua usando `updateProduct` do servico Supabase. Quando um valor unitario valido e maior que zero muda, o servico mantem a geracao existente em `price_history`.

## Permissoes

- Dono da lista: pode editar.
- Compartilhamento `editor`: pode editar.
- Compartilhamento `viewer`: nao ve botao de editar e permanece somente leitura.

## Testes manuais

1. Editar quantidade e clicar fora da linha.
2. Recarregar a pagina e conferir persistencia.
3. Editar preco e conferir novo registro de historico quando aplicavel.
4. Trocar diretamente para outra linha e conferir que a anterior foi salva.
5. Cancelar uma edicao e conferir que nenhuma mudanca foi persistida.
6. Simular falha de rede e conferir mensagem na linha.
7. Validar dono, editor e viewer.
