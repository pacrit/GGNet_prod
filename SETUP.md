# 🚀 Setup do GGNetworking

## Pré-requisitos
- Node.js 18+ instalado
- Git instalado
- Conta no Neon (para PostgreSQL)

## 📋 Passo a passo

### 1. Clone e instale dependências
\`\`\`bash
git clone <seu-repo>
cd ggnetworking
npm install
\`\`\`

### 2. Configure as variáveis de ambiente
\`\`\`bash
# Copie o arquivo de exemplo
cp .env.example .env.local

# Edite o arquivo .env.local com seus dados
\`\`\`

### 3. Configure o banco de dados (Neon)

#### 3.1. Crie uma conta no Neon
- Acesse: https://neon.tech
- Crie uma conta gratuita
- Crie um novo projeto

#### 3.2. Obtenha a URL de conexão
- No dashboard do Neon, copie a `DATABASE_URL`
- Cole no arquivo `.env.local`

#### 3.3. Execute os scripts SQL
\`\`\`sql
-- Execute no console SQL do Neon ou use um cliente PostgreSQL

-- 1. Criar tabelas
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chats (
    id SERIAL PRIMARY KEY,
    participant_1_id INTEGER REFERENCES users(id),
    participant_2_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    chat_id INTEGER REFERENCES chats(id),
    sender_id INTEGER REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Inserir usuários demo (opcional)
INSERT INTO users (email, password_hash, display_name) VALUES
('demo1@ggnetworking.com', 'demo_password', 'Demo User 1'),
('demo2@ggnetworking.com', 'demo_password', 'Demo User 2'),
('admin@ggnetworking.com', 'demo_password', 'Admin User');
\`\`\`

### 4. Execute o projeto
\`\`\`bash
# Modo desenvolvimento
npm run dev

# Ou modo produção
npm run build
npm start
\`\`\`

### 5. Acesse o projeto
- Abra: http://localhost:3000
- Teste o cadastro/login
- Verifique os logs no console

## 🔧 Comandos úteis

\`\`\`bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Build para produção
npm run build

# Rodar produção
npm start

# Lint do código
npm run lint
\`\`\`

## 🐛 Troubleshooting

### Erro de conexão com banco
- Verifique se a `DATABASE_URL` está correta
- Confirme se o banco Neon está ativo
- Teste a conexão diretamente

### Erro de JWT
- Verifique se `JWT_SECRET` está definido
- Use uma string longa e aleatória

### Erro de dependências
\`\`\`bash
# Limpar cache e reinstalar
rm -rf node_modules package-lock.json
npm install
\`\`\`

## 📁 Estrutura do projeto

\`\`\`
ggnetworking/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts
│   │   │   └── register/route.ts
│   │   ├── users/route.ts
│   │   └── messages/route.ts
│   ├── components/
│   │   ├── Auth/
│   │   ├── Dashboard/
│   │   └── Chat/
│   ├── contexts/
│   │   └── AuthContext.tsx
│   ├── lib/
│   │   ├── db.ts
│   │   └── auth.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/ui/ (shadcn/ui)
├── .env.local
├── package.json
└── README.md
