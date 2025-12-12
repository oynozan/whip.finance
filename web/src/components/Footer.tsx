"use client";

import { Settings, FileText } from "lucide-react";
import { useWindowStore } from "@/store/windowStore";
import { usePriceDataStore } from "@/store/priceDataStore";
import { useLogsStore } from "@/store/logsStore";

export default function Footer() {
    const { price } = usePriceDataStore();
    const { logs } = useLogsStore();
    const { openWindow } = useWindowStore();

    const formatTimestamp = (date: Date) => {
        return new Date(date).toLocaleString("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        });
    };

    const handleLogsClick = () => {
        openWindow(
            "logs",
            "Logs",
            <div className="space-y-2 min-w-100 max-w-200 h-100">
                <div className="text-sm text-secondary-text">
                    {logs.length === 0 ? (
                        <p className="text-muted-text text-xs">No logs yet...</p>
                    ) : (
                        <div className="space-y-1 font-mono text-xs max-h-[400px] overflow-y-auto">
                            {logs.map((log) => (
                                <p key={log.id} className="break-all">
                                    [{formatTimestamp(log.timestamp)}] {log.message}
                                </p>
                            ))}
                        </div>
                    )}
                </div>
            </div>,
        );
    };

    return (
        <footer className="bg-background border-t border-border-subtle h-8">
            <div className="flex items-center h-full justify-between px-6">
                <div className="flex items-center gap-6">
                    <button className="flex items-center gap-1 text-xs text-secondary-text hover:text-foreground rounded-lg transition-colors">
                        <Settings className="w-4 h-4" />
                        Settings
                    </button>

                    <button
                        onClick={handleLogsClick}
                        className="flex items-center gap-1 text-xs text-secondary-text hover:text-foreground rounded-lg transition-colors"
                    >
                        <FileText className="w-4 h-4" />
                        Logs
                    </button>
                </div>

                <div>
                    <span className="text-sm text-muted-text">
                        $IP ≈{" "}
                        <span className="text-sm font-mono text-positive">${price.toFixed(4)}</span>
                    </span>
                </div>
            </div>
        </footer>
    );
}
