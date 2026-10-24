-- Starting offerings from the approved plan. Prices are proposals and stay
-- hidden on the public site until "Show prices" is turned on in the dashboard.

insert into settings (key, value) values ('show_prices', 'false')
on conflict (key) do nothing;

insert into offerings (slug, kind, name, tagline, price_cents, price_suffix, description, deliverables, revision_rounds, est_hours_low, est_hours_high, sort) values
('starter-online-presence', 'package', 'Starter Online Presence', 'For businesses that already have a website', 49700, '', 'Get your Google listing, social profiles and review requests working for you.',
  array['Online presence audit', 'Google Business Profile optimization', 'Facebook and Instagram setup or cleanup', 'Review request link and message templates', 'Business information consistency check'], 2, 4, 6, 10),
('business-website-launch', 'package', 'Business Website Launch', 'A professional website plus the essentials', 149700, '', 'A fast, mobile-friendly website that turns visitors into calls and quote requests.',
  array['Up to 5-page website', 'Mobile-friendly design using your branding', 'Contact form and click-to-call buttons', 'Basic local SEO setup', 'Launch on hosting you own', 'Everything in Starter Online Presence'], 2, 10, 14, 20),
('premium-digital-presence', 'package', 'Premium Digital Presence', 'For businesses ready to stand out', 299700, '', 'A larger site, refreshed branding, and lead capture that responds for you.',
  array['Up to 10 pages, including service-area pages and a gallery', 'Brand refresh: colors, fonts and social graphics', 'Instant reply to new website leads', 'Review request automation', 'Everything in Starter Online Presence'], 2, 20, 26, 30),
('logo-creation', 'addon', 'Logo creation', '', 39700, '', '2 concepts and 2 revision rounds.',
  array['Primary logo', 'Simplified variation', 'Transparent PNG and web formats', 'Light and dark versions', 'Vector file'], 2, null, null, 10),
('brand-identity-kit', 'addon', 'Brand identity kit', '', 89700, '', 'Logo, colors, fonts and ready-to-use brand assets.',
  array['Logo creation or refinement', 'Primary and secondary colors', 'Typography recommendations', 'Social profile and cover images', 'Business card design', 'Email signature', 'Basic brand guidelines'], 2, null, null, 20),
('additional-page', 'addon', 'Additional website page', '', 15000, '', '', '{}', null, null, null, 30),
('service-area-page', 'addon', 'Service-area page', '', 12500, '', 'A page for a specific city you serve.', '{}', null, null, null, 40),
('photo-gallery', 'addon', 'Expanded photo gallery', '', 15000, '', '', '{}', null, null, null, 50),
('extra-revision', 'addon', 'Additional revision round', '', 9500, '', '', '{}', null, null, null, 60),
('social-post-pack', 'addon', 'Social media post pack', '', 19700, '', '8 branded posts with captions.', '{}', null, null, null, 70),
('review-automation', 'addon', 'Review request automation', '', 29700, 'setup', '', '{}', null, null, null, 80),
('booking-integration', 'addon', 'Appointment booking integration', '', 19700, 'setup', 'You pay the booking tool directly.', '{}', null, null, null, 90),
('ai-chatbot', 'addon', 'AI website chatbot', '', 39700, 'setup + $49/month', '', '{}', null, null, null, 100),
('ai-lead-response', 'addon', 'AI lead response automation', '', 29700, 'setup + $39/month', '', '{}', null, null, null, 110),
('extra-local-seo', 'addon', 'Additional local SEO', '', 39700, '', 'Citation cleanup and 3 location or service pages.', '{}', null, null, null, 120),
('blog-post', 'addon', 'Blog post', '', 15000, 'each', '', '{}', null, null, null, 130),
('ai-search-setup', 'addon', 'AI search visibility setup (GEO)', 'Get mentioned by ChatGPT and Google AI answers', 69700, 'setup', 'Make your business easy for AI assistants to find, understand and recommend.',
  array['AI visibility check: real customer questions asked in ChatGPT, Google AI answers and Perplexity', 'Report showing where you appear and which competitors are named instead', 'Service, service-area and FAQ content written for AI answers', 'Structured data (schema markup) for your business', 'Listing consistency fixes on the directories AI tools use'], null, null, null, 140),
('care-plan', 'plan', 'Care', '', 7900, '/month', 'Keep your website healthy.',
  array['Uptime and contact form monitoring', 'Security checks', '30 minutes of edits each month'], null, null, null, 10),
('growth-plan', 'plan', 'Growth', '', 19900, '/month', 'Stay active on Google and keep improving.',
  array['Everything in Care', '1 hour of edits each month', '4 Google Business Profile posts', 'Monthly review and lead report'], null, null, null, 20),
('presence-pro-plan', 'plan', 'Presence Pro', '', 39900, '/month', 'We keep your whole online presence moving.',
  array['Everything in Growth', '8 social media posts', 'Review request management', 'One new SEO page each quarter'], null, null, null, 30),
('ai-visibility-plan', 'plan', 'AI Visibility', '', 24900, '/month', 'We check what AI assistants say about you every month and keep improving it.',
  array['Monthly AI visibility check on the same customer questions', 'Short report: where you appear, who is named instead, what changed', 'Ongoing fixes to FAQs, listings and structured data', 'Review request guidance focused on what AI tools read'], null, null, null, 40)
on conflict (slug) do nothing;
