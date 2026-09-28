# Painel administrativo — atualização

- Navegação móvel: menu lateral com fundo clicável, áreas de toque maiores, títulos legíveis e layout fluido.
- Configurações: limites de depósito com validação, prévia e estado de salvamento.
- Servidor: valida mínimo e máximo ao salvar e aplica limites da plataforma no pedido de depósito e na criação do PIX, respeitando também os limites do provedor Dotfy. Intervalos incompatíveis recebem erro explícito.

## Antes de usar

Configure também o intervalo na página PIX Dotfy. A faixa aceita em PIX é a interseção entre os limites da plataforma e os do provedor. A compilação local passou com `npm run build`. Fluxos autenticados com Firebase, pagamentos reais e webhooks requerem testes no seu ambiente configurado.

As rotinas preexistentes de cobranças relacionadas à liberação de saques não foram ampliadas nesta atualização.
