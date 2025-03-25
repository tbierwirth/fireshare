import { useState, useRef, useEffect } from "react";

export default function useLoadingState({minDuration: minDuration = 800, initialState: initialState = true, onLoadingComplete: onLoadingComplete = null, debounceToggles: debounceToggles = true} = {}) {
  const [isLoading, setIsLoadingState] = useState(initialState);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const loadStartTime = useRef(Date.now());
  const isMounted = useRef(true);
  const timeoutRef = useRef(null);
  const isInTransition = useRef(false);
  const lastToggleTime = useRef(0);
  const setIsLoading = newLoadingState => {
    if (!isMounted.current) return;
    const now = Date.now();
    if (debounceToggles && now - lastToggleTime.current < 300) {
      return;
    }
    if (isInTransition.current && !newLoadingState) {
      return;
    }
    if (newLoadingState && !isLoading) {
      loadStartTime.current = now;
      lastToggleTime.current = now;
      setIsLoadingState(true);
      return;
    }
    if (!newLoadingState && isLoading) {
      const loadingTime = now - loadStartTime.current;
      const remainingTime = Math.max(0, minDuration - loadingTime);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (remainingTime > 0) {
        isInTransition.current = true;
        lastToggleTime.current = now;
        timeoutRef.current = setTimeout((() => {
          if (isMounted.current) {
            setIsLoadingState(false);
            setIsFirstLoad(false);
            isInTransition.current = false;
            if (onLoadingComplete) onLoadingComplete();
          }
        }), remainingTime);
      } else {
        lastToggleTime.current = now;
        setIsLoadingState(false);
        setIsFirstLoad(false);
        if (onLoadingComplete) onLoadingComplete();
      }
    }
  };
  useEffect((() => {
    // Check if we should suppress initial loading state based on session storage
    const hadFeedContent = sessionStorage.getItem('route:feed:hasVideos') === 'true';
    const hadDashboardContent = sessionStorage.getItem('route:dashboard:hasVideos') === 'true';
    const shouldSuppressLoading = hadFeedContent || hadDashboardContent;
    
    // If navigating between routes (Feed/Dashboard), use much shorter timeout
    const navigationTimeout = shouldSuppressLoading ? 50 : minDuration;
    
    if (initialState && !shouldSuppressLoading) {
      loadStartTime.current = Date.now();
      isInTransition.current = true;
      timeoutRef.current = setTimeout((() => {
        if (isMounted.current) {
          setIsLoadingState(false);
          setIsFirstLoad(false);
          isInTransition.current = false;
          if (onLoadingComplete) onLoadingComplete();
        }
      }), navigationTimeout);
    } else if (initialState && shouldSuppressLoading) {
      // Skip loading state entirely if we previously had content
      setIsLoadingState(false);
      setIsFirstLoad(false);
      isInTransition.current = false;
      if (onLoadingComplete) onLoadingComplete();
    }
    return () => {
      isMounted.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }), [ initialState, minDuration, onLoadingComplete ]);
  return [ isLoading, setIsLoading, isFirstLoad ];
}