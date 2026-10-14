'use client';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
type Variant = 'primary'|'secondary'|'ghost'|'danger';
type Size = 'sm'|'md'|'lg'|'icon';
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: Variant; size?: Size; block?: boolean; loading?: boolean; iconLeft?: ReactNode; iconRight?: ReactNode; }
const vc: Record<Variant,string> = { primary:'btn-primary', secondary:'btn-secondary', ghost:'btn-ghost', danger:'btn-danger' };
const sc: Record<Size,string> = { sm:'btn-sm', md:'', lg:'btn-lg', icon:'btn-icon' };
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant='primary', size='md', block, loading, iconLeft, iconRight, className='', children, disabled, ...rest }, ref) {
  const classes = ['btn', vc[variant], sc[size], block?'btn-block':'', className].filter(Boolean).join(' ');
  return <button ref={ref} className={classes} disabled={disabled||loading} aria-busy={loading||undefined} {...rest}>{loading?<span className="ai-suggest-spinner" aria-hidden="true"/>:iconLeft}{children}{iconRight}</button>;
});
