'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, Plus, Minus, List, X } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { PageStack, showcasePages } from './PageStack';

type DialogContent = { title: string; text: string; example?: boolean; image?: string } | null;
type Stage = 'Build' | 'Measure' | 'Improve';
const stages: Stage[] = ['Build', 'Measure', 'Improve'];
const stageContent = {
  Build: { title: 'Your business. Every page.', text: 'Turn a short brief into a complete website. Give each service and location its own page, then make it yours with a visual editor.', label: 'OAK / SITE OVERVIEW', column: 'Page', value: 'Included', rows: [['Home', 'Business introduction'], ['About', 'Your story'], ['Bespoke furniture', 'Dedicated service page'], ['Our service area', 'Local information'], ['Contact', 'Lead capture form']], foot: 'Industry templates · LocalBusiness schema · Section-level editing' },
  Measure: { title: 'Know where you show up.', text: 'Track local keywords, explore your visibility across the map, and keep indexing and Google Business Profile information in one place.', label: 'OAK / LOCAL VISIBILITY', column: 'Search term', value: 'Local position', rows: [['Bespoke furniture', '#3'], ['Local carpenter', '#5'], ['Custom shelving', '#4'], ['Furniture workshop', '#2'], ['Cabinet maker', '#7']], foot: 'Keyword history · Geo-grid scans · Indexing status' },
  Improve: { title: 'See the next step. Take it.', text: 'Connect ranking changes to the pages behind them. Review an AI suggestion, refine the content, and approve the update before it goes live.', label: 'OAK / PAGE INSIGHTS', column: 'Suggested improvement', value: 'Page', rows: [['Clarify service details', 'Bespoke furniture'], ['Refresh page description', 'Custom shelving'], ['Add local context', 'Our service area'], ['Review business schema', 'Home'], ['Answer a common question', 'Cabinet making']], foot: 'Page-level insights · AI suggestions · Your approval' },
};
const plans = [
  { name: 'Free', price: 0, annual: 0, summary: 'Give your business a first home.', audience: 'For getting started', action: 'Start free', features: ['1 complete website generation', '5 pages to tell your story', 'Limited local rank tracking', 'Visual editing & static export', 'AI usage controls'] },
  { name: 'Growth', price: 29, annual: 24, summary: 'Build your presence. Keep improving.', audience: 'For local businesses', action: 'Choose Growth', features: ['3 websites · 5 business locations', 'Service & location pages', 'Keyword tracking & geo-grid scans', 'Reviews, calls & lead inbox', 'AI page insights & blog drafts'], featured: true },
  { name: 'Agency', price: 79, annual: 65, summary: 'More clients. One place to manage.', audience: 'For teams & agencies', action: 'Choose Agency', features: ['15 websites · 30 business locations', 'Everything in Growth', 'White-label client workspaces', 'Bulk location management', 'REST API & MCP access'] },
];
const faqs = [
  ['What does webshop do?', 'webshop brings AI website creation and local SEO tools together. The planned workflow takes you from a business brief to a multi-page site, then helps you measure local visibility and review suggested improvements.'],
  ['Do I need to know how to code?', 'No. Tell webshop about your business, services and locations. The planned visual editor lets you refine text, images and sections without writing code.'],
  ['Can I use my own images?', 'Yes. The planned editor supports your business photography and image changes, so your website can reflect the work you actually do.'],
  ['Can I take my website with me?', 'Static code export and WordPress export are part of the product requirements, alongside platform hosting and deployment to supported cloud providers.'],
  ['How will AI usage work?', 'The product is designed to show AI credit consumption and let you set spending caps. The prices and plan limits on this page are samples; final AI allowances and billing terms will be confirmed before launch.'],
  ['Is webshop available yet?', 'Not yet. webshop is in development. Account creation, sign-in and paid plans are coming soon. This page previews the intended product experience; it does not generate sites, track live rankings or take payments.'],
];
function Action({ children, onClick, secondary = false }: { children: ReactNode; onClick: () => void; secondary?: boolean }) {
  return <button className={`action ${secondary ? 'action-secondary' : ''}`} onClick={onClick}>{children}<ArrowRight size={22} weight="regular" aria-hidden="true" /></button>;
}
export function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [stage, setStage] = useState<Stage>('Build');
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [dialog, setDialog] = useState<DialogContent>(null);
  const modal = useRef<HTMLDialogElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);
  const stageRefs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    if (!dialog) return;
    restoreFocus.current = document.activeElement as HTMLElement;
    modal.current?.showModal();
    const prior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prior; restoreFocus.current?.focus(); };
  }, [dialog]);
  const closeDialog = () => { modal.current?.close(); setDialog(null); };
  const comingSoon = (context = 'Get started') => {
    setMenuOpen(false);
    setDialog({ title: context === 'Sign in' ? 'Sign-in is coming soon.' : 'Your next chapter is coming.', text: context === 'Sign in' ? 'We’re still building webshop. Sign-in will be available when accounts launch. For now, explore what’s on the way.' : `${context === 'Get started' ? 'Website creation' : context} will be available when webshop launches. We’re building a better way to create, measure and improve your local presence. No account or payment is needed for this preview.` });
  };
  const example = (index = 0) => {
    const page = showcasePages[index];
    setDialog({ title: `${page.name}.`, text: `A ${page.category.toLowerCase()} website concept with its own colors, typography and personality. This fictional business illustrates a possible design direction; it is not a live customer website.`, example: true, image: page.image });
  };
  const current = stageContent[stage];
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header page-width flex items-center justify-between">
      <a className="wordmark" href="#" aria-label="webshop home">webshop.</a>
      <button className="menu-toggle" aria-expanded={menuOpen} aria-controls="main-navigation" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={25}/> : <List size={25}/>}</button>
      <nav id="main-navigation" className={menuOpen ? 'navigation is-open' : 'navigation'} aria-label="Main navigation" onKeyDown={e => { if (e.key === 'Escape') { setMenuOpen(false); (document.querySelector('.menu-toggle') as HTMLButtonElement)?.focus(); } }}>
        <button onClick={() => { setMenuOpen(false); example(); }}>Example</button><a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a><a href="#pricing" onClick={() => setMenuOpen(false)}>Plans</a><button className="get-started" onClick={() => comingSoon()}>Get started<ArrowUpRight size={16} aria-hidden="true" /></button>
      </nav>
    </header>
    <main id="main">
      <section className="hero page-width" aria-labelledby="hero-heading">
        <div className="hero-copy"><h1 id="hero-heading"><span>Stand out.</span><span>Get found.</span></h1><p className="hero-description">AI-built websites for local businesses.<br className="desktop-break"/> From first impression to local visibility.</p><Action onClick={() => comingSoon()}>Build my website</Action><button className="text-link explore" onClick={() => example()}>Explore an example<ArrowUpRight size={17} aria-hidden="true" /></button><p className="hero-note">Your website. Your local presence. One place.</p></div>
        <PageStack onInspect={example}/>
      </section>
      <section className="process" id="how-it-works" aria-labelledby="process-heading"><div className="page-width process-grid"><h2 id="process-heading">From details<br/>to discovered.</h2><ol><li><span className="step-number">01</span><div><h3>Tell your story. Build your site.</h3><p>Add your business, services and locations.</p></div></li><li><span className="step-number">02</span><div><h3>Make it yours. Put it out there.</h3><p>Choose a look, refine your pages and publish.</p></div></li><li><span className="step-number">03</span><div><h3>See what works. Keep growing.</h3><p>Track local visibility and act on AI suggestions.</p></div></li></ol></div></section>
      <section className="capabilities page-width section-space" id="features" aria-labelledby="features-heading">
        <div className="section-intro"><p className="eyebrow">BUILT FOR WHAT COMES NEXT</p><h2 id="features-heading">A website is<br/>just the start.</h2><p>Bring your website and your local presence together. Less switching tools. More moving your business forward.</p><a className="text-link" href="#pricing">Find your plan<ArrowRight size={18} aria-hidden="true" /></a></div>
        <div className="capability-detail"><div role="tablist" aria-label="Explore webshop features" className="feature-tabs">{stages.map((s, i) => <button key={s} ref={el => { stageRefs.current[i] = el; }} role="tab" id={`tab-${s}`} aria-controls="feature-panel" aria-selected={stage === s} tabIndex={stage === s ? 0 : -1} onClick={() => setStage(s)} onKeyDown={e => { let n = i; if (e.key === 'ArrowRight') n = (i + 1) % 3; else if (e.key === 'ArrowLeft') n = (i + 2) % 3; else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = 2; else return; e.preventDefault(); setStage(stages[n]); stageRefs.current[n]?.focus(); }}><span>0{i+1}</span>{s}</button>)}</div>
          <div role="tabpanel" tabIndex={0} id="feature-panel" aria-labelledby={`tab-${stage}`} className="feature-panel"><h3>{current.title}</h3><p>{current.text}</p><div className="data-preview"><div className="data-heading"><span>{current.label}</span><span className="sample-label">Illustrative preview</span></div><table><thead><tr><th>{current.column}</th><th>{current.value}</th></tr></thead><tbody>{current.rows.map(([label, value]) => <tr key={label}><td>{label}</td><td>{value}</td></tr>)}</tbody></table></div><p className="feature-footnote">{current.foot}</p></div>
        </div>
      </section>
      <section className="ownership page-width" aria-label="Flexibility and control"><div><h3>Your work goes with you.</h3><p>Export static code or WordPress. Choose where you host.</p></div><div><h3>Your business, at any scale.</h3><p>One location or many. A workspace that brings it together.</p></div><div><h3>You stay in control.</h3><p>Review AI changes and keep an eye on usage with spend caps.</p></div></section>
      <section className="pricing section-space" id="pricing" aria-labelledby="pricing-heading"><div className="page-width"><div className="pricing-heading"><div><p className="eyebrow">ROOM TO GROW</p><h2 id="pricing-heading">Start small.<br/>Think local. Grow big.</h2></div><div className="pricing-controls"><div className="billing-switch" role="group" aria-label="Billing period"><button aria-pressed={!annual} onClick={() => setAnnual(false)}>Monthly</button><button aria-pressed={annual} onClick={() => setAnnual(true)}>Yearly</button></div><p>Sample pricing · USD<br/>Final prices and limits coming at launch.</p></div></div>
        <div className="plans">{plans.map(plan => <article key={plan.name} className={`plan ${plan.featured ? 'plan-featured' : ''}`}><div className="plan-topline"><span>{plan.audience}</span>{plan.featured && <span className="plan-tag">For your next chapter</span>}</div><h3>{plan.name}</h3><p className="plan-summary">{plan.summary}</p><div className="plan-price" aria-live="polite"><strong>${annual ? plan.annual : plan.price}</strong><span>{plan.price === 0 ? '/ to start' : '/ month'}</span></div><p className="billing-caption">{plan.price === 0 ? 'One generation. No card required.' : annual ? `$${plan.annual * 12} billed yearly · sample price` : 'Billed monthly · sample price'}</p><Action secondary={!plan.featured} onClick={() => comingSoon(`${plan.name} plan access`)}>{plan.action}</Action><ul>{plan.features.map(feature => <li key={feature}><Check size={17} weight="bold" aria-hidden="true"/><span>{feature}</span></li>)}</ul></article>)}</div><p className="pricing-note">These plans are a preview, not a purchase offer. AI credit allowances and any usage charges will be confirmed before launch.</p>
      </div></section>
      <section className="closing page-width section-space" id="faq" aria-labelledby="closing-heading"><div><p className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</p><h2 id="closing-heading">Make your next<br/>first impression.</h2><Action onClick={() => comingSoon()}>Build my website</Action><p className="closing-note">Made for the businesses that make a neighbourhood.</p></div><div className="faq"><h3>A few things to know.</h3>{faqs.map(([question, answer], i) => <div className="faq-item" key={question}><h4><button aria-expanded={openFaq === i} aria-controls={`faq-answer-${i}`} id={`faq-question-${i}`} onClick={() => setOpenFaq(openFaq === i ? null : i)}>{question}{openFaq === i ? <Minus size={20} aria-hidden="true"/> : <Plus size={20} aria-hidden="true"/>}</button></h4><div id={`faq-answer-${i}`} role="region" aria-labelledby={`faq-question-${i}`} hidden={openFaq !== i}><p>{answer}</p></div></div>)}</div></section>
    </main>
    <footer className="site-footer page-width"><div className="footer-top"><a className="wordmark" href="#" aria-label="webshop home">webshop.</a><nav aria-label="Footer navigation"><a href="#features">Features</a><a href="#pricing">Plans</a><a href="#faq">FAQs</a><button onClick={() => setDialog({title:'Let’s talk. Soon.',text:'Our contact and support channels will be available when webshop launches. This preview does not collect messages or personal details.'})}>Contact<ArrowUpRight size={14} aria-hidden="true"/></button></nav></div><div className="footer-bottom"><p>© {new Date().getFullYear()} webshop. Built for local ambition.</p><p>In development. A preview of what’s coming.</p></div></footer>
    <dialog ref={modal} className={`site-dialog ${dialog?.example ? 'example-dialog' : ''}`} aria-labelledby="dialog-title" aria-describedby="dialog-description" onCancel={e => { e.preventDefault(); closeDialog(); }} onClick={e => { if (e.target === e.currentTarget) { const b = e.currentTarget.getBoundingClientRect(); if (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom) closeDialog(); } }}><button className="dialog-close" aria-label="Close dialog" onClick={closeDialog}><X size={24}/></button><p className="eyebrow">{dialog?.example ? 'WEBSHOP / DESIGN INSPIRATION' : 'WEBSHOP / COMING SOON'}</p>{dialog?.example && <img className="dialog-image" src={dialog.image} alt="Illustrative business website concept" width="1280" height="776"/>}<h2 id="dialog-title">{dialog?.title}</h2><p id="dialog-description">{dialog?.text}</p><Action onClick={closeDialog}>{dialog?.example ? 'Back to webshop' : 'Keep exploring'}</Action></dialog>
  </>;
}




