import React, { createContext, useContext, useState } from 'react';

const AlertContext = createContext();

export function AlertProvider({ children }) {
  const [activeAlert, setActiveAlert] = useState(null);

  const triggerAlert = (level, duration = 0) => {
    setActiveAlert(level);
    if (duration > 0) {
      setTimeout(() => setActiveAlert(null), duration);
    }
  };

  const clearAlert = () => {
    setActiveAlert(null);
  };

  return (
    <AlertContext.Provider value={{ activeAlert, triggerAlert, clearAlert }}>
      {children}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}

