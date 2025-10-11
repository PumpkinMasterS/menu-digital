# Segurança e RGPD

## Princípios
- Minimização de dados: não recolher dados desnecessários do cliente.
- Transparência: política de privacidade e termos acessíveis.
- Segurança por design: validação, encriptação, least privilege.

## Dados Pessoais
- Cliente: apenas telefone para MB Way (quando aplicável) e dados do pedido.
- Staff/Admin: email, nome opcional.
- Retenção: pagamentos e pedidos conforme obrigações legais; anonimização quando possível.

## Medidas Técnicas
- TLS/HTTPS obrigatório; HSTS; headers de segurança (CSP, X-Content-Type-Options, etc.).
- Hash de senhas com `bcrypt`; tokens JWT com expiração curta + refresh.
- Segredos em `Key Vault`/`Secrets Manager`; rotação periódica.
- Logs sem dados sensíveis; mascarar telefones.
- Rate limiting e detecção de abuso; proteção contra CSRF para ações admin.

## Direitos dos Titulares
- Acesso, retificação, apagamento, portabilidade e objeção.
- Ponto de contacto (DPO); tempos de resposta e registo.

## Webhooks e Pagamentos
- Validação de assinatura e idempotência; retries controlados.
- Armazenar apenas o mínimo necessário do PSP.

## Conformidade
- Privacy by design; DPIA se necessário; registo de atividades de tratamento.
- Backups encriptados e testes de restauração; controlo de acesso por função.