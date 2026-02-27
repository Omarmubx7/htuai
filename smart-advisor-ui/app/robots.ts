import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/api/', '/admin/'],
            },
            // Allow AI crawlers for AEO/GEO visibility
            { userAgent: 'GPTBot', allow: '/' },
            { userAgent: 'Google-Extended', allow: '/' },
            { userAgent: 'ChatGPT-User', allow: '/' },
            { userAgent: 'anthropic-ai', allow: '/' },
            { userAgent: 'ClaudeBot', allow: '/' },
            { userAgent: 'PerplexityBot', allow: '/' },
            { userAgent: 'Bytespider', allow: '/' },
        ],
        sitemap: 'https://htuai.mubx.dev/sitemap.xml',
    };
}
