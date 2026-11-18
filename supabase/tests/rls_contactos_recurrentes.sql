-- Pruebas de clientes y proveedores (B11) y pagos recurrentes (B10). Corre en una transacción que se deshace al final.
-- La tabla final debe mostrar ok = true en todas las filas.
begin;
insert into auth.users (id, email, aud, role) values
 ('00000000-0000-0000-0000-00000000000a','a@prueba.co','authenticated','authenticated'),
 ('00000000-0000-0000-0000-00000000000b','b@prueba.co','authenticated','authenticated'),
 ('00000000-0000-0000-0000-00000000000c','c@prueba.co','authenticated','authenticated');
create temp table r(prueba text, ok boolean);
grant all on r to authenticated, anon;
create temp table ctx(negocio_a uuid, efectivo_a uuid, negocio_b uuid, contacto_b uuid, recurrente_b uuid);
grant all on ctx to authenticated, anon;

set local role authenticated;
-- B arma su negocio con un contacto y un recurrente.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select public.completar_onboarding('{"full_name":"Beto","usage":"negocio","business_name":"Ferretería","policy_version":"v1","consents":{"terminos":true,"datos":true}}');
insert into ctx (negocio_b) select id from public.businesses;
insert into public.contacts (business_id, kind, name, data_consent) select negocio_b, 'cliente', 'Cliente de B', true from ctx;
insert into public.recurring_payments (business_id, name, amount, day_of_month) select negocio_b, 'Arriendo B', 1000, 5 from ctx;
update ctx set contacto_b = (select id from public.contacts), recurrente_b = (select id from public.recurring_payments);

-- A arma el suyo.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select public.completar_onboarding('{"full_name":"Ana","usage":"negocio","business_name":"Tienda","policy_version":"v1","consents":{"terminos":true,"datos":true}}');
update ctx set negocio_a = (select id from public.businesses), efectivo_a = (select id from public.accounts where owner_type = 'negocio' and kind = 'efectivo');
insert into public.contacts (business_id, kind, name, phone, doc_type, doc_number, data_consent) select negocio_a, 'cliente', 'Tienda Aurora', '3001234567', 'nit', '900123456', true from ctx;
insert into public.recurring_payments (business_id, name, kind, amount, day_of_month, account_id) select negocio_a, 'Arriendo', 'fijo', 1300000, 5, efectivo_a from ctx;
insert into public.movements (owner_type, business_id, date, kind, amount, account_id, contact_id, recurring_id)
  select 'negocio', negocio_a, '2026-11-05', 'fijo', 1300000, efectivo_a, null, (select id from public.recurring_payments) from ctx;
insert into public.movements (owner_type, business_id, date, kind, amount, paid, contact_id)
  select 'negocio', negocio_a, '2026-11-06', 'venta', 300000, false, (select id from public.contacts) from ctx;
insert into r select 'El dueño guarda contactos, recurrentes y movimientos enlazados',
  (select count(*) = 1 from public.contacts) and (select count(*) = 1 from public.recurring_payments)
  and (select count(*) = 2 from public.movements where contact_id is not null or recurring_id is not null);
insert into r select 'A no ve el contacto ni el recurrente de B', (select count(*) = 0 from public.contacts c, ctx where c.id = ctx.contacto_b)
  and (select count(*) = 0 from public.recurring_payments p, ctx where p.id = ctx.recurrente_b);

do $$ begin
  begin
    insert into public.contacts (business_id, kind, name, data_consent) select negocio_a, 'cliente', 'Sin permiso', false from ctx;
    insert into r values ('Sin autorización (Ley 1581) no se guarda el contacto', false);
  exception when check_violation then insert into r values ('Sin autorización (Ley 1581) no se guarda el contacto', true); end;
  begin
    insert into public.movements (owner_type, business_id, date, kind, amount, paid, contact_id) select 'negocio', negocio_a, '2026-11-07', 'venta', 1000, false, contacto_b from ctx;
    insert into r values ('No se puede enlazar el contacto de otro negocio', false);
  exception when insufficient_privilege then insert into r values ('No se puede enlazar el contacto de otro negocio', true); end;
  begin
    insert into public.movements (owner_type, business_id, date, kind, amount, account_id, recurring_id) select 'negocio', negocio_a, '2026-11-07', 'fijo', 1000, efectivo_a, recurrente_b from ctx;
    insert into r values ('No se puede enlazar el recurrente de otro negocio', false);
  exception when insufficient_privilege then insert into r values ('No se puede enlazar el recurrente de otro negocio', true); end;
  begin
    insert into public.contacts (business_id, kind, name, data_consent) select negocio_b, 'cliente', 'Intruso', true from ctx;
    insert into r values ('A no crea contactos en el negocio de B', false);
  exception when insufficient_privilege then insert into r values ('A no crea contactos en el negocio de B', true); end;
  begin
    insert into public.recurring_payments (business_id, name, amount, day_of_month) select negocio_a, 'Día malo', 1000, 32 from ctx;
    insert into r values ('El día del mes va de 1 a 31', false);
  exception when check_violation then insert into r values ('El día del mes va de 1 a 31', true); end;
end $$;

-- Borrar el contacto deja el movimiento sin contacto (no lo borra).
delete from public.contacts;
insert into r select 'Borrar un contacto no borra sus movimientos', (select count(*) = 2 from public.movements where owner_type = 'negocio' and business_id = (select negocio_a from ctx));

-- Un vendedor (C) ve los contactos pero no los crea.
reset role;
insert into public.contacts (business_id, kind, name, data_consent) select negocio_a, 'proveedor', 'Telas SAS', true from ctx;
insert into public.business_members (business_id, user_id, role) select negocio_a, '00000000-0000-0000-0000-00000000000c', 'seller' from ctx;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
insert into r select 'El vendedor ve los contactos del negocio', (select count(*) = 1 from public.contacts);
do $$ begin
  begin
    insert into public.contacts (business_id, kind, name, data_consent) select negocio_a, 'cliente', 'Del vendedor', true from ctx;
    insert into r values ('El vendedor no crea contactos (todavía; v2)', false);
  exception when insufficient_privilege then insert into r values ('El vendedor no crea contactos (todavía; v2)', true); end;
end $$;
reset role;
select * from r;
rollback;
