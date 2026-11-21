create extension if not exists pgcrypto;

create table if not exists welfare_program (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  form_type text not null default '공통서식',
  summary_easy text,
  apply_place text,
  contact text,
  after_submit_easy text,
  created_at timestamptz not null default now()
);

create table if not exists form_field (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references welfare_program(id) on delete cascade,
  key text not null,
  common_key text,
  label text not null,
  section text not null,
  question_easy text not null,
  question_helper text not null,
  help_easy text,
  type text not null check (type in ('yes_no','choice','district','count','money','text')),
  options jsonb,
  required boolean not null default true,
  allow_unknown boolean not null default false,
  min_value bigint,
  max_value bigint,
  show_if jsonb,
  confirm_label text,
  check_guide text,
  sort_order int not null,
  unique (program_id, key)
);

create table if not exists document_rule (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references welfare_program(id) on delete cascade,
  doc_name text not null,
  easy_explain text,
  issue_place text,
  place_group text not null check (place_group in ('home','onsite','bank','work','tax','gov24')),
  condition jsonb,
  sort_order int not null default 0,
  unique (program_id, doc_name)
);

create table if not exists precheck_rule (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references welfare_program(id) on delete cascade,
  check_question text not null,
  why_easy text not null,
  fix_easy text not null,
  related_doc text,
  condition jsonb,
  sort_order int not null default 0,
  unique (program_id, check_question)
);

create table if not exists application (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references welfare_program(id),
  status text not null default 'drafting' check (status in ('drafting','preparing','submitted','supplementing')),
  helper_mode text not null default 'self' check (helper_mode in ('self','family','helper')),
  resume_code text unique not null,
  app_token text unique not null,
  share_code text unique,
  share_expires_at timestamptz,
  submitted_at timestamptz,
  ai_call_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);

create table if not exists answer (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references application(id) on delete cascade,
  field_id uuid not null references form_field(id) on delete cascade,
  value jsonb,
  raw_speech text,
  input_method text check (input_method in ('voice','button','text','unknown')),
  is_approximate boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (application_id, field_id)
);

create table if not exists supplement_request (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references application(id) on delete cascade,
  source_text text,
  parsed_json jsonb not null,
  deadline date,
  deadline_confirmed boolean not null default false,
  office_contact text,
  submitted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists checklist_item (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references application(id) on delete cascade,
  supplement_id uuid references supplement_request(id) on delete set null,
  doc_name text not null,
  easy_explain text,
  issue_place text,
  place_group text not null default 'onsite' check (place_group in ('home','onsite','bank','work','tax','gov24')),
  source text not null default 'base' check (source in ('base','supplement')),
  due_date date,
  is_done boolean not null default false,
  also_requested boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists precheck_result (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references application(id) on delete cascade,
  rule_id uuid not null references precheck_rule(id) on delete cascade,
  result text not null check (result in ('yes','no','unknown')),
  updated_at timestamptz not null default now(),
  unique (application_id, rule_id)
);

create table if not exists resume_attempt (
  id uuid primary key default gen_random_uuid(),
  ip text not null,
  success boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists resume_attempt_ip_time on resume_attempt (ip, created_at);

-- 피드백 반영: RLS를 켜고 정책을 두지 않는다. anon 키로는 아무것도 못 읽고, 서버가 비밀 키로만 접근한다.
alter table welfare_program enable row level security;
alter table form_field enable row level security;
alter table document_rule enable row level security;
alter table precheck_rule enable row level security;
alter table application enable row level security;
alter table answer enable row level security;
alter table supplement_request enable row level security;
alter table checklist_item enable row level security;
alter table precheck_result enable row level security;
alter table resume_attempt enable row level security;
