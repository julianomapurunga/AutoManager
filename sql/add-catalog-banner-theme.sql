-- Personalização do catálogo público: banner (imagem full-width no topo) e
-- cor de destaque (hex) que tematiza a página da loja.
-- Colunas nuláveis e aditivas. Equivalente ao `npm run db:push` (drizzle-kit).
-- Rodar no SQL Editor do Supabase ou via psql. Idempotente.

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS catalog_banner_path text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS catalog_theme_color text;
