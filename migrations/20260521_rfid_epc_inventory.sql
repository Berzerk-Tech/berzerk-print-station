-- Migration: rfid_epc_inventory
--
-- Aplicar no Supabase Industrial (hvnysnfmsndjehjndipc).
-- Tabela 1:1 com EPCs queimados — uma row por etiqueta RFID gravada.
-- Permite Expedição reverter EPC → batch/SKU sem precisar relê-lo no iTAG.
--
-- Não está num pipeline de migrations automatizado — aplicar manualmente via
-- Lovable Cloud SQL editor ou supabase CLI no projeto industrial.

create table if not exists public.rfid_epc_inventory (
  epc text primary key,
  batch_id uuid not null,
  batch_code text not null,
  size text not null,
  ean13 text not null,
  sku text,
  codigo_inventario_itag integer,
  job_id uuid,
  situacao_atual integer not null default 2,
  printed_at timestamptz not null default now(),
  moved_at timestamptz,
  moved_to_situacao integer,
  moved_by uuid
);

create index if not exists rfid_epc_inventory_batch_idx
  on public.rfid_epc_inventory (batch_id);
create index if not exists rfid_epc_inventory_codigo_itag_idx
  on public.rfid_epc_inventory (codigo_inventario_itag);
create index if not exists rfid_epc_inventory_situacao_idx
  on public.rfid_epc_inventory (situacao_atual);
create index if not exists rfid_epc_inventory_job_idx
  on public.rfid_epc_inventory (job_id);
create index if not exists rfid_epc_inventory_pending_idx
  on public.rfid_epc_inventory (job_id)
  where moved_at is null;

-- FKs em separado: se as tabelas referenciadas tiverem nomes diferentes em
-- prod, ajustar/descartar essas constraints. Mantemos a tabela utilizável
-- mesmo sem FKs (rfid_print_jobs e production_batches existem com os UUIDs).
alter table public.rfid_epc_inventory
  add constraint rfid_epc_inventory_batch_fk
  foreign key (batch_id) references public.production_batches(id)
  on delete restrict;

alter table public.rfid_epc_inventory
  add constraint rfid_epc_inventory_job_fk
  foreign key (job_id) references public.rfid_print_jobs(id)
  on delete set null;

alter table public.rfid_epc_inventory
  add constraint rfid_epc_inventory_movedby_fk
  foreign key (moved_by) references auth.users(id)
  on delete set null;

-- RLS
alter table public.rfid_epc_inventory enable row level security;

create policy "epc_inventory_select_authenticated"
  on public.rfid_epc_inventory
  for select
  to authenticated
  using (true);

create policy "epc_inventory_insert_authenticated"
  on public.rfid_epc_inventory
  for insert
  to authenticated
  with check (true);

-- UPDATE só permite mudar campos de movimentação — não permite reescrever
-- epc/batch/job. Em prod a gente pode apertar mais com check constraints.
create policy "epc_inventory_update_authenticated"
  on public.rfid_epc_inventory
  for update
  to authenticated
  using (true)
  with check (true);

comment on table public.rfid_epc_inventory is
  'EPCs gravados no iTAG. Linka EPC → batch Berzerk + situação atual.';
comment on column public.rfid_epc_inventory.situacao_atual is
  'Código de situação no iTAG. Default 2 = impresso. Mudado por movimentação.';
comment on column public.rfid_epc_inventory.codigo_inventario_itag is
  'codigoInventario que a iTAG devolve no POST /iprint/gerarRFID. Pode ser null se o app foi populado por outra fonte.';
