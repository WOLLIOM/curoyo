// Set NEXT_PUBLIC_SITE_URL at deploy time (e.g. https://beavik.com once you own the domain). No trailing slash.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://beavik.pages.dev').replace(/\/$/, '')
export const SITE_NAME = 'BEAVIK'
export const OWNER = 'Simon Maxam'
export const TITLE = 'BEAVIK — Creative technology studio by Simon Maxam | 3D, AI, Web'
export const DESCRIPTION =
  'BEAVIK is a creative technology studio in Calgary, Alberta, founded by Simon Maxam. 3D product configurators, interactive websites, architecture visualization, AI assistants and real-time experiences.'
