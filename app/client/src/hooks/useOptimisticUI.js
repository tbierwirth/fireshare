import { useState, useEffect } from 'react';

/**
 * Custom hook to implement optimistic UI patterns with session storage.
 * Tracks if a component has shown content before to avoid "no content" flashes.
 * 
 * @param {Object} options Hook configuration options
 * @param {string} options.key Storage key identifier for this component
 * @param {boolean} options.initialValue Initial value for hadContent state
 * @param {Array|Object} options.data Data to track
 * @param {boolean} options.condition Optional condition for updating storage (default checks for array length)
 * @returns {boolean} Whether this component has shown content before
 */
export default function useOptimisticUI({
  key,
  initialValue = false,
  data,
  condition = null
}) {
  // Get initial value from session storage or use provided initialValue
  const [hadContent, setHadContent] = useState(() => {
    const storedValue = sessionStorage.getItem(key);
    return storedValue === 'true' || initialValue;
  });
  
  // Update session storage when data meets the condition
  useEffect(() => {
    let hasContent = false;
    
    // Check if data meets the condition
    if (condition !== null) {
      // Use the custom condition if provided
      hasContent = condition(data);
    } else {
      // Default condition: check if array has items or object has properties
      if (Array.isArray(data)) {
        hasContent = data && data.length > 0;
      } else if (data && typeof data === 'object') {
        hasContent = Object.keys(data).length > 0;
      } else {
        hasContent = !!data;
      }
    }
    
    // Update session storage if content is found
    if (hasContent) {
      sessionStorage.setItem(key, 'true');
      setHadContent(true);
    }
  }, [data, key, condition]);
  
  return hadContent;
}