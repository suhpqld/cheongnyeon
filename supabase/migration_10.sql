-- 복냥이 새 기획(docs/10) DB 추가. 여러 번 실행해도 안전함.

alter table welfare_program add column if not exists status text not null default 'soon';
alter table welfare_program add column if not exists sort_order int not null default 0;
do $$ begin
  alter table welfare_program add constraint welfare_program_status_chk check (status in ('available','soon'));
exception when duplicate_object then null; end $$;

update welfare_program set status = 'available', sort_order = 10 where code = 'seoul_basic';

insert into welfare_program (code, name, status, sort_order, summary_easy) values
 ('basic_livelihood','국민기초생활보장 (생계, 의료, 주거급여)','soon',20,'준비 중이에요'),
 ('basic_pension','기초연금','soon',30,'준비 중이에요'),
 ('disability_pension','장애인연금','soon',40,'준비 중이에요'),
 ('seoul_emergency','서울형 긴급복지','soon',50,'준비 중이에요')
on conflict (code) do nothing;

create table if not exists form_template (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references welfare_program(id) on delete cascade,
  code text not null,
  name text not null,
  page_images jsonb not null default '[]'::jsonb,
  sort_order int not null default 0,
  unique (program_id, code)
);

create table if not exists form_slot (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references form_template(id) on delete cascade,
  field_key text,
  local_only text check (local_only in ('name','rrn','phone','signature')),
  page int not null default 1,
  x numeric not null, y numeric not null, w numeric not null, h numeric not null,
  render text not null default 'text' check (render in ('text','check')),
  check_value text,
  font_pt numeric not null default 10
);

alter table form_template enable row level security;
alter table form_slot enable row level security;

-- 서울형 기초보장의 신청서 양식 2개 (칸 위치는 seed_form_slots.sql에서 따로 넣음)
insert into form_template (program_id, code, name, page_images, sort_order)
select id, 'social_security_application', '사회보장급여 신청(변경)서', '["/forms/ssa_p1.png"]'::jsonb, 10
from welfare_program where code = 'seoul_basic'
on conflict (program_id, code) do nothing;

insert into form_template (program_id, code, name, page_images, sort_order)
select id, 'income_asset_report', '소득 재산 신고서', '[]'::jsonb, 20
from welfare_program where code = 'seoul_basic'
on conflict (program_id, code) do nothing;

-- 확인
select code, name, status, sort_order from welfare_program order by sort_order;
