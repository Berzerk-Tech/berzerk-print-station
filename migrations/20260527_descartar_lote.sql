-- Migration: descartar lote (limpeza de lotes de teste / que já passaram)
--
-- Aplicar no Supabase Industrial (hvnysnfmsndjehjndipc).
-- Não está num pipeline automatizado — aplicar manualmente via Lovable Cloud
-- SQL editor ou supabase CLI no projeto industrial.
--
-- Suporta a ação "Descartar" da tela de Produção do Berzerk RFID
-- (src/services/batches.ts → discardBatch):
--   1. DELETE dos EPCs do lote em rfid_epc_inventory;
--   2. UPDATE production_batches.deleted_at (soft-delete).
--
-- A migration 20260521 criou rfid_epc_inventory SEM policy de DELETE — com RLS
-- ligado, qualquer DELETE do client é negado por padrão. Esta policy libera.

-- (1) DELETE em rfid_epc_inventory — necessário pra apagar os EPCs do lote
-- descartado. Etiqueta descartada não deve deixar EPC órfão no inventário.
create policy "epc_inventory_delete_authenticated"
  on public.rfid_epc_inventory
  for delete
  to authenticated
  using (true);

-- (2) Soft-delete de production_batches (UPDATE de deleted_at).
--
-- O app industrial (web) já soft-deleta lotes, então MUITO PROVAVELMENTE já
-- existe uma policy de UPDATE pra `authenticated` em production_batches e o
-- passo (2) do discardBatch já funciona sem nada aqui. APLIQUE o bloco abaixo
-- SÓ se o "Descartar" falhar no UPDATE (erro de RLS / "new row violates
-- row-level security"). Descomente e rode:
--
-- create policy "production_batches_soft_delete_rfid"
--   on public.production_batches
--   for update
--   to authenticated
--   using (true)
--   with check (true);
