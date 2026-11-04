import Image from 'next/image';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { Footer } from '@/components/Footer';
import { Arrow } from '@/components/Arrow';
import { Motion } from '@/components/Motion';
import { ProjectPlate } from '@/components/ProjectPlate';
import { ProjectIndex } from '@/components/ProjectIndex';
import { Words } from '@/components/Words';
import { featuredProjects, projects } from '@/data/projects';
import { profile } from '@/data/profile';
import s from './page.module.css';

const capabilities = [
  { title: 'Integrate', description: 'APIs, databases, and the tools people already use. I connect the pieces so information can move with the work.', project: 'HiTalent integrations', slug: 'hitalent', tools: 'API development · SQL · System integration' },
  { title: 'Automate', description: 'I look for the repetitive parts, then build a useful way through them. Applied AI, document processing, and workflows with a clear purpose.', project: 'AI & recruitment workflows', slug: 'hitalent', tools: 'Python · LLM APIs · n8n · Computer vision' },
  { title: 'Develop', description: 'From the first form to the tricky edge cases. Applications built around real roles, real decisions, and people with a busy day ahead.', project: 'Inside Methodata', slug: 'methodata', tools: 'React · Next.js · TypeScript · Laravel · PostgreSQL' },
  { title: 'Deploy', description: 'A project needs a life beyond the editor. I work through the deployment, the environment, and the details that help a system stay useful.', project: 'ASTRON onboarding', slug: 'astron-onboarding', tools: 'Vercel · Cloudflare · Docker · CI/CD' },
];

function Separator() {
  return <svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M20 2v36M2 20h36M7.3 7.3l25.4 25.4M7.3 32.7 32.7 7.3" stroke="currentColor" strokeWidth="6" /></svg>;
}

export default function Home() {
  return <>
    <Header />
    <main id="main-content">
      <Hero />
      <section className={s.manifesto} aria-label="What drives my work" data-motion-section="manifesto">
        <div className={'page-frame ' + s.statement}>
          <p data-statement><span><Words text="software and ai serving" /></span><br /><span><Words text="real world operations." /></span></p>
          <span className={s.statementMark} aria-hidden="true"><Arrow direction="down-left" size={90} /></span>
        </div>
        <div className={s.beltWindow} aria-hidden="true">
          <div className={s.belt} data-belt>
            {[0, 1, 2, 3].map(i => <span key={i} className={s.verbGroup}>{['integrate', 'automate', 'develop', 'deploy'].map(verb => <span key={verb}>{verb}<span data-belt-separator><Separator /></span></span>)}</span>)}
          </div>
        </div>
        <p className="sr-only">Integrate, automate, develop, deploy.</p>
      </section>

      <section id="work" className={'page-frame ' + s.work} data-work-scene data-motion-section="work">
        <div className={s.workHeading} data-work-heading>
          <h2><Words text="Selected work." /></h2>
          <p>Different problems.<br />The same hands-on curiosity.</p>
        </div>
        <div className={s.projectGrid}>{featuredProjects.map((project, index) => <ProjectPlate key={project.slug} project={project} index={index} />)}</div>
        <div className={s.allWork} data-reveal><p>A few things I’ve been building.</p><Link className="text-link" href="/work"><span>Explore all 10 projects</span><Arrow size={23} /></Link></div>
      </section>

      <section className={'page-frame ' + s.about} aria-labelledby="about-title" data-motion-section="about">
        <div id="about" className={s.aboutIntro} data-about-intro>
          <div className={s.aboutHeading}>
            <h2 id="about-title"><Words text="Hi, I’m Beril." /></h2>
            <p>Curious by nature.<br />Practical by choice.</p>
          </div>
          <div className={s.portraitWrap}>
            <div className={s.portraitWell}><div className={s.portrait} data-portrait-reveal>
              <Image src={profile.portrait} alt="Beril Berekhya" width={1000} height={1000} sizes="(max-width:700px) 88vw, 35vw" data-portrait />
            </div></div>
            <p>Full-stack & AI developer. People person, too.</p>
          </div>
          <div className={s.aboutText}>
            <p className={s.aboutLead}>I like figuring things out.<br />Then making them work.</p>
            {profile.bio.slice(0, 2).map(paragraph => <p key={paragraph}>{paragraph}</p>)}
            <a href={profile.cv} download className="text-link"><span>A little more about me</span><Arrow direction="down" size={20} /></a>
          </div>
        </div>
        <p className={s.aboutContinuation} data-reveal>{profile.bio[2]}</p>
        <div className={s.experience}>
          <h3><Words text="A little of the journey." /></h3>
          <div>{profile.experience.map(experience => <article key={experience.company} className={s.experienceRow} data-reveal><div><p>{experience.company}</p><h4>{experience.role}</h4></div><span>{experience.period}</span></article>)}</div>
        </div>
        <div className={s.proof}>{profile.achievements.map(achievement => <a key={achievement.title} href={achievement.href} target="_blank" rel="noreferrer" data-reveal><Arrow size={22} /><div><h3>{achievement.title}</h3><p>{achievement.detail}</p></div></a>)}</div>
      </section>

      <section className={s.capabilities} data-motion-section="capabilities"><div id="capabilities" className="page-frame">
        <div className={s.capHeading}><h2><Words text="Ideas are a start." /><br /><Words text="I like building the rest." /></h2><p>Whether it needs an AI model, a better workflow, or a web application, I start with what the people using it need.</p></div>
        <div className={s.capList}>{capabilities.map((capability, index) => <details key={capability.title} open={index === 0} data-reveal><summary><h3>{capability.title}</h3><span className={s.plus} aria-hidden="true">+</span></summary><div className={s.capBody}><p>{capability.description}</p><div><p className={s.tools}>{capability.tools}</p><Link href={'/work/' + capability.slug} className="text-link"><span>{capability.project}</span><Arrow size={20} /></Link></div></div></details>)}</div>
      </div></section>

      <section className={'page-frame ' + s.more} data-motion-section="archive">
        <div className={s.sectionHeading}><h2><Words text="Still curious?" /></h2><p>A few more things<br />from the workbench.</p></div>
        <ProjectIndex projects={projects.filter(project => !project.featured)} />
        <div className={s.moreLink}><Link href="/work" className="text-link"><span>The complete collection</span><Arrow size={22} /></Link></div>
      </section>
    </main>
    <Footer />
    <Motion />
  </>;
}
