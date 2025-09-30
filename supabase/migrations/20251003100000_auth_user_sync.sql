-- Ensure auth signups automatically provision public user profiles

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  display_name text := nullif(metadata ->> 'display_name', '');
begin
  insert into public.users (id, email, display_name)
  values (new.id, new.email, display_name)
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(excluded.display_name, users.display_name),
        updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill profiles for any auth users missing a public.users row
insert into public.users (id, email, display_name)
select au.id, au.email, nullif(au.raw_user_meta_data ->> 'display_name', '')
from auth.users au
left join public.users pu on pu.id = au.id
where pu.id is null;
