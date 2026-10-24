-- One-time update for databases created before GEO was added to the packages.
-- New databases get this wording from seed.sql. Run it once, after `npm run db:setup`,
-- in the Supabase SQL editor (or with psql). It overwrites the wording of these offerings,
-- so redo any edits you made to them in the dashboard afterwards.

update offerings set
  deliverables = array['Online presence audit, including what AI assistants say about you', 'Google Business Profile optimization', 'Facebook and Instagram setup or cleanup', 'Review request link and message templates', 'Business information consistency check'],
  updated_at = now()
where slug = 'starter-online-presence';

update offerings set
  tagline = 'A new website with GEO included',
  description = 'A fast, mobile-friendly website that turns visitors into calls, built so Google and AI assistants like ChatGPT can understand and recommend you.',
  deliverables = array['Up to 5-page website', 'GEO included: structured data and an AI-friendly FAQ so ChatGPT and Google''s AI answers understand your business', 'Mobile-friendly design using your branding', 'Contact form and click-to-call buttons', 'Basic local SEO setup', 'Launch on hosting you own', 'Everything in Starter Online Presence'],
  updated_at = now()
where slug = 'business-website-launch';

update offerings set
  tagline = 'Website plus our full GEO setup',
  description = 'A larger site, refreshed branding, lead capture that responds for you, and our full AI search visibility setup.',
  deliverables = array['Up to 10 pages, including service-area pages and a gallery', 'Full GEO setup included: AI visibility check, competitor report and fixes', 'Brand refresh: colors, fonts and social graphics', 'Instant reply to new website leads', 'Review request automation', 'Everything in Starter Online Presence'],
  updated_at = now()
where slug = 'premium-digital-presence';

update offerings set
  deliverables = array['Everything in Growth', '8 social media posts', 'Review request management', 'One new SEO page each quarter', 'Quarterly AI visibility check'],
  updated_at = now()
where slug = 'presence-pro-plan';
