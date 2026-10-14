import type { ReactNode } from 'react';
import { DashboardShell } from '../../components/dashboard/DashboardShell';
import { ToastProvider } from '../../components/ui/Toast';
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <ToastProvider><DashboardShell>{children}</DashboardShell></ToastProvider>;
}
