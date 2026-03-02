import { createContext, useState, useEffect, useContext } from 'react';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('cd-theme') || 'dark';
  });

  useEffect(() => {
    // Apply theme to the root HTML element
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cd-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Convenience hook
export const useTheme = () => useContext(ThemeContext);
