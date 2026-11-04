import Link from 'next/link';
import { Arrow } from './Arrow';
import { Words } from './Words';
import { CookieSettingsButton } from './privacy/PrivacyProvider';
import s from './Footer.module.css';

const contacts = [
  { name: 'WhatsApp', href: 'https://wa.me/6282391430073' },
  { name: 'Instagram', href: 'https://www.instagram.com/berilberekhya/' },
  { name: 'LinkedIn', href: 'https://www.linkedin.com/in/beril-berekhya/' },
];

export function Footer() {
  return <footer id="contact" className={s.footer} data-footer data-motion-section="footer">
    <div className={`page-frame ${s.dark}`}>
      <div className={s.top}>
        <p>Have a problem worth solving?</p>
        <a href="mailto:berilberekhya@gmail.com" className={s.email}>berilberekhya@gmail.com <Arrow size={20}/></a>
      </div>
      <div className={s.invitation}>
        <h2 data-motion-title><Words text="You dream it."/><br/><Words text="I build it."/></h2>
        <a href="mailto:berilberekhya@gmail.com" className={s.circle} aria-label="Start a conversation by email" data-magnetic data-footer-arrow><Arrow size={58}/></a>
      </div>
      <div className={s.contactRow}>
        <p>Useful systems.<br/>A human touch.</p>
        <div className={s.contacts}>{contacts.map(contact => <a key={contact.name} href={contact.href} target="_blank" rel="noreferrer">{contact.name} <Arrow size={17}/></a>)}<a href="/beril-berekhya-resume.pdf" download>Résumé <Arrow direction="down" size={17}/></a></div>
      </div>
    </div>
    <div className={s.legal} data-footer-legal>
      <div className={`page-frame ${s.legalInner}`}>
        <div className={s.identity}><Link href="/" className={s.wordmark}>© Beril Berekhya</Link><span>Indonesia</span></div>
        <a href="#top" className={s.backTop} aria-label="Back to top">Back to top <Arrow size={18}/></a>
        <nav className={s.policies} aria-label="Legal and privacy"><Link href="/legal-notice">Legal notice</Link><Link href="/privacy-policy">Privacy policy</Link><Link href="/cookie-policy">Cookie policy</Link><CookieSettingsButton/></nav>
        <span className={s.year}>{new Date().getFullYear()} · Built with care.</span>
      </div>
    </div>
  </footer>;
}
