import type { Metadata } from "next";
import { Figtree, Ubuntu_Mono } from "next/font/google";

import Navigation from "@/components/Navigation";
import Wrapper from "@/components/Wrapper";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";

import "./globals.css";

const figtree = Figtree({
    subsets: ["latin"],
    variable: "--font-figtree",
});

const ubuntuMono = Ubuntu_Mono({
    subsets: ["latin"],
    variable: "--font-ubuntu-mono",
    weight: ["400", "700"],
});

export const metadata: Metadata = {
    title: "whip.finance",
    description: "pump.fun for Story IPs",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${figtree.variable} ${ubuntuMono.variable} antialiased`}>
                <Wrapper>
                    <div className="min-h-screen bg-background flex flex-col">
                        <Navigation />

                        <div className="flex flex-1 overflow-hidden">
                            <Sidebar />

                            <main className="flex-1 overflow-hidden flex flex-col">
                                {children}
                                <Footer />
                            </main>
                        </div>
                    </div>
                </Wrapper>
            </body>
        </html>
    );
}
