import type { MetadataRoute } from 'next'

export const dynamic = 'force-static'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PACALIX',
    short_name: 'PACALIX',
    description: 'Creative technology studio by Simon Maxam, Calgary, Alberta.',
    start_url: '/',
    display: 'standalone',
    background_color: '#08090b',
    theme_color: '#08090b',
    icons: [{ src: '/logo-panda.png', sizes: 'any', type: 'image/png' }],
  }
}
