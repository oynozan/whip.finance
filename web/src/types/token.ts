export type SocialPlatform = "twitter" | "telegram" | "website" | "discord";

export interface SocialLink {
    platform: SocialPlatform;
    url: string;
}

export interface TokenCardProps {
    id: string;
    name: string;
    avatar: string;
    timestamp: Date;
    marketCap: number;
    volume24h: number;
    priceChange1m: number;
    supply?: number;
    currentPrice?: number;
    socialLinks?: SocialLink[];
    isDerivative?: boolean;
}

export interface ColumnHeaderProps {
    title: string;
    onSort: () => void;
    sortLabel: string;
}

export interface WalletInfoProps {
    balance: number;
    address: string;
    chains: Array<{ name: string; color: string }>;
}
