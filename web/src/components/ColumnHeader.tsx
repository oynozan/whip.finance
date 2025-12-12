"use client";

import { ArrowUpDown } from "lucide-react";
import { ColumnHeaderProps } from "@/types/token";

export default function ColumnHeader({ title, onSort, sortLabel }: ColumnHeaderProps) {
    return (
        <div className="sticky top-0 bg-background border-b border-border-subtle z-10">
            <div className="flex items-center justify-between h-12 px-6">
                <h2 className="text-lg font-semibold">{title}</h2>
                <button
                    onClick={onSort}
                    className="flex items-center gap-1 text-xs text-secondary-text hover:text-foreground transition-colors"
                >
                    <ArrowUpDown className="w-3 h-3" />
                    {sortLabel}
                </button>
            </div>
        </div>
    );
}
