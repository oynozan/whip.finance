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
    
    // 1. Use refs to track state inside the observer without adding dependencies
    const pageRef = useRef(0);
    const isLoadingRef = useRef(false);
    
    // 2. Keep loadPage stable in a ref to handle cases where the user 
    // forgot to wrap loadPage in useCallback
    const loadPageRef = useRef(loadPage);
    loadPageRef.current = loadPage;

    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            async (entries) => {
                const entry = entries[0];

                // 3. Check refs instead of state variables
                if (entry.isIntersecting && hasMore && !isLoadingRef.current) {
                    try {
                        // Lock the operation
                        isLoadingRef.current = true;
                        setIsLoading(true);

                        const nextPage = pageRef.current + 1;
                        console.log("Loading page", nextPage);

                        // Use the ref to call the latest function version
                        await loadPageRef.current(nextPage);
                        
                        // Only increment page if successful
                        pageRef.current = nextPage;
                    } catch (error) {
                        console.error("Failed to load page", error);
                    } finally {
                        // Unlock
                        isLoadingRef.current = false;
                        setIsLoading(false);
                    }
                }
            },
            { 
                root: null, 
                rootMargin, 
                // Threshold 0 ensures it fires as soon as 1px is visible
                threshold: 0 
            },
        );

        observer.observe(sentinel);

        return () => observer.disconnect();

        // 4. Dependency Array: 
        // We REMOVED `isLoading` and `loadPage`. 
        // This ensures the observer is not destroyed/recreated unnecessarily.
    }, [hasMore, rootMargin, sentinelRef]);

    return { isLoading };
}