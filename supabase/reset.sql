-- 예전 구조를 지운다. 시연용 데이터만 있으니 지워도 된다. 시연 중에는 실행하지 말 것.
drop table if exists resume_attempt, precheck_result, checklist_item, supplement_request, answer, application, precheck_rule, document_rule, form_field, welfare_program cascade;
