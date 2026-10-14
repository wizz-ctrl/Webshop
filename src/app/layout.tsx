import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@fontsource-variable/inter-tight';
import '../styles.css';

export const metadata: Metadata = {
  title: 'webshop — Stand out. Get found.',
  description: 'Build a website that stands out. Explore webshop: AI website creation, local search visibility and insights for local businesses. Coming soon.',
};
export const viewport: Viewport = { themeColor: '#ffffff' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
