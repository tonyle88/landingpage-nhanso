begin;

alter table public.service_survey_responses
  drop constraint if exists service_survey_responses_survey_id_fkey;

alter table public.service_survey_responses
  add constraint service_survey_responses_survey_id_fkey
  foreign key (survey_id) references public.service_surveys(id) on delete cascade;

commit;
