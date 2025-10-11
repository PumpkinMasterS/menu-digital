import { createContext, useContext, useEffect, useState, useMemo } from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  systemTheme: Theme;
  actualTheme: Theme;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
  systemTheme: "light",
  actualTheme: "light",
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "connect-ai-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem(storageKey) as Theme;
      return stored || defaultTheme;
    } catch {
      return defaultTheme;
    }
  });
  
  const [systemTheme, setSystemTheme] = useState<Theme>(() => 
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  );

  const actualTheme = useMemo(() => {
    return theme === "system" ? systemTheme : theme;
  }, [theme, systemTheme]);

  useEffect(() => {
    const root = window.document.documentElement;

    // Remove existing theme classes
    root.classList.remove("light", "dark");

    // Add the actual theme class
    root.classList.add(actualTheme);
    
    // Apply theme immediately to body
    document.body.setAttribute('data-theme', actualTheme);

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        "content", 
        actualTheme === "dark" ? "hsl(222.2, 84%, 4.9%)" : "hsl(0, 0%, 100%)"
      );
    }
  }, [actualTheme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };

    // Listen for system theme changes
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const value = useMemo(() => ({
    theme,
    setTheme: (newTheme: Theme) => {
      try {
        localStorage.setItem(storageKey, newTheme);
        setTheme(newTheme);
        
        // Dispatch custom event for other components to listen to
        window.dispatchEvent(new CustomEvent('theme-change', { 
          detail: { 
            theme: newTheme, 
            actualTheme: newTheme === "system" ? systemTheme : newTheme 
          } 
        }));
      } catch {
        // Fail silently for localStorage issues
        setTheme(newTheme);
      }
    },
    systemTheme,
    actualTheme,
  }), [theme, systemTheme, actualTheme, storageKey]);

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
}; 