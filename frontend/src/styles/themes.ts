export interface ThemeDefinition {
  name: string;
  category: 'dark' | 'light';
  colors: {
    bgPrimary: string;
    bgSecondary: string;
    bgTertiary: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    borderColor: string;
    accentPrimary: string;
    accentPrimaryHover: string;
    accentSecondary: string;
    errorColor: string;
    errorBg: string;
    successColor: string;
    successBg: string;
    warningColor: string;
    infoColor: string;
  };
}

export const themes: Record<string, ThemeDefinition> = {
  // Dark Themes
  dark: {
    name: 'Dark (Default)',
    category: 'dark',
    colors: {
      bgPrimary: '#1e1e2e',
      bgSecondary: '#2d2d44',
      bgTertiary: '#3d3d5c',
      textPrimary: '#e2e8f0',
      textSecondary: '#cbd5e1',
      textMuted: '#94a3b8',
      borderColor: '#3d3d5c',
      accentPrimary: '#6366f1',
      accentPrimaryHover: '#4f46e5',
      accentSecondary: '#8b5cf6',
      errorColor: '#ef4444',
      errorBg: 'rgba(239, 68, 68, 0.1)',
      successColor: '#22c55e',
      successBg: 'rgba(34, 197, 94, 0.1)',
      warningColor: '#f59e0b',
      infoColor: '#3b82f6',
    },
  },

  dracula: {
    name: 'Dracula',
    category: 'dark',
    colors: {
      bgPrimary: '#282a36',
      bgSecondary: '#44475a',
      bgTertiary: '#6272a4',
      textPrimary: '#f8f8f2',
      textSecondary: '#e6e6e6',
      textMuted: '#bfbfbf',
      borderColor: '#44475a',
      accentPrimary: '#bd93f9',
      accentPrimaryHover: '#a374f5',
      accentSecondary: '#ff79c6',
      errorColor: '#ff5555',
      errorBg: 'rgba(255, 85, 85, 0.1)',
      successColor: '#50fa7b',
      successBg: 'rgba(80, 250, 123, 0.1)',
      warningColor: '#f1fa8c',
      infoColor: '#8be9fd',
    },
  },

  nord: {
    name: 'Nord',
    category: 'dark',
    colors: {
      bgPrimary: '#2e3440',
      bgSecondary: '#3b4252',
      bgTertiary: '#434c5e',
      textPrimary: '#eceff4',
      textSecondary: '#e5e9f0',
      textMuted: '#d8dee9',
      borderColor: '#434c5e',
      accentPrimary: '#88c0d0',
      accentPrimaryHover: '#81a1c1',
      accentSecondary: '#b48ead',
      errorColor: '#bf616a',
      errorBg: 'rgba(191, 97, 106, 0.1)',
      successColor: '#a3be8c',
      successBg: 'rgba(163, 190, 140, 0.1)',
      warningColor: '#ebcb8b',
      infoColor: '#5e81ac',
    },
  },

  gruvboxDark: {
    name: 'Gruvbox Dark',
    category: 'dark',
    colors: {
      bgPrimary: '#282828',
      bgSecondary: '#3c3836',
      bgTertiary: '#504945',
      textPrimary: '#fbf1c7',
      textSecondary: '#ebdbb2',
      textMuted: '#d5c4a1',
      borderColor: '#504945',
      accentPrimary: '#b8bb26',
      accentPrimaryHover: '#98971a',
      accentSecondary: '#fabd2f',
      errorColor: '#fb4934',
      errorBg: 'rgba(251, 73, 52, 0.1)',
      successColor: '#b8bb26',
      successBg: 'rgba(184, 187, 38, 0.1)',
      warningColor: '#fabd2f',
      infoColor: '#83a598',
    },
  },

  oneDark: {
    name: 'One Dark',
    category: 'dark',
    colors: {
      bgPrimary: '#282c34',
      bgSecondary: '#353b45',
      bgTertiary: '#3e4451',
      textPrimary: '#abb2bf',
      textSecondary: '#b6bdca',
      textMuted: '#828997',
      borderColor: '#3e4451',
      accentPrimary: '#61afef',
      accentPrimaryHover: '#528bcc',
      accentSecondary: '#c678dd',
      errorColor: '#e06c75',
      errorBg: 'rgba(224, 108, 117, 0.1)',
      successColor: '#98c379',
      successBg: 'rgba(152, 195, 121, 0.1)',
      warningColor: '#e5c07b',
      infoColor: '#56b6c2',
    },
  },

  tokyoNight: {
    name: 'Tokyo Night',
    category: 'dark',
    colors: {
      bgPrimary: '#1a1b26',
      bgSecondary: '#24283b',
      bgTertiary: '#414868',
      textPrimary: '#c0caf5',
      textSecondary: '#a9b1d6',
      textMuted: '#565f89',
      borderColor: '#414868',
      accentPrimary: '#7aa2f7',
      accentPrimaryHover: '#565f89',
      accentSecondary: '#bb9af7',
      errorColor: '#f7768e',
      errorBg: 'rgba(247, 118, 142, 0.1)',
      successColor: '#9ece6a',
      successBg: 'rgba(158, 206, 106, 0.1)',
      warningColor: '#e0af68',
      infoColor: '#2ac3de',
    },
  },

  monokai: {
    name: 'Monokai',
    category: 'dark',
    colors: {
      bgPrimary: '#272822',
      bgSecondary: '#3e3d32',
      bgTertiary: '#49483e',
      textPrimary: '#f8f8f2',
      textSecondary: '#cfcfc2',
      textMuted: '#75715e',
      borderColor: '#49483e',
      accentPrimary: '#a6e22e',
      accentPrimaryHover: '#7cb02e',
      accentSecondary: '#f92672',
      errorColor: '#f92672',
      errorBg: 'rgba(249, 38, 114, 0.1)',
      successColor: '#a6e22e',
      successBg: 'rgba(166, 226, 46, 0.1)',
      warningColor: '#e6db74',
      infoColor: '#66d9ef',
    },
  },

  solarizedDark: {
    name: 'Solarized Dark',
    category: 'dark',
    colors: {
      bgPrimary: '#002b36',
      bgSecondary: '#073642',
      bgTertiary: '#586e75',
      textPrimary: '#fdf6e3',
      textSecondary: '#eee8d5',
      textMuted: '#93a1a1',
      borderColor: '#586e75',
      accentPrimary: '#268bd2',
      accentPrimaryHover: '#1e6ea5',
      accentSecondary: '#d33682',
      errorColor: '#dc322f',
      errorBg: 'rgba(220, 50, 47, 0.1)',
      successColor: '#859900',
      successBg: 'rgba(133, 153, 0, 0.1)',
      warningColor: '#b58900',
      infoColor: '#2aa198',
    },
  },

  catppuccin: {
    name: 'Catppuccin',
    category: 'dark',
    colors: {
      bgPrimary: '#1e1e2e',
      bgSecondary: '#302d41',
      bgTertiary: '#575268',
      textPrimary: '#d9e0ee',
      textSecondary: '#c3bac6',
      textMuted: '#988ba2',
      borderColor: '#575268',
      accentPrimary: '#cba6f7',
      accentPrimaryHover: '#b4befe',
      accentSecondary: '#f38ba8',
      errorColor: '#f38ba8',
      errorBg: 'rgba(243, 139, 168, 0.1)',
      successColor: '#a6e3a1',
      successBg: 'rgba(166, 227, 161, 0.1)',
      warningColor: '#f9e2af',
      infoColor: '#74c7ec',
    },
  },

  // Light Themes
  light: {
    name: 'Light',
    category: 'light',
    colors: {
      bgPrimary: '#ffffff',
      bgSecondary: '#f8fafc',
      bgTertiary: '#f1f5f9',
      textPrimary: '#1e293b',
      textSecondary: '#475569',
      textMuted: '#64748b',
      borderColor: '#e2e8f0',
      accentPrimary: '#6366f1',
      accentPrimaryHover: '#4f46e5',
      accentSecondary: '#8b5cf6',
      errorColor: '#dc2626',
      errorBg: 'rgba(220, 38, 38, 0.1)',
      successColor: '#16a34a',
      successBg: 'rgba(22, 163, 74, 0.1)',
      warningColor: '#d97706',
      infoColor: '#2563eb',
    },
  },

  gruvboxLight: {
    name: 'Gruvbox Light',
    category: 'light',
    colors: {
      bgPrimary: '#fbf1c7',
      bgSecondary: '#f2e5bc',
      bgTertiary: '#ebdbb2',
      textPrimary: '#3c3836',
      textSecondary: '#504945',
      textMuted: '#7c6f64',
      borderColor: '#d5c4a1',
      accentPrimary: '#79740e',
      accentPrimaryHover: '#5e6309',
      accentSecondary: '#b57614',
      errorColor: '#9d0006',
      errorBg: 'rgba(157, 0, 6, 0.1)',
      successColor: '#79740e',
      successBg: 'rgba(121, 116, 14, 0.1)',
      warningColor: '#b57614',
      infoColor: '#076678',
    },
  },

  solarizedLight: {
    name: 'Solarized Light',
    category: 'light',
    colors: {
      bgPrimary: '#fdf6e3',
      bgSecondary: '#eee8d5',
      bgTertiary: '#93a1a1',
      textPrimary: '#002b36',
      textSecondary: '#073642',
      textMuted: '#586e75',
      borderColor: '#93a1a1',
      accentPrimary: '#268bd2',
      accentPrimaryHover: '#1e6ea5',
      accentSecondary: '#d33682',
      errorColor: '#dc322f',
      errorBg: 'rgba(220, 50, 47, 0.1)',
      successColor: '#859900',
      successBg: 'rgba(133, 153, 0, 0.1)',
      warningColor: '#b58900',
      infoColor: '#2aa198',
    },
  },

  githubLight: {
    name: 'GitHub Light',
    category: 'light',
    colors: {
      bgPrimary: '#ffffff',
      bgSecondary: '#f6f8fa',
      bgTertiary: '#eaeef2',
      textPrimary: '#24292f',
      textSecondary: '#57606a',
      textMuted: '#8c959f',
      borderColor: '#d0d7de',
      accentPrimary: '#0969da',
      accentPrimaryHover: '#0550ae',
      accentSecondary: '#8250df',
      errorColor: '#cf222e',
      errorBg: 'rgba(207, 34, 46, 0.1)',
      successColor: '#1a7f37',
      successBg: 'rgba(26, 127, 55, 0.1)',
      warningColor: '#9a6700',
      infoColor: '#0969da',
    },
  },
};

export const themeCategories = {
  dark: [
    'dark',
    'dracula',
    'nord',
    'gruvboxDark',
    'oneDark',
    'tokyoNight',
    'monokai',
    'solarizedDark',
    'catppuccin',
  ],
  light: ['light', 'gruvboxLight', 'solarizedLight', 'githubLight'],
};

export const applyTheme = (themeKey: string) => {
  const theme = themes[themeKey];
  if (!theme) return;

  const root = document.documentElement;
  const { colors } = theme;

  root.style.setProperty('--bg-primary', colors.bgPrimary);
  root.style.setProperty('--bg-secondary', colors.bgSecondary);
  root.style.setProperty('--bg-tertiary', colors.bgTertiary);
  root.style.setProperty('--text-primary', colors.textPrimary);
  root.style.setProperty('--text-secondary', colors.textSecondary);
  root.style.setProperty('--text-muted', colors.textMuted);
  root.style.setProperty('--border-color', colors.borderColor);
  root.style.setProperty('--accent-primary', colors.accentPrimary);
  root.style.setProperty('--accent-primary-hover', colors.accentPrimaryHover);
  root.style.setProperty('--accent-secondary', colors.accentSecondary);
  root.style.setProperty('--error-color', colors.errorColor);
  root.style.setProperty('--error-bg', colors.errorBg);
  root.style.setProperty('--success-color', colors.successColor);
  root.style.setProperty('--success-bg', colors.successBg);
  root.style.setProperty('--warning-color', colors.warningColor);
  root.style.setProperty('--info-color', colors.infoColor);

  root.setAttribute('data-theme', theme.category);
};
