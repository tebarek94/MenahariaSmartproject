import { useState, useEffect, useCallback } from "react";

export function useLocalStorage(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item != null ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [key, state]);

  const remove = useCallback(() => {
    window.localStorage.removeItem(key);
    setState(initialValue);
  }, [key, initialValue]);

  return [state, setState, remove];
}
