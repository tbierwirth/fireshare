import React, { createContext, useContext, useState, useEffect } from 'react';
import { ConfigService } from '../services';
import { cache } from '../common/utils';


const ConfigContext = createContext();


export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};


export const ConfigProvider = ({ children }) => {
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  
  const fetchConfig = async (force = false) => {
    setIsLoading(true);
    
    try {
      
      if (!force) {
        const cachedConfig = cache.get('app_config');
        if (cachedConfig) {
          console.log('Using cached app config');
          setConfig(cachedConfig);
          setIsLoading(false);
          return;
        }
      }
      
      
      console.log('Fetching fresh app config');
      const res = await ConfigService.getConfig();
      const newConfig = res.data;
      
      
      setConfig(newConfig);
      cache.set('app_config', newConfig, 30 * 60 * 1000); 
    } catch (error) {
      console.error('Config fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  
  const fetchAdminConfig = async () => {
    try {
      const res = await ConfigService.getAdminConfig();
      return res.data;
    } catch (error) {
      console.error('Admin config fetch error:', error);
      throw error;
    }
  };
  
  
  const updateConfig = async (newConfig) => {
    try {
      await ConfigService.updateConfig(newConfig);
      
      fetchConfig(true);
    } catch (error) {
      console.error('Config update error:', error);
      throw error;
    }
  };
  
  
  useEffect(() => {
    fetchConfig();
  }, []);
  
  
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