"use client";

import { useMemo, useEffect } from "react";
import { CrosshairMode } from "lightweight-charts";
import { Chart as TradingViewChart, CandlestickSeries } from "lightweight-charts-react-wrapper";

import "./chart.scss";

interface CandlestickData {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
}

interface ChartProps {
    data: CandlestickData[];
}

export default function Chart({ data }: ChartProps) {
    // Debug: Log when component renders and data changes
    useEffect(() => {
        console.log("📈 Chart component rendered with data length:", data.length);
        console.log("📈 Raw data:", data);
    }, [data]);

    const formattedData = useMemo(() => {
        if (!data || data.length === 0) {
            console.log("📈 No data to format");
            return [];
        }

        try {
            const formatted = data
                .map(candle => {
                    const timeValue = new Date(candle.time).getTime() / 1000;

                    return {
                        time: Math.floor(timeValue) as never,
                        open: Number(candle.open) || 0,
                        high: Number(candle.high) || 0,
                        low: Number(candle.low) || 0,
                        close: Number(candle.close) || 0,
                    };
                })
                .sort((a, b) => (a.time as number) - (b.time as number));

            console.log("📈 Formatted data for chart:", formatted.length, "candles");
            return formatted;
        } catch (error) {
            console.error("Error formatting chart data:", error);
            return [];
        }
    }, [data]);

    if (!formattedData || formattedData.length === 0) {
        return (
            <div className="chart-container">
                <div className="flex items-center justify-center h-full text-secondary-text text-sm">
                    No trading data yet.
                </div>
            </div>
        );
    }

    return (
        <div className="chart-container">
            <TradingViewChart {...options} autoSize key={formattedData.length}>
                <CandlestickSeries
                    data={formattedData}
                    upColor="#f8aaff"
                    downColor="red"
                    borderDownColor="red"
                    borderUpColor="#f8aaff"
                    wickDownColor="red"
                    wickUpColor="#f8aaff"
                />
            </TradingViewChart>
        </div>
    );
}

const options = {
    width: 600,
    height: 300,
    layout: {
        background: {
            color: "transparent",
        },
        textColor: "rgba(255, 255, 255, 0.9)",
    },
    grid: {
        vertLines: {
            color: "rgba(255, 255, 255, 0.02)",
        },
        horzLines: {
            color: "rgba(255, 255, 255, 0.02)",
        },
    },
    crosshair: {
        mode: CrosshairMode.Normal,
    },
    rightPriceScale: {
        borderColor: "rgba(197, 203, 206, 0.8)",
    },
    timeScale: {
        borderColor: "rgba(197, 203, 206, 0.8)",
    },
};
