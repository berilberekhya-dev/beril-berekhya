import Image from 'next/image';
import s from './PixelImage.module.css';

export function PixelImage({ src, alt, priority = false, sizes = '(max-width:760px) 92vw, (max-width:1100px) 50vw, 65vw' }: {
  src: string;
  alt: string;
  priority?: boolean;
  sizes?: string;
  parallax?: boolean;
}) {
  return (
    <div className={s.frame}>
      <div className={s.image}>
        <Image src={src} alt={alt} width={1440} height={1040}
          sizes={sizes}
          priority={priority} fetchPriority={priority ? 'high' : undefined}
          decoding={priority ? 'sync' : 'async'} />
      </div>
    </div>
  );
}
