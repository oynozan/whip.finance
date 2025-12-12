import { create } from "zustand";

interface LogEntry {
    id: string;
    message: string;
    timestamp: Date;
}

interface LogsStore {
    logs: LogEntry[];
    addLog: (message: string) => void;
}

export const useLogsStore = create<LogsStore>((set) => ({
    logs: [],
    addLog: (message: string) =>
        set((state) => {
            const newLog: LogEntry = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                message,
                timestamp: new Date(),
            };
            
            // Keep only the latest 100 logs
            const updatedLogs = [...state.logs, newLog];
            if (updatedLogs.length > 100) updatedLogs.shift();
            
            return { logs: updatedLogs };
        }),
}));

