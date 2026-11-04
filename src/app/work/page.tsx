import type {Metadata} from 'next';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';
import {Motion} from '@/components/Motion';
import {ProjectIndex} from '@/components/ProjectIndex';
import {projects} from '@/data/projects';
import {pageMetadata} from '@/lib/social-metadata';
import s from './work.module.css';
export const metadata:Metadata=pageMetadata({title:'Work',description:'A collection of applied AI, operational software, integrations, community platforms, and computer-vision research by Beril Berekhya.',path:'/work'});
export default function Work(){return <><Header light/><main id="main-content" className={`page-frame ${s.main}`}><div className={`${s.heading} page-enter`}><h1>The work<span>.</span></h1><p>From a better everyday workflow to a question worth researching. A collection of things I’ve helped bring to life.</p></div><ProjectIndex projects={projects} filterable/><div className={s.note}><p>Every project has its own story.</p><p>The case studies explain my contribution and where the work stands today.</p></div></main><Footer/><Motion/></>}
