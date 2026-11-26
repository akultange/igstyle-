// Sitemap of every public page in both languages, with language alternates.
import type { APIRoute } from 'astro';
import { langs } from '../data/i18n';
import { occasions } from '../data/content';

const paths = [
  '', 'about/', 'program/', 'membership/',
  ...occasions.map((o) => `membership/${o.slug}/`), 'menu/', 'gallery/', 'booking/', 'careers/', 'privacy/', 'cookies/', 'terms/',
];

export const GET: APIRoute = ({ site }) => {
  const abs = (p: string) => new URL(p, site).href;
  const urls = paths.flatMap((p) => langs.map((l) => {
    const alts = langs.map((a) => `<xhtml:link rel="alternate" hreflang="${a}" href="${abs(`/${a}/${p}`)}"/>`).join('');
    return `<url><loc>${abs(`/${l}/${p}`)}</loc>${alts}</url>`;
  }));
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls.join('')}</urlset>\n`;
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
};
