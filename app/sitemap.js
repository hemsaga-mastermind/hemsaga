import { getSiteUrl } from '../lib/site-url';

export default function sitemap() {
  const base = getSiteUrl();
  const now = new Date();
  return [
    { url: base, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/auth`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
  ];
}
