-- One-time update for the October 2026 site refresh. New databases get this from seed.sql.
-- Run it once in the Supabase SQL editor (or with psql). It is safe to run more than once.
-- It only changes names and wording that still match the old defaults, so edits you made
-- in the dashboard are kept. It does not touch prices.

update offerings set name = 'GEO Setup', updated_at = now()
where slug = 'ai-search-setup' and name = 'AI Search Visibility (GEO)';

update offerings set name = 'AI Visibility Monitoring', updated_at = now()
where slug = 'ai-visibility-plan' and name = 'AI Visibility';

-- Name every AI assistant we mention, and only the ones the AI check actually asks.
update offerings set
  description = replace(description, 'AI assistants like ChatGPT can understand', 'AI assistants like ChatGPT, Claude, Gemini, Perplexity and Copilot can understand'),
  deliverables = array_replace(deliverables,
    'GEO included: structured data and an AI-friendly FAQ so ChatGPT and Google''s AI answers understand your business',
    'GEO included: structured data and an AI-friendly FAQ so Google and AI assistants understand your business'),
  updated_at = now()
where slug = 'business-website-launch';

update offerings set
  deliverables = array_replace(deliverables,
    'AI visibility check: real customer questions asked in ChatGPT, Google AI answers and Perplexity',
    'AI visibility check: real customer questions asked in ChatGPT, Gemini, Perplexity and Claude'),
  updated_at = now()
where slug = 'ai-search-setup';
