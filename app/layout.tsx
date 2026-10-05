import type { Metadata, Viewport } from 'next'
import { Bagel_Fat_One, Space_Grotesk } from 'next/font/google'
import './globals.css'
import { DESCRIPTION, OWNER, SITE_NAME, SITE_URL, TITLE } from '@/lib/site'

const display = Bagel_Fat_One({ subsets: ['latin', 'latin-ext'], weight: '400', variable: '--font-display', display: 'swap' })
const sans = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-sans', display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: '%s | OTRYK' },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: OWNER, url: SITE_URL }],
  creator: OWNER,
  publisher: SITE_NAME,
  keywords: [
    'OTRYK', 'Simon Maxam', 'Simon Maxam Calgary', 'creative technology studio', 'Calgary web design',
    '3D product configurator', 'interactive website', 'architecture visualization', 'AI assistant', 'WebGL', 'Three.js', 'Alberta',
  ],
  alternates: { canonical: '/' },
  category: 'technology',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: SITE_NAME,
    title: TITLE,
    description: DESCRIPTION,
    locale: 'en_CA',
    images: [{ url: '/logo-panda.png', width: 1254, height: 1254, alt: 'OTRYK sea otter logo' }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: ['/logo-panda.png'] },
  icons: { icon: '/logo-panda.png', apple: '/logo-panda.png' },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: SITE_NAME,
      alternateName: ['Otryk', 'OTRYK Studio', 'Simon Maxam'],
      description: DESCRIPTION,
      inLanguage: 'en',
      publisher: { '@id': `${SITE_URL}/#org` },
    },
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#org`,
      name: SITE_NAME,
      alternateName: ['Otryk', 'OTRYK Studio'],
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/logo-panda.png`,
      image: `${SITE_URL}/logo-panda.png`,
      description: DESCRIPTION,
      founder: { '@id': `${SITE_URL}/#simon` },
      address: { '@type': 'PostalAddress', addressLocality: 'Calgary', addressRegion: 'AB', addressCountry: 'CA' },
      areaServed: 'Worldwide',
      knowsAbout: ['3D', 'Web design', 'Architecture visualization', 'Artificial intelligence', 'Interactive experiences', 'Product configurators'],
    },
    {
      '@type': 'Person',
      '@id': `${SITE_URL}/#simon`,
      name: OWNER,
      url: `${SITE_URL}/`,
      jobTitle: 'Founder',
      worksFor: { '@id': `${SITE_URL}/#org` },
      homeLocation: { '@type': 'Place', name: 'Calgary, Alberta, Canada' },
      knowsAbout: ['3D', 'Web development', 'Architecture visualization', 'Artificial intelligence', 'Unreal Engine', 'Blender'],
    },
  ],
}

export const viewport: Viewport = {
  themeColor: '#08090b',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        {children}
      </body>
    </html>
  )
}
