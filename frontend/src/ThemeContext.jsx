import { createContext, useContext, useState } from 'react';
import { themes } from './themes';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [themeKey, setThemeKey] = useState(
    () => localStorage.getItem('theme') || 'default'
  );

  const changeTheme = (key) => {
    setThemeKey(key);
    localStorage.setItem('theme', key);
  };

  return (
    <ThemeContext.Provider value={{ theme: themes[themeKey], themeKey, changeTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
