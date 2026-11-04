import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PrivacyProvider } from '@/components/privacy/PrivacyProvider';
import { siteOrigin } from '@/lib/site-origin';
import { CustomCursor } from '@/components/CustomCursor';
import { pageMetadata, portfolioTitle, portfolioDescription } from '@/lib/social-metadata';
import { IntroLoader } from '@/components/IntroLoader';
export const metadata: Metadata = {
  ...pageMetadata({ title: portfolioTitle, description: portfolioDescription, path: '/' }),
  title: { default: portfolioTitle, template: '%s | Beril Berekhya' },
  metadataBase: new URL(siteOrigin),
  robots: { index: true, follow: true },
};
export const viewport: Viewport = { themeColor: '#11110f' };
export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en"><body id="top"><IntroLoader /><div id="site-content"><a className="skip-link" href="#main-content">Skip to content</a><PrivacyProvider config={{ measurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '', siteUrl: process.env.NEXT_PUBLIC_SITE_URL || '', enabled: process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true', deploymentEnvironment: process.env.VERCEL_ENV || 'local' }}>{children}</PrivacyProvider></div><CustomCursor /></body></html>;
}
