import React from 'react'

let isLocalhost = (window.location.hostname.indexOf('localhost') >= 0 || window.location.hostname.indexOf('127.0.0.1') >= 0) && window.location.port !== '';
export const getServedBy = () => {
  return isLocalhost
    ? 'flask'
    : 'nginx'
}

export const getUrl = () => {
  const portWithColon = window.location.port ? `:${window.location.port}` : '';
  
  // Check if SSL is specifically configured
  const forceSSL = localStorage.getItem('force_ssl') === 'true';
  
  if (isLocalhost) {
    // In development, always use http:// with port 5000
    return `http://${window.location.hostname}:5000`;
  } else if (forceSSL) {
    // With force_ssl, always use https://
    return `https://${window.location.hostname}${portWithColon}`;
  } else {
    // Otherwise, preserve the protocol currently being used
    return `${window.location.protocol}//${window.location.hostname}${portWithColon}`;
  }
}

export const getPublicWatchUrl = () => {
  // First check for customized shareable link domain in settings
  const shareableLinkDomain = getSetting('ui_config')?.['shareable_link_domain'];
  if (shareableLinkDomain) {
    // Ensure the domain includes protocol - and default to https if not specified
    if (shareableLinkDomain.includes('://')) {
      return `${shareableLinkDomain}/w/`;
    } else {
      return `https://${shareableLinkDomain}/w/`;
    }
  }
  
  // When no custom domain is set, use the current host
  const portWithColon = window.location.port ? `:${window.location.port}` : '';
  const forceSSL = localStorage.getItem('force_ssl') === 'true';
  
  if (isLocalhost) {
    return `http://${window.location.hostname}:5000/w/`;
  } else if (forceSSL) {
    return `https://${window.location.hostname}${portWithColon}/w/`;
  } else {
    return `${window.location.protocol}//${window.location.hostname}${portWithColon}/w/`;
  }
}

export const getVideoPath = (id, extension) => {
  if (extension === '.mkv') {
    return `${id}-1.mp4`
  }
  return `${id}${extension}`
}

export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = React.useState(value)

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}


// Simple logger utility that can be enabled/disabled via localStorage
export const logger = {
  debug: (component, ...args) => {
    if (process.env.NODE_ENV === 'development' && localStorage.getItem('enable_debug_logs') === 'true') {
      console.debug(`[${component}]`, ...args);
    }
  },
  info: (component, ...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.info(`[${component}]`, ...args);
    }
  },
  warn: (component, ...args) => {
    console.warn(`[${component}]`, ...args);
  },
  error: (component, ...args) => {
    console.error(`[${component}]`, ...args);
  }
};


const pendingRequests = {};

export const cache = {
  get: (key) => {
    const data = localStorage.getItem(key);
    if (!data) return null;
    
    try {
      const { value, expiry } = JSON.parse(data);
      if (expiry && expiry < Date.now()) {
        localStorage.removeItem(key);
        return null;
      }
      return value;
    } catch (err) {
      console.error('Cache retrieval error:', err);
      return null;
    }
  },
  
  set: (key, value, ttl = 5 * 60 * 1000) => {
    try {
      const data = {
        value,
        expiry: ttl ? Date.now() + ttl : null
      };
      localStorage.setItem(key, JSON.stringify(data));
    } catch (err) {
      console.error('Cache set error:', err);
    }
  },
  
  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      console.error(`Cache removal error for key ${key}:`, err);
    }
  },
  
  isRequestPending: (key) => {
    return !!pendingRequests[key];
  },
  
  registerRequest: (key, promise) => {
    pendingRequests[key] = promise;
    
    promise.finally(() => {
      delete pendingRequests[key];
    });
    return promise;
  },
  
  getPendingRequest: (key) => {
    return pendingRequests[key];
  }
};

export const getSettings = () => localStorage.getItem('config') && JSON.parse(localStorage.getItem('config'))
export const getSetting = (setting) =>
  localStorage.getItem('config') && JSON.parse(localStorage.getItem('config'))[setting]
export const setSettings = (settings) => localStorage.setItem('config', JSON.stringify(settings))
export const setSetting = (setting, value) => {
  if (localStorage.getItem('config')) {
    const settings = JSON.parse(localStorage.getItem('config'))
    localStorage.setItem('config', JSON.stringify({ ...settings, [setting]: value }))
  } else {
    localStorage.setItem('config', JSON.stringify({ [setting]: value }))
  }
}

export const toHHMMSS = (secs) => {
  var sec_num = parseInt(secs, 10)
  var hours = Math.floor(sec_num / 3600)
  var minutes = Math.floor(sec_num / 60) % 60
  var seconds = sec_num % 60

  return [hours, minutes, seconds]
    .map((v) => (v < 10 ? '0' + v : v))
    .filter((v, i) => v !== '00' || i > 0)
    .join(':')
}

export const copyToClipboard = (textToCopy) => {
  
  if (navigator.clipboard && window.isSecureContext) {
    
    return navigator.clipboard.writeText(textToCopy)
  } else {
    console.log('test')
    
    let textArea = document.createElement('textarea')
    textArea.value = textToCopy
    
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    return new Promise((res, rej) => {
      
      document.execCommand('copy') ? res() : rej()
      textArea.remove()
    })
  }
}