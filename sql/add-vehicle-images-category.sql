-- Adiciona a categoria da foto do veículo (externa/interna/placa) para o envio via QR code.
-- Coluna nulável e aditiva (fotos antigas ficam com NULL). O enum é validado na
-- aplicação, não no banco — por isso é apenas um `text`.
--
-- Equivalente ao que o `npm run db:push` (drizzle-kit) geraria. Use este SQL quando
-- o drizzle-kit não estiver disponível (ex.: na VPS, que só tem deps de produção).
--
-- Rodar no SQL Editor do Supabase ou via psql. Idempotente.

ALTER TABLE vehicle_images ADD COLUMN IF NOT EXISTS category text;
