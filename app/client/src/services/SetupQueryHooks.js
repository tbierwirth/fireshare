import axios from 'axios';
import { useQuery } from '@tanstack/react-query';

/**
 * Hook to fetch the setup status of the application
 * This is used to determine if the application needs first-time setup
 * and to get the setup invite code if available
 */
export const useSetupStatus = (options = {}) => {
  return useQuery({
    queryKey: ['setup', 'status'],
    queryFn: async () => {
      console.log('Fetching setup status from /api/setup/status');
      const response = await axios.get('/api/setup/status');
      console.log('Setup status response:', response.data);
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes (replaces cacheTime in v5)
    retry: 1,
    refetchOnWindowFocus: false,
    // Make sure this query is enabled by default
    enabled: true,
    ...options
  });
};