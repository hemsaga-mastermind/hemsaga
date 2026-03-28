/** Canonical site URL for metadata, sitemap, and OG (no trailing slash). */
export function getSiteUrl() {
  const u = (process.env.NEXT_PUBLIC_SITE_URL || 'https://hemsaga.com').trim();
  return u.replace(/\/$/, '');
}
