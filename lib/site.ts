// Until the beavik Pages project exists this stays on curoyo.pages.dev. Set NEXT_PUBLIC_SITE_URL at deploy time (e.g. https://palaeox.com once you own the domain). No trailing slash.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://curoyo.pages.dev').replace(/\/$/, '')
export const SITE_NAME = 'PALAEOX'
export const OWNER = 'Simon Maxam'
export const TITLE = 'PALAEOX — Creative technology studio by Simon Maxam | 3D, AI, Web'
export const DESCRIPTION =
  'PALAEOX is a creative technology studio in Calgary, Alberta, founded by Simon Maxam. 3D product configurators, interactive websites, architecture visualization, AI assistants and real-time experiences.'
