'use client';
import {useState,useEffect} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type {Project} from '@/data/projects';
import {Arrow} from './Arrow';
import s from './ProjectIndex.module.css';
const filters=['All','Software & operations','AI & automation','Research & exploration'];
export function ProjectIndex({projects,filterable=false}:{projects:Project[];filterable?:boolean}){
 const [filter,setFilter]=useState('All');const [preview,setPreview]=useState(projects[0]);
 const ProjectHeading=filterable?'h2':'h3';
 useEffect(()=>{if(!filterable)return;const value=new URL(window.location.href).searchParams.get('category');if(value&&filters.includes(value)){setFilter(value);setPreview(value==='All'?projects[0]:projects.find(project=>project.category===value)||projects[0]);}},[filterable,projects]);
 const visible=filter==='All'?projects:projects.filter(p=>p.category===filter);
 const changeFilter=(value:string)=>{setFilter(value);const first=value==='All'?projects[0]:projects.find(p=>p.category===value);if(first)setPreview(first);const url=new URL(window.location.href);if(value==='All')url.searchParams.delete('category');else url.searchParams.set('category',value);window.history.replaceState(window.history.state,'',url)};
 return <div className={s.index}>{filterable&&<div className={s.filters} role="group" aria-label="Filter projects">{filters.map(f=><button key={f} aria-pressed={f===filter} className={f===filter?s.active:''} onClick={()=>changeFilter(f)}>{f}</button>)}</div>}
 {filterable&&<p className={s.count} aria-live="polite">{visible.length} {visible.length===1?'project':'projects'}</p>}
 <div className={s.layout}><ul className={s.list}>{visible.map(p=><li key={p.slug}><Link href={`/work/${p.slug}`} onMouseEnter={()=>setPreview(p)} onFocus={()=>setPreview(p)} className={s.row}><div className={s.mobileImage}><Image src={p.cover} alt="" width={160} height={105} sizes="90px"/></div><div className={s.rowText}><ProjectHeading>{p.shortTitle}</ProjectHeading><p>{p.tags.slice(0,2).join(' / ')}</p></div><span className={s.year}>{p.year}</span><Arrow size={25}/></Link></li>)}</ul>
 {preview&&<div className={s.preview} aria-hidden="true" data-archive-preview><div className={s.previewInner}><Image key={preview.slug} src={preview.cover} alt="" width={600} height={433} sizes="35vw"/><div><span>{preview.shortTitle}</span><span>{preview.status}</span></div></div></div>}</div></div>;
}
