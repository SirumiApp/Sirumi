-- Pruebas de importar extractos (B9). Corre en una transacción que se deshace al final.
begin;
insert into auth.users (id, email, aud, role) values
 ('00000000-0000-0000-0000-00000000000a','a@prueba.co','authenticated','authenticated'),
 ('00000000-0000-0000-0000-00000000000b','b@prueba.co','authenticated','authenticated');
create temp table r(prueba text, ok boolean);
grant all on r to authenticated, anon;
create temp table ctx(negocio uuid, davi uuid, imp uuid, imp_p uuid, cat uuid);
grant all on ctx to authenticated, anon;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select public.completar_onboarding('{"full_name":"Ana","usage":"ambos","business_name":"Tienda","policy_version":"v1","consents":{"terminos":true,"datos":true}}');
insert into ctx (negocio) select id from public.businesses;
insert into public.accounts (owner_type, business_id, name, kind, initial_balance) select 'negocio', negocio, 'Davivienda', 'banco', 3000000 from ctx;
update ctx set davi = (select id from public.accounts where name = 'Davivienda');

-- Ejemplo B9: saldo 3.000.000; entra 2.350.000 y sale 1.300.000 → saldo inicial 1.950.000, saldo de hoy igual.
update ctx set imp = public.importar_extracto(jsonb_build_object('ambito', 'negocio', 'business_id', negocio, 'account_id', davi, 'month', '2026-08', 'file_name', 'agosto.csv',
  'rows', jsonb_build_array(
    jsonb_build_object('date', '2026-08-10', 'description', 'Venta mayorista', 'amount', 2350000, 'kind', 'venta'),
    jsonb_build_object('date', '2026-08-02', 'description', 'Arriendo', 'amount', -1300000, 'kind', 'fijo'))));
insert into r select 'B9: el saldo inicial baja 1.050.000', (select initial_balance = 1950000 from public.accounts a, ctx where a.id = ctx.davi);
insert into r select 'B9: el saldo de hoy sigue en 3.000.000',
  (select a.initial_balance + coalesce(sum(case when m.kind in ('venta','aporte','prestamo') then m.amount else -m.amount end), 0) = 3000000
   from public.accounts a left join public.movements m on m.account_id = a.id, ctx where a.id = ctx.davi group by a.initial_balance);
insert into r select 'Queda registrado el extracto (cuenta, mes, totales)', (select rows = 2 and inflows = 2350000 and outflows = 1300000 and month = '2026-08' from public.statement_imports);
do $$ begin
  begin
    perform public.importar_extracto(jsonb_build_object('ambito', 'negocio', 'business_id', negocio, 'account_id', davi, 'month', '2026-08',
      'rows', jsonb_build_array(jsonb_build_object('date', '2026-08-10', 'amount', 5000, 'kind', 'fijo')))) from ctx;
    insert into r values ('Una entrada no puede ser gasto (el tipo va con la dirección)', false);
  exception when raise_exception then insert into r values ('Una entrada no puede ser gasto (el tipo va con la dirección)', sqlerrm = 'tipoNoCuadra'); end;
end $$;

-- Personal: gastos e ingresos con su categoría; sin saldo que ajustar.
update ctx set cat = (select id from public.categories where key = 'mercado' limit 1);
select public.crear_categorias_iniciales();
update ctx set cat = (select id from public.categories where key = 'mercado' limit 1);
update ctx set imp_p = public.importar_extracto(jsonb_build_object('ambito', 'personal', 'month', '2026-08',
  'rows', jsonb_build_array(jsonb_build_object('date', '2026-08-05', 'description', 'EXITO', 'amount', -85000, 'category_id', cat),
                           jsonb_build_object('date', '2026-08-01', 'description', 'Nomina', 'amount', 4800000))));
insert into r select 'Personal: un gasto con categoría y un ingreso',
  (select count(*) = 2 from public.movements where owner_type = 'personal' and source = 'extracto')
  and (select kind = 'gasto' and category_id is not null from public.movements where owner_type = 'personal' and amount = 85000);

-- B no ve ni deshace lo de A.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
insert into r select 'Un extraño no ve los extractos', (select count(*) = 0 from public.statement_imports);
do $$ begin
  begin
    perform public.deshacer_importacion(imp) from ctx;
    insert into r values ('Un extraño no deshace un extracto ajeno', false);
  exception when insufficient_privilege then insert into r values ('Un extraño no deshace un extracto ajeno', true); end;
  begin
    perform public.importar_extracto(jsonb_build_object('ambito', 'negocio', 'business_id', negocio, 'account_id', davi, 'month', '2026-08',
      'rows', jsonb_build_array(jsonb_build_object('date', '2026-08-10', 'amount', 5000, 'kind', 'venta')))) from ctx;
    insert into r values ('Un extraño no importa en un negocio ajeno', false);
  exception when insufficient_privilege then insert into r values ('Un extraño no importa en un negocio ajeno', true); end;
end $$;

-- A deshace: se van los movimientos y el saldo inicial vuelve a 3.000.000.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select public.deshacer_importacion(imp) from ctx;
insert into r select 'Deshacer revierte movimientos y saldo inicial',
  (select initial_balance = 3000000 from public.accounts a, ctx where a.id = ctx.davi)
  and (select count(*) = 0 from public.movements where owner_type = 'negocio' and source = 'extracto')
  and (select count(*) = 1 from public.statement_imports);
reset role;
select * from r;
rollback;
