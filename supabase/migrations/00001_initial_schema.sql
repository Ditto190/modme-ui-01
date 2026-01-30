-- ============================================
-- ModMe GenUI Workspace - Supabase Database
-- Initial Schema Migration
-- ============================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================
-- 1. Users & Profiles
-- ============================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin', 'consultant')),
  preferences jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- 2. Projects / Workspaces
-- ============================================

create table public.projects (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  settings jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "Owners can manage their projects"
  on public.projects for all
  using (auth.uid() = owner_id);

create index idx_projects_owner on public.projects(owner_id);

-- ============================================
-- 3. Conversations (Agent chat sessions)
-- ============================================

create table public.conversations (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  agent_model text not null default 'gemini-2.5-flash',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.conversations enable row level security;

create policy "Users can manage own conversations"
  on public.conversations for all
  using (auth.uid() = user_id);

create index idx_conversations_project on public.conversations(project_id);
create index idx_conversations_user on public.conversations(user_id);

-- ============================================
-- 4. Messages
-- ============================================

create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content text not null,
  tool_calls jsonb,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "Users can access messages in own conversations"
  on public.messages for all
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

create index idx_messages_conversation on public.messages(conversation_id);
create index idx_messages_created on public.messages(conversation_id, created_at);

-- ============================================
-- 5. UI Elements (GenUI rendered components)
-- ============================================

create table public.ui_elements (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  element_key text not null,
  element_type text not null check (element_type in ('StatCard', 'DataTable', 'ChartCard', 'Custom')),
  props jsonb not null default '{}',
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ui_elements enable row level security;

create policy "Users can access UI elements in own conversations"
  on public.ui_elements for all
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

create index idx_ui_elements_conversation on public.ui_elements(conversation_id);

-- ============================================
-- 6. Toolsets
-- ============================================

create table public.toolsets (
  id text primary key,
  name text not null,
  description text,
  icon text,
  is_default boolean not null default false,
  tools text[] not null default '{}',
  category text check (category in (
    'generative_ui', 'data_analysis', 'frontend', 'backend',
    'system', 'integration', 'testing', 'knowledge_management'
  )),
  status text not null default 'active' check (status in ('active', 'deprecated', 'experimental', 'beta')),
  version text not null default '1.0.0',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.toolsets enable row level security;

create policy "Toolsets are readable by authenticated users"
  on public.toolsets for select
  using (auth.role() = 'authenticated');

create policy "Only admins can modify toolsets"
  on public.toolsets for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ============================================
-- 7. Audit Log
-- ============================================

create table public.audit_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;

create policy "Users can view own audit entries"
  on public.audit_log for select
  using (auth.uid() = user_id);

create policy "System can insert audit entries"
  on public.audit_log for insert
  with check (auth.uid() = user_id);

create index idx_audit_log_user on public.audit_log(user_id);
create index idx_audit_log_project on public.audit_log(project_id);
create index idx_audit_log_action on public.audit_log(action);
create index idx_audit_log_created on public.audit_log(created_at desc);

-- ============================================
-- 8. Journal Entries (private notes)
-- ============================================

create table public.journal_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  tags text[] not null default '{}',
  embedding vector(768),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.journal_entries enable row level security;

create policy "Users can manage own journal entries"
  on public.journal_entries for all
  using (auth.uid() = user_id);

create index idx_journal_user on public.journal_entries(user_id);
create index idx_journal_tags on public.journal_entries using gin(tags);

-- ============================================
-- 9. File Uploads (data directory equivalent)
-- ============================================

create table public.file_uploads (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_size bigint,
  mime_type text,
  category text not null default 'raw' check (category in ('raw', 'processed', 'reports')),
  storage_bucket text not null default 'project-files',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.file_uploads enable row level security;

create policy "Users can manage own file uploads"
  on public.file_uploads for all
  using (auth.uid() = user_id);

create index idx_file_uploads_project on public.file_uploads(project_id);

-- ============================================
-- 10. Updated_at trigger function
-- ============================================

create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply updated_at triggers
create trigger set_updated_at before update on public.profiles
  for each row execute function public.update_updated_at();

create trigger set_updated_at before update on public.projects
  for each row execute function public.update_updated_at();

create trigger set_updated_at before update on public.conversations
  for each row execute function public.update_updated_at();

create trigger set_updated_at before update on public.ui_elements
  for each row execute function public.update_updated_at();

create trigger set_updated_at before update on public.toolsets
  for each row execute function public.update_updated_at();

create trigger set_updated_at before update on public.journal_entries
  for each row execute function public.update_updated_at();

-- ============================================
-- 11. Storage Buckets
-- ============================================

insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', false);

create policy "Users can upload to own project files"
  on storage.objects for insert
  with check (
    bucket_id = 'project-files' and
    auth.role() = 'authenticated'
  );

create policy "Users can read own project files"
  on storage.objects for select
  using (
    bucket_id = 'project-files' and
    auth.role() = 'authenticated'
  );
