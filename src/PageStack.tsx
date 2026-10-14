'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Pause, Play } from '@phosphor-icons/react';

export const showcasePages = [
  { name: 'Sunday Coffee', category: 'Café', image: '/assets/cafe-color.png', alt: 'Sunday Coffee café website with forest-green typography, cream tones and coffee photography' },
  { name: 'Forma', category: 'Finance', image: '/assets/finance-color.png', alt: 'Forma finance website with deep navy, electric blue and mint accents' },
  { name: 'Studio Form', category: 'Store', image: '/assets/store-color.png', alt: 'Studio Form homeware shop with coral, burgundy and colorful product photography' },
  { name: 'Brightwood Academy', category: 'School', image: '/assets/school-color.png', alt: 'Brightwood Academy school website with sky blue, yellow and classroom photography' },
  { name: 'Gather', category: 'Teams', image: '/assets/workspace-color.png', alt: 'Gather team workspace website with lavender, indigo and a productivity interface' },
];

type Sheet = { id: number; page: number };
const SLIDE_MS = 1100;
const REST_MS = 1000;

export function PageStack({ onInspect }: { onInspect: (index: number) => void }) {
  const [sheets, setSheets] = useState<Sheet[]>([{ id: 0, page: 0 }, { id: -1, page: 4 }, { id: -2, page: 3 }]);
  const [incoming, setIncoming] = useState<Sheet | null>(null);
  const sequence = useRef(0);
  const [paused, setPaused] = useState(false);


  const [reducedMotion, setReducedMotion] = useState(true);
  const [pageVisible, setPageVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const active = sheets[0].page;
  const selected = incoming?.page ?? active;
  const running = ready && !paused && !reducedMotion && pageVisible;

  useEffect(() => {
    let cancelled = false;
    Promise.all(showcasePages.map(page => new Promise<void>((resolve, reject) => {
      const image = new Image();
      image.onload = () => image.decode().then(resolve, resolve);
      image.onerror = reject;
      image.src = page.image;
    }))).then(() => { if (!cancelled) setReady(true); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReducedMotion(media.matches);
    const updateVisibility = () => setPageVisible(!document.hidden);
    updateMotion();
    updateVisibility();
    media.addEventListener('change', updateMotion);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => { media.removeEventListener('change', updateMotion); document.removeEventListener('visibilitychange', updateVisibility); };
  }, []);

  const finishTransition = useCallback(() => {
    if (!incoming) return;
    setSheets(previous => [incoming, ...previous].slice(0, 3));
    setIncoming(null);
  }, [incoming]);

  useEffect(() => {
    if (!incoming) return;
    // Settle the stack even if a hidden tab suppresses the animation event.
    const timer = window.setTimeout(finishTransition, reducedMotion ? 0 : SLIDE_MS + 150);
    return () => window.clearTimeout(timer);
  }, [incoming, reducedMotion, finishTransition]);

  useEffect(() => {
    if (!running || incoming) return;
    const timer = window.setTimeout(() => setIncoming({ id: ++sequence.current, page: (active + 1) % showcasePages.length }), REST_MS);
    return () => window.clearTimeout(timer);
  }, [running, incoming, active]);

  const selectPage = (page: number) => {
    setPaused(true);
    if (page === selected || incoming) return;
    const sheet = { id: ++sequence.current, page };
    if (reducedMotion) setSheets(previous => [sheet, ...previous].slice(0, 3));
    else setIncoming(sheet);
  };

  // Retain each sheet and its final transform; pause never cancels a slide in flight.
  const visibleSheets = incoming ? [incoming, ...sheets] : sheets;
  return <figure className="page-showcase" id="example" aria-label="Website design showcase">
    <div className="page-stack" data-active-slide={selected} data-autoplay={running} data-transitioning={Boolean(incoming)}>
      {visibleSheets.map((sheet, depth) => {
        const page = showcasePages[sheet.page];
        const arriving = sheet.id === incoming?.id;
        return <div key={sheet.id} className={`stack-page stack-depth-${depth}${arriving ? ' stack-arriving' : ''}`} aria-hidden={depth !== 0} onAnimationEnd={arriving ? finishTransition : undefined}>
          <img src={page.image} alt={page.alt} width="1610" height="977" fetchPriority={depth === 0 ? 'high' : 'auto'} draggable={false}/>
        </div>;
      })}
    </div>
    <figcaption className="stack-caption">
      <div className="stack-caption-top"><div><span className="stack-kicker">DIFFERENT BUSINESSES. DISTINCT PERSONALITIES.</span><button className="stack-view" onClick={() => onInspect(selected)}>{showcasePages[selected].name}<ArrowUpRight size={19} aria-hidden="true"/></button><span className="stack-disclosure">Explore a website concept</span></div>
        <button className="stack-pause" aria-label={paused || reducedMotion ? 'Play webpage animation' : 'Pause webpage animation'} aria-pressed={paused || reducedMotion} disabled={reducedMotion} title={reducedMotion ? 'Reduced motion is on. Choose a design below.' : undefined} onClick={() => setPaused(current => !current)}>{paused || reducedMotion ? <Play size={17} weight="fill"/> : <Pause size={17} weight="fill"/>}</button>
      </div>
      <div className="stack-picker" role="group" aria-label="Choose a business website">{showcasePages.map((page,index) => <button key={page.name} aria-label={`Show ${page.category} design`} aria-pressed={selected === index} disabled={Boolean(incoming)} onClick={() => selectPage(index)}><span className="stack-index">{String(index + 1).padStart(2, '0')}</span><span>{page.category}</span></button>)}</div>
    </figcaption>
  </figure>;
}


