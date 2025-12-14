"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { formatUnits } from "viem";
import { useBalance } from "wagmi";
import { useDynamicContext, DynamicWidget, useIsLoggedIn } from "@dynamic-labs/sdk-react-core";
import { ChevronDown, Search, Settings, Star, Plus, LogOut } from "lucide-react";

import Logo from "../Logo";
import { truncateWallet } from "@/lib/utils";
import { useWindowStore } from "@/store/windowStore";
import CreateIPWindow from "../CreateIPWindow";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTokenStore } from "@/store/tokenStore";

export default function Navigation() {
    const isLoggedIn = useIsLoggedIn();
    const pathname = usePathname();
    const { openWindow } = useWindowStore();
    const router = useRouter();
    const { setSearchQuery } = useTokenStore();
    const [searchTerm, setSearchTerm] = useState("");

    const handleCreateClick = () => {
        openWindow("create-ip", "Create Tradable IP", <CreateIPWindow />);
    };

    const menuItems = [
        { label: "Trenches", href: "/" },
        { label: "Market", href: "/market" },
        { label: "Earnings", href: "/earnings" },
        { label: "Tutorial", href: "/tutorial" },
    ];

    return (
        <nav className="sticky top-0 z-50 bg-background border-b border-border-subtle">
            <div className="flex items-center justify-between pr-6 pl-1 h-20">
                {/* Logo and Menu */}
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <Link href="/">
                            <Logo size={96} color="dark" />
                        </Link>
                    </div>

                    <div className="hidden lg:flex items-center gap-4">
                        {menuItems.map(item => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.label}
                                    href={item.href}
                                    className={`text-sm transition-colors ${
                                        isActive
                                            ? "text-foreground"
                                            : "text-secondary-text hover:text-foreground"
                                    }`}
                                    aria-current={isActive ? "page" : undefined}
                                >
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* Create Button, Search and Wallet */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleCreateClick}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-background rounded-lg font-medium hover:bg-primary/80 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Create
                    </button>
                    <div className="hidden md:flex items-center gap-2 bg-secondary-bg rounded-lg px-3 py-2 border border-border-subtle">
                        <Search className="w-4 h-4 text-muted-text" />
                        <input
                            type="text"
                            placeholder="Search IP ID"
                            value={searchTerm}
                            onChange={e => {
                                setSearchTerm(e.target.value);
                                setSearchQuery(e.target.value);
                            }}
                            onKeyDown={e => {
                                if (e.key === "Enter" && searchTerm.trim()) {
                                    router.push(`/ip/${searchTerm.trim()}`);
                                }
                            }}
                            className="bg-transparent border-none outline-none text-sm w-48 text-foreground placeholder:text-muted-text"
                        />
                        <span className="text-muted-text text-xs">/</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <button>
                            <Settings className="w-4 h-4 transition-colors hover:text-foreground text-secondary-text" />
                        </button>
                        <Link href="/watchlist">
                            <Star className="w-4 h-4 transition-colors hover:text-orange-200 text-secondary-text" />
                        </Link>
                    </div>
                    {isLoggedIn ? (
                        <UserMenu />
                    ) : (
                        <DynamicWidget
                            buttonContainerClassName="wallet-button"
                            innerButtonComponent={<span>Connect Wallet</span>}
                        />
                    )}
                </div>
            </div>
        </nav>
    );
}

function UserMenu() {
    const { primaryWallet, handleLogOut } = useDynamicContext();
    const walletAddress = primaryWallet?.address as `0x${string}` | undefined;

    const { data: balanceData } = useBalance({
        address: walletAddress,
    });

    const walletBalance = balanceData ? formatUnits(balanceData.value, balanceData.decimals) : "0";

    const userMenuItems = [
        { label: "Portfolio", href: "/portfolio" },
        { label: "Watchlist", href: "/watchlist" },
        { label: "Referral", href: "/referral" },
    ];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 bg-secondary-bg rounded-lg px-3 py-2 border border-border-subtle transition-colors hover:border-border">
                    <div className="flex flex-col items-start text-left">
                        <span className="text-sm font-mono font-bold text-primary">
                            {parseFloat(walletBalance).toFixed(6)} $IP
                        </span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-muted-text transition-transform data-[state=open]:rotate-180" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="w-56 rounded-lg border-border-subtle bg-background p-0"
            >
                <div className="border-b border-border-subtle px-4 py-3">
                    <p className="text-xs text-muted-text uppercase tracking-wide">$IP Balance</p>
                    <p className="text-lg font-mono font-semibold text-foreground">
                        {parseFloat(walletBalance).toFixed(6)}
                    </p>
                    {walletAddress && (
                        <p className="text-xs text-muted-text">
                            {truncateWallet(walletAddress, 18, 6)}
                        </p>
                    )}
                </div>
                <div className="py-2">
                    {userMenuItems.map(item => (
                        <DropdownMenuItem key={item.label} asChild>
                            <Link
                                href={item.href}
                                className="px-4 py-2 text-sm text-secondary-text hover:text-foreground hover:bg-secondary-bg transition-colors cursor-pointer"
                            >
                                {item.label}
                            </Link>
                        </DropdownMenuItem>
                    ))}
                </div>
                <div className="border-t border-border-subtle py-2">
                    <DropdownMenuItem
                        onClick={handleLogOut}
                        className="px-4 py-2 text-sm text-negative hover:text-negative hover:bg-negative/10 transition-colors cursor-pointer flex items-center gap-2"
                    >
                        <LogOut className="w-4 h-4" />
                        Disconnect
                    </DropdownMenuItem>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
