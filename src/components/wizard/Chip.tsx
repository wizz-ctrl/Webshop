'use client';
import { useState, type ReactNode } from 'react';
import { X, Plus, Sparkle } from '@phosphor-icons/react';
interface ChipProps { label: string; active?: boolean; aiGenerated?: boolean; onClick?: () => void; onRemove?: () => void; }
export function Chip({ label, active, aiGenerated, onClick, onRemove }: ChipProps) {
  if (onRemove) return <span className={'chip '+(active?'active':'')+' '+(aiGenerated?'ai':'')}>{aiGenerated && <Sparkle size={12} aria-hidden="true" style={{ color: 'var(--accent)' }}/>}<span>{label}</span><button type="button" className="chip-remove" aria-label={'Remove '+label} onClick={onRemove}><X size={12} aria-hidden="true"/></button></span>;
  return <button type="button" className={'chip '+(active?'active':'')+' '+(aiGenerated?'ai':'')} onClick={onClick} aria-pressed={active}>{aiGenerated && <Sparkle size={12} aria-hidden="true" style={{ color: 'var(--accent)' }}/>}<span>{label}</span></button>;
}
export function ChipAdd({ label='Add', onClick }: { label?: string; onClick: () => void }) { return <button type="button" className="chip-add" onClick={onClick}><Plus size={13} aria-hidden="true"/><span>{label}</span></button>; }
export function ChipInput({ onAdd, placeholder='Type and press Enter', label='Add' }: { onAdd: (v: string) => void; placeholder?: string; label?: string }) { const [value, setValue] = useState(''); const submit = (e: React.FormEvent) => { e.preventDefault(); const v = value.trim(); if (!v) return; onAdd(v); setValue(''); }; return <form className="row" style={{ gap: 8, width: '100%' }} onSubmit={submit}><input className="field-input" value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} aria-label={label} style={{ flex: 1 }}/><button type="submit" className="btn btn-secondary btn-sm" disabled={!value.trim()}><Plus size={14} aria-hidden="true"/> {label}</button></form>; }
