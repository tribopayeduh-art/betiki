# Atualização do painel administrativo

- Menu pesquisável por nome e descrição da página; abertura e fechamento por toque, fundo ou tecla Escape.
- Barra de acesso rápido no celular para Visão geral, Jogadores, Financeiro e Configurações.
- Configurações: navegação por seções, atalhos para Pixels/Ads, PIX e Visual, indicador de alterações pendentes, botões Salvar/Descartar e bloqueio de envios duplicados.
- Validação básica dos limites de depósito antes de salvar. O servidor continua responsável pela validação final.
- Visão geral atualiza os blocos de forma independente: falha de uma fonte não apaga os dados das demais; informa hora da última atualização.
- Melhorias de legibilidade, toque, rolagem e layout em telas pequenas, incluindo formulários, métricas, tabelas e gavetas.

Validação: `npm run build` passou. Para testar com dados reais, configure o Firebase e os serviços usados pela plataforma. As regras preexistentes de cobranças relacionadas à liberação de saques não foram expandidas.

## Gerenciar jogadores — pesquisa e exibição

- Busca local enquanto digita por nome, e-mail, UID, ID de conta, CPF e telefone. Para CPF e telefone, aceita números sem pontuação.
- O botão Pesquisar e a tecla Enter consultam o servidor. UID, e-mail, CPF, telefone e ID de conta armazenado podem encontrar registros fora das 2.000 contas carregadas inicialmente. A busca parcial por nomes permanece limitada à janela recente de 2.000.
- Filtros de depósitos totais mínimo/máximo e KYC pendente, além dos filtros anteriores.
- Lista paginada por padrão (25 por página), ordenação existente e preferência de visualização compacta ou confortável salva neste navegador.
- Cartões para celular e tablet, tabela para computador e aviso quando não há resultado.

## Funções adicionais do admin

- Busca global de páginas com Ctrl+K (ou ⌘K), com fechamento por Esc e navegação direta.
- Atalhos na visão geral para Jogadores, Financeiro, PIX, Pixels/Utmify, Relatórios e Configurações.
- Visões salvas de filtros de jogadores: nomeie até oito combinações de filtro, ordenação, faixa de depósitos e tamanho da página. As preferências ficam somente no navegador atual; nomes, CPF e outros dados dos jogadores não são salvos nessas visões.
