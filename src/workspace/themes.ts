export type ColorScheme = 'default' | 'github' | 'catppuccin' | 'rose-pine' | 'flexoki' | 'ayu' | 'gruvbox' | 'penumbra'
export type Mode = 'dark' | 'light'
export type ThemeTokens = Record<string, string>

export const THEMES: Record<ColorScheme, Record<Mode, ThemeTokens>> = {
  default: {
    light: {
      '--bg-primary': '#fdfcfc', '--bg-secondary': '#f8f7f7', '--bg-card': '#f8f7f7',
      '--bg-hover': '#f1eeee', '--border': 'rgba(15,0,0,0.12)',
      '--text-primary': '#201d1d', '--text-secondary': '#424245', '--text-muted': '#646262',
      '--accent-green': '#30d158', '--accent-blue': '#007aff', '--accent-purple': '#201d1d',
      '--error': '#ff3b30',
      '--warning-bg': '#fff3cd', '--warning-text': '#9a6700', '--warning-border': '#cc7f08',
    },
    dark: {
      '--bg-primary': '#201d1d', '--bg-secondary': '#302c2c', '--bg-card': '#302c2c',
      '--bg-hover': '#3d3838', '--border': 'rgba(253,252,252,0.1)',
      '--text-primary': '#fdfcfc', '--text-secondary': '#c4c2c2', '--text-muted': '#9a9898',
      '--accent-green': '#30d158', '--accent-blue': '#007aff', '--accent-purple': '#fdfcfc',
      '--error': '#ff3b30',
      '--warning-bg': '#2a1a00', '--warning-text': '#ff9f0a', '--warning-border': '#cc7f08',
    },
  },
  github: {
    dark: {
      '--bg-primary': '#0d1117', '--bg-secondary': '#161b22', '--bg-card': '#161b22',
      '--bg-hover': '#21262d', '--border': '#30363d',
      '--text-primary': '#e6edf3', '--text-secondary': '#8b949e', '--text-muted': '#6e7681',
      '--accent-green': '#238636', '--accent-blue': '#388bfd', '--accent-purple': '#238636',
      '--error': '#f85149',
      '--warning-bg': '#2d1b00', '--warning-text': '#d29922', '--warning-border': '#9e6a03',
    },
    light: {
      '--bg-primary': '#ffffff', '--bg-secondary': '#f6f8fa', '--bg-card': '#ffffff',
      '--bg-hover': '#f3f4f6', '--border': '#d0d7de',
      '--text-primary': '#1f2328', '--text-secondary': '#656d76', '--text-muted': '#9198a1',
      '--accent-green': '#1a7f37', '--accent-blue': '#0969da', '--accent-purple': '#1a7f37',
      '--error': '#cf222e',
      '--warning-bg': '#fff8c5', '--warning-text': '#9a6700', '--warning-border': '#d4a72c',
    },
  },
  catppuccin: {
    dark: {
      '--bg-primary': '#1e1e2e', '--bg-secondary': '#181825', '--bg-card': '#181825',
      '--bg-hover': '#313244', '--border': '#45475a',
      '--text-primary': '#cdd6f4', '--text-secondary': '#a6adc8', '--text-muted': '#6c7086',
      '--accent-green': '#a6e3a1', '--accent-blue': '#89b4fa', '--accent-purple': '#cba6f7',
      '--error': '#f38ba8',
      '--warning-bg': '#2a1a0a', '--warning-text': '#f9e2af', '--warning-border': '#fab387',
    },
    light: {
      '--bg-primary': '#eff1f5', '--bg-secondary': '#e6e9ef', '--bg-card': '#ffffff',
      '--bg-hover': '#dce0e8', '--border': '#ccd0da',
      '--text-primary': '#4c4f69', '--text-secondary': '#5c5f77', '--text-muted': '#9ca0b0',
      '--accent-green': '#40a02b', '--accent-blue': '#1e66f5', '--accent-purple': '#8839ef',
      '--error': '#d20f39',
      '--warning-bg': '#fef3c7', '--warning-text': '#df8e1d', '--warning-border': '#fe640b',
    },
  },
  'rose-pine': {
    dark: {
      '--bg-primary': '#191724', '--bg-secondary': '#1f1d2e', '--bg-card': '#1f1d2e',
      '--bg-hover': '#26233a', '--border': '#403d52',
      '--text-primary': '#e0def4', '--text-secondary': '#908caa', '--text-muted': '#6e6a86',
      '--accent-green': '#31748f', '--accent-blue': '#9ccfd8', '--accent-purple': '#c4a7e7',
      '--error': '#eb6f92',
      '--warning-bg': '#2a1a0a', '--warning-text': '#f6c177', '--warning-border': '#ebbcba',
    },
    light: {
      '--bg-primary': '#faf4ed', '--bg-secondary': '#fffaf3', '--bg-card': '#ffffff',
      '--bg-hover': '#f2e9e1', '--border': '#dfdad9',
      '--text-primary': '#575279', '--text-secondary': '#797593', '--text-muted': '#9893a5',
      '--accent-green': '#286983', '--accent-blue': '#56949f', '--accent-purple': '#907aa9',
      '--error': '#b4637a',
      '--warning-bg': '#fef3c7', '--warning-text': '#ea9d34', '--warning-border': '#d7827a',
    },
  },
  flexoki: {
    dark: {
      '--bg-primary': '#100f0f', '--bg-secondary': '#1c1b1a', '--bg-card': '#1c1b1a',
      '--bg-hover': '#282726', '--border': '#343331',
      '--text-primary': '#fffcf0', '--text-secondary': '#b7b5ac', '--text-muted': '#878580',
      '--accent-green': '#879a39', '--accent-blue': '#4385be', '--accent-purple': '#8b7ec8',
      '--error': '#d14d41',
      '--warning-bg': '#2a1a0a', '--warning-text': '#d0a215', '--warning-border': '#da702c',
    },
    light: {
      '--bg-primary': '#fffcf0', '--bg-secondary': '#f2f0e5', '--bg-card': '#ffffff',
      '--bg-hover': '#e6e4d9', '--border': '#dad8ce',
      '--text-primary': '#100f0f', '--text-secondary': '#6f6e69', '--text-muted': '#b7b5ac',
      '--accent-green': '#66800b', '--accent-blue': '#205ea6', '--accent-purple': '#5e409d',
      '--error': '#af3029',
      '--warning-bg': '#fef3c7', '--warning-text': '#ad8301', '--warning-border': '#bc5215',
    },
  },
  ayu: {
    dark: {
      '--bg-primary': '#1f2430', '--bg-secondary': '#242936', '--bg-card': '#242936',
      '--bg-hover': '#2d3347', '--border': '#3d4563',
      '--text-primary': '#cccac2', '--text-secondary': '#8a9199', '--text-muted': '#5c6773',
      '--accent-green': '#a2d080', '--accent-blue': '#5ccfe6', '--accent-purple': '#d4bfff',
      '--error': '#ff6666',
      '--warning-bg': '#2a1a0a', '--warning-text': '#ffb454', '--warning-border': '#e6b673',
    },
    light: {
      '--bg-primary': '#fafafa', '--bg-secondary': '#f3f4f5', '--bg-card': '#ffffff',
      '--bg-hover': '#eaebec', '--border': '#d9dce0',
      '--text-primary': '#5c6166', '--text-secondary': '#8a9199', '--text-muted': '#abb0b6',
      '--accent-green': '#6cbf43', '--accent-blue': '#36a3d9', '--accent-purple': '#a37acc',
      '--error': '#e65050',
      '--warning-bg': '#fef3c7', '--warning-text': '#a37a00', '--warning-border': '#f2ae49',
    },
  },
  gruvbox: {
    dark: {
      '--bg-primary': '#282828', '--bg-secondary': '#3c3836', '--bg-card': '#3c3836',
      '--bg-hover': '#504945', '--border': '#665c54',
      '--text-primary': '#ebdbb2', '--text-secondary': '#d5c4a1', '--text-muted': '#928374',
      '--accent-green': '#b8bb26', '--accent-blue': '#83a598', '--accent-purple': '#d3869b',
      '--error': '#fb4934',
      '--warning-bg': '#2a1a0a', '--warning-text': '#fabd2f', '--warning-border': '#fe8019',
    },
    light: {
      '--bg-primary': '#fbf1c7', '--bg-secondary': '#f2e5bc', '--bg-card': '#ffffff',
      '--bg-hover': '#ebdbb2', '--border': '#d5c4a1',
      '--text-primary': '#3c3836', '--text-secondary': '#504945', '--text-muted': '#7c6f64',
      '--accent-green': '#79740e', '--accent-blue': '#076678', '--accent-purple': '#8f3f71',
      '--error': '#9d0006',
      '--warning-bg': '#fff8c5', '--warning-text': '#b57614', '--warning-border': '#af3a03',
    },
  },
  penumbra: {
    dark: {
      '--bg-primary': '#1e1e1e', '--bg-secondary': '#2c2c2c', '--bg-card': '#2c2c2c',
      '--bg-hover': '#3d3d3d', '--border': '#4a4a4a',
      '--text-primary': '#e8e8e8', '--text-secondary': '#a8a8a8', '--text-muted': '#6f6f6f',
      '--accent-green': '#e78a4e', '--accent-blue': '#8ccf7e', '--accent-purple': '#e78a4e',
      '--error': '#f07178',
      '--warning-bg': '#2a1a0a', '--warning-text': '#ffb454', '--warning-border': '#e78a4e',
    },
    light: {
      '--bg-primary': '#f4f4f4', '--bg-secondary': '#ebebeb', '--bg-card': '#ffffff',
      '--bg-hover': '#e0e0e0', '--border': '#d0d0d0',
      '--text-primary': '#2c2c2c', '--text-secondary': '#5f5f5f', '--text-muted': '#9a9a9a',
      '--accent-green': '#b35c00', '--accent-blue': '#4e8f00', '--accent-purple': '#b35c00',
      '--error': '#cf222e',
      '--warning-bg': '#fff8c5', '--warning-text': '#9a6700', '--warning-border': '#b35c00',
    },
  },
}

export const THEME_META: { id: ColorScheme; label: string; darkBg: string; accent: string }[] = [
  { id: 'default',    label: 'Default',   darkBg: '#201d1d', accent: '#30d158' },
  { id: 'github',     label: 'GitHub',    darkBg: '#0d1117', accent: '#238636' },
  { id: 'catppuccin', label: 'Catppuccin',darkBg: '#1e1e2e', accent: '#a6e3a1' },
  { id: 'rose-pine',  label: 'Rosé Pine', darkBg: '#191724', accent: '#31748f' },
  { id: 'flexoki',    label: 'Flexoki',   darkBg: '#100f0f', accent: '#879a39' },
  { id: 'ayu',        label: 'Ayu',       darkBg: '#1f2430', accent: '#a2d080' },
  { id: 'gruvbox',    label: 'Gruvbox',   darkBg: '#282828', accent: '#b8bb26' },
  { id: 'penumbra',   label: 'Penumbra',  darkBg: '#1e1e1e', accent: '#e78a4e' },
]
