import axios from "axios";

import { cache } from "../common/utils";

// For local development, use relative URLs to leverage the proxy setting in package.json
// This will automatically use the proxy for /api/* requests
const createDedupedRequest = () => {
  const instance = axios.create({
    timeout: 1e4,
    withCredentials: true
  });
  instance.interceptors.request.use((async config => {
    const requestKey = `request:${config.method}:${config.url}:${JSON.stringify(config.params || {})}`;
    if (cache.isRequestPending(requestKey)) {
      config.requestKey = requestKey;
      config.deduped = true;
    } else {
      config.requestKey = requestKey;
    }
    return config;
  }));
  instance.interceptors.response.use((response => response), (error => {
    if (!axios.isCancel(error)) {
      if (error.response?.status === 401) {}
      return Promise.reject(error);
    }
    return null;
  }));
  return instance;
};

const Api = () => createDedupedRequest();

export const dedupedFetch = async config => {
  const requestKey = `request:${config.method || "get"}:${config.url}:${JSON.stringify(config.params || {})}`;
  if (cache.isRequestPending(requestKey)) {
    return cache.getPendingRequest(requestKey);
  }
  const api = Api();
  const promise = api(config);
  cache.registerRequest(requestKey, promise);
  return promise;
};

export default Api;