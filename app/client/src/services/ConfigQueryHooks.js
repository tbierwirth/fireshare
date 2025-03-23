import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ConfigService from './ConfigService';
import { logger } from '../common/logger';
import { useAuth } from '../contexts';

/**
 * Hook to fetch and manage UI configuration
 */
export function useConfig(options = {}) {
  return useQuery({
    queryKey: ['config', 'ui'],
    queryFn: () => {
      logger.debug('ConfigQueryHooks', 'Fetching UI config');
      return ConfigService.getConfig();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    ...options
  });
}

/**
 * Hook to fetch and manage admin configuration
 */
export function useAdminConfig(isAdmin = false, options = {}) {
  return useQuery({
    queryKey: ['config', 'admin'],
    queryFn: async () => {
      logger.debug('ConfigQueryHooks', 'Fetching admin config');
      try {
        const result = await ConfigService.getAdminConfig();
        return result;
      } catch (error) {
        logger.error('ConfigQueryHooks', 'Error fetching admin config', error);
        throw error;
      }
    },
    enabled: isAdmin,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
    retry: isAdmin ? 1 : 0,
    ...options
  });
}

/**
 * Hook to update configuration settings
 */
export function useUpdateConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (config) => {
      logger.debug('ConfigQueryHooks', 'Updating config', config);
      return ConfigService.updateConfig(config);
    },
    onSuccess: () => {
      // Invalidate both UI and admin config queries
      queryClient.invalidateQueries({ queryKey: ['config'] });
    }
  });
}

/**
 * Hook to fetch system warnings
 */
export function useSystemWarnings(isAdmin = false, options = {}) {
  return useQuery({
    queryKey: ['config', 'warnings'],
    queryFn: async () => {
      logger.debug('ConfigQueryHooks', 'Fetching system warnings');
      try {
        const response = await ConfigService.getAdminWarnings();
        return response;
      } catch (error) {
        logger.error('ConfigQueryHooks', 'Error fetching system warnings', error);
        throw error;
      }
    },
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options
  });
}

/**
 * Hook to trigger a manual scan of the video library
 */
export function useScanLibrary() {
  return useMutation({
    mutationFn: () => {
      logger.debug('ConfigQueryHooks', 'Initiating library scan');
      return ConfigService.manualScan();
    }
  });
}

/**
 * Hook to fetch user-specific settings
 */
export function useUserSettings(options = {}) {
  const { isAuthenticated } = useAuth();
  
  return useQuery({
    queryKey: ['config', 'user'],
    queryFn: async () => {
      logger.debug('ConfigQueryHooks', 'Fetching user settings');
      try {
        const result = await ConfigService.getUserSettings();
        return result;
      } catch (error) {
        logger.error('ConfigQueryHooks', 'Error fetching user settings', error);
        // Return default settings if the API fails
        return {
          data: {
            darkMode: localStorage.getItem('darkMode') === 'true',
            defaultViewStyle: localStorage.getItem('listStyle') || 'card',
            cardSize: parseInt(localStorage.getItem('cardSize')) || 300
          }
        };
      }
    },
    enabled: !!isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 1, // Retry once, then fall back to defaults
    ...options
  });
}

/**
 * Hook to update user-specific settings
 */
export function useUpdateUserSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (settings) => {
      logger.debug('ConfigQueryHooks', 'Updating user settings', settings);
      return ConfigService.updateUserSettings(settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config', 'user'] });
    }
  });
}

/**
 * Centralized config cache management
 */
export function useConfigCache() {
  const queryClient = useQueryClient();
  
  const refreshConfig = () => {
    queryClient.invalidateQueries({ queryKey: ['config'] });
    return true;
  };
  
  return {
    refreshConfig
  };
}