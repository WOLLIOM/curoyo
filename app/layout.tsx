import type { Metadata, Viewport } from 'next'
import { Sora, Space_Grotesk } from 'next/font/google'
import './globals.css'
import { ABOUT_LANGS } from '@/components/AboutLocales'
import { DESCRIPTION, OWNER, PHONE, SITE_NAME, SITE_URL, TITLE } from '@/lib/site'

const display = Sora({ subsets: ['latin', 'latin-ext'], weight: ['700', '800'], variable: '--font-display', display: 'swap' })
const sans = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-sans', display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: '%s | PACALIX' },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: OWNER, url: SITE_URL }],
  creator: OWNER,
  publisher: SITE_NAME,
  keywords: [
    'PACALIX', 'Pacalix studio', 'Pacalix Calgary', 'Pacalix web design', 'Pacalix Simon Maxam', 'Simon Maxam', 'Simon Maxam Pacalix', 'simon0021maxam', 'Simon Maxam Calgary', 'creative technology studio', 'Calgary web design',
    '3D product configurator', 'interactive website', 'architecture visualization', 'AI assistant', 'WebGL', 'Three.js', 'Alberta',
  ],
  alternates: { canonical: '/', languages: Object.fromEntries(['x-default', 'en', ...ABOUT_LANGS].map((l) => [l, '/'])) },
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
    alternateLocale: ['fr_CA', 'fr_FR', 'es_ES', 'de_DE', 'tr_TR', 'ru_RU', 'ar_AE', 'ja_JP', 'ko_KR', 'zh_CN', 'pt_BR', 'it_IT'],
    images: [{ url: '/logo-panda.png', width: 1254, height: 1254, alt: 'PACALIX beaver logo' }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: ['/logo-panda.png'] },
  icons: { icon: '/logo-panda.png', apple: '/logo-panda.png' },
}

const SAME_AS = ['https://www.instagram.com/noroyo.studio/', 'https://www.linkedin.com/in/simonmaxam/']

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: SITE_NAME,
      alternateName: ['Pacalix', 'PACALIX Studio', 'Simon Maxam'],
      description: DESCRIPTION,
      inLanguage: 'en',
      publisher: { '@id': `${SITE_URL}/#org` },
    },
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#org`,
      name: SITE_NAME,
      alternateName: ['Pacalix', 'PACALIX Studio'],
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/logo-panda.png`,
      image: `${SITE_URL}/logo-panda.png`,
      description: DESCRIPTION,
      email: 'simon0021maxam@gmail.com',
      telephone: PHONE,
      contactPoint: { '@type': 'ContactPoint', contactType: 'sales', email: 'simon0021maxam@gmail.com', telephone: PHONE, availableLanguage: ['en', 'fr'], areaServed: 'Worldwide' },
      sameAs: SAME_AS,
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
      jobTitle: 'Founder and owner',
      alternateName: ['Simon Maxam Pacalix', 'Simon Maxam Calgary'],
      email: 'simon0021maxam@gmail.com',
      telephone: PHONE,
      sameAs: SAME_AS,
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
