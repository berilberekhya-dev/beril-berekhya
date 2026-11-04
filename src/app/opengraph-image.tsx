import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const alt = 'Beril Berekhya, full-stack and AI developer. Original 3D B sculpture with HiTalent and Methodata interface previews.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const [geist, tile, hitalent, methodata] = await Promise.all([
  readFile(join(process.cwd(), 'public/fonts/geist-regular.ttf')),
  readFile(join(process.cwd(), 'public/images/social/b-tile.png')),
  readFile(join(process.cwd(), 'public/images/social/hitalent.png')),
  readFile(join(process.cwd(), 'public/images/social/methodata.png')),
]);
const imageData = (data: Buffer) => `data:image/png;base64,${data.toString('base64')}`;

function Separator() {
  return <svg width="19" height="19" viewBox="0 0 40 40" fill="none">
    <path d="M20 2v36M2 20h36M7.3 7.3l25.4 25.4M7.3 32.7 32.7 7.3" stroke="#11110f" strokeWidth="5" />
  </svg>;
}

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ display: 'flex', position: 'relative', width: '100%', height: '100%', background: '#11110f', color: '#f5f4f0', fontFamily: 'Geist', overflow: 'hidden' }}>
      <div style={{ display: 'flex', position: 'absolute', top: 42, left: 56, right: 56, justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', fontSize: 34, letterSpacing: -2 }}>beril<span style={{ color: '#f36b32' }}>.</span></div>
        <div style={{ display: 'flex', fontSize: 25 }}>Full-stack &amp; AI developer</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', position: 'absolute', top: 149, left: 52, fontSize: 118, letterSpacing: -6, lineHeight: 0.98 }}>
        <div style={{ display: 'flex' }}>Beril</div>
        <div style={{ display: 'flex' }}>Berekhya<span style={{ color: '#f36b32' }}>.</span></div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', position: 'absolute', top: 412, left: 58, fontSize: 27, lineHeight: 1.3, letterSpacing: -0.5 }}>
        <div style={{ display: 'flex' }}>Software and AI serving</div>
        <div style={{ display: 'flex' }}>real world operations.</div>
      </div>
      <div style={{ display: 'flex', position: 'absolute', top: 127, left: 700, width: 490, height: 407 }}>
        <div style={{ display: 'flex', position: 'absolute', left: 8, top: 5, width: 266, height: 193, transform: 'rotate(-8deg)', borderRadius: 14, overflow: 'hidden' }}>
          <img src={imageData(methodata)} width={266} height={193} alt="Methodata church administration interface" />
        </div>
        <div style={{ display: 'flex', position: 'absolute', left: 12, top: 188, width: 280, height: 202, transform: 'rotate(6deg)', borderRadius: 14, overflow: 'hidden' }}>
          <img src={imageData(hitalent)} width={280} height={202} alt="HiTalent CV tools with contact details permanently blurred" />
        </div>
        <img src={imageData(tile)} width={300} height={299} alt="Original three-dimensional B monogram" style={{ position: 'absolute', left: 174, top: 77 }} />
      </div>
      <div style={{ display: 'flex', position: 'absolute', bottom: 0, left: 0, width: '100%', height: 90, padding: '0 56px', alignItems: 'center', justifyContent: 'space-between', background: '#f36b32', color: '#11110f' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 19, fontSize: 25, letterSpacing: -0.8 }}>
          <span>integrate</span><Separator /><span>automate</span><Separator /><span>develop</span><Separator /><span>deploy</span>
        </div>
        <div style={{ display: 'flex', fontSize: 20, letterSpacing: -0.5 }}>beril-berekhya.vercel.app</div>
      </div>
    </div>,
    { ...size, fonts: [{ name: 'Geist', data: geist, weight: 400, style: 'normal' }] },
  );
}
