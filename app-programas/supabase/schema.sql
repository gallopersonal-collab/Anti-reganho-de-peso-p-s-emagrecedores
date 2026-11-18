-- Trainer Pro Studio: estado final do banco (projeto Supabase trainer-pro-studio)
create extension if not exists pgcrypto with schema extensions;

-- Dados do personal sincronizados do app (um JSON por registro)
create table public.items (
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  store text not null check (store in ('programs', 'students', 'trainers', 'settings')),
  id text not null check (char_length(id) between 1 and 80),
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (owner, store, id)
);
alter table public.items enable row level security;
create policy items_owner_select on public.items for select to authenticated using (owner = (select auth.uid()));
create policy items_owner_insert on public.items for insert to authenticated with check (owner = (select auth.uid()));
create policy items_owner_update on public.items for update to authenticated using (owner = (select auth.uid())) with check (owner = (select auth.uid()));
create policy items_owner_delete on public.items for delete to authenticated using (owner = (select auth.uid()));

-- Código de acesso: 8 caracteres sem ambíguos (mesmo formato do Shape Zero Rebote Pro)
create or replace function public.new_access_code()
returns text language plpgsql set search_path = public, extensions as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text := '';
begin
  for i in 1..8 loop
    code := code || substr(alphabet, 1 + (get_byte(gen_random_bytes(1), 0) % length(alphabet)), 1);
  end loop;
  return code;
end; $$;

create table public.student_access (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  program_ref text not null check (char_length(program_ref) <= 80),
  student_ref text check (char_length(student_ref) <= 80),
  student_name text check (char_length(student_name) <= 120),
  code text not null unique default public.new_access_code(),
  active boolean not null default true,
  expires_at timestamptz,               -- null = até o personal desativar
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);
create index student_access_trainer_idx on public.student_access (trainer_id);
create index student_access_program_idx on public.student_access (trainer_id, program_ref);
alter table public.student_access enable row level security;
create policy access_owner_select on public.student_access for select to authenticated using (trainer_id = (select auth.uid()));
create policy access_owner_insert on public.student_access for insert to authenticated with check (trainer_id = (select auth.uid()));
create policy access_owner_update on public.student_access for update to authenticated using (trainer_id = (select auth.uid())) with check (trainer_id = (select auth.uid()));
create policy access_owner_delete on public.student_access for delete to authenticated using (trainer_id = (select auth.uid()));

-- Treinos registrados pelo aluno (gravação só pelas funções student_*)
create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  access_id uuid not null references public.student_access(id) on delete cascade,
  trainer_id uuid not null references auth.users(id) on delete cascade,
  workout_ref text check (char_length(workout_ref) <= 80),
  workout_name text check (char_length(workout_name) <= 120),
  log_date date not null default ((now() at time zone 'America/Sao_Paulo'))::date,
  exercises jsonb not null default '[]'::jsonb check (pg_column_size(exercises) < 60000),
  notes text check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index workout_logs_access_idx on public.workout_logs (access_id, log_date desc);
create index workout_logs_trainer_idx on public.workout_logs (trainer_id);
alter table public.workout_logs enable row level security;
create policy logs_trainer_select on public.workout_logs for select to authenticated using (trainer_id = (select auth.uid()));
create policy logs_trainer_delete on public.workout_logs for delete to authenticated using (trainer_id = (select auth.uid()));

-- Limite de tentativas de código errado por IP
create table public.access_attempts (
  id bigint generated always as identity primary key,
  ip text not null,
  attempted_at timestamptz not null default now()
);
create index access_attempts_ip_idx on public.access_attempts (ip, attempted_at desc);
alter table public.access_attempts enable row level security;  -- sem políticas: só as funções acessam

create or replace function public.request_ip()
returns text language sql stable set search_path = '' as $$
  select coalesce(nullif(trim(split_part(coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''), ',', 1)), ''), 'unknown');
$$;

create or replace function public.prune_attempts() returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.access_attempts where attempted_at < now() - interval '1 day';
  return null;
end; $$;
create trigger access_attempts_prune after insert on public.access_attempts for each statement execute function public.prune_attempts();

create or replace function public.check_access(_code text, out a public.student_access, out err text)
language plpgsql security definer set search_path = public as $$
declare
  c text := upper(regexp_replace(coalesce(_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_ip text := public.request_ip();
begin
  err := null;
  if (select count(*) from public.access_attempts t where t.ip = v_ip and t.attempted_at > now() - interval '1 hour') >= 20 then
    err := 'TOO_MANY_ATTEMPTS'; return;
  end if;
  select * into a from public.student_access s where s.code = c;
  if not found then
    insert into public.access_attempts (ip) values (v_ip);
    err := 'INVALID_CODE'; return;
  end if;
  if not a.active then err := 'INACTIVE'; return; end if;
  if a.expires_at is not null and a.expires_at < now() then err := 'EXPIRED'; return; end if;
end; $$;

create or replace function public.student_open(_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r record;
  prog jsonb; tr jsonb; st jsonb; logs jsonb;
begin
  select * into r from public.check_access(_code);
  if r.err is not null then return jsonb_build_object('error', r.err); end if;
  update public.student_access set last_seen_at = now() where id = (r.a).id;
  select data into prog from public.items where owner = (r.a).trainer_id and store = 'programs' and id = (r.a).program_ref;
  if prog is null then return jsonb_build_object('error', 'PROGRAM_NOT_FOUND'); end if;
  select data into tr from public.items where owner = (r.a).trainer_id and store = 'trainers' and id = prog ->> 'trainerId';
  select data into st from public.items where owner = (r.a).trainer_id and store = 'students' and id = coalesce((r.a).student_ref, prog ->> 'studentId');
  select coalesce(jsonb_agg(to_jsonb(l) - 'trainer_id' - 'access_id' order by l.log_date desc, l.created_at desc), '[]'::jsonb)
    into logs from (select * from public.workout_logs where access_id = (r.a).id order by log_date desc, created_at desc limit 300) l;
  return jsonb_build_object(
    'access', jsonb_build_object('id', (r.a).id, 'expires_at', (r.a).expires_at),
    'program', prog,
    'trainer', case when tr is null then null else jsonb_build_object('name', tr ->> 'name', 'photo', tr ->> 'photo', 'cref', tr ->> 'cref') end,
    'student', case when st is null then jsonb_build_object('name', (r.a).student_name) else jsonb_build_object('name', st ->> 'name', 'photo', st ->> 'photo') end,
    'logs', logs);
end; $$;

create or replace function public.student_save_log(_code text, _log jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r record;
  lid uuid;
begin
  select * into r from public.check_access(_code);
  if r.err is not null then return jsonb_build_object('error', r.err); end if;
  if jsonb_typeof(_log -> 'exercises') is distinct from 'array' then return jsonb_build_object('error', 'BAD_LOG'); end if;
  if (_log ->> 'id') is not null then
    update public.workout_logs
       set exercises = _log -> 'exercises', notes = left(_log ->> 'notes', 1000),
           workout_ref = left(_log ->> 'workout_ref', 80), workout_name = left(_log ->> 'workout_name', 120),
           log_date = coalesce((_log ->> 'log_date')::date, log_date), updated_at = now()
     where id = (_log ->> 'id')::uuid and access_id = (r.a).id
     returning id into lid;
    if lid is not null then return jsonb_build_object('id', lid); end if;
  end if;
  insert into public.workout_logs (access_id, trainer_id, workout_ref, workout_name, log_date, exercises, notes)
  values ((r.a).id, (r.a).trainer_id, left(_log ->> 'workout_ref', 80), left(_log ->> 'workout_name', 120),
          coalesce((_log ->> 'log_date')::date, ((now() at time zone 'America/Sao_Paulo'))::date),
          _log -> 'exercises', left(_log ->> 'notes', 1000))
  returning id into lid;
  return jsonb_build_object('id', lid);
end; $$;

create or replace function public.student_delete_log(_code text, _id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r record;
begin
  select * into r from public.check_access(_code);
  if r.err is not null then return jsonb_build_object('error', r.err); end if;
  delete from public.workout_logs where id = _id and access_id = (r.a).id;
  return jsonb_build_object('ok', true);
end; $$;

revoke execute on function public.check_access(text) from public, anon, authenticated;
revoke execute on function public.request_ip() from public, anon, authenticated;
revoke execute on function public.prune_attempts() from public, anon, authenticated;
revoke execute on function public.new_access_code() from public, anon;
grant execute on function public.new_access_code() to authenticated;
revoke execute on function public.student_open(text) from public;
revoke execute on function public.student_save_log(text, jsonb) from public;
revoke execute on function public.student_delete_log(text, uuid) from public;
grant execute on function public.student_open(text) to anon, authenticated;
grant execute on function public.student_save_log(text, jsonb) to anon, authenticated;
grant execute on function public.student_delete_log(text, uuid) to anon, authenticated;

-- Imagens dos slides importados de PDF
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('slides', 'slides', true, 5242880, array['image/jpeg', 'image/png'])
on conflict (id) do nothing;
create policy slides_owner_select on storage.objects for select to authenticated
  using (bucket_id = 'slides' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy slides_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'slides' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy slides_owner_update on storage.objects for update to authenticated
  using (bucket_id = 'slides' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy slides_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'slides' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- =========================================================
-- Licenças (assinatura Kiwify)
-- O webhook (supabase/functions/kiwify-webhook) grava uma licença por e-mail do comprador.
-- O app só abre para o personal cuja conta (mesmo e-mail) tem licença ativa.
-- =========================================================
create table public.licenses (
  email text primary key check (email = lower(email)),
  status text not null default 'active' check (status in ('active', 'inactive')),
  expires_at timestamptz,              -- null = sem vencimento
  source text not null default 'kiwify',
  order_id text, product text, last_event text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.licenses enable row level security;   -- sem políticas: só funções e webhook

create table public.kiwify_events (                      -- registro de cada aviso recebido
  id bigint generated always as identity primary key,
  received_at timestamptz not null default now(),
  event text, email text, order_id text, result text, payload jsonb
);
alter table public.kiwify_events enable row level security;

create table public.app_config (key text primary key, value text not null, updated_at timestamptz not null default now());
alter table public.app_config enable row level security;
-- chaves usadas: kiwify_url_key (segredo da URL do webhook), kiwify_token (opcional, assinatura da Kiwify)

create or replace function public.has_license()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.licenses l
    where l.email = lower(coalesce(auth.jwt() ->> 'email', ''))
      and l.status = 'active' and (l.expires_at is null or l.expires_at > now()));
$$;
create or replace function public.my_license()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('active', public.has_license(),
    'status', (select status from public.licenses where email = lower(coalesce(auth.jwt() ->> 'email', ''))),
    'expires_at', (select expires_at from public.licenses where email = lower(coalesce(auth.jwt() ->> 'email', ''))));
$$;
revoke execute on function public.has_license() from public, anon;
grant execute on function public.has_license() to authenticated;
revoke execute on function public.my_license() from public, anon;
grant execute on function public.my_license() to authenticated;

-- Sem licença ativa, a conta não grava na nuvem nem cria códigos de aluno
create policy items_license_insert on public.items as restrictive for insert to authenticated with check (public.has_license());
create policy items_license_update on public.items as restrictive for update to authenticated using (public.has_license());
create policy access_license_insert on public.student_access as restrictive for insert to authenticated with check (public.has_license());
create policy access_license_update on public.student_access as restrictive for update to authenticated using (public.has_license());
create policy slides_license_insert on storage.objects as restrictive for insert to authenticated with check (bucket_id <> 'slides' or public.has_license());

-- Liberar manualmente (cortesia, parceiro):
--   insert into public.licenses (email, source) values ('email@exemplo.com', 'manual');
-- Bloquear manualmente:
--   update public.licenses set status = 'inactive' where email = 'email@exemplo.com';
