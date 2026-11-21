-- 복냥이: 신청서 모든 칸 채우기 (docs/10 14장). migration_10 다음에 실행. 여러 번 실행해도 안전함.

-- 1) 양식 칸: 저장하지 않는 값의 이름(local_key)을 자유롭게
alter table form_slot add column if not exists local_key text;
alter table form_slot drop constraint if exists form_slot_local_only_check;

-- 2) 복지별로 2쪽 보장구분에 체크할 칸
alter table welfare_program add column if not exists form_checks jsonb not null default '[]'::jsonb;
-- ⚠ 서울형 기초보장의 보장구분 체크는 120 또는 주민센터 확인 후 고칠 것 (지금은 생계, 의료, 주거로 둠)
update welfare_program set form_checks = '["livelihood","medical","housing"]'::jsonb where code = 'seoul_basic';

-- 3) 신청서 그림 3쪽
update form_template set page_images = '["/forms/ssa_p1.png","/forms/ssa_p2.png","/forms/ssa_p3.png"]'::jsonb
where code = 'social_security_application';

-- 4) 묶음 질문 타입(group) 추가: 가족, 부양의무자, 계좌처럼 여러 칸을 한 번에 받는 질문
alter table form_field drop constraint if exists form_field_type_check;
alter table form_field add constraint form_field_type_check
  check (type in ('yes_no','choice','district','count','money','text','group'));

-- 5) 결과 받는 방법에 전자우편 추가
update form_field set options = '[{"value":"sms","label":"문자로 받을래요"},{"value":"mail","label":"우편(종이)으로 받을래요"},{"value":"email","label":"이메일로 받을래요"}]'::jsonb
where key = 'notice_method';

-- 6) 새 질문
-- group의 options: {"max":줄 수, "fields":[저장하는 칸], "local":[출력 화면에서만 적는 칸]}
with p as (select id from welfare_program where code = 'seoul_basic')
insert into form_field (program_id, key, common_key, label, section, question_easy, question_helper, help_easy, type, options, required, allow_unknown, min_value, max_value, show_if, confirm_label, check_guide, sort_order)
select p.id, v.* from p, (values
  ('head_relation','head_relation','세대주와의 관계','사는 곳',
   '등본에 세대주로 올라간 사람은 누구예요?','신청하시는 분 등본에 세대주로 올라간 사람은 누구예요?',
   '혼자 사시면 보통 본인이 세대주예요.','choice',
   '[{"value":"본인","label":"내가 세대주예요"},{"value":"배우자","label":"남편이나 아내"},{"value":"부모","label":"부모님"},{"value":"자녀","label":"자녀"},{"value":"기타","label":"그 밖에"}]'::jsonb,
   true, true, null::bigint, null::bigint, null::jsonb,
   '세대주', '주민등록등본 맨 위에 세대주 이름이 있어요. 정부24에서 무료로 볼 수 있어요.', 25),

  ('members','members','가족사항','가구',
   '같이 사는 가족을 한 사람씩 알려 주세요.','신청하시는 분과 같이 사는 가족을 한 사람씩 알려 주세요.',
   '이름과 주민등록번호는 출력할 때 적어요. 여기서는 관계, 같이 사는지, 학교, 건강, 일만 물어봐요.','group',
   '{"max":4,"fields":[
      {"key":"relation","label":"세대주와의 관계","type":"choice","options":["배우자","아들","딸","아버지","어머니","손자","손녀","형제자매","그 밖에"]},
      {"key":"living","label":"같이 사나요","type":"choice","options":["동거","미동거(군 복무)","미동거(학업)","미동거(입원)","미동거(그 밖에)"]},
      {"key":"education","label":"학력이나 학교","type":"text","placeholder":"고졸, OO중 2학년"},
      {"key":"health","label":"건강","type":"choice","options":["건강함","장애","질병"]},
      {"key":"job","label":"하는 일","type":"text","placeholder":"없음, 일용직, 회사원"}],
     "local":[{"key":"name","label":"이름"},{"key":"rrn","label":"주민등록번호"},{"key":"workplace","label":"직장 이름"},{"key":"phone","label":"전화번호"}]}'::jsonb,
   true, false, null::bigint, null::bigint, '{"field":"household_size","op":"gt","value":1}'::jsonb,
   '같이 사는 가족', null::text, 55),

  ('spouse_relation','spouse_relation','배우자 관계','가구',
   '배우자가 있으시면 어떤 관계예요?','신청하시는 분께 배우자가 있으시면 어떤 관계예요?',
   '배우자가 없으면 "해당 없어요"를 골라 주세요.','choice',
   '[{"value":"none","label":"해당 없어요"},{"value":"legal","label":"혼인신고 했어요"},{"value":"de_facto","label":"혼인신고 없이 같이 살아요"},{"value":"separated","label":"서류상 부부지만 따로 살아요"}]'::jsonb,
   true, false, null::bigint, null::bigint, null::jsonb,
   '배우자 관계', null::text, 56),

  ('supporters','supporters','부양의무자','가구',
   '따로 사는 부모님이나 자녀(그 배우자 포함)를 알려 주세요.','신청하시는 분과 따로 사는 부모님이나 자녀(그 배우자 포함)를 알려 주세요.',
   '주민센터에서 필요하다고 할 때만 적는 칸이에요. 이름, 주민등록번호, 주소, 전화는 출력할 때 적어요.','group',
   '{"max":4,"fields":[
      {"key":"relation","label":"신청인의 누구","type":"choice","options":["아들","딸","아버지","어머니","사위","며느리"]},
      {"key":"household_size","label":"그 집 식구 수","type":"count"}],
     "local":[{"key":"name","label":"이름"},{"key":"rrn","label":"주민등록번호"},{"key":"address","label":"주소"},{"key":"phone","label":"전화번호"}]}'::jsonb,
   false, true, null::bigint, null::bigint, '{"field":"has_family_elsewhere","op":"eq","value":true}'::jsonb,
   '따로 사는 부모, 자녀', '가족관계증명서를 떼면 부모와 자녀가 다 나와요.', 58),

  ('account','account','급여 받을 계좌','신청 방법',
   '돈을 받을 통장은 어느 은행이에요?','돈을 받을 통장은 어느 은행이에요?',
   '계좌번호는 출력할 때 적어요. 본인 통장이 아니면 이유를 적어야 해요.','group',
   '{"max":1,"fields":[
      {"key":"relation","label":"통장 주인","type":"choice","options":["본인","배우자","자녀","그 밖에"]},
      {"key":"bank","label":"은행","type":"text","placeholder":"농협, 국민은행"},
      {"key":"note","label":"본인 통장이 아니면 이유","type":"text","placeholder":"압류방지통장이면 꼭 적기"}],
     "local":[{"key":"owner_name","label":"예금주 이름"},{"key":"number","label":"계좌번호"}]}'::jsonb,
   true, true, null::bigint, null::bigint, null::jsonb,
   '받을 통장', '통장 첫 장에 은행과 계좌번호가 있어요.', 175),

  ('fee_discount','fee_discount','요금 감면 신청','신청 방법',
   '수급자로 정해지면 전기요금, 휴대전화 요금 할인도 같이 신청할까요?','수급자로 정해지면 전기요금, 휴대전화 요금 할인도 같이 신청할까요?',
   '같이 신청하면 따로 갈 필요가 없어요. 결정은 각 회사가 해요.','yes_no', null::jsonb,
   true, false, null::bigint, null::bigint, null::jsonb,
   '요금 할인 같이 신청', null::text, 185),

  ('consent_required','consent_required','개인정보 활용 동의 (필수)','확인과 동의',
   '구청이 소득과 재산을 조회하는 데 동의하세요?','신청하시는 분이 구청의 소득, 재산 조회에 동의하세요?',
   '동의해야 신청을 받아 줘요. 주민센터 직원이 한 번 더 설명해 줘요.','yes_no', null::jsonb,
   true, false, null::bigint, null::bigint, null::jsonb,
   '개인정보 활용 동의', null::text, 190),

  ('consent_optional_1','consent_optional_1','선택 동의 1','확인과 동의',
   '기초생활보장이 안 되면 차상위 지원으로 이어서 신청할까요?','기초생활보장이 안 되면 차상위 지원으로 이어서 신청할까요?',
   '선택이에요. 동의하면 다시 신청하러 가지 않아도 돼요.','yes_no', null::jsonb,
   false, false, null::bigint, null::bigint, null::jsonb,
   '차상위로 이어서 신청', null::text, 191),

  ('consent_optional_2','consent_optional_2','선택 동의 2','확인과 동의',
   '나중에 형편이 바뀌면 기초생활보장도 자동으로 신청할까요?','나중에 형편이 바뀌면 기초생활보장도 자동으로 신청할까요?',
   '선택이에요.','yes_no', null::jsonb,
   false, false, null::bigint, null::bigint, null::jsonb,
   '형편 바뀌면 자동 신청', null::text, 192),

  ('consent_notice','consent_notice','유의사항 확인','확인과 동의',
   '거짓으로 적으면 받은 돈을 돌려줘야 하고, 형편이 바뀌면 알려야 해요. 확인하셨어요?','거짓으로 적으면 받은 돈을 돌려줘야 하고, 형편이 바뀌면 알려야 해요. 확인하셨어요?',
   '신청서 3쪽 유의사항을 쉽게 줄인 거예요.','yes_no', null::jsonb,
   true, false, null::bigint, null::bigint, null::jsonb,
   '유의사항 확인', null::text, 193)
) as v(key, common_key, label, section, question_easy, question_helper, help_easy, type, options, required, allow_unknown, min_value, max_value, show_if, confirm_label, check_guide, sort_order)
on conflict (program_id, key) do nothing;

-- 7) 제3자 제공 동의는 요금 감면을 고르면 같이 체크 (form_slot에서 fee_discount로 처리)

select key, type, sort_order from form_field where key in
 ('head_relation','members','spouse_relation','supporters','account','fee_discount','consent_required','consent_optional_1','consent_optional_2','consent_notice')
order by sort_order;
