-- Pruebas de metas, deudas, activos y patrimonio. Corre dentro de una transacción que se deshace al final.
-- Ejecútalas en el editor SQL de Supabase: la tabla final debe mostrar ok = true en todas las filas.
begin;
insert into auth.users (id, email, aud, role) values
 ('00000000-0000-0000-0000-00000000000a','a@prueba.co','authenticated','authenticated'),
 ('00000000-0000-0000-0000-00000000000b','b@prueba.co','authenticated','authenticated');
create temp table r(prueba text, ok boolean);
grant all on r to authenticated, anon;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
insert into public.goals (name, target, saved) values ('Viaje', 4000000, 3800000);
insert into public.debts (name, balance, rate_ea, min_payment) values ('Tarjeta', 300000, 28, 150000);
insert into public.assets (name, value) values ('Cuentas', 3200000), ('Moto', 7000000);
insert into r select 'A5: abonar 500.000 a una meta de 4.000.000 con 3.800.000 deja 4.000.000', (select public.abonar_meta(id, 500000) = 4000000 from public.goals);
insert into r select 'A6: abonar 500.000 a una deuda de 300.000 deja 0', (select public.abonar_deuda(id, 500000) = 0 from public.debts);
insert into r select 'Un abono negativo no cambia nada', (select public.abonar_deuda(id, -100) = 0 from public.debts);
select public.guardar_foto_patrimonio();
select public.guardar_foto_patrimonio();
insert into r select 'A7: una sola foto por mes con 10.200.000 + 4.000.000 − 0', (select count(*) = 1 and max(net) = 14200000 from public.net_worth_snapshots);
do $$ begin
  begin
    insert into public.goals (name, target, saved) values ('Mala', 100, 200);
    insert into r values ('Lo ahorrado no puede pasar del objetivo', false);
  exception when check_violation then insert into r values ('Lo ahorrado no puede pasar del objetivo', true); end;
end $$;

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
insert into r select 'B no ve metas, deudas, activos ni fotos de A',
  (select count(*) = 0 from public.goals) and (select count(*) = 0 from public.debts) and (select count(*) = 0 from public.assets) and (select count(*) = 0 from public.net_worth_snapshots);
reset role;
create temp table ids_a as select (select id from public.goals limit 1) as meta, (select id from public.debts limit 1) as deuda;
grant select on ids_a to authenticated;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
insert into r select 'B no puede abonar a la meta de A', (select public.abonar_meta((select meta from ids_a), 1) is null);
update public.assets set value = 1;
reset role;
insert into r select 'B no cambió los activos de A', (select sum(value) = 10200000 from public.assets);
do $$ begin
  begin
    set local role authenticated;
    perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
    insert into public.goals (user_id, name, target) values ('00000000-0000-0000-0000-00000000000a', 'Falsa', 100);
    reset role;
    insert into r values ('B no crea metas a nombre de A', false);
  exception when insufficient_privilege then reset role; insert into r values ('B no crea metas a nombre de A', true); end;
end $$;
reset role;
select * from r;
rollback;
