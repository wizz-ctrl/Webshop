'use client';
import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, type ReactNode, useId } from 'react';
import { Warning, CheckCircle, Info } from '@phosphor-icons/react';
export function Field({ label, required, optional, helper, error, success, children, htmlFor }: { label:string; required?:boolean; optional?:boolean; helper?:ReactNode; error?:string; success?:string; children:ReactNode; htmlFor?:string }) {
  return <div className="field"><label className="field-label" htmlFor={htmlFor}><span>{label}</span>{required&&<span className="field-required">*</span>}{optional&&<span className="field-optional">Optional</span>}</label>{children}{helper&&!error&&!success&&<div className="field-helper">{helper}</div>}{error&&<div className="field-error" role="alert"><Warning size={14} weight="fill" aria-hidden="true"/><span>{error}</span></div>}{success&&!error&&<div className="field-success"><CheckCircle size={14} weight="fill" aria-hidden="true"/><span>{success}</span></div>}</div>;
}
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(function Input({ invalid, className='', ...rest }, ref) { return <input ref={ref} className={'field-input '+className} aria-invalid={invalid||undefined} {...rest}/>; });
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(function Textarea({ invalid, className='', ...rest }, ref) { return <textarea ref={ref} className={'field-textarea '+className} aria-invalid={invalid||undefined} {...rest}/>; });
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(function Select({ invalid, className='', children, ...rest }, ref) { return <select ref={ref} className={'field-select '+className} aria-invalid={invalid||undefined} {...rest}>{children}</select>; });
export function Banner({ variant='info', title, children }: { variant?:'info'|'success'|'warning'|'error'; title?:string; children:ReactNode }) {
  const Icon = variant==='success'?CheckCircle:variant==='warning'||variant==='error'?Warning:Info;
  return <div className={'banner banner-'+variant} role={variant==='error'||variant==='warning'?'alert':'status'}><span className="banner-icon"><Icon size={18} weight="fill" aria-hidden="true"/></span><div className="banner-body">{title&&<div className="banner-title">{title}</div>}<div className="banner-text">{children}</div></div></div>;
}
