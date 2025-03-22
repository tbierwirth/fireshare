import React from 'react'

let isLocalhost = (window.location.hostname.indexOf('localhost') >= 0 || window.location.hostname.indexOf('127.0.0.1') >= 0) && window.location.port !== '';
export const getServedBy = () => {
  return isLocalhost
    ? 'flask'
    : 'nginx'
}

export const getUrl = () => {
  const portWithColon = window.location.port ? `:${window.location.port}` : ''
  return isLocalhost
    ? `http://${window.location.hostname}:${process.env.REACT_APP_SERVER_PORT || window.location.port}`
    : `${window.location.protocol}//${window.location.hostname}${portWithColon}`
}

export const getPublicWatchUrl = () => {
  const shareableLinkDomain = getSetting('ui_config')?.['shareable_link_domain']
  if (shareableLinkDomain) {
    return `${shareableLinkDomain}/w/`
  }
  const portWithColon = window.location.port ? `:${window.location.port}` : ''
  return isLocalhost
    ? `http://${window.location.hostname}:${process.env.REACT_APP_SERVER_PORT || window.location.port}/#/w/`
    : `${window.location.protocol}//${window.location.hostname}${portWithColon}/w/`
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


export function withTiming(Component) {
  const WrappedComponent = React.forwardRef((props, ref) => {
    const componentName = Component.displayName || Component.name || 'Component';
    const renderCount = React.useRef(0);
    
    
    renderCount.current += 1;
    
    console.log(`[${new Date().toISOString()}] ${componentName} rendering (count: ${renderCount.current})`);
    console.time(`${componentName} render #${renderCount.current}`);
    
    
    const enhancedProps = {
      ...props,
      _debugRenderCount: renderCount.current
    };
    
    
    React.useEffect(() => {
      console.log(`[${new Date().toISOString()}] ${componentName} state:`, enhancedProps);
      
      return () => {
        console.log(`[${new Date().toISOString()}] ${componentName} unmounting`);
      };
    }, []);
    
    
    const result = <Component {...enhancedProps} ref={ref} />;
    console.timeEnd(`${componentName} render #${renderCount.current}`);
    
    return result;
  });
  
  
  WrappedComponent.displayName = `withTiming(${Component.displayName || Component.name || 'Component'})`;
  
  return WrappedComponent;
}


export function useTrackedState(initialState, debugName) {
  const [state, setState] = React.useState(initialState);
  const stateRef = React.useRef(initialState);
  const updateCount = React.useRef(0);
  const componentName = debugName || 'Component';
  
  
  const setTrackedState = React.useCallback((newState) => {
    updateCount.current += 1;
    const count = updateCount.current;
    
    
    const resolvedNewState = typeof newState === 'function' 
      ? newState(stateRef.current) 
      : newState;
    
    console.log(`[${new Date().toISOString()}] ${componentName} state update #${count}:`, {
      from: stateRef.current,
      to: resolvedNewState,
      diff: typeof resolvedNewState === 'object' && typeof stateRef.current === 'object'
        ? Object.keys(resolvedNewState).reduce((acc, key) => {
            if (resolvedNewState[key] !== stateRef.current[key]) {
              acc[key] = {
                from: stateRef.current[key],
                to: resolvedNewState[key]
              };
            }
            return acc;
          }, {})
        : 'Simple value change'
    });
    
    
    stateRef.current = resolvedNewState;
    setState(resolvedNewState);
  }, [componentName]);
  
  return [state, setTrackedState];
}


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