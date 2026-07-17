-- Senha Intranet Gazin: controle interno do usuário (não é autenticação do painel).
-- Cada usuário edita a própria em Minha Conta; diretores veem/editam de todos em Gerenciamento de Usuários.
ALTER TABLE public.usuarios_custom
ADD COLUMN IF NOT EXISTS senha_intranet_gazin text;
