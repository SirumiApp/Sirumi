-- Fase 2 · Paso 6 (parte 2): topes (presupuestos) por categoría (docs/specs/02-personal.md, regla A3).
-- La alerta (activa y umbral) vive en profiles.preferences.topes = { "alerta": true, "umbral": 80 }.

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  monthly_limit bigint not null check (monthly_limit > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category_id)
);

create trigger budgets_updated_at
  before update on public.budgets
  for each row execute function public.tocar_updated_at();

alter table public.budgets enable row level security;

create policy "Cada quien ve sus topes" on public.budgets for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Cada quien crea topes en sus categorías" on public.budgets for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.categories c where c.id = category_id and c.user_id = (select auth.uid()))
  );
create policy "Cada quien edita sus topes" on public.budgets for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.categories c where c.id = category_id and c.user_id = (select auth.uid()))
  );
create policy "Cada quien borra sus topes" on public.budgets for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.budgets from anon;
