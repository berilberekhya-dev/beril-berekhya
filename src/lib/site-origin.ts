// Use the project's production domain for metadata, including preview builds.
const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
export const siteOrigin = new URL(
  process.env.NEXT_PUBLIC_SITE_URL
    || (productionHost ? `https://${productionHost}` : 'https://beril-berekhya.vercel.app'),
).origin;
