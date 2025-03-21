import axios from 'axios'
import { getUrl, cache } from '../common/utils'

const URL = getUrl()

// Create a request deduplication layer
const createDedupedRequest = () => {
  // Create a new instance each time to avoid shared state issues
  const instance = axios.create({
    baseURL: URL,
    timeout: 10000,
    withCredentials: true
  })
  
  // Add unique request ID to each request for tracking
  instance.interceptors.request.use(async (config) => {
    // Create a cache key based on the request
    const requestKey = `request:${config.method}:${config.url}:${JSON.stringify(config.params || {})}`
    
    // Check if there's already an in-flight request for this exact endpoint+params
    if (cache.isRequestPending(requestKey)) {
      // Attach the request key so we can handle it in the response interceptor
      config.requestKey = requestKey;
      config.deduped = true;
    } else {
      // Register this as a new in-flight request
      config.requestKey = requestKey;
    }
    
    return config;
  })
  
  // Handle response and deduplicate requests
  instance.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      if (!axios.isCancel(error)) {
        if (error.response?.status === 401) {
          // 401 Unauthorized handling could go here
        }
        return Promise.reject(error);
      }
      return null;
    }
  )
  
  return instance;
}

const Api = () => {
  return createDedupedRequest();
}

// Enhanced API with request deduplication
export const dedupedFetch = async (config) => {
  // Create a cache key based on the request
  const requestKey = `request:${config.method || 'get'}:${config.url}:${JSON.stringify(config.params || {})}`;
  
  // If there's already an in-flight request for this endpoint, return the existing promise
  if (cache.isRequestPending(requestKey)) {
    return cache.getPendingRequest(requestKey);
  }
  
  // Make a new request and register it
  const api = Api();
  const promise = api(config);
  
  // Register this promise so other components can reuse it
  cache.registerRequest(requestKey, promise);
  
  return promise;
};

export default Api
