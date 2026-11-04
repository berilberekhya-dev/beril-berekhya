import type { Metadata } from 'next';
import { PolicyPage } from '@/components/privacy/PolicyPage';
import { pageMetadata } from '@/lib/social-metadata';

export const metadata: Metadata = pageMetadata({ title: 'Legal notice', description: 'Publisher, contact, and ownership information for Beril Berekhya’s personal portfolio.', path: '/legal-notice' });

export default function LegalNotice() {
  return <PolicyPage title="Legal notice" intro="Who publishes this portfolio, and how the work shown here is presented.">
    <section><h2>Publisher and contact</h2><address>Beril Berekhya Mutia Hasibuan<br/>Individual publisher based in Indonesia<br/><a href="mailto:berilberekhya@gmail.com">berilberekhya@gmail.com</a></address><p>This is my personal professional portfolio. It introduces my background, selected contributions, research, and projects, and provides ways to contact me about work and collaboration.</p></section>
    <section><h2>The work on this site</h2><p>Case studies describe my contribution and the project’s documented stage. A prototype, prepilot, research project, or internal validation is identified as such. A platform being in production does not mean that every feature or integration described has been activated in production.</p><p>Some images are privacy-redacted original interfaces, and some are isolated previews or recreated examples. Their captions explain the relevant context. They are not claims about adoption, attendance, deployment scale, or measured business results.</p></section>
    <section><h2>Ownership and credits</h2><p>My original portfolio text and design implementation are protected by applicable intellectual-property law. Project materials, organisation names, product names, and marks belong to their respective owners. Their appearance documents the work and does not imply an endorsement.</p><p>The site uses the self-hosted Geist font under the <a href="/fonts/OFL-Geist.txt">SIL Open Font License</a>. The supplied résumé is available as a downloadable PDF. Please contact me before reusing my work or photographs beyond uses permitted by applicable law.</p></section>
    <section><h2>External destinations</h2><p>Links to project previews, publications, LinkedIn, Instagram, WhatsApp, and other websites open services operated by their respective providers. Their availability, content, and privacy practices are governed by those services.</p></section>
    <section><h2>Accuracy and updates</h2><p>I aim to keep the descriptions accurate and update them as projects develop. The site and its downloadable résumé may have different update dates. If you notice an error or have a rights-related concern, email me with the relevant page and details.</p></section>
  </PolicyPage>;
}
