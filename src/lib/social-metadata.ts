import type { Metadata } from 'next';

export const portfolioTitle = 'Beril Berekhya | Full-stack & AI developer';
export const portfolioDescription = 'I build web applications, AI tools, and automations for real-world operations. Explore my work, from idea to deployment.';

const defaultImage = {
  url: '/opengraph-image?preview=20261102',
  width: 1200,
  height: 630,
  alt: 'Beril Berekhya, full-stack and AI developer. Original 3D B sculpture with HiTalent and Methodata interface previews.',
};

export function pageMetadata({ title, description, path, image = defaultImage }: {
  title: string;
  description: string;
  path: string;
  image?: typeof defaultImage;
}): Metadata {
  const shareTitle = title === portfolioTitle ? title : `${title} | Beril Berekhya`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: shareTitle,
      description,
      siteName: 'Beril Berekhya',
      type: 'website',
      locale: 'en_US',
      url: path,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: shareTitle,
      description,
      images: [image],
    },
  };
}
