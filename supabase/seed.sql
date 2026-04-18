insert into users (id, email, full_name)
values
  ('00000000-0000-0000-0000-000000000001', 'demo@artha.app', 'Demo User')
on conflict (email) do nothing;

insert into sessions (id, user_id, context)
values
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', '{"demo": true}')
on conflict (id) do nothing;
