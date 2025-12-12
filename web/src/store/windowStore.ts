import { create } from "zustand";
import { ReactNode } from "react";

interface WindowState {
    id: string;
    title: string;
    content: ReactNode;
    isOpen: boolean;
}

interface WindowStore {
    windows: WindowState[];
    openWindow: (id: string, title: string, content: ReactNode) => void;
    closeWindow: (id: string) => void;
    closeAllWindows: () => void;
}

export const useWindowStore = create<WindowStore>(set => ({
    windows: [],

    openWindow: (id, title, content) => {
        set(state => {
            const existingWindow = state.windows.find(w => w.id === id);
            if (existingWindow) {
                return {
                    windows: state.windows.map(w =>
                        w.id === id ? { ...w, isOpen: true, content, title } : w,
                    ),
                };
            }
            return {
                windows: [...state.windows, { id, title, content, isOpen: true }],
            };
        });
    },

    closeWindow: id => {
        set(state => ({
            windows: state.windows.map(w => (w.id === id ? { ...w, isOpen: false } : w)),
        }));
    },

    closeAllWindows: () => {
        set(state => ({
            windows: state.windows.map(w => ({ ...w, isOpen: false })),
        }));
    },
}));
