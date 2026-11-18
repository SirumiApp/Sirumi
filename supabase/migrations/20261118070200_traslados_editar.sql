-- La persona dueña puede editar traslados (lo necesita, por ejemplo, quitar_cuenta_negocio para pasarlos a la cuenta principal).
create policy "El dueño edita traslados" on public.transfers for update to authenticated
  using (public.es_dueno(business_id))
  with check (
    public.es_dueno(business_id) and public.cuenta_del_negocio(from_account, business_id)
    and (to_account is null or public.cuenta_del_negocio(to_account, business_id))
    and (to_card is null or public.tarjeta_del_negocio(to_card, business_id))
  );
