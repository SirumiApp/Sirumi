-- Pruebas de pagos recurrentes personales (B10). Corre en una transacción que se deshace al final.
begin;
insert into auth.users (id, email, aud, role) values
 ('00000000-0000-0000-0000-00000000000a','a@prueba.co','authenticated','authenticated'),
 ('00000000-0000-0000-0000-00000000000b','b@prueba.co','authenticated','authenticated');
create temp table r(prueba text, ok boolean);
grant all on r to authenticated, anon;
create temp table ctx(rec uuid, cat uuid, negocio uuid);
grant all on ctx to authenticated, anon;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select public.crear_categorias_iniciales();
insert into ctx (cat) select id from public.categories where key = 'transporte';
insert into public.recurring_payments (owner_type, user_id, name, amount, day_of_month, category_id)
  select 'personal', '00000000-0000-0000-0000-00000000000a', 'Arriendo', 1500000, 5, cat from ctx;
update ctx set rec = (select id from public.recurring_payments where name = 'Arriendo');
insert into public.movements (owner_type, user_id, date, kind, amount, recurring_id) select 'personal', '00000000-0000-0000-0000-00000000000a', '2026-11-05', 'gasto', 1500000, rec from ctx;
insert into r select 'A crea su pago recurrente y lo registra como pagado', (select count(*) = 1 from public.movements m, ctx where m.recurring_id = ctx.rec);
select public.completar_onboarding('{"full_name":"Ana","usage":"ambos","business_name":"Tienda","policy_version":"v1","consents":{"terminos":true,"datos":true}}');
update ctx set negocio = (select id from public.businesses);
insert into public.recurring_payments (business_id, name, amount, day_of_month) select negocio, 'Arriendo local', 2000000, 1 from ctx;
insert into r select 'Los del negocio siguen funcionando', (select count(*) = 2 from public.recurring_payments);

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
insert into r select 'B no ve los pagos de A', (select count(*) = 0 from public.recurring_payments);
do $$ begin
  begin
    insert into public.movements (owner_type, user_id, date, kind, amount, recurring_id) select 'personal', '00000000-0000-0000-0000-00000000000b', '2026-11-05', 'gasto', 1, rec from ctx;
    insert into r values ('B no amarra su movimiento a un pago de A', false);
  exception when insufficient_privilege then insert into r values ('B no amarra su movimiento a un pago de A', true); end;
  begin
    insert into public.recurring_payments (owner_type, user_id, name, amount, day_of_month) values ('personal', '00000000-0000-0000-0000-00000000000a', 'X', 1, 1);
    insert into r values ('B no crea pagos a nombre de A', false);
  exception when insufficient_privilege then insert into r values ('B no crea pagos a nombre de A', true); end;
  begin
    insert into public.recurring_payments (owner_type, user_id, name, amount, day_of_month, category_id) select 'personal', '00000000-0000-0000-0000-00000000000b', 'X', 1, 1, cat from ctx;
    insert into r values ('B no usa una categoría de A', false);
  exception when insufficient_privilege then insert into r values ('B no usa una categoría de A', true); end;
end $$;
update public.recurring_payments set amount = 1;
reset role;
insert into r select 'B no cambia los pagos de A', (select amount = 1500000 from public.recurring_payments where name = 'Arriendo');
select * from r;
rollback;
