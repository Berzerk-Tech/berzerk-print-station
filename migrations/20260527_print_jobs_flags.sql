-- Migration: flags de impressão (teste / manual) + contagem real impressa
--
-- Aplicar no Supabase Industrial (hvnysnfmsndjehjndipc), manualmente via
-- Lovable Cloud SQL editor ou supabase CLI. Não há pipeline automatizado.
--
-- Suporta:
--   • Modo manual no modal de impressão  → rfid_print_jobs.is_manual
--   • "Descartar teste" (limpa só EPCs de teste, mantém o lote)
--        → rfid_print_jobs.is_test  (printJobs.ts → discardTestForBatch)
--   • Progresso fiel (impresso REAL vs solicitado)
--        → rfid_print_jobs.printed_count (markDone grava os EPCs queimados)
--
-- O DELETE em rfid_epc_inventory que o "Descartar teste" usa já foi liberado
-- na migration 20260527_descartar_lote.sql (policy epc_inventory_delete_*).

alter table public.rfid_print_jobs
  add column if not exists is_test boolean not null default false,
  add column if not exists is_manual boolean not null default false,
  add column if not exists printed_count integer;

comment on column public.rfid_print_jobs.is_test is
  'Impressão de teste (Modo teste). Só EPCs de jobs is_test são removidos pelo "Descartar teste".';
comment on column public.rfid_print_jobs.is_manual is
  'Operador escolheu tamanhos/quantidades à mão no modal de impressão.';
comment on column public.rfid_print_jobs.printed_count is
  'Etiquetas REALMENTE queimadas (EPCs retornados pela iTAG). NULL até concluir; pode ser < total_etiquetas (parcial).';
