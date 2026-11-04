'use client';
import Link from 'next/link';
import {useState,useEffect,useRef} from 'react';
import {Arrow} from './Arrow';
import s from './Header.module.css';
export function Header({light=false}:{light?:boolean}){
 const [open,setOpen]=useState(false);
 const menu=useRef<HTMLButtonElement>(null);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape'&&open){setOpen(false);menu.current?.focus()}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[open]);
 return <header className={`${s.header} ${light?s.light:''}`}><div className={`page-frame ${s.inner}`}>
  <Link href="/" className={s.logo} aria-label="Beril Berekhya, home">beril<span>.</span></Link>
  <button ref={menu} className={s.menuButton} aria-expanded={open} aria-controls="main-navigation" onClick={()=>setOpen(!open)}>{open?'Close':'Menu'} <span aria-hidden="true">{open?'−':'+'}</span></button>
  <nav id="main-navigation" aria-label="Main navigation" className={`${s.nav} ${open?s.open:''}`}>
   <Link href="/work" onClick={()=>setOpen(false)}>Work <span>(10)</span></Link><Link href="/#about" onClick={()=>setOpen(false)}>About</Link><Link href="/#capabilities" onClick={()=>setOpen(false)}>What I do</Link>
  </nav>
  <a href="mailto:berilberekhya@gmail.com" className={s.contact}>Let’s talk <Arrow size={16}/></a>
 </div></header>;
}
