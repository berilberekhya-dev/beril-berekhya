import type {Metadata} from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {projects,getProject} from '@/data/projects';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';
import {Arrow} from '@/components/Arrow';
import {Motion} from '@/components/Motion';
import {PixelImage} from '@/components/PixelImage';
import {pageMetadata} from '@/lib/social-metadata';
import s from './case.module.css';
export const dynamicParams=false;
export function generateStaticParams(){return projects.map(p=>({slug:p.slug}))}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
 const p=getProject((await params).slug);
 return p?pageMetadata({title:p.shortTitle,description:p.summary,path:`/work/${p.slug}`,image:{url:p.cover,width:1440,height:1040,alt:p.gallery[0]?.alt||p.title}}):{title:'Project not found'};
}
export default async function CaseStudy({params}:{params:Promise<{slug:string}>}){
 const project=getProject((await params).slug);if(!project)notFound();
 const index=projects.findIndex(p=>p.slug===project.slug);const next=projects[(index+1)%projects.length];
 return <><Header/><main id="main-content"><section className={`${s.hero} page-enter`}><div className="page-frame"><Link href="/work" className={s.back}><Arrow direction="left" size={16}/> All work</Link><p className={s.category}>{project.category}</p><h1>{project.shortTitle}<span>.</span></h1><p className={s.headline}>{project.headline}</p><p className={s.summary}>{project.summary}</p><dl className={s.facts}><div><dt>My role</dt><dd>{project.role}</dd></div><div><dt>Stage</dt><dd>{project.status}</dd></div><div><dt>When</dt><dd>{project.year}</dd></div></dl></div></section>
 <div className={`page-frame ${s.cover}`}><PixelImage src={project.cover} alt={project.gallery[0]?.alt||project.title} priority sizes="(max-width:700px) 92vw, 94vw"/><p className={s.coverCaption}>{project.gallery[0]?.caption}</p></div>
 <section className={`page-frame ${s.story}`}><div className={s.storyRow} data-reveal><h2>The problem.</h2><p>{project.problem}</p></div><div className={s.storyRow} data-reveal><h2>Where I came in.</h2><ul className={s.bullets}>{project.contribution.map(c=><li key={c}>{c}</li>)}</ul></div>
 {project.gallery.filter(i=>i.src!==project.cover).map(item=><figure key={item.src} className={s.detail} data-reveal><Image src={item.src} alt={item.alt} width={1440} height={1040} sizes="(max-width:700px) 90vw, 85vw"/><figcaption>{item.caption}</figcaption></figure>)}
 <div className={s.storyRow} data-reveal><h2>How it comes together.</h2><ol className={s.workflow}>{project.workflow.map((w,i)=><li key={w}><span aria-hidden="true">{i+1}</span><p>{w}</p></li>)}</ol></div>
 <div className={s.storyRow} data-reveal><h2>The details that matter.</h2><ul className={s.bullets}>{project.decisions.map(d=><li key={d}>{d}</li>)}</ul></div>
 <div className={s.result} data-reveal><h2>Where it stands.</h2><p>{project.result}</p><div className={s.stack}>{project.stack.map(t=><span key={t}>{t}</span>)}</div>{project.links.length>0&&<div className={s.external}>{project.links.map(l=><a key={l.href} className="text-link" href={l.href} target="_blank" rel="noreferrer"><span>{l.label}</span><Arrow size={18}/></a>)}</div>}</div>
 <Link href={`/work/${next.slug}`} className={s.next}><div><span>Keep exploring</span><h2>{next.shortTitle}</h2><Arrow size={32}/></div><Image src={next.cover} alt="" width={500} height={361} sizes="(max-width:600px) 90vw, 35vw"/></Link>
 </section></main><Footer/><Motion/></>;
}
