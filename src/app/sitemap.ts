import type {MetadataRoute} from 'next';
import {projects} from '@/data/projects';
import {siteOrigin} from '@/lib/site-origin';
export default function sitemap():MetadataRoute.Sitemap{return ['','/work','/legal-notice','/privacy-policy','/cookie-policy',...projects.map(p=>`/work/${p.slug}`)].map(path=>({url:`${siteOrigin}${path}`}))}
