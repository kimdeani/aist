import { useState } from 'react';
import { CoverTone } from '../types/readlog';

interface BookCoverProps {
  title: string;
  author: string;
  coverImage?: string;
  coverTone: CoverTone;
  size?: 'sm' | 'md' | 'lg';
}

const TONE_STYLES: Record<CoverTone, { bg: string; text: string; accent: string; sub: string }> = {
  slate: {
    bg: 'bg-[#E8ECEF]',
    text: 'text-[#18181B]',
    accent: 'border-[#94A3B8]',
    sub: 'text-[#52525B]',
  },
  cobalt: {
    bg: 'bg-[#1E3A8A]',
    text: 'text-[#FAFAFA]',
    accent: 'border-[#60A5FA]/40',
    sub: 'text-[#DBEAFE]',
  },
  charcoal: {
    bg: 'bg-[#18181B]',
    text: 'text-[#FAFAFA]',
    accent: 'border-[#52525B]',
    sub: 'text-[#A1A1AA]',
  },
  stone: {
    bg: 'bg-[#F1F1EE]',
    text: 'text-[#18181B]',
    accent: 'border-[#D4D4D8]',
    sub: 'text-[#52525B]',
  },
};

export function BookCover({ title, author, coverImage, coverTone, size = 'md' }: BookCoverProps) {
  const [imgError, setImgError] = useState(false);

  const sizeClasses =
    size === 'sm'
      ? 'w-14 h-[74px] text-[10px]'
      : size === 'lg'
        ? 'w-28 h-[150px] text-xs'
        : 'w-20 h-[106px] text-[11px]';

  const tone = TONE_STYLES[coverTone] || TONE_STYLES.slate;

  if (coverImage && !imgError) {
    return (
      <div className={`${sizeClasses} shrink-0 overflow-hidden rounded-[4px] border border-zinc-200 bg-zinc-100`}>
        <img
          src={coverImage}
          alt={`${title} 표지`}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses} ${tone.bg} ${tone.text} relative shrink-0 overflow-hidden rounded-[4px] border border-zinc-200 flex flex-col justify-between p-2.5 select-none`}
      aria-label={`${title} 표지`}
    >
      <div className="pointer-events-none absolute inset-y-0 left-1.5 w-px bg-black/10" aria-hidden="true" />
      <div className={`border-b ${tone.accent} pb-1.5 pl-1`}>
        <p className="font-editorial font-semibold leading-tight line-clamp-3 break-keep">{title}</p>
      </div>
      <p className={`${tone.sub} pl-1 text-[10px] leading-none truncate`}>{author}</p>
    </div>
  );
}
