-- HO 位整理表 · 云端同步初始化脚本
-- 用法：Supabase 控制台 → 左侧 SQL Editor → New query → 全选粘贴 → Run
-- 设计：浏览器只拿到 anon public key，不直接读写表，只能调用下面两个函数。
--       表本身不给 anon 任何权限，因此别人无法枚举空间 ID 或读取别人的数据。
--       隔离靠「空间 ID + 同步口令」，两者都要知道才能读写，请自行保管好。

create table if not exists public.ho_boards (
  space_id   text primary key,
  secret     text not null,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.ho_boards enable row level security;
revoke all on public.ho_boards from anon, authenticated;

-- 读取：空间 ID + 口令都正确时返回整份数据，否则返回 null
create or replace function public.ho_load(p_space text, p_secret text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_data jsonb;
begin
  if p_space is null or p_secret is null then return null; end if;
  select data into v_data
    from public.ho_boards
   where space_id = p_space and secret = p_secret;
  return v_data;
end $$;

-- 写入：首次使用创建空间；之后口令必须匹配才能覆盖
create or replace function public.ho_save(p_space text, p_secret text, p_data jsonb)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_secret text;
  v_data jsonb;
begin
  if p_space is null or length(p_space) < 6 or length(p_space) > 64 then return false; end if;
  if p_secret is null or length(p_secret) < 4 or length(p_secret) > 128 then return false; end if;
  v_data := coalesce(p_data, '{}'::jsonb);
  if length(v_data::text) > 500000 then return false; end if;

  select secret into v_secret from public.ho_boards where space_id = p_space;
  if found and v_secret <> p_secret then
    return false;  -- 空间已存在但口令不对，拒绝覆盖
  end if;

  insert into public.ho_boards (space_id, secret, data, updated_at)
  values (p_space, p_secret, v_data, now())
  on conflict (space_id) do update
    set data = excluded.data, updated_at = now();
  return true;
end $$;

-- 只把两个函数暴露给匿名调用者
revoke all on function public.ho_load(text, text) from public;
revoke all on function public.ho_save(text, text, jsonb) from public;
grant execute on function public.ho_load(text, text) to anon, authenticated, service_role;
grant execute on function public.ho_save(text, text, jsonb) to anon, authenticated, service_role;

-- 可选：验证脚本是否生效（应返回 null，表示函数可调用、当前空间为空）
-- select public.ho_load('test-space', 'test-secret');
