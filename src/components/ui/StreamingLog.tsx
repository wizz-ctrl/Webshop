'use client';
import { useEffect, useRef } from 'react';
export interface LogLine { id: string; time: string; message: string; tag?: 'start'|'done'|'err'|'info'; }
interface StreamingLogProps { lines: LogLine[]; emptyText?: string; autoScroll?: boolean; }
export function StreamingLog({ lines, emptyText='Waiting to start...', autoScroll=true }: StreamingLogProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!autoScroll) return; const el = containerRef.current; if (!el) return; const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80; if (nearBottom) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [lines, autoScroll]);
  return <div className="gen-log" ref={containerRef} role="log" aria-live="polite" aria-label="Generation log">{lines.length===0 ? <div className="gen-log-empty">{emptyText}</div> : lines.map((line) => <div className="gen-log-line" key={line.id}><span className="log-time">{line.time}</span>{line.tag&&<span className={'log-tag '+line.tag}>{line.tag.toUpperCase()}</span>}<span className="log-msg">{line.message}</span></div>)}<div ref={endRef}/></div>;
}
