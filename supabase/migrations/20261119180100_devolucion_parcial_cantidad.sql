-- D4b: una línea devuelta por completo queda con 0 unidades (antes la cantidad tenía que ser > 0).
alter table public.sale_items drop constraint sale_items_quantity_check;
alter table public.sale_items add constraint sale_items_quantity_check check (quantity >= 0);
