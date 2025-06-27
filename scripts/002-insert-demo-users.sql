-- Inserir usuários de demonstração
-- Senha para todos: 123456 (usando hash simples para demo)
INSERT INTO users (email, password_hash, display_name) VALUES
('joao@demo.com', 'demo_password', 'João Silva'),
('maria@demo.com', 'demo_password', 'Maria Santos'),
('pedro@demo.com', 'demo_password', 'Pedro Costa'),
('ana@demo.com', 'demo_password', 'Ana Oliveira'),
('carlos@demo.com', 'demo_password', 'Carlos Ferreira')
ON CONFLICT (email) DO NOTHING;
