'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Globe, Plus, Funnel, MagnifyingGlass, ArrowUpRight } from '@phosphor-icons/react';
import { api, ApiError } from '../../../lib/api/client';
import type { Site } from '../../../lib/api/contracts';
import { SkeletonSitesGrid } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useToast } from '../../../components/ui/Toast';
import { Banner } from '../../../components/ui/Field';
type SF = 'all'|'live'|'draft'|'generating'|'failed';
export default function SitesPage() {
  const [sites, setSites] = useState<Site[]|null>(null);
  const [error, setError] = useState<string|null>(null);
  const [filter, setFilter] = useState<SF>('all');
  const [query, setQuery] = useState('');
  const { toast } = useToast();
  useEffect(() => { api.listSites().then(setSites).catch((err)=>{const m=err instanceof ApiError?err.message:'Could not load.';setError(m);toast({variant:'error',title:'Sites load failed',text:m});}); }, [toast]);
  const filtered = (sites||[]).filter((s)=>{ if(filter!=='all'&&s.status!==filter) return false; if(query&&!s.businessName.toLowerCase().includes(query.toLowerCase())) return false; return true; });
  return <div className="enter"><div className="page-head"><div><div className="page-head-eyebrow">My Websites</div><h1>Your websites.</h1><p className="page-head-sub">Every site you've generated, drafted, or deployed.</p></div><div className="page-head-actions"><Link href="/dashboard/create" className="topbar-action primary"><Plus size={16} weight="bold"/><span>New Website</span></Link></div></div>{error&&<Banner variant="error" title="Could not load">{error}</Banner>}<div className="row between mb-lg" style={{flexWrap:'wrap',gap:12}}><div className="row" style={{gap:8}}><span className="muted" style={{fontSize:13,display:'inline-flex',alignItems:'center',gap:6}}><Funnel size={14}/> Filter</span>{(['all','live','draft','generating','failed'] as SF[]).map((f)=><button key={f} type="button" className={'btn btn-sm '+(filter===f?'btn-primary':'btn-secondary')} onClick={()=>setFilter(f)} aria-pressed={filter===f}>{f==='all'?'All':f.charAt(0).toUpperCase()+f.slice(1)}</button>)}</div><div style={{position:'relative',maxWidth:260,flex:1}}><MagnifyingGlass size={16} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-subtle)'}}/><input type="search" className="field-input" placeholder="Search..." value={query} onChange={(e)=>setQuery(e.target.value)} style={{paddingLeft:36}}/></div></div>{sites===null?<SkeletonSitesGrid count={4}/>:filtered.length===0?<EmptyState icon={<Globe size={26}/>} title={query||filter!=='all'?'No websites match.':'Your first website is one brief away.'} text={query||filter!=='all'?'Try a different filter.':'Tell us about your business.'} actions={!query&&filter==='all'?<Link href="/dashboard/create" className="topbar-action primary"><Plus size={16} weight="bold"/><span>Create</span></Link>:undefined}/>:<div className="sites-grid">{filtered.map((s)=><article key={s.id} className="site-card"><div className="site-thumb"><img src="/assets/store-color.png" alt=""/><span className={"site-status "+(s.status==='live'?'live':'draft')}>{s.status.toUpperCase()}</span></div><div className="site-body"><div className="site-name">{s.businessName}</div><div className="site-meta">{s.pageCount} pages</div></div><div className="site-foot"><Link href={'/dashboard/sites/'+s.id}>View <ArrowUpRight size={13}/></Link><span className="site-cost">{'$'+s.costUsd.toFixed(4)}</span></div></article>)}</div>}</div>;
}
