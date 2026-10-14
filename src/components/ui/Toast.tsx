'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CheckCircle, Warning, Info, X, WarningCircle } from '@phosphor-icons/react';
export type ToastVariant = 'success'|'error'|'warning'|'info';
export interface ToastInput { variant: ToastVariant; title: string; text?: string; durationMs?: number; }
interface ToastItem extends Required<Omit<ToastInput,'text'>> { id: string; text?: string; leaving: boolean; }
interface ToastCtx { toast: (i: ToastInput) => void; dismiss: (id: string) => void; }
const Ctx = createContext<ToastCtx | null>(null);
export function useToast() { const ctx = useContext(Ctx); if (!ctx) throw new Error('useToast must be used inside <ToastProvider>'); return ctx; }
const ICONS: Record<ToastVariant, ReactNode> = { success:<CheckCircle size={18} weight="fill"/>, error:<WarningCircle size={18} weight="fill"/>, warning:<Warning size={18} weight="fill"/>, info:<Info size={18} weight="fill"/> };
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const dismiss = useCallback((id: string) => { setToasts((cur) => cur.map((t) => t.id === id ? { ...t, leaving: true } : t)); const lt = setTimeout(() => { setToasts((cur) => cur.filter((t) => t.id !== id)); timers.current.delete(id); }, 220); timers.current.set(id, lt); }, []);
  const toast = useCallback((input: ToastInput) => { const id = 'toast_'+Date.now()+'_'+Math.random().toString(36).slice(2,7); const dur = input.durationMs ?? 4500; setToasts((cur) => [...cur, { id, variant: input.variant, title: input.title, text: input.text, durationMs: dur, leaving: false }]); const et = setTimeout(() => dismiss(id), dur); timers.current.set(id, et); }, [dismiss]);
  useEffect(() => { const m = timers.current; return () => { m.forEach((t) => clearTimeout(t)); m.clear(); }; }, []);
  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);
  return <Ctx.Provider value={value}>{children}<div className="toast-viewport" role="region" aria-label="Notifications" aria-live="polite">{toasts.map((t) => <div key={t.id} className={['toast','toast-'+t.variant,t.leaving?'toast-leaving':''].filter(Boolean).join(' ')} role="status"><span className={'toast-icon toast-'+t.variant} aria-hidden="true">{ICONS[t.variant]}</span><div className="toast-body"><div className="toast-title">{t.title}</div>{t.text&&<div className="toast-text">{t.text}</div>}</div><button type="button" className="toast-close" aria-label="Dismiss notification" onClick={() => dismiss(t.id)}><X size={14} aria-hidden="true"/></button></div>)}</div></Ctx.Provider>;
}
