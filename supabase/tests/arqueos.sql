-- D10 · arqueo de caja. Transacción que se deshace.
begin;
insert into auth.users (id, email, aud, role) values
 ('00000000-0000-0000-0000-00000000000a','a@prueba.co','authenticated','authenticated'),
 ('00000000-0000-0000-0000-00000000000b','b@prueba.co','authenticated','authenticated');
create temp table r(prueba text, ok boolean);
grant all on r to authenticated, anon;
create temp table ctx(negocio uuid, efectivo uuid);
grant all on ctx to authenticated, anon;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select public.completar_onboarding('{"full_name":"Ana","usage":"negocio","business_name":"Tienda","policy_version":"v1","consents":{"terminos":true,"datos":true}}');
insert into ctx select b.id, a.id from public.businesses b join public.accounts a on a.business_id = b.id and a.kind = 'efectivo';
select public.registrar_arqueo(jsonb_build_object('business_id', negocio, 'account_id', efectivo, 'expected', 600000, 'counted', 580000, 'adjust', true, 'faltante', 'Faltante de caja')) from ctx;
select public.registrar_arqueo(jsonb_build_object('business_id', negocio, 'account_id', efectivo, 'expected', 580000, 'counted', 590000, 'adjust', false)) from ctx;
insert into r select 'Se guardan los dos conteos con su diferencia', (select array_agg(difference order by created_at, difference) = array[-20000::bigint, 10000] from public.cash_counts);
insert into r select 'Faltante ajustado: gasto variable de 20.000 en efectivo', (select count(*) = 1 and min(amount) = 20000 and min(kind) = 'variable' and bool_and(paid) from public.movements where source = 'arqueo');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
insert into r select 'Un extraño no ve los arqueos', (select count(*) = 0 from public.cash_counts);
do $$ begin
  begin
    perform public.registrar_arqueo(jsonb_build_object('business_id', negocio, 'account_id', efectivo, 'expected', 1, 'counted', 1)) from ctx;
    insert into r values ('Un extraño no registra arqueos', false);
  exception when insufficient_privilege then insert into r values ('Un extraño no registra arqueos', true); end;
end $$;
reset role;
select * from r;
rollback;
