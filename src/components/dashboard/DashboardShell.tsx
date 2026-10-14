'use client';
import { useState, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
export function DashboardShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  return <div className="app-shell" data-collapsed={collapsed}><Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((c) => !c)} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)}/><div className="app-content"><Topbar onMobileMenu={() => setMobileOpen(true)}/><main className="app-main">{children}</main></div></div>;
}
