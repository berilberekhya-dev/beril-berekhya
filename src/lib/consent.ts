export const CONSENT_KEY = 'beril-consent-v1';
export const CONSENT_VERSION = 1;
export const CONSENT_LIFETIME_MS = 180 * 24 * 60 * 60 * 1000;

export type ConsentRecord = {
  version: number;
  analytics: boolean;
  updatedAt: number;
  expiresAt: number;
};

export function createConsent(analytics: boolean, now = Date.now()): ConsentRecord {
  return { version: CONSENT_VERSION, analytics, updatedAt: now, expiresAt: now + CONSENT_LIFETIME_MS };
}

export function parseConsent(value: string | null, now = Date.now()): ConsentRecord | null {
  if (!value) return null;
  try {
    const record = JSON.parse(value) as Partial<ConsentRecord>;
    if (record.version !== CONSENT_VERSION || typeof record.analytics !== 'boolean'
      || !Number.isFinite(record.updatedAt) || !Number.isFinite(record.expiresAt)
      || record.updatedAt! > now || record.expiresAt! <= now
      || record.expiresAt! - record.updatedAt! > CONSENT_LIFETIME_MS) return null;
    return record as ConsentRecord;
  } catch { return null; }
}

export type PublicAnalyticsConfig = {
  measurementId: string;
  siteUrl: string;
  enabled: boolean;
  deploymentEnvironment: string;
};

export type AnalyticsEligibility = { eligible: boolean; reason: string; origin: string; measurementId: string };

export function analyticsEligibility(config: PublicAnalyticsConfig, currentUrl: string): AnalyticsEligibility {
  const blocked = (reason: string): AnalyticsEligibility => ({ eligible: false, reason, origin: '', measurementId: '' });
  if (!config.enabled || !/^G-[A-Z0-9]+$/.test(config.measurementId)) return blocked('not-configured');
  if (config.deploymentEnvironment !== 'production') return blocked('non-production');
  try {
    const expected = new URL(config.siteUrl);
    const current = new URL(currentUrl);
    const host = current.hostname.toLowerCase();
    if (current.protocol !== 'https:' || expected.protocol !== 'https:' || expected.origin !== current.origin)
      return blocked('unapproved-domain');
    if (host === 'localhost' || host === '::1' || host === '[::1]' || /^127\./.test(host)
      || /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host))
      return blocked('local-domain');
    return { eligible: true, reason: 'production', origin: expected.origin, measurementId: config.measurementId };
  } catch { return blocked('invalid-domain'); }
}

export const projectSlugs = [
  'hitalent', 'ut-operations', 'methodata', 'family-gathering', 'coal-agro',
  'astron-onboarding', 'video-violence-detection', 'palm-counting', 'gmi-bahtera', 'tactical-drone',
] as const;
export type ProjectSlug = typeof projectSlugs[number];
export type ContactChannel = 'email' | 'whatsapp' | 'instagram' | 'linkedin';
export type PortfolioEvent =
  | { name: 'select_project'; project: ProjectSlug; placement: 'hero' | 'featured' | 'index' | 'related' }
  | { name: 'file_download' }
  | { name: 'contact_click'; channel: ContactChannel };

export function safePagePath(input: string): string {
  const pathname = input.split(/[?#]/)[0].replace(/\/$/, '') || '/';
  if (['/', '/work', '/legal-notice', '/privacy-policy', '/cookie-policy'].includes(pathname)) return pathname;
  if (projectSlugs.some(slug => pathname === `/work/${slug}`)) return pathname;
  return '/404';
}

export function classifyAnalyticsLink(href: string, origin: string, placement: string | undefined): PortfolioEvent | null {
  try {
    const url = new URL(href, origin);
    if (url.protocol === 'mailto:') return { name: 'contact_click', channel: 'email' };
    if (['wa.me', 'api.whatsapp.com', 'www.whatsapp.com'].includes(url.hostname)) return { name: 'contact_click', channel: 'whatsapp' };
    if (['instagram.com', 'www.instagram.com'].includes(url.hostname)) return { name: 'contact_click', channel: 'instagram' };
    if (['linkedin.com', 'www.linkedin.com'].includes(url.hostname)) return { name: 'contact_click', channel: 'linkedin' };
    if (url.origin !== origin) return null;
    if (url.pathname === '/beril-berekhya-resume.pdf') return { name: 'file_download' };
    const project = projectSlugs.find(slug => url.pathname === `/work/${slug}`);
    if (project) {
      const safePlacement = ['hero', 'featured', 'index', 'related'].includes(placement || '')
        ? placement as 'hero' | 'featured' | 'index' | 'related' : 'related';
      return { name: 'select_project', project, placement: safePlacement };
    }
    return null;
  } catch { return null; }
}

export type AnalyticsAdapter = {
  initialize: (id: string, origin: string) => void;
  load: (id: string) => void;
  send: (name: string, parameters: Record<string, string>) => void;
  disable: (id: string) => void;
};

// Pure, injected boundary: tests can inspect every command without loading Google.
export function createAnalyticsController(eligibility: AnalyticsEligibility, adapter: AnalyticsAdapter) {
  let consent = false;
  let loaded = false;
  let lastPath: string | null = null;
  return {
    setConsent(allowed: boolean) {
      consent = eligibility.eligible && allowed;
      if (consent && !loaded) {
        adapter.initialize(eligibility.measurementId, eligibility.origin);
        adapter.load(eligibility.measurementId);
        loaded = true;
      } else if (!consent && loaded) {
        adapter.disable(eligibility.measurementId);
        loaded = false;
        lastPath = null;
      }
    },
    page(path: string) {
      if (!consent || !loaded) return;
      const safePath = safePagePath(path);
      if (safePath === lastPath) return;
      lastPath = safePath;
      adapter.send('page_view', { page_path: safePath, page_location: `${eligibility.origin}${safePath}` });
    },
    event(event: PortfolioEvent) {
      if (!consent || !loaded) return;
      if (event.name === 'select_project' && projectSlugs.includes(event.project))
        adapter.send('select_project', { project_slug: event.project, placement: ['hero', 'featured', 'index', 'related'].includes(event.placement) ? event.placement : 'related' });
      else if (event.name === 'file_download')
        adapter.send('file_download', { file_name: 'beril-berekhya-resume.pdf' });
      else if (event.name === 'contact_click' && ['email', 'whatsapp', 'instagram', 'linkedin'].includes(event.channel))
        adapter.send('contact_click', { contact_channel: event.channel });
    },
    get active() { return consent && loaded; },
  };
}
