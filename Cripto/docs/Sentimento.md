# Sentimento – Coleta, Classificação e Agregação

Fontes:
- Reddit (subreddits de cripto)
- Twitter/X (hashtags/símbolos)
- Notícias (RSS/APIs financeiras)

Pipeline:
1) Coleta (APIs oficiais/streams) com filtros por símbolo (ex.: BTC, Bitcoin).
2) Limpeza (remover spam, normalizar texto, idioma, deduplicar).
3) Classificação:
   - Modelos: scikit-learn (baseline), transformers (FinBERT/finance-bert) para maior precisão.
   - Saída: score contínuo → normalizado para intervalo [-1, +1].
4) Agregação temporal:
   - Janelas (ex.: 10m, 1h) com média ponderada e/ou mediana.
   - Pesos por fonte (ex.: notícias > Twitter).
5) Persistência em MongoDB (coleção sentiment) com ts, símbolo, fonte, score.

Controlo de qualidade:
- Indicadores de qualidade (nº de mensagens, cobertura de fontes).
- Tratamento de sarcasmo/ironia é limitado; combine várias fontes para robustez.

Uso nos sinais:
- Condição: Sentimento ≥ 0 para BUY; valores negativos penalizam sinais.
- Pode usar limiar dinâmico baseado em volatilidade ou volume de menções.