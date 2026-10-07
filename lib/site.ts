// Until the beavik Pages project exists this stays on curoyo.pages.dev. Set NEXT_PUBLIC_SITE_URL at deploy time (e.g. https://pacalix.com once you own the domain). No trailing slash.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://curoyo.pages.dev').replace(/\/$/, '')
export const SITE_NAME = 'PACALIX'
export const OWNER = 'Simon Maxam'
export const TITLE = 'PACALIX — Creative technology studio by Simon Maxam | 3D, AI, Web'
export const DESCRIPTION =
  'PACALIX is a creative technology studio in Calgary, Alberta, founded by Simon Maxam. 3D product configurators, interactive websites, architecture visualization, AI assistants and real-time experiences.'

// Placeholder number (555-01xx is reserved for fiction). Replace with the real one before launch.
export const PHONE = '+1 403 555 0142'
export const PHONE_HREF = 'tel:+14035550142'
export const EMAIL = 'simon0021maxam@gmail.com'
