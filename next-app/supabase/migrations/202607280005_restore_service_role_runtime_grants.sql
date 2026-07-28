begin;

-- Server routes use the Supabase secret key as service_role. These grants are
-- intentionally limited to the tables and operations used by the payment,
-- email, and calendar runtime.
grant select on table public.site_settings to service_role;
grant select, update on table public.bookings to service_role;
grant select on table public.payment_transactions to service_role;
grant select, insert on table public.audit_logs to service_role;

do $$
begin
  if not has_table_privilege('service_role', 'public.site_settings', 'select')
    or not has_table_privilege('service_role', 'public.bookings', 'select')
    or not has_table_privilege('service_role', 'public.bookings', 'update')
    or not has_table_privilege('service_role', 'public.payment_transactions', 'select')
    or not has_table_privilege('service_role', 'public.audit_logs', 'select')
    or not has_table_privilege('service_role', 'public.audit_logs', 'insert')
  then
    raise exception 'service_role runtime grants were not restored';
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;
