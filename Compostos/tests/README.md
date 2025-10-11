# 🧪 Scripts de Teste - Sistema Compostos

Este diretório contém scripts de teste para validar as funcionalidades do sistema Compostos de marketing multinível.

## 📋 Scripts Disponíveis

### 1. `test_compostos_system.py`
Script de teste completo que valida todas as funcionalidades principais do sistema:
- Autenticação de usuários
- Sistema de robôs investidores
- Transferências de criptomoedas
- Sistema de referrals
- Sistema de ranks e bônus
- Sistema de tarefas e gamificação
- Dashboard administrativo

### 2. `test_crypto_transfers.py`
Script de teste específico para o sistema de transferências de criptomoedas:
- Verificação de transações na blockchain
- Processamento de investimentos
- Cálculo de retornos diários
- Suporte para diferentes tokens

## 🚀 Como Usar

### Pré-requisitos

1. **Python 3.7+**
2. **Dependências Python**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Servidor Backend Rodando**:
   ```bash
   cd backend
   npm run dev
   ```

### Configuração

1. Copie o arquivo de configuração de exemplo:
   ```bash
   cp env.example .env
   ```

2. Edite o arquivo `.env` com suas configurações:
   ```env
   # URL da API (ajuste conforme necessário)
   API_BASE_URL=http://localhost:5000/api
   
   # Configurações de Teste (opcional)
   TEST_USER_EMAIL=test@example.com
   TEST_USER_PASSWORD=Test@123456
   ```

### Executando os Testes

#### Teste Completo do Sistema
```bash
python test_compostos_system.py
```

#### Teste Específico de Transferências de Cripto
```bash
python test_crypto_transfers.py
```

## 📊 Relatórios

Após a execução, os scripts geram relatórios detalhados:

### Relatórios do Teste Completo
- `test_report.json` - Relatório em formato JSON
- `test_report.html` - Relatório visual em HTML
- `test_results.log` - Log detalhado da execução

### Relatórios do Teste de Transferências
- `crypto_transfer_test_report.json` - Relatório em formato JSON
- `crypto_transfer_test_results.log` - Log detalhado da execução

## 📋 Estrutura dos Testes

### Testes de Autenticação
- Registro de novo usuário
- Login de usuário
- Validação de token

### Testes de Robôs
- Obtenção de robôs disponíveis
- Criação de robôs (se permitido)
- Informações detalhadas de robôs

### Testes de Transferências de Cripto
- Obtenção de informações da rede
- Verificação de endereço da empresa
- Lista de tokens suportados
- Verificação de transações
- Criação de investimentos
- Verificação de transferências pendentes
- Cálculo de retornos diários

### Testes de Referrals
- Obtenção de código de referral
- Estatísticas de referrals

### Testes de Ranks
- Lista de ranks disponíveis
- Verificação de qualificação

### Testes de Tarefas
- Lista de tarefas disponíveis
- Conclusão de tarefas

### Testes de Dashboard
- Estatísticas gerais
- Dados do usuário

### Testes Administrativos
- Gestão de usuários
- Funções de admin

## 🔧 Personalização

### Adicionando Novos Testes

1. Crie um novo método na classe de teste:
   ```python
   def test_new_feature(self) -> bool:
       """Testa nova funcionalidade"""
       try:
           response = self.make_request('GET', '/api/new-endpoint', auth_required=True)
           return response.status_code == 200
       except Exception as e:
           logger.error(f"Erro no teste: {str(e)}")
           return False
   ```

2. Adicione o método à lista de testes em `run_all_tests()`:
   ```python
   test_methods = [
       # ... testes existentes ...
       self.test_new_feature,
   ]
   ```

### Configurando Dados de Teste

Modifique o dicionário `test_config` no construtor da classe:
```python
self.test_config = {
    'user': {
        'name': 'Custom Test User',
        'email': 'custom@example.com',
        # ...
    },
    # ...
}
```

## 🐛 Solução de Problemas

### Erro: API não está respondendo
- Verifique se o servidor backend está rodando
- Confirme a URL da API no arquivo `.env`

### Erro: Falha na autenticação
- Verifique se as credenciais de teste estão corretas
- Confirme se o usuário de teste ainda não existe

### Erro: Permissão negada
- Alguns testes requerem privilégios de administrador
- Verifique se o usuário de teste tem as permissões necessárias

### Erro: Conexão com blockchain
- Verifique se as variáveis de ambiente da blockchain estão configuradas
- Confirme se a rede correta está sendo usada (testnet/mainnet)

## 📝 Notas

- Os testes são projetados para serem executados em um ambiente de desenvolvimento/teste
- Alguns testes podem criar dados no banco de dados (usuários, robôs, investimentos)
- Recomenda-se limpar o banco de dados após a execução dos testes
- Os testes de blockchain simulam transações e não enviam fundos reais

## 🤝 Contribuição

Para adicionar novos testes ou melhorar os existentes:

1. Crie uma branch para sua feature
2. Adicione ou modifique os testes necessários
3. Execute todos os testes para garantir que não há regressões
4. Envie um pull request com suas alterações

## 📞 Suporte

Se encontrar problemas ou tiver dúvidas sobre os testes:

1. Verifique os logs de execução
2. Consulte os relatórios gerados
3. Revise a documentação do sistema
4. Entre em contato com a equipe de desenvolvimento

