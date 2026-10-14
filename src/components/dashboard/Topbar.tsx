'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { List, Plus, CaretRight } from '@phosphor-icons/react';
interface TopbarProps { onMobileMenu: () => void; }
interface Crumb { label: string; href?: string; }
function deriveCrumbs(pathname: string): Crumb[] { if (pathname === '/dashboard') return [{ label: 'Overview' }]; if (pathname === '/dashboard/sites') return [{ label: 'Dashboard', href: '/dashboard' }, { label: 'My Websites' }]; if (pathname === '/dashboard/settings') return [{ label: 'Dashboard', href: '/dashboard' }, { label: 'Settings' }]; if (pathname === '/dashboard/create') return [{ label: 'Dashboard', href: '/dashboard' }, { label: 'Create Website' }]; if (pathname.startsWith('/dashboard/sites/')) return [{ label: 'Dashboard', href: '/dashboard' }, { label: 'My Websites', href: '/dashboard/sites' }, { label: 'Site details' }]; return [{ label: 'Dashboard', href: '/dashboard' }]; }
export function Topbar({ onMobileMenu }: TopbarProps) {
  const pathname = usePathname();
  const crumbs = deriveCrumbs(pathname);
  return <header className="topbar"><div className="topbar-left"><button type="button" className="topbar-mobile-toggle" aria-label="Open menu" onClick={onMobileMenu}><List size={20} aria-hidden="true"/></button><nav className="topbar-breadcrumb" aria-label="Breadcrumb">{crumbs.map((c, i) => { const isLast = i === crumbs.length - 1; return <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>{c.href && !isLast ? <Link href={c.href}>{c.label}</Link> : <span className={isLast?'crumb-current':''}>{c.label}</span>}{!isLast && <CaretRight size={11} className="crumb-sep" aria-hidden="true"/>}</span>; })}</nav></div><div className="topbar-right"><Link href="/dashboard/create" className="topbar-action primary hide-mobile"><Plus size={16} weight="bold" aria-hidden="true"/><span>New Website</span></Link></div></header>;
}
