import { create } from 'zustand';
import { Notification } from '@api-types/ui';

interface UIStore {
  // State
  isLoading: boolean;
  error: string | null;
  success: string | null;
  activeStep: number;
  notifications: Notification[];

  // Actions
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setSuccess: (success: string | null) => void;
  setActiveStep: (step: number) => void;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  reset: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  isLoading: false,
  error: null,
  success: null,
  activeStep: 0,
  notifications: [],

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  setSuccess: (success) => set({ success }),

  setActiveStep: (activeStep) => set({ activeStep }),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        {
          ...notification,
          id: `${Date.now()}-${Math.random()}`,
        },
      ],
    })),

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  reset: () =>
    set({
      isLoading: false,
      error: null,
      success: null,
      activeStep: 0,
      notifications: [],
    }),
}));

export default useUIStore;