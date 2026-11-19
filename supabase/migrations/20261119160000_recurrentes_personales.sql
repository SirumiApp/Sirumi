-- B10 también en personal: arriendo, servicios, celular, suscripciones… con recordatorio.
-- Un pago recurrente es del negocio (como antes) o de una persona (con su categoría).

alter table public.recurring_payments
  add column owner_type text not null default 'negocio' check (owner_type in ('negocio', 'personal')),
  add column user_id uuid references auth.users (id) on delete cascade,
  add column category_id uuid references public.categories (id) on delete set null,
  alter column business_id drop not null;
alter table public.recurring_payments add constraint recurring_payments_dueno check (
  (owner_type = 'negocio' and business_id is not null and user_id is null and category_id is null)
  or (owner_type = 'personal' and user_id is not null and business_id is null and account_id is null)
);
create index recurring_payments_usuario_idx on public.recurring_payments (user_id) where user_id is not null;

create policy "Cada quien ve sus pagos recurrentes" on public.recurring_payments for select to authenticated
  using (owner_type = 'personal' and user_id = (select auth.uid()));
create policy "Cada quien crea sus pagos recurrentes" on public.recurring_payments for insert to authenticated
  with check (owner_type = 'personal' and user_id = (select auth.uid())
    and (category_id is null or exists (select 1 from public.categories c where c.id = category_id and c.user_id = (select auth.uid()))));
create policy "Cada quien edita sus pagos recurrentes" on public.recurring_payments for update to authenticated
  using (owner_type = 'personal' and user_id = (select auth.uid()))
  with check (owner_type = 'personal' and user_id = (select auth.uid())
    and (category_id is null or exists (select 1 from public.categories c where c.id = category_id and c.user_id = (select auth.uid()))));
create policy "Cada quien borra sus pagos recurrentes" on public.recurring_payments for delete to authenticated
  using (owner_type = 'personal' and user_id = (select auth.uid()));

-- Un movimiento personal puede venir de un pago recurrente propio (el contacto sigue siendo solo del negocio).
alter table public.movements drop constraint movements_contacto_solo_negocio;
alter table public.movements add constraint movements_contacto_solo_negocio check (owner_type = 'negocio' or contact_id is null);

create or replace function public.recurrente_personal(recurrente uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.recurring_payments where id = recurrente and owner_type = 'personal' and user_id = (select auth.uid()));
$$;
revoke execute on function public.recurrente_personal(uuid) from public, anon;
grant execute on function public.recurrente_personal(uuid) to authenticated;

drop policy "Cada quien registra sus movimientos personales" on public.movements;
drop policy "Cada quien edita sus movimientos personales" on public.movements;
create policy "Cada quien registra sus movimientos personales" on public.movements for insert to authenticated
  with check (
    owner_type = 'personal' and user_id = (select auth.uid())
    and (category_id is null or exists (select 1 from public.categories c where c.id = category_id and c.user_id = (select auth.uid())))
    and (recurring_id is null or public.recurrente_personal(recurring_id))
  );
create policy "Cada quien edita sus movimientos personales" on public.movements for update to authenticated
  using (owner_type = 'personal' and user_id = (select auth.uid()))
  with check (
    owner_type = 'personal' and user_id = (select auth.uid())
    and (category_id is null or exists (select 1 from public.categories c where c.id = category_id and c.user_id = (select auth.uid())))
    and (recurring_id is null or public.recurrente_personal(recurring_id))
  );
