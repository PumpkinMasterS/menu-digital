# Como Encontrar o Guild ID do Servidor Discord

## Método 1: Através das Configurações do Servidor

1. **Ativar o Modo Desenvolvedor no Discord:**
   - Abra o Discord
   - Vá para Configurações do Usuário (ícone de engrenagem)
   - Vá para "Avançado" na barra lateral
   - Ative "Modo do Desenvolvedor"

2. **Obter o Guild ID:**
   - Clique com o botão direito no nome do servidor na lista de servidores
   - Selecione "Copiar ID do Servidor"
   - Este é o Guild ID que você precisa inserir

## Método 2: Através da URL do Discord

1. Abra o servidor no Discord Web ou Desktop
2. Observe a URL: `https://discord.com/channels/GUILD_ID/CHANNEL_ID`
3. O primeiro número longo após `/channels/` é o Guild ID

## Formato Correto

- ✅ **Correto:** `123456789012345678` (17-19 dígitos)
- ❌ **Incorreto:** `https://discord.com/oauth2/authorize?client_id=...` (URL de autorização)
- ❌ **Incorreto:** `@everyone` (menção)
- ❌ **Incorreto:** `Meu Servidor` (nome do servidor)

## Exemplo

Se a URL do seu servidor for:
`https://discord.com/channels/987654321098765432/123456789012345678`

O Guild ID é: `987654321098765432`

## Notas Importantes

- O Guild ID é sempre um número de 17-19 dígitos
- Não confunda com o Channel ID (segundo número na URL)
- Não use URLs de convite ou autorização
- Certifique-se de que o bot foi adicionado ao servidor antes de mapear