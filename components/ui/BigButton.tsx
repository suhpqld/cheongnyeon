import Link from 'next/link';
import type { ReactNode } from 'react';

interface BigButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'choice' | 'warn';
  icon?: string;
  sub?: string;
  selected?: boolean;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
}

const styles = {
  primary: 'bg-primary text-white border-primary',
  secondary: 'bg-white border-line',
  choice: 'bg-white border-line',
  warn: 'bg-warn text-white border-warn',
};

export function BigButton({ children, variant = 'primary', icon, sub, selected, href, onClick, disabled }: BigButtonProps) {
  const className = 'flex w-full min-h-16 items-center justify-center gap-2 rounded-xl px-3 py-2 text-center font-bold border-[3px] ' +
    (selected ? 'border-line bg-primary-soft text-ink ring-2 ring-line ' : styles[variant] + ' ') +
    (disabled ? 'opacity-60' : '');
  const content = <>
    {icon && <span aria-hidden="true">{icon}</span>}
    <span>{children}{sub && <span className="block text-[max(18px,0.9rem)] font-normal">{sub}</span>}</span>
    {selected && <span aria-hidden="true">✓</span>}
  </>;
  if (href && !disabled) return <Link className={className} href={href} onClick={onClick}>{content}</Link>;
  return <button type="button" className={className} disabled={disabled} onClick={onClick}
    aria-pressed={variant === 'choice' || selected !== undefined ? Boolean(selected) : undefined}>{content}</button>;
}

export default BigButton;
