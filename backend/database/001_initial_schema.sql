-- SafeWatch MVP schema (Supabase/PostgreSQL)
create extension if not exists pgcrypto;

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'VIEWER' check (role in ('ADMIN','OPERATOR','VIEWER')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','SUSPENDED')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  type text not null check (type in ('WEBCAM','UPLOAD','RTSP','HLS','DRONE','MOBILE')),
  url text,
  status text not null default 'INACTIVE' check (status in ('ACTIVE','INACTIVE','ERROR')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists zones (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  source_id uuid references sources(id) on delete cascade,
  name text not null,
  polygon jsonb not null,
  restricted boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  type text not null,
  enabled boolean not null default true,
  threshold numeric,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists model_versions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  version text not null,
  framework text not null default 'YOLO',
  artifact_uri text,
  checksum text,
  status text not null default 'READY' check (status in ('DRAFT','VALIDATING','READY','ACTIVE','DEPRECATED','FAILED')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(name, version)
);

create table if not exists detections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  source_id uuid references sources(id) on delete set null,
  model_version_id uuid references model_versions(id) on delete set null,
  class_name text not null,
  confidence numeric not null,
  bbox jsonb not null,
  track_id text,
  detected_at timestamptz not null default now()
);

create table if not exists incidents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  source_id uuid references sources(id) on delete set null,
  rule_id uuid references rules(id) on delete set null,
  detection_id uuid references detections(id) on delete set null,
  severity text not null check (severity in ('INFO','LOW','MEDIUM','HIGH','CRITICAL')),
  status text not null default 'OPEN' check (status in ('OPEN','ACKNOWLEDGED','RESOLVED')),
  title text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz
);

create table if not exists evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  incident_id uuid not null references incidents(id) on delete cascade,
  type text not null check (type in ('IMAGE','VIDEO','FRAME')),
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete set null,
  actor_user_id uuid,
  action text not null,
  resource_type text,
  resource_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_sources_org on sources(organization_id);
create index if not exists idx_incidents_org_created on incidents(organization_id, created_at desc);
create index if not exists idx_detections_source_time on detections(source_id, detected_at desc);
create index if not exists idx_audit_org_time on audit_logs(organization_id, created_at desc);
