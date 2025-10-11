# 🚀 Guia de Inicialização - Deliver Eat Now

## 📋 Pré-requisitos

1. **Node.js** (v18 ou superior) instalado
2. **Expo CLI** instalado globalmente: `npm install -g expo-cli`
3. **Android Studio** (para desenvolvimento Android)
4. **Xcode** (para desenvolvimento iOS, apenas macOS)

## 🌐 Serviços do Projeto

O projeto Deliver Eat Now consiste em 3 componentes principais:

1. **Aplicação Web** (React + Vite)
2. **App Cliente Mobile** (React Native - Expo)
3. **App Driver** (React Native - Expo)

## 🔧 Configuração Inicial

### 1. Variáveis de Ambiente

Copie o arquivo `.env.template` para `.env` na raiz do projeto:

```bash
cp env.template .env
```

As variáveis do Supabase já estão configuradas. Se necessário, configure as chaves do Stripe.

### 2. Instalar Dependências

#### Aplicação Web:
```bash
npm install
```

#### App Cliente Mobile:
```bash
cd SaborPortugues
npm install
cd ..
```

#### App Driver:
```bash
cd SaborPortugues-Driver-Fresh
npm install
cd ..
```

## 🚀 Inicialização dos Servidores

### Opção 1: Iniciar Tudo (Recomendado)

Abra 3 terminais separados e execute os seguintes comandos:

#### Terminal 1 - Aplicação Web:
```bash
npm run dev
```

#### Terminal 2 - App Cliente Mobile:
```bash
cd SaborPortugues
npm start
```

#### Terminal 3 - App Driver:
```bash
cd SaborPortugues-Driver-Fresh
npm start
```

### Opção 2: Iniciar Individualmente

#### Aplicação Web:
```bash
npm run dev
```
A aplicação estará disponível em: http://localhost:8081

#### App Cliente Mobile:
```bash
cd SaborPortugues
npm start
```
- Escaneie o QR code com o app Expo Go no seu dispositivo
- Ou pressione `a` para abrir no emulador Android
- Ou pressione `i` para abrir no emulador iOS (macOS apenas)

#### App Driver:
```bash
cd SaborPortugues-Driver-Fresh
npm start
```
- Escaneie o QR code com o app Expo Go no seu dispositivo
- Ou pressione `a` para abrir no emulador Android
- Ou pressione `i` para abrir no emulador iOS (macOS apenas)

## 📱 Acesso às Aplicações

### 1. Aplicação Web
- **URL**: http://localhost:8081
- **Funcionalidades**: 
  - Interface para clientes
  - Dashboard de administração
  - Dashboard de restaurantes
  - Dashboard de cozinha

### 2. App Cliente Mobile
- **Acesso**: Via Expo Go ou emulador
- **Funcionalidades**:
  - Navegação por restaurantes
  - Realização de pedidos
  - Histórico de pedidos
  - Perfil do cliente

### 3. App Driver
- **Acesso**: Via Expo Go ou emulador
- **Funcionalidades**:
  - Visualização de entregas disponíveis
  - Aceitação de entregas
  - Atualização de status
  - Histórico de entregas

## 🔐 Credenciais de Teste

Após a inicialização, você pode criar usuários de teste através do dashboard de administração:

1. Acesse http://localhost:8081
2. Crie uma conta de administrador
3. Acesse o dashboard de administração
4. Crie usuários com diferentes roles:
   - `platform_owner`
   - `super_admin`
   - `restaurant_admin`
   - `kitchen`
   - `driver`
   - `customer`

## 🛠️ Comandos Úteis

### Aplicação Web:
```bash
npm run dev          # Iniciar servidor de desenvolvimento
npm run build        # Build para produção
npm run preview      # Visualizar build de produção
npm run lint         # Verificar linting
npm run type-check   # Verificar tipos TypeScript
```

### Apps Mobile:
```bash
npm start            # Iniciar servidor Expo
npm run android      # Executar no Android
npm run ios          # Executar no iOS (macOS apenas)
npm run web          # Executar versão web
```

## 📊 Estrutura do Projeto

```
deliver-eat-now/
├── src/                    # Aplicação Web
├── SaborPortugues/         # App Cliente Mobile
├── SaborPortugues-Driver-Fresh/  # App Driver
├── supabase/               # Backend e Edge Functions
├── public/                 # Arquivos estáticos
└── docs/                   # Documentação
```

## 🐛 Solução de Problemas

### Problemas Comuns:

1. **Porta já em uso**: 
   - Altere a porta no vite.config.ts
   - Ou encerre o processo que está usando a porta

2. **Dependências não instaladas**:
   - Execute `npm install` em cada projeto
   - Limpe o cache: `npm cache clean --force`

3. **Problemas com Expo**:
   - Atualize o Expo CLI: `npm install -g expo-cli@latest`
   - Limpe o cache do Expo: `expo r -c`

4. **Problemas de build no Android**:
   - Verifique se o Android Studio está instalado
   - Crie um emulador AVD
   - Execute `npx expo run:android`

5. **Problemas de build no iOS**:
   - Verifique se o Xcode está instalado
   - Execute `npx expo run:ios`

## 📞 Suporte

Para mais informações:
- Consulte a documentação em `docs/`
- Verifique o arquivo `LIMPEZA_PROJETO.md` para detalhes da estrutura
- Acesse o centro de ajuda em http://localhost:8081/help-center

---

**Nota**: Este guia assume que você está executando o projeto em ambiente de desenvolvimento. Para deploy em produção, consulte a documentação específica.


