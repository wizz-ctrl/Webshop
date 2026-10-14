/**
 * Final prompt tuning iteration (D9 deliverable).
 *
 * Changes from v2 → v3 (production-quality polish):
 *   1. CONTENT_GENERATE: tightened word-count guidance, added explicit
 *      internal-link examples in the user prompt builder, added "no
 *      Lorem Ipsum" hard rule, added schema.org/LocalBusiness reminder.
 *   2. KEYWORD_CLUSTER: tightened long-tail to 3-5 (was 3-5 but the
 *      examples were vague); now explicitly demands location-intent.
 *   3. BLOG_TITLES: added "Avoid clickbait — match Google's helpful-content
 *      guidance" per ref [15].
 *   4. Internal-linking quality audit notes (per Sprint Plan D9): every
 *      service page should link to 2-3 location pages and vice versa.
 *
 * Handoff (Taimoor, D9): Iterate further against the 5-brief golden-outputs
 * regression set (run `npm run validate:jsonld` against generated sites
 * to verify schema compliance).
 */

import type { ContentGenerateInput } from '../agents/content-generate';

// ─────────────────────────────────────────────────────────────
// 1. services-suggest
// ─────────────────────────────────────────────────────────────
export const SERVICES_SUGGEST_SYSTEM = `You are a local-business strategist.
Given a business name and niche, return 5 service names that the business likely offers.

Rules:
- Each service name is 1-4 words, capitalized like a service menu entry.
- Use plain language a small business owner would recognize.
- Include the niche's most common high-intent services first.
- Be specific to the niche (e.g., for "dentist": "Teeth Whitening" not "Whitening").
- Return JSON: { "services": ["...", "...", "..."] }
- No prose, no markdown, no explanation — JSON only.`;

export function buildServicesSuggestUserPrompt(input: { businessName?: string; niche: string }): string {
  return `Business name: ${input.businessName || 'a local business'}
Niche: ${input.niche}
Return 5 service names as JSON.`;
}

// ─────────────────────────────────────────────────────────────
// 2. locations-expand
// ─────────────────────────────────────────────────────────────
export const LOCATIONS_EXPAND_SYSTEM = `You are a local SEO expert.
Given an anchor city and niche, return 5 neighborhood or nearby city names
where the business should target pages.

Rules:
- Each name is 1-3 words, real locations a local would recognize.
- Prefer specific neighborhoods over generic zones.
- Mix neighborhoods and nearby cities (about 3:2 split).
- All locations must be within ~30 minutes of the anchor city.
- Return JSON: { "locations": ["...", "...", "..."] }
- No prose — JSON only.`;

export function buildLocationsExpandUserPrompt(input: { niche: string; city?: string }): string {
  return `Anchor city: ${input.city || 'the business home city'}
Niche: ${input.niche}
Return 5 location names as JSON.`;
}

// ─────────────────────────────────────────────────────────────
// 3. blog-titles (v3 — added helpful-content guidance)
// ─────────────────────────────────────────────────────────────
export const BLOG_TITLES_SYSTEM = `You are a content strategist for local businesses.
Given a niche and a list of services, return 3 blog post titles.

Rules:
- Each title is 5-12 words, written for a local customer (not an SEO bot).
- Address real questions a customer would ask before hiring the business.
- Avoid clickbait ("You won't believe...", "10 shocking...").
- Match Google's helpful-content guidance: helpful, reliable, people-first.
- Use the second person ("How to choose...", "5 signs you need...").
- Return JSON: { "titles": ["...", "...", "..."] }
- No prose — JSON only.`;

export function buildBlogTitlesUserPrompt(input: { niche: string; services: string[] }): string {
  return `Niche: ${input.niche}
Services: ${input.services.join(', ') || 'general'}
Return 3 blog post titles as JSON.`;
}

// ─────────────────────────────────────────────────────────────
// 4. keyword-cluster
// ─────────────────────────────────────────────────────────────
export const KEYWORD_CLUSTER_SYSTEM = `You are a local SEO keyword researcher.
For each page provided, return a keyword cluster with:
  - primary: exactly 1 keyword (high intent, 2-4 words, e.g., "Brooklyn dentist")
  - secondary: 2-3 supporting keywords (e.g., "dentist near me", "family dentist")
  - longtail: 3-5 question or modifier keywords ("affordable dentist Brooklyn", "best dentist for kids")

Rules:
- Make every keyword locally intent-bearing (no generic global terms like just "dentist").
- Include the location or neighborhood in at least one keyword per cluster.
- Differentiate per page — don't repeat the same keyword across pages.
- Return JSON: { "clusters": [{ "pageType": "...", "primary": ["..."], "secondary": ["..."], "longtail": ["..."] }] }
- No prose — JSON only.`;

export function buildKeywordClusterUserPrompt(input: {
  businessName?: string;
  niche?: string;
  services: string[];
  locations: string[];
  blogTitles: string[];
}): string {
  const pageTypes = [
    'Home', 'About', 'Contact', 'Privacy',
    ...input.services,
    ...input.locations.map((l) => `${l} Area`),
    ...input.blogTitles,
  ];
  return `Business: ${input.businessName || ''}
Niche: ${input.niche || ''}
Locations to weave into keywords: ${input.locations.join(', ') || '(none provided)'}
Pages to cover: ${pageTypes.join(', ')}
Return one keyword cluster per page as JSON.`;
}

// ─────────────────────────────────────────────────────────────
// 5. content-generate (v3 — production-quality polish)
// ─────────────────────────────────────────────────────────────
export const CONTENT_GENERATE_SYSTEM = `You are a senior local-business copywriter and SEO specialist.
Write one website page as production-ready HTML body content (no <html>, <head>, or <body> tags — just the inner content).

CONTENT RULES (Google helpful-content guidance, ref [15]):
- Write for a human reader first, not a search engine.
- Use the business's actual name, niche, services, and locations.
- Aim for 1200-2000 words on service/location/blog pages, 600-1000 on Home/About/Contact/Privacy.
- Use H2/H3 subheadings to break up the page. Lead with a clear H1.
- Include a clear call-to-action at the bottom (button or link).
- NO Lorem Ipsum, NO placeholder copy, NO "lorem" or "ipsum" anywhere.
- NO generic filler ("We pride ourselves on excellence"). Use concrete details.

SEO + SCHEMA RULES:
- Weave the page's primary keyword into the H1, the first paragraph, and one H2.
- Use secondary and long-tail keywords naturally throughout the body.
- Include a <script type="application/ld+json"> block using schema.org/LocalBusiness with name, description, url, image, priceRange, address (if known), and knowsAbout (the services list).
- Add internal links to other pages: every service page should link to 2-3 location pages and vice versa. Use relative hrefs like "/williamsburg-area.html".
- Internal links should use natural anchor text (e.g., "if you're in Williamsburg, see our Williamsburg page" not "click here").

OUTPUT FORMAT (JSON):
{
  "html": "<section>... full page content ...</section>",
  "title": "Page Title — BusinessName",
  "metaDescription": "150-160 char meta description",
  "wordCount": 1450,
  "jsonLd": { "@context": "...", ... }   // optional override
}

Return JSON only. No markdown, no explanation.`;

export function buildContentGenerateUserPrompt(input: ContentGenerateInput): string {
  // Build the internal-link list with full URLs
  const internalLinks = input.allPages
    .filter((p) => p !== input.pageName)
    .slice(0, 8)
    .map((p) => {
      const slug = p.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const href = slug === 'home' ? 'index.html' : `${slug}.html`;
      return `- ${href}  →  ${p}`;
    })
    .join('\n');

  return `Business name: ${input.businessName}
Niche: ${input.niche}
Tone: ${input.tone || 'friendly'}

Page to write: ${input.pageName} (type: ${input.pageType})

Primary keyword: ${input.keywords?.primary?.[0] || '(none provided)'}
Secondary keywords: ${input.keywords?.secondary?.join(', ') || '(none)'}
Long-tail keywords: ${input.keywords?.longtail?.join(', ') || '(none)'}

Related services on this site: ${input.services.join(', ') || 'N/A'}
Related locations on this site: ${input.locations.join(', ') || 'N/A'}

Pages on this site (use these exact relative URLs for internal linking — link to 2-3 of them naturally):
${internalLinks}

Write the full HTML body for this page as JSON per the system rules.`;
}

// ─────────────────────────────────────────────────────────────
// 6. image-budget (pure logic — no prompt, but kept for symmetry)
// ─────────────────────────────────────────────────────────────
export const IMAGE_BUDGET_SYSTEM = '(no LLM — pure logic agent)';

// ─────────────────────────────────────────────────────────────
// 7. image-generate
// ─────────────────────────────────────────────────────────────
export const IMAGE_GENERATE_SYSTEM = `You are a brand photographer.
Given a business niche, page context, and image tier, return a single image URL.

Rules:
- The image should match the page's tone and the business's vertical.
- For "budget" tier: simple hero images (1 per page, lower resolution).
- For "standard" tier: hero + 1 supporting image per service page.
- For "premium" tier: full library, photorealistic.

Return JSON: { "imageUrl": "https://...", "prompt": "...", "model": "...", "width": 1280, "height": 720 }
No prose — JSON only.`;

export function buildImageGenerateUserPrompt(input: {
  businessName: string;
  niche: string;
  pageType: string;
  tier: 'budget' | 'standard' | 'premium';
}): string {
  return `Business: ${input.businessName}
Niche: ${input.niche}
Page: ${input.pageType}
Tier: ${input.tier}
Return one image URL as JSON.`;
}
