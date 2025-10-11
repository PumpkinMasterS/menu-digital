# Deploy, Observabilidade e Custos

## Ambientes
- Dev: branches com preview; base de dados dev no Atlas (free/tier baixo).
- Staging: testes end-to-end e webhooks em sandbox do PSP.
- Prod: domínio `menu.digital`, TLS e escalonamento automático.

## Pipeline CI/CD
- Lint/test/build em cada PR; scan de dependências.
- Deploy automatizado após aprovação para staging e prod.

## Observabilidade
- Logs estruturados (JSON) com correlação; retention ~14–30 dias.
- Métricas: tráfego, latência, erros, throughput de webhooks, fila de pagamentos.
- Alertas: taxa de erro > X%, latência p95, falhas de webhook/retries.
- Monitorização de uptime (HTTP ping) e verificação do fluxo MB Way.

## Backups & DR
- Backups automáticos no Atlas; testes de restore trimestrais.
- RPO/RTO definidos conforme critério do negócio.

## Custos (estimativa inicial)
- MongoDB Atlas: tier M0/M10 (10–50€/m conforme uso).
- Hosting API: 10–50€/m (consumo e autoscaling).
- CDN/Storage: 5–20€/m; tráfego variável.
- Domínio/SSL: ~10–20€/ano (se não incluído).
- PSP/MB Way: taxas por transação (consultar fornecedor), margem 1–2%.

## Segurança Operacional
- Gestão de segredos via serviço dedicado; rotação e acesso por função.
- Revisões periódicas, pentests e dependabot/snyk ativados.