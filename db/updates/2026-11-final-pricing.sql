-- Final prices and package contents, agreed with Alvin on 2026-11-24.
-- Run once in the Supabase SQL editor. Safe to run again: every statement sets
-- fixed values, and the new add-ons use "on conflict do update".

-- Starter is folded into GEO Setup, so it is hidden (not deleted).
-- Add-ons we haven't delivered yet are hidden until we have.
update offerings set active = false, updated_at = now()
where slug in ('starter-online-presence', 'review-automation', 'ai-chatbot', 'ai-lead-response', 'brand-identity-kit');

-- Packages ------------------------------------------------------------------

update offerings set
  price_cents = 69700,
  tagline = 'For businesses that don''t need a new website',
  description = 'Keep your current website, or skip one entirely. We get your Google profile, reviews and listings in shape, and make your business easy for AI assistants to find, understand and recommend. Paid in full when you order.',
  deliverables = array[
    'AI visibility check: real customer questions asked in ChatGPT, Gemini, Perplexity and Claude',
    'Report showing where you appear and which competitors are named instead',
    'Google Business Profile optimization',
    'Replies to your existing Google reviews',
    'Review link, QR card and text templates to ask for new reviews',
    'Facebook and Instagram profile cleanup',
    'Service and FAQ content written for AI answers, on your website or Google Business Profile',
    'Structured data (schema markup) for your business',
    'Listing fixes on the directories AI tools use, like Bing, Apple Maps and Yelp'
  ],
  sort = 10,
  updated_at = now()
where slug = 'ai-search-setup';

update offerings set
  price_cents = 149700,
  description = 'A fast, mobile-friendly website that turns visitors into calls, built so Google and AI assistants like ChatGPT, Claude, Gemini, Perplexity and Copilot can understand and recommend you. 50% to start, 50% before your site goes live.',
  deliverables = array[
    'Up to 5-page website',
    '3 city pages for the areas you serve',
    'GEO included: structured data and an AI-friendly FAQ so Google and AI assistants understand your business',
    'Mobile-friendly design using your branding',
    'Contact form and click-to-call buttons',
    'Business email setup, up to 2 inboxes (you pay Google directly)',
    'Google Business Profile optimization and replies to your existing reviews',
    'Review link, QR card and text templates',
    'Listings on Bing, Apple Maps and Yelp checked and fixed',
    'Google Search Console and Bing Webmaster Tools setup',
    'Launch on hosting you own',
    'Small fixes free for 30 days after launch'
  ],
  revision_rounds = 2,
  updated_at = now()
where slug = 'business-website-launch';

update offerings set
  price_cents = 299700,
  description = 'A larger site, refreshed branding, lead capture that responds for you, and our full AI search visibility setup. 50% to start, 50% before your site goes live.',
  deliverables = array[
    'Up to 10 pages, including service pages and a gallery',
    'Up to 8 city pages for the areas you serve',
    'Full GEO setup included: AI visibility check, competitor report and fixes',
    'Brand refresh: colors, fonts and social graphics',
    'Instant reply to new website leads',
    'Review request automation',
    'Everything in Business Website Launch'
  ],
  revision_rounds = 2,
  updated_at = now()
where slug = 'premium-digital-presence';

-- Monthly plans (optional, month to month, cancel anytime) ----------------------

update offerings set
  price_cents = 7900,
  description = 'Keep your website healthy. Website care only, no posting.',
  deliverables = array[
    'Uptime and contact form monitoring',
    'Security checks',
    '30 minutes of edits each month',
    'Month to month, cancel anytime'
  ],
  updated_at = now()
where slug = 'care-plan';

update offerings set
  price_cents = 19900,
  description = 'Stay active on Google and keep improving.',
  deliverables = array[
    'Everything in Care',
    '1 hour of edits each month',
    '4 Google Business Profile posts a month (one a week)',
    'A reply to every new Google review',
    'Monthly review and lead report',
    'Month to month, cancel anytime'
  ],
  updated_at = now()
where slug = 'growth-plan';

update offerings set
  price_cents = 39900,
  description = 'We keep your whole online presence moving.',
  deliverables = array[
    'Everything in Growth',
    '8 Facebook and Instagram posts a month (two a week)',
    'Review request management',
    'One new SEO page each quarter',
    'Monthly AI visibility check',
    'Month to month, cancel anytime'
  ],
  updated_at = now()
where slug = 'presence-pro-plan';

-- Replaces AI Visibility Monitoring ($249). Same slug, so links and lead notes keep working.
update offerings set
  name = 'Google & AI Care',
  tagline = 'For businesses without our website',
  price_cents = 14900,
  price_suffix = '/month',
  description = 'We keep your Google profile active and check what AI assistants say about you every month.',
  deliverables = array[
    '4 Google Business Profile posts a month (one a week)',
    'A reply to every new Google review',
    'Monthly AI visibility check on the same customer questions',
    'Short report: where you appear, who is named instead, what changed',
    'Ongoing fixes to FAQs, listings and structured data',
    'Month to month, cancel anytime'
  ],
  updated_at = now()
where slug = 'ai-visibility-plan';

-- Add-ons -------------------------------------------------------------------

update offerings set
  name = 'Professional logo',
  price_cents = 39700,
  price_suffix = '',
  description = 'A custom, professionally vectorized logo that stays sharp at any size, from business cards to truck wraps. 2 concepts and 2 revision rounds included.',
  deliverables = array[
    '2 logo concepts to choose from',
    'Vector files (SVG, PDF, EPS), plus PNG and web versions',
    'Full-color, white and black versions',
    'You own all rights to it'
  ],
  revision_rounds = 2,
  updated_at = now()
where slug = 'logo-creation';

update offerings set
  name = 'City page',
  price_cents = 4900,
  price_suffix = 'each',
  description = 'A page for another city you serve, written with local details. Website Launch includes 3 and Premium includes up to 8.',
  updated_at = now()
where slug = 'service-area-page';

update offerings set price_cents = 9500, updated_at = now() where slug = 'extra-revision';

insert into offerings (slug, kind, name, tagline, price_cents, price_suffix, description, deliverables, revision_rounds, sort, active) values
('city-page-5-pack', 'addon', 'City pages, 5-pack', '', 19900, '', 'Five more city pages, each written with local details.', '{}', null, 45, true),
('business-email-setup', 'addon', 'Business email setup', '', 9900, '',
  'A professional address like you@yourbusiness.com on Google Workspace, set up so your mail lands in inboxes, not spam. Up to 2 inboxes; you pay Google directly. Included with every website package.',
  '{}', null, 35, true)
on conflict (slug) do update set
  kind = excluded.kind, name = excluded.name, price_cents = excluded.price_cents, price_suffix = excluded.price_suffix,
  description = excluded.description, sort = excluded.sort, active = true, updated_at = now();
