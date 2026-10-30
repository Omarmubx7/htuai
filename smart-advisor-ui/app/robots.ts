import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

/**
 * AI crawlers are allowed on public pages only. Authenticated app routes
 * (/planner, /admin, /api) are private and carry no crawlable content.
 */
const AI_CRAWLERS = [
    'GPTBot',
    'OAI-SearchBot',
    'ChatGPT-User',
    'Google-Extended',
    'ClaudeBot',
    'Claude-Web',
    'anthropic-ai',
    'PerplexityBot',
    'Perplexity-User',
    'Applebot-Extended',
    'CCBot',
    'cohere-ai',
    'Meta-ExternalAgent',
    'Amazonbot',
    'MistralAI-User',
    'YouBot',
];

const PRIVATE_PATHS = [
    '/api/',
    '/admin/',
    '/login',
    '/dashboard',
    '/planner',
];

/** Public machine-readable endpoints stay crawlable even though /api is private. */
const PUBLIC_ALLOW = ['/', '/api/public/'];

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: PUBLIC_ALLOW,
                disallow: PRIVATE_PATHS,
            },
            // Explicit allow for AI answer engines so they can cite the public pages.
            ...AI_CRAWLERS.map((userAgent) => ({
                userAgent,
                allow: PUBLIC_ALLOW,
                disallow: PRIVATE_PATHS,
            })),
        ],
        sitemap: `${SITE_URL}/sitemap.xml`,
        host: SITE_URL,
    };
}
