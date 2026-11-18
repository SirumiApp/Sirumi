-- Pruebas de la plata del negocio. Corre dentro de una transacción que se deshace al final.
-- Ejecútalas en el editor SQL de Supabase: la tabla final debe mostrar ok = true en todas las filas.
begin;
insert into auth.users (id, email, aud, role) values
 ('00000000-0000-0000-0000-00000000000a','a@prueba.co','authenticated','authenticated'),
 ('00000000-0000-0000-0000-00000000000b','b@prueba.co','authenticated','authenticated'),
 ('00000000-0000-0000-0000-00000000000c','c@prueba.co','authenticated','authenticated');
create temp table r(prueba text, ok boolean);
grant all on r to authenticated, anon;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select public.completar_onboarding('{"full_name":"Ana","usage":"negocio","business_name":"Tienda","policy_version":"v1","consents":{"terminos":true,"datos":true}}');
create temp table ctx as select b.id as negocio, (select id from public.accounts where business_id = b.id and kind = 'efectivo') as efectivo from public.businesses b;
grant all on ctx to authenticated, anon;
insert into public.accounts (owner_type, business_id, name, kind, initial_balance) select 'negocio', negocio, 'Davivienda', 'banco', 3000000 from ctx;
insert into public.credit_cards (business_id, name, credit_limit, initial_debt) select negocio, 'Visa', 5000000, 1200000 from ctx;
alter table ctx add column davi uuid, add column visa uuid;
update ctx set davi = (select id from public.accounts where name = 'Davivienda'), visa = (select id from public.credit_cards limit 1);

insert into public.movements (owner_type, business_id, date, kind, amount, account_id) select 'negocio', negocio, '2026-11-10', 'venta', 500000, davi from ctx;
insert into public.movements (owner_type, business_id, date, kind, amount, card_id) select 'negocio', negocio, '2026-11-11', 'variable', 300000, visa from ctx;
insert into public.movements (owner_type, business_id, date, kind, amount, paid) select 'negocio', negocio, '2026-11-12', 'venta', 900000, false from ctx;
insert into public.transfers (business_id, date, from_account, to_card, amount) select negocio, '2026-11-20', davi, visa, 500000 from ctx;
insert into public.transfers (business_id, date, from_account, to_account, amount) select negocio, '2026-11-21', davi, efectivo, 200000 from ctx;
insert into r select 'El dueño registra venta, gasto con tarjeta, venta pendiente y traslados',
  (select count(*) = 3 from public.movements where owner_type = 'negocio') and (select count(*) = 2 from public.transfers);

do $$ begin
  begin
    insert into public.movements (owner_type, business_id, date, kind, amount, card_id) select 'negocio', negocio, '2026-11-12', 'venta', 1000, visa from ctx;
    insert into r values ('Una venta nunca entra a una tarjeta', false);
  exception when check_violation then insert into r values ('Una venta nunca entra a una tarjeta', true); end;
  begin
    insert into public.movements (owner_type, business_id, date, kind, amount, paid) select 'negocio', negocio, '2026-11-12', 'aporte', 1000, false from ctx;
    insert into r values ('Un aporte no puede quedar pendiente', false);
  exception when check_violation then insert into r values ('Un aporte no puede quedar pendiente', true); end;
  begin
    insert into public.movements (owner_type, business_id, date, kind, amount) select 'negocio', negocio, '2026-11-12', 'fijo', 1000 from ctx;
    insert into r values ('Un movimiento pagado necesita cuenta o tarjeta', false);
  exception when check_violation then insert into r values ('Un movimiento pagado necesita cuenta o tarjeta', true); end;
end $$;

delete from public.accounts where kind = 'efectivo';
insert into r select 'Efectivo no se puede borrar', (select count(*) = 1 from public.accounts where kind = 'efectivo' and owner_type = 'negocio');

-- Un vendedor (C) ve el negocio pero no registra plata; un extraño (B) no ve nada.
reset role;
insert into public.business_members (business_id, user_id, role) select negocio, '00000000-0000-0000-0000-00000000000c', 'seller' from ctx;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
insert into r select 'El vendedor ve los movimientos del negocio', (select count(*) = 3 from public.movements);
do $$ begin
  begin
    insert into public.movements (owner_type, business_id, date, kind, amount, account_id) select 'negocio', negocio, '2026-11-12', 'retiro', 1000, davi from ctx;
    insert into r values ('El vendedor no registra movimientos de plata', false);
  exception when insufficient_privilege then insert into r values ('El vendedor no registra movimientos de plata', true); end;
end $$;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
insert into r select 'Un extraño no ve movimientos, tarjetas ni traslados',
  (select count(*) = 0 from public.movements) and (select count(*) = 0 from public.credit_cards) and (select count(*) = 0 from public.transfers);

-- A quita Davivienda: sus movimientos pasan a la principal (Efectivo) y el traslado entre las dos se borra.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
insert into r select 'Quitar una cuenta mueve 1 movimiento a la principal', (select public.quitar_cuenta_negocio(davi) = 1 from ctx);
insert into r select 'La venta quedó en Efectivo y el pago de la tarjeta sale de Efectivo',
  (select count(*) = 1 from public.movements m, ctx where m.account_id = ctx.efectivo and m.kind = 'venta')
  and (select count(*) = 1 from public.transfers t, ctx where t.from_account = ctx.efectivo and t.to_card = ctx.visa)
  and (select count(*) = 1 from public.transfers);
reset role;
select * from r;
rollback;
