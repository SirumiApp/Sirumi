-- Sin sesión no se leen los parámetros de impuestos (solo personas con cuenta).
revoke all on public.tax_parameters from anon;
