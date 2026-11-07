import { create } from 'zustand';
import type { Project, Work, Assertion, ComparisonTable, GapRecord, Heatmap } from '../types/synthesis';

interface SynthesisState {
  projects: Project[];
  selectedProjectId: string | null;
  works: Work[];
  assertions: Assertion[];
  comparison: ComparisonTable | null;
  gaps: GapRecord[];
  heatmap: Heatmap | null;
  setProjects: (projects: Project[]) => void;
  selectProject: (id: string | null) => void;
  setWorks: (works: Work[]) => void;
  setAssertions: (assertions: Assertion[]) => void;
  setComparison: (table: ComparisonTable | null) => void;
  setGaps: (gaps: GapRecord[]) => void;
  setHeatmap: (heatmap: Heatmap | null) => void;
}

export const useSynthesisStore = create<SynthesisState>((set) => ({
  projects: [],
  selectedProjectId: null,
  works: [],
  assertions: [],
  comparison: null,
  gaps: [],
  heatmap: null,
  setProjects: (projects) => set({ projects }),
  selectProject: (id) => set({ selectedProjectId: id }),
  setWorks: (works) => set({ works }),
  setAssertions: (assertions) => set({ assertions }),
  setComparison: (comparison) => set({ comparison }),
  setGaps: (gaps) => set({ gaps }),
  setHeatmap: (heatmap) => set({ heatmap }),
}));
