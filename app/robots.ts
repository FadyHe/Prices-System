import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/search-test', '/test'],
      },
    ],
    sitemap: 'https://qarinha.app/sitemap.xml',
  };
}
