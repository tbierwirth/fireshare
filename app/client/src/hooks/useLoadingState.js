import { useState, useRef, useEffect } from 'react';

/**
 * Custom hook to manage loading states with minimum duration
 * to prevent flashing UI during quick data loads.
 * 
 * @param {Object} options Hook configuration options
 * @param {number} options.minDuration Minimum loading duration in milliseconds (default: 800)
 * @param {boolean} options.initialState Initial loading state (default: true)
 * @param {function} options.onLoadingComplete Callback when loading completes
 * @param {boolean} options.debounceToggles Prevents rapid toggling of loading state (default: true)
 * @returns {Array} [isLoading, setIsLoading, isFirstLoad]
 */
export default function useLoadingState({
  minDuration = 800,
  initialState = true,
  onLoadingComplete = null,
  debounceToggles = true
} = {}) {
  // Main loading state
  const [isLoading, setIsLoadingState] = useState(initialState);
  
  // Track if this is the component's first load
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  
  // Ref to track when loading started
  const loadStartTime = useRef(Date.now());
  
  // Ref to track component mounting state
  const isMounted = useRef(true);
  
  // Ref to track the timeout
  const timeoutRef = useRef(null);
  
  // Ref to track if we're in a loading transition to prevent double blinks
  const isInTransition = useRef(false);
  
  // Track the last state change time to debounce rapid toggles
  const lastToggleTime = useRef(0);
  
  // Custom setter for isLoading that respects minimum duration
  const setIsLoading = (newLoadingState) => {
    if (!isMounted.current) return;
    
    const now = Date.now();
    
    // Prevent rapid toggles (debounce) if enabled
    if (debounceToggles && now - lastToggleTime.current < 300) {
      return;
    }
    
    // If already in transition, don't interrupt it unless explicitly going to loading state
    if (isInTransition.current && !newLoadingState) {
      return;
    }
    
    // If switching to loading state, record the start time
    if (newLoadingState && !isLoading) {
      loadStartTime.current = now;
      lastToggleTime.current = now;
      setIsLoadingState(true);
      return;
    }
    
    // If switching from loading to not loading
    if (!newLoadingState && isLoading) {
      const loadingTime = now - loadStartTime.current;
      const remainingTime = Math.max(0, minDuration - loadingTime);
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      if (remainingTime > 0) {
        // Mark that we're in a transition
        isInTransition.current = true;
        lastToggleTime.current = now;
        
        // Need to wait for the minimum duration
        timeoutRef.current = setTimeout(() => {
          if (isMounted.current) {
            setIsLoadingState(false);
            setIsFirstLoad(false);
            isInTransition.current = false;
            if (onLoadingComplete) onLoadingComplete();
          }
        }, remainingTime);
      } else {
        // Min duration already met, update immediately
        lastToggleTime.current = now;
        setIsLoadingState(false);
        setIsFirstLoad(false);
        if (onLoadingComplete) onLoadingComplete();
      }
    }
  };
  
  // Apply the initial minimum loading duration on mount
  useEffect(() => {
    if (initialState) {
      loadStartTime.current = Date.now();
      isInTransition.current = true;
      
      timeoutRef.current = setTimeout(() => {
        if (isMounted.current) {
          setIsLoadingState(false);
          setIsFirstLoad(false);
          isInTransition.current = false;
          if (onLoadingComplete) onLoadingComplete();
        }
      }, minDuration);
    }
    
    return () => {
      isMounted.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [initialState, minDuration, onLoadingComplete]);
  
  return [isLoading, setIsLoading, isFirstLoad];
}