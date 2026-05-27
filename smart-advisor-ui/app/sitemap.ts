import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://ai.mubx.dev';

    return [
        {
            url: baseUrl,
            lastModified: new Date('2026-05-27'),
            changeFrequency: 'weekly',
            priority: 1,
        },
        {
            url: `${baseUrl}/planner`,
            lastModified: new Date('2026-05-27'),
            changeFrequency: 'weekly',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/courses`,
            lastModified: new Date('2026-05-20'),
            changeFrequency: 'monthly',
            priority: 0.7,
        },
        {
            url: `${baseUrl}/login`,
            lastModified: new Date('2026-02-01'),
            changeFrequency: 'monthly',
            priority: 0.6,
        },
        {
            url: `${baseUrl}/planner/study-log`,
            lastModified: new Date('2026-05-27'),
            changeFrequency: 'weekly',
            priority: 0.6,
        },
        {
            url: `${baseUrl}/ai-transparency`,
            lastModified: new Date('2026-05-01'),
            changeFrequency: 'monthly',
            priority: 0.4,
        },
        {
            url: `${baseUrl}/privacy`,
            lastModified: new Date('2026-02-27'),
            changeFrequency: 'yearly',
            priority: 0.3,
        },
        {
            url: `${baseUrl}/terms`,
            lastModified: new Date('2026-02-21'),
            changeFrequency: 'yearly',
            priority: 0.3,
        },
        // Note: /planner/settings is intentionally excluded — user-specific, noindex page
    ];
}
