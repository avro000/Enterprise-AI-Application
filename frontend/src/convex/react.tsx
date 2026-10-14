import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { executeMutation, executeQuery, getCacheKey, subscribeToQueries } from "./bridge";
import { globalQueryCache } from "./cache";

export class ConvexReactClient {
  constructor(_url?: string) {}
}

const ConvexContext = createContext<any>(null);

export function ConvexAuthProvider({
  children,
  client,
}: {
  children: ReactNode;
  client?: ConvexReactClient;
}) {
  return (
    <AuthProvider>
      <ConvexContext.Provider value={client || {}}>{children}</ConvexContext.Provider>
    </AuthProvider>
  );
}

export function useConvexAuth() {
  const { isLoading, isAuthenticated } = useAuth();
  return { isLoading, isAuthenticated };
}

/**
 * Enterprise SWR (Stale-While-Revalidate) Query Hook:
 * - Hydrates synchronously from in-memory cache (0ms tab switching latency, zero loading spinners).
 * - Background revalidates when data exceeds stale threshold without unmounting or flickering.
 * - Deduplicates in-flight promises across concurrent components.
 */
export function useQuery(queryDef: any, args?: any): any {
  const queryName = typeof queryDef === "string" ? queryDef : String(queryDef);
  const isSkipped = args === "skip" || !queryName;
  const cacheKey = isSkipped ? "" : getCacheKey(queryName, args);

  // Synchronous initial state from SWR cache
  const [data, setData] = useState<any>(() => {
    if (isSkipped) return undefined;
    const cached = globalQueryCache.get(cacheKey);
    return cached ? cached.data : undefined;
  });

  useEffect(() => {
    if (isSkipped) {
      setData(undefined);
      return;
    }

    let active = true;

    // Check existing cache state
    const cached = globalQueryCache.get(cacheKey);
    if (cached && active) {
      setData(cached.data);
    }

    const revalidate = async (isBackground = false) => {
      try {
        const fresh = await globalQueryCache.dedupe(cacheKey, () =>
          executeQuery(queryName, args)
        );
        if (active) {
          setData(fresh);
        }
      } catch (err) {
        if (!isBackground) {
          console.error(`Query ${queryName} failed:`, err);
          if (active) setData(null);
        }
      }
    };

    // If no cache or if stale, fetch/revalidate
    if (!cached || cached.isStale) {
      const isBg = !!cached;
      revalidate(isBg);
    }

    // Subscribe to mutation invalidations
    const unsubscribe = subscribeToQueries(() => {
      revalidate(true);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [cacheKey, isSkipped]);

  return data;
}

export function useMutation(mutationDef: any) {
  const mutationName = typeof mutationDef === "string" ? mutationDef : String(mutationDef);

  return async (args?: any) => {
    return await executeMutation(mutationName, args);
  };
}

/**
 * Proactive prefetching helper to warm up cache on login or route hover
 */
export async function prefetchQuery(queryDef: any, args?: any): Promise<any> {
  const queryName = typeof queryDef === "string" ? queryDef : String(queryDef);
  const cacheKey = getCacheKey(queryName, args);
  return await globalQueryCache.dedupe(cacheKey, () => executeQuery(queryName, args));
}
