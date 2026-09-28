# Integrações de anúncios e Utmify

Em Admin → Configurações, informe o Pixel ID da Meta, o Google Ads ID (AW-...) e os labels de conversão. Salve as integrações separadamente das demais configurações. A mesma tela continua disponível em Ads & Tracking.

Para Utmify, crie uma credencial em Integrações → Webhooks → Credenciais de API. Cole o token e ative a integração. O token fica em `system_private/marketing_tracking` e não sai pela configuração pública.

Após criar um PIX de depósito comum, o backend envia `waiting_payment` com o ID do pedido, cliente e parâmetros UTM. Após confirmação e crédito pelo provedor, envia `paid` com o mesmo ID. O valor é em centavos, datas em UTC e o método é `pix`. As taxas relacionadas a saques ficam fora desse envio. Erros externos são registrados no log do servidor e não impedem o depósito. O envio é assíncrono e não possui fila durável de reprocessamento; monitore os logs da integração.

O Pixel da Meta e a tag Google disparam no navegador; bloqueadores, consentimento e configuração do domínio podem impedir a medição. O evento de depósito pago é deduplicado na sessão por `requestId`. Os tokens de Conversions API e TikTok Events API não são utilizados por esta versão.

A compilação `npm run build` e a sintaxe do servidor passaram. Um teste real precisa de credenciais suas, ambiente Firebase/PIX configurado e um pagamento de teste validado no painel Utmify.
