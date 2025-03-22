import { useState, useEffect } from "react";

export default function useOptimisticUI({key: key, initialValue: initialValue = false, data: data, condition: condition = null}) {
  const [hadContent, setHadContent] = useState((() => {
    const storedValue = sessionStorage.getItem(key);
    return storedValue === "true" || initialValue;
  }));
  useEffect((() => {
    let hasContent = false;
    if (condition !== null) {
      hasContent = condition(data);
    } else {
      if (Array.isArray(data)) {
        hasContent = data && data.length > 0;
      } else if (data && typeof data === "object") {
        hasContent = Object.keys(data).length > 0;
      } else {
        hasContent = !!data;
      }
    }
    if (hasContent) {
      sessionStorage.setItem(key, "true");
      setHadContent(true);
    }
  }), [ data, key, condition ]);
  return hadContent;
}