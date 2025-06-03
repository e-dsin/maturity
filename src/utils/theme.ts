// src/utils/theme.ts
export const colors = {
    primary: {
      DEFAULT: '#0B4E87', // Bleu foncé
      900: '#0B4E87',
      800: '#2D698F',
      700: '#4F84A8',
      600: '#719FC1',
      500: '#93BAD9',
      400: '#B5D5F2',
      100: '#E6F0FA',
      50: '#F0F7FF',
    },
    secondary: {
      DEFAULT: '#09C4B8', // Turquoise
      900: '#09C4B8',
      800: '#2ED0C6',
      700: '#53DCD4',
      600: '#78E8E2',
      500: '#9DF4F0',
      400: '#C2FFFD',
      100: '#E6FFFD',
      50: '#F0FFFD',
    },
    accent1: {
      DEFAULT: '#C55A57', // Rouge corail
      light: '#F29B8D',
    },
    accent2: {
      DEFAULT: '#A9C255', // Vert lime
      light: '#D3E48F',
    },
    accent3: {
      DEFAULT: '#7E64A8', // Violet
      light: '#C4B1E0',
    },
    accent4: {
      DEFAULT: '#4AACC5', // Bleu ciel
      light: '#A6DFF2',
    },
  };
  
  export const typography = {
    fontFamily: {
      sans: ['Ubuntu', 'sans-serif'],
      title: ['Ubuntu', 'sans-serif'],
    },
    fontSize: {
      xs: '0.75rem',     // 12px
      sm: '0.875rem',    // 14px
      base: '1rem',      // 16px
      lg: '1.125rem',    // 18px
      xl: '1.25rem',     // 20px
      '2xl': '1.5rem',   // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem',  // 36px
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  };
  
  export const spacing = {
    base: 4,            // 4px
    xs: '0.25rem',      // 4px
    sm: '0.5rem',       // 8px
    md: '1rem',         // 16px
    lg: '1.5rem',       // 24px
    xl: '2rem',         // 32px
    '2xl': '2.5rem',    // 40px
    '3xl': '3rem',      // 48px
  };
  
  export const shadows = {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    card: '0 2px 6px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.1)',
    'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  };
  
  export const breakpoints = {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  };
  
  export const borderRadius = {
    none: '0',
    sm: '0.125rem',    // 2px
    DEFAULT: '0.25rem', // 4px
    md: '0.375rem',    // 6px
    lg: '0.5rem',      // 8px
    xl: '0.75rem',     // 12px
    '2xl': '1rem',     // 16px
    '3xl': '1.5rem',   // 24px
    full: '9999px',
  };
  
  export const transitions = {
    DEFAULT: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    fast: '100ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  };
  
  export const zIndex = {
    0: '0',
    10: '10',
    20: '20',
    30: '30',
    40: '40',
    50: '50',
    auto: 'auto',
    dropdown: '1000',
    sticky: '1020',
    fixed: '1030',
    modalBackdrop: '1040',
    modal: '1050',
    popover: '1060',
    tooltip: '1070',
  };
  
  export default {
    colors,
    typography,
    spacing,
    shadows,
    breakpoints,
    borderRadius,
    transitions,
    zIndex,
  };