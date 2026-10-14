'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StepId, BasicInfo, Service, Location, BlogTitle, KeywordCluster, ImageTier } from '../../lib/api/contracts';
interface WizardStore {
  projectId: string | null; currentStep: StepId; basicInfo: Partial<BasicInfo>;
  services: Service[]; locations: Location[]; blogTitles: BlogTitle[]; keywords: KeywordCluster[];
  selectedPageIndex: number; themeId: string | null; imageTier: ImageTier; spendLimit?: number;
  setProjectId: (id: string) => void; setStep: (s: StepId) => void; goNext: () => void; goBack: () => void;
  setBasicInfo: (i: Partial<BasicInfo>) => void; setServices: (s: Service[]) => void;
  addService: (n: string, a: boolean) => void; removeService: (id: string) => void;
  setLocations: (l: Location[]) => void; addLocation: (n: string, s: Location['strategy'], a: boolean) => void; removeLocation: (id: string) => void;
  setBlogTitles: (t: BlogTitle[]) => void; toggleBlogTitle: (t: string, a: boolean) => void; removeBlogTitle: (id: string) => void;
  setKeywords: (k: KeywordCluster[]) => void; setSelectedPage: (i: number) => void;
  updateKeyword: (pt: string, t: 'primary'|'secondary'|'longtail', v: string[]) => void;
  setThemeId: (id: string) => void; setImageTier: (t: ImageTier) => void; setSpendLimit: (l?: number) => void; reset: () => void;
}
const TS = 8; function mid(p: string) { return p + '_' + Math.random().toString(36).slice(2, 9); }
export const useWizardStore = create<WizardStore>()(persist((set, get) => ({
  projectId: null, currentStep: 1, basicInfo: {}, services: [], locations: [], blogTitles: [], keywords: [], selectedPageIndex: 0, themeId: null, imageTier: 'standard', spendLimit: undefined,
  setProjectId: (id) => set({ projectId: id }), setStep: (step) => set({ currentStep: step }),
  goNext: () => { const c = get().currentStep; if (c < TS) set({ currentStep: (c+1) as StepId }); },
  goBack: () => { const c = get().currentStep; if (c > 1) set({ currentStep: (c-1) as StepId }); },
  setBasicInfo: (info) => set((s) => ({ basicInfo: { ...s.basicInfo, ...info } })),
  setServices: (s) => set({ services: s }),
  addService: (n, a) => set((s) => ({ services: [...s.services, { id: mid('svc'), name: n.trim(), aiGenerated: a }] })),
  removeService: (id) => set((s) => ({ services: s.services.filter((x) => x.id !== id) })),
  setLocations: (l) => set({ locations: l }),
  addLocation: (n, s, a) => set((st) => ({ locations: [...st.locations, { id: mid('loc'), name: n.trim(), strategy: s, aiGenerated: a }] })),
  removeLocation: (id) => set((s) => ({ locations: s.locations.filter((x) => x.id !== id) })),
  setBlogTitles: (t) => set({ blogTitles: t }),
  toggleBlogTitle: (t, a) => set((s) => { const ex = s.blogTitles.find((x) => x.title === t); if (ex) return { blogTitles: s.blogTitles.filter((x) => x.title !== t) }; return { blogTitles: [...s.blogTitles, { id: mid('blog'), title: t, aiGenerated: a }] }; }),
  removeBlogTitle: (id) => set((s) => ({ blogTitles: s.blogTitles.filter((t) => t.id !== id) })),
  setKeywords: (k) => set({ keywords: k, selectedPageIndex: 0 }),
  setSelectedPage: (i) => set({ selectedPageIndex: i }),
  updateKeyword: (pt, t, v) => set((s) => ({ keywords: s.keywords.map((c) => c.pageType === pt ? { ...c, [t]: v } : c) })),
  setThemeId: (id) => set({ themeId: id }), setImageTier: (t) => set({ imageTier: t }), setSpendLimit: (l) => set({ spendLimit: l }),
  reset: () => set({ projectId: null, currentStep: 1, basicInfo: {}, services: [], locations: [], blogTitles: [], keywords: [], selectedPageIndex: 0, themeId: null, imageTier: 'standard', spendLimit: undefined }),
}), { name: 'localloop-wizard', partialize: (s) => ({ projectId: s.projectId, currentStep: s.currentStep, basicInfo: s.basicInfo, services: s.services, locations: s.locations, blogTitles: s.blogTitles, keywords: s.keywords, themeId: s.themeId, imageTier: s.imageTier, spendLimit: s.spendLimit }) }));
export const TOTAL_WIZARD_STEPS = TS;
