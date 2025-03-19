import React, { createContext, useContext, useState, useEffect } from 'react';
import { ConfigService } from '../services';
import { cache } from '../common/utils';

// Create config context
const ConfigContext = createContext();

// Custom hook to use the config context
export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};

// Provider component that wraps the app and makes config object available
export const ConfigProvider = ({ children }) => {
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Function to fetch config with caching
  const fetchConfig = async (force = false) => {
    setIsLoading(true);
    
    try {
      // Check cache first (unless forced refresh)
      if (!force) {
        const cachedConfig = cache.get('app_config');
        if (cachedConfig) {
          console.log('Using cached app config');
          setConfig(cachedConfig);
          setIsLoading(false);
          return;
        }
      }
      
      // No cache or forced refresh, fetch from API
      console.log('Fetching fresh app config');
      const res = await ConfigService.getConfig();
      const newConfig = res.data;
      
      // Update state and cache
      setConfig(newConfig);
      cache.set('app_config', newConfig, 30 * 60 * 1000); // 30 minute TTL
    } catch (error) {
      console.error('Config fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Get admin config (only called explicitly)
  const fetchAdminConfig = async () => {
    try {
      const res = await ConfigService.getAdminConfig();
      return res.data;
    } catch (error) {
      console.error('Admin config fetch error:', error);
      throw error;
    }
  };
  
  // Update config (admin only)
  const updateConfig = async (newConfig) => {
    try {
      await ConfigService.updateConfig(newConfig);
      // Refresh config after update
      fetchConfig(true);
    } catch (error) {
      console.error('Config update error:', error);
      throw error;
    }
  };
  
  // Fetch config on initial load
  useEffect(() => {
    fetchConfig();
  }, []);
  
  // Create the config value object
  const configValue = {
    config,
    isLoading,
    fetchConfig,
    fetchAdminConfig,
    updateConfig
  };
  
  return (
    <ConfigContext.Provider value={configValue}>
      {children}
    </ConfigContext.Provider>
  );
};

export default ConfigContext;