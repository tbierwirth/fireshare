import axios from 'axios';
import { useQuery } from '@tanstack/react-query';

/**
 * Hook to fetch the setup status of the application
 * This is used to determine if the application needs first-time setup
 * and to get the setup invite code if available
 */
export const useSetupStatus = (options = {}) => {
  return useQuery(
    ['setup', 'status'],
    async () => {
      const response = await axios.get('/api/setup/status');
      return response.data;
    },
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 10, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
      ...options
    }
  );
};