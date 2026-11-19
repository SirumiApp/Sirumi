-- Arreglo: el parámetro "token" chocaba con la columna del mismo nombre.
drop function public.registrar_celular(text, text);
create function public.registrar_celular(token_celular text, plataforma text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'sinPermiso' using errcode = '42501'; end if;
  insert into public.push_tokens (token, user_id, platform, updated_at) values (token_celular, (select auth.uid()), plataforma, now())
  on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
end;
$$;
revoke execute on function public.registrar_celular(text, text) from public, anon;
grant execute on function public.registrar_celular(text, text) to authenticated;
