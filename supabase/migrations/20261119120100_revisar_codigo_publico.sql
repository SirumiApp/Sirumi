-- En el onboarding la persona revisa el código antes de crear su cuenta: revisar_codigo solo dice
-- el nombre del negocio si el código está vigente (no deja unirse; eso pide sesión).
grant execute on function public.revisar_codigo(text) to anon;
