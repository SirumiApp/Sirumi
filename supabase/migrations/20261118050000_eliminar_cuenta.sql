-- Ajustes · Eliminar mi cuenta (Ley 1581: la persona puede borrar sus datos cuando quiera).
-- Borra la cuenta de quien la pide y, en cascada, todos sus datos: perfil, autorizaciones,
-- categorías, movimientos, topes y cuentas personales.
-- Negocios: si es la única dueña, el negocio se borra con todo lo suyo; si hay otra persona dueña,
-- el negocio queda a nombre de ella.

create or replace function public.eliminar_mi_cuenta()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  usuario uuid := (select auth.uid());
  negocio record;
  otro_dueno uuid;
begin
  if usuario is null then
    raise exception 'Necesitas iniciar sesión';
  end if;

  for negocio in
    select distinct b.id from public.businesses b
    left join public.business_members m on m.business_id = b.id and m.user_id = usuario
    where b.created_by = usuario or m.role = 'owner'
  loop
    select user_id into otro_dueno from public.business_members
    where business_id = negocio.id and role = 'owner' and user_id <> usuario
    limit 1;

    if otro_dueno is null then
      delete from public.businesses where id = negocio.id;
    else
      update public.businesses set created_by = otro_dueno where id = negocio.id and created_by = usuario;
    end if;
  end loop;

  delete from auth.users where id = usuario;
end;
$$;

revoke execute on function public.eliminar_mi_cuenta() from public, anon;
grant execute on function public.eliminar_mi_cuenta() to authenticated;
