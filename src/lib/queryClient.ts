import { QueryClient } from "@tanstack/react-query";

export const QUERY_CACHE_MAX_AGE = 1000 * 60 * 60 * 24; // 24 hours
export const QUERY_STALE_TIME = 4000; // Recheck data after 4 seconds

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cached results display immediately; mounted queries become eligible
      // for a background refresh after four seconds.
      staleTime: QUERY_STALE_TIME,
      gcTime: QUERY_CACHE_MAX_AGE,
      retry: 1,
      networkMode: "offlineFirst",
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
    },
    mutations: {
      networkMode: "offlineFirst",
      retry: 0,
    },
  },
});
