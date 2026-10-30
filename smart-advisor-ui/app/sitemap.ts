import { MetadataRoute } from 'next';
import { MAJOR_LIST, majorSlug } from '@/lib/majors';
import { SITE_URL } from '@/lib/seo';

const LAST_UPDATED = new Date('2026-10-30');

export default function sitemap(): MetadataRoute.Sitemap {
    const publicPages: Array<{
        path: string;
        priority: number;
        changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
    }> = [
        { path: '', priority: 1.0, changeFrequency: 'weekly' },
        { path: '/gpa-calculator', priority: 0.95, changeFrequency: 'monthly' },
        { path: '/courses', priority: 0.9, changeFrequency: 'monthly' },
        { path: '/majors', priority: 0.85, changeFrequency: 'monthly' },
        { path: '/resources', priority: 0.8, changeFrequency: 'weekly' },
        { path: '/how-it-works', priority: 0.7, changeFrequency: 'monthly' },
        { path: '/faq', priority: 0.7, changeFrequency: 'monthly' },
        { path: '/about', priority: 0.6, changeFrequency: 'monthly' },
        { path: '/ai-transparency', priority: 0.5, changeFrequency: 'monthly' },
        { path: '/for-ai', priority: 0.5, changeFrequency: 'monthly' },
        { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
        { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
    ];

    const majorPages = MAJOR_LIST.map((major) => ({
        path: `/majors/${majorSlug(major.key)}`,
        priority: 0.75,
        changeFrequency: 'monthly' as const,
    }));

    return [...publicPages, ...majorPages].map((page) => ({
        url: `${SITE_URL}${page.path}`,
        lastModified: LAST_UPDATED,
        changeFrequency: page.changeFrequency,
        priority: page.priority,
    }));
}
