'use client';

import Link from 'next/link';

interface LogoProps {
  className?: string;
  href?: string;
  showSubtitle?: boolean;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap = { sm: 'h-6', md: 'h-8', lg: 'h-10', xl: 'h-14' };

export function Logo({ className = '', href, showSubtitle, subtitle, size = 'md' }: LogoProps) {
  const imgSize = sizeMap[size];
  const img = (
    <>
      <img
        src="/light_logo.png"
        alt="ACESS"
        className={`${imgSize} w-auto block dark:hidden`}
      />
      <img
        src="/dark_logo.png"
        alt="ACESS"
        className={`${imgSize} w-auto hidden dark:block`}
      />
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`inline-flex flex-col ${className}`}>
        {img}
        {showSubtitle && subtitle && (
          <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
        )}
      </Link>
    );
  }

  return (
    <span className={`inline-flex flex-col ${className}`}>
      {img}
      {showSubtitle && subtitle && (
        <span className="text-sm text-gray-400 mt-1">{subtitle}</span>
      )}
    </span>
  );
}
