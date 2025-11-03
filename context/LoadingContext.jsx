import { createContext, useContext, useState, useCallback } from "react";

const LoadingContext = createContext({
  isLoading: false,
  startLoading: () => {},
  stopLoading: () => {},
});

export const LoadingProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeRequests, setActiveRequests] = useState(0);

  const startLoading = useCallback(() => {
    setActiveRequests(prev => prev + 1);
    setIsLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    setActiveRequests(prev => {
      const next = prev - 1;
      if (next <= 0) {
        setTimeout(() => setIsLoading(false), 100);
        return 0;
      }
      return next;
    });
  }, []);

  return (
    <LoadingContext.Provider value={{ isLoading, startLoading, stopLoading }}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => useContext(LoadingContext);
