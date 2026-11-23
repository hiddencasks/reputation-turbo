-- Client checklist with real boxes (Nov 2026): each checklist item gets a key and its form answers.
-- Safe to run more than once. Answers typed before this change are kept.

alter table intake_items add column if not exists key text not null default '';
alter table intake_items add column if not exists fields jsonb not null default '{}'::jsonb;

update intake_items i set key = m.key
from (values
  ('Business name', 'business_name'),
  ('Address, and whether customers come to you or you go to them', 'address'),
  ('Phone number and email to show customers', 'contact'),
  ('Business hours', 'hours'),
  ('Services and prices to show', 'services'),
  ('Cities and neighborhoods you want customers from', 'areas'),
  ('Licenses, certifications or awards', 'licenses'),
  ('Payment types, languages spoken, parking and anything else customers ask', 'extras'),
  ('Two or three competitors you respect or want to beat', 'competitors'),
  ('Your logo', 'logo'),
  ('Photos', 'photos'),
  ('Colors you like, and one or two websites you like the look of', 'style'),
  ('Three to five customer reviews or quotes you''re OK sharing', 'reviews'),
  ('Domain name', 'domain'),
  ('Website hosting account', 'hosting'),
  ('Google Business Profile', 'google'),
  ('Facebook and Instagram', 'social'),
  ('Other listings you already have', 'listings'),
  ('Do you want a business email at your own domain?', 'business_email')
) as m(label, key)
where i.label = m.label and i.key = '';
