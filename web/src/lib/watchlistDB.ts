"use client";

import { openDB } from "idb";
import { TokenCardProps } from "@/types/token";

const DB_NAME = "whip-watchlist";
const STORE_NAME = "watchlist";
const DB_VERSION = 1;

const getDB = () =>
    openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: "id" });
            }
        },
    });

export async function getWatchlistTokens(): Promise<TokenCardProps[]> {
    const db = await getDB();
    return db.getAll(STORE_NAME);
}

export async function saveTokenToWatchlist(token: TokenCardProps) {
    const db = await getDB();
    await db.put(STORE_NAME, token);
}

export async function removeTokenFromWatchlist(id: string) {
    const db = await getDB();
    await db.delete(STORE_NAME, id);
}
