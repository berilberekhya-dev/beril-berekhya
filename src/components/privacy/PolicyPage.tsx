import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Arrow } from '@/components/Arrow';
import s from './PolicyPage.module.css';

export function AnalyticsStatusNote() {
  const configured = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true'
    && /^G-[A-Z0-9]+$/.test(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '')
    && process.env.VERCEL_ENV === 'production';
  return <aside className={s.status}><strong>{configured ? 'Analytics is optional.' : 'Analytics is not active on this version.'}</strong><p>{configured ? 'Google Analytics is available only on the configured production domain and starts after you choose to allow it. Rejecting it does not affect the portfolio.' : 'This version does not load Google Analytics or create its tracking cookies. The consent system is prepared for a future activation.'}</p></aside>;
}

export function PolicyPage({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return <><Header light/><main id="main-content" className={`page-frame ${s.main}`}><Link href="/" className={s.back}><Arrow direction="left" size={17}/> Back to the portfolio</Link><header className={s.heading}><h1>{title}<span>.</span></h1><p>{intro}</p><span className={s.updated}>Last updated: 29 October 2026</span></header><article className={s.content}>{children}</article><div className={s.related}><Link href="/legal-notice">Legal notice</Link><Link href="/privacy-policy">Privacy policy</Link><Link href="/cookie-policy">Cookie policy</Link></div></main><Footer/></>;
}
