begin;

do $$
declare
  v_function_name text;
  v_definition text;
begin
  foreach v_function_name in array array[
    'admin_save_site_setting',
    'admin_delete_site_setting'
  ]
  loop
    select pg_get_functiondef(pg_proc.oid)
    into v_definition
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname = v_function_name;

    if v_definition is null
      or position('public.digest' in v_definition) = 0
    then
      raise exception 'unexpected setting function definition: %', v_function_name;
    end if;

    execute replace(v_definition, 'public.digest', 'extensions.digest');
  end loop;
end;
$$;

commit;
