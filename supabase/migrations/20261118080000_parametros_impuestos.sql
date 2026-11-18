-- B7 · Parámetros de impuestos por año (docs/reglas-de-calculo.md): las tarifas y la UVT cambian cada año,
-- así que viven aquí y no en el código. Valores 2026 del prototipo: VALIDAR CON EL CONTADOR ANTES DE LANZAR.
-- Para un año nuevo: insertar otra fila (la app usa la del año en curso o, si no existe, la más reciente).

create table public.tax_parameters (
  year int primary key check (year between 2020 and 2100),
  params jsonb not null,
  note text,
  updated_at timestamptz not null default now()
);

alter table public.tax_parameters enable row level security;
-- Cualquiera con sesión puede leerlos; nadie los cambia desde la app.
create policy "Todos leen los parámetros de impuestos" on public.tax_parameters for select to authenticated using (true);
revoke insert, update, delete on public.tax_parameters from anon, authenticated;

insert into public.tax_parameters (year, params, note) values (2026, '{
  "uvt": 52374,
  "topeUvt": 3500,
  "rangosBimestreUvt": [1000, 2500, 5000],
  "tarifasSimple": { "1": [1.2, 2.8, 4.4, 5.6], "2": [1.6, 2.0, 3.5, 4.5], "3": [7.3, 8.3, 8.3, 8.3], "4": [3.1, 3.4, 4.0, 4.5] },
  "tarifaOrdinario": 35,
  "tablaArt241": [
    { "desdeUvt": 0, "hastaUvt": 1090, "tarifa": 0, "baseUvt": 0 },
    { "desdeUvt": 1090, "hastaUvt": 1700, "tarifa": 19, "baseUvt": 0 },
    { "desdeUvt": 1700, "hastaUvt": 4100, "tarifa": 28, "baseUvt": 116 },
    { "desdeUvt": 4100, "hastaUvt": 8670, "tarifa": 33, "baseUvt": 788 },
    { "desdeUvt": 8670, "hastaUvt": 18970, "tarifa": 35, "baseUvt": 2296 },
    { "desdeUvt": 18970, "hastaUvt": 31000, "tarifa": 37, "baseUvt": 5901 },
    { "desdeUvt": 31000, "hastaUvt": null, "tarifa": 39, "baseUvt": 10352 }
  ],
  "icaPorMil": 9.66,
  "iva": 19
}'::jsonb, 'Valores del prototipo para 2026. Validar con el contador antes de lanzar.');
