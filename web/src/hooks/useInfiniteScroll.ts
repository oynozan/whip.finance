import { useEffect, useRef, useState, RefObject } from "react";

type UseInfiniteScrollOptions = {
    hasMore: boolean;
    loadPage: (page: number) => Promise<void>;
    rootMargin?: string;
};

export function useInfiniteScroll(
    sentinelRef: RefObject<Element | null>,
    { hasMore, loadPage, rootMargin = "0px" }: UseInfiniteScrollOptions,
) {
    const [isLoading, setIsLoading] = useState(false);
    
    const pageRef = useRef(0);
    const isLoadingRef = useRef(false);
    const loadPageRef = useRef(loadPage);
    loadPageRef.current = loadPage;

    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            async (entries) => {
                const entry = entries[0];

                if (entry.isIntersecting && hasMore && !isLoadingRef.current) {
                    try {
                        isLoadingRef.current = true;
                        setIsLoading(true);

                        const nextPage = pageRef.current + 1;
                        console.log("Loading page", nextPage);

                        await loadPageRef.current(nextPage);
                        
                        pageRef.current = nextPage;
                    } catch (error) {
                        console.error("Failed to load page", error);
                    } finally {
                        isLoadingRef.current = false;
                        setIsLoading(false);
                    }
                }
            },
            { 
                root: null, 
                rootMargin, 
                threshold: 0 
            },
        );

        observer.observe(sentinel);

        return () => observer.disconnect();
    }, [hasMore, rootMargin, sentinelRef]);

    return { isLoading };
}