// src/contexts/ErrorContext.jsx
import React, { createContext, useState, useContext } from 'react';

const ErrorContext = createContext();

export function ErrorProvider({ children }) {
  const [error, setError] = useState(null);

  const handleError = (err) => {
    console.error("Application error:", err);
    setError(err);
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <ErrorContext.Provider value={{ error, handleError, clearError }}>
      {children}
    </ErrorContext.Provider>
  );
}

export function useError() {
  return useContext(ErrorContext);
}