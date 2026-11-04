import Link from 'next/link';
import {Header} from '@/components/Header';
import {Footer} from '@/components/Footer';
import {Arrow} from '@/components/Arrow';
export default function NotFound(){return <><Header light/><main id="main-content" className="page-frame" style={{paddingBlock:'100px 140px'}}><h1 style={{fontSize:'clamp(48px,8vw,120px)',maxWidth:1000}}>A little off course.</h1><p style={{marginTop:30,marginBottom:35,maxWidth:500}}>This page isn’t here. There’s plenty of good work back in the collection.</p><Link href="/work" className="pill">Back to the work <Arrow/></Link></main><Footer/></>}
