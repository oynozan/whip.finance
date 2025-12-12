"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useWindowStore } from "@/store/windowStore";

const Y_MIN = 64;

interface WindowProps {
    id: string;
    title: string;
    children?: React.ReactNode;
}

export function Window({ id, title, children }: WindowProps) {
    const { closeWindow } = useWindowStore();
    const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
    const [dragging, setDragging] = useState(false);

    const windowRef = useRef<HTMLDivElement | null>(null);
    const dragStart = useRef({ x: 0, y: 0 });

    // Center window on mount
    useEffect(() => {
        if (windowRef.current && pos === null) {
            const windowWidth = windowRef.current.offsetWidth;
            const windowHeight = windowRef.current.offsetHeight;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            const centerX = (viewportWidth - windowWidth) / 2;
            const centerY = (viewportHeight - windowHeight) / 2;

            setPos({
                x: Math.max(0, centerX),
                y: Math.max(Y_MIN, centerY),
            });
        }
    }, [pos]);

    const startDrag = (e: React.PointerEvent) => {
        if (!pos) return;
        setDragging(true);
        dragStart.current = {
            x: e.clientX - pos.x,
            y: e.clientY - pos.y,
        };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const onDrag = (e: PointerEvent) => {
        if (!dragging || !pos) return;

        const winEl = windowRef.current;
        if (!winEl) return;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const newX = Math.min(
            Math.max(0, e.clientX - dragStart.current.x),
            viewportWidth - winEl.offsetWidth,
        );

        const newY = Math.min(
            Math.max(Y_MIN, e.clientY - dragStart.current.y),
            viewportHeight - winEl.offsetHeight,
        );

        setPos({ x: newX, y: newY });
    };

    const endDrag = () => setDragging(false);

    useEffect(() => {
        window.addEventListener("pointermove", onDrag);
        window.addEventListener("pointerup", endDrag);

        return () => {
            window.removeEventListener("pointermove", onDrag);
            window.removeEventListener("pointerup", endDrag);
        };
    }, [dragging]);

    // Don't render until position is calculated
    if (pos === null) {
        return (
            <div
                ref={windowRef}
                className="fixed bg-background border border-border-default rounded-lg text-white shadow-2xl invisible"
                style={{ 
                    left: '0px',
                    top: '0px',
                    maxWidth: '90vw',
                    maxHeight: '90vh',
                    zIndex: 9999
                }}
            >
                <div className="flex items-center justify-between border-b border-border-subtle rounded-t-lg px-3 py-1.5 cursor-move bg-secondary-bg">
                    <h2 className="text-sm font-semibold">{title}</h2>
                </div>
                <div className="overflow-auto p-4" style={{ maxHeight: '540px' }}>
                    {children}
                </div>
            </div>
        );
    }

    return (
        <div
            ref={windowRef}
            className="fixed bg-background border border-border-default rounded-lg text-white shadow-2xl"
            style={{ 
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                maxWidth: '90vw',
                maxHeight: '90vh',
                zIndex: 9999
            }}
        >
            <div
                className="flex items-center justify-between border-b border-border-subtle rounded-t-lg px-3 py-1.5 cursor-move bg-secondary-bg"
                onPointerDown={startDrag}
            >
                <h2 className="text-sm font-semibold">{title}</h2>
                <button
                    onClick={() => closeWindow(id)}
                    className="hover:bg-border-subtle rounded transition-colors"
                >
                    <X size={16} className="text-secondary-text" />
                </button>
            </div>
            <div className="overflow-auto p-4 max-h-[calc(90vh-3rem)]">
                {children}
            </div>
        </div>
    );
}

export function WindowManager() {
    const { windows } = useWindowStore();

    return (
        <>
            {windows.map((window) =>
                window.isOpen ? (
                    <Window key={window.id} id={window.id} title={window.title}>
                        {window.content}
                    </Window>
                ) : null
            )}
        </>
    );
}