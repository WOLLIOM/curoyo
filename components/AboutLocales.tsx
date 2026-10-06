// A short, honest description of the studio in the languages of the countries we want to reach.
// It is real content for search engines and screen readers (each paragraph carries its language), not hidden keywords.
const ABOUT: { lang: string; dir?: 'rtl'; text: string }[] = [
  { lang: 'fr', text: 'PALAEOX est un studio de technologie créative fondé par Simon Maxam à Calgary, au Canada. Sites web interactifs en 3D, configurateurs de produits, visualisation architecturale et assistants IA pour des marques du monde entier.' },
  { lang: 'es', text: 'PALAEOX es un estudio de tecnología creativa fundado por Simon Maxam en Calgary, Canadá. Sitios web interactivos en 3D, configuradores de producto, visualización arquitectónica y asistentes de IA para marcas de todo el mundo.' },
  { lang: 'de', text: 'PALAEOX ist ein kreatives Technologiestudio von Simon Maxam aus Calgary, Kanada. Interaktive 3D-Websites, Produktkonfiguratoren, Architekturvisualisierung und KI-Assistenten für Marken weltweit.' },
  { lang: 'it', text: 'PALAEOX è uno studio di tecnologia creativa fondato da Simon Maxam a Calgary, in Canada. Siti web interattivi in 3D, configuratori di prodotto, visualizzazione architettonica e assistenti AI per marchi di tutto il mondo.' },
  { lang: 'pt', text: 'A PALAEOX é um estúdio de tecnologia criativa fundado por Simon Maxam em Calgary, no Canadá. Sites interativos em 3D, configuradores de produtos, visualização arquitetônica e assistentes de IA para marcas do mundo todo.' },
  { lang: 'nl', text: 'PALAEOX is een creatieve techstudio van Simon Maxam uit Calgary, Canada. Interactieve 3D-websites, productconfigurators, architectuurvisualisatie en AI-assistenten voor merken wereldwijd.' },
  { lang: 'sv', text: 'PALAEOX är en kreativ teknikstudio grundad av Simon Maxam i Calgary, Kanada. Interaktiva 3D-webbplatser, produktkonfiguratorer, arkitekturvisualisering och AI-assistenter för varumärken över hela världen.' },
  { lang: 'pl', text: 'PALAEOX to studio technologii kreatywnych założone przez Simona Maxama w Calgary w Kanadzie. Interaktywne strony 3D, konfiguratory produktów, wizualizacje architektoniczne i asystenci AI dla marek na całym świecie.' },
  { lang: 'tr', text: 'PALAEOX, Simon Maxam tarafından Kanada’nın Calgary şehrinde kurulan bir yaratıcı teknoloji stüdyosudur. Dünyanın dört bir yanındaki markalar için etkileşimli 3D web siteleri, ürün yapılandırıcıları, mimari görselleştirme ve yapay zekâ asistanları.' },
  { lang: 'ru', text: 'PALAEOX — студия креативных технологий, основанная Саймоном Максамом в Калгари, Канада. Интерактивные 3D-сайты, конфигураторы продуктов, архитектурная визуализация и ИИ-ассистенты для брендов по всему миру.' },
  { lang: 'uk', text: 'PALAEOX — студія креативних технологій, заснована Саймоном Максамом у Калгарі, Канада. Інтерактивні 3D-сайти, конфігуратори продуктів, архітектурна візуалізація та ШІ-асистенти для брендів з усього світу.' },
  { lang: 'ar', dir: 'rtl', text: 'PALAEOX هو استوديو للتقنيات الإبداعية أسسه سايمون ماكسام في كالغاري بكندا. مواقع ويب تفاعلية ثلاثية الأبعاد، وأدوات تخصيص المنتجات، وتصور معماري، ومساعدون بالذكاء الاصطناعي للعلامات التجارية حول العالم.' },
  { lang: 'ja', text: 'PALAEOX は、カナダのカルガリーでサイモン・マクサムが設立したクリエイティブテクノロジースタジオです。インタラクティブな3Dウェブサイト、製品コンフィギュレーター、建築ビジュアライゼーション、AIアシスタントを世界中のブランドに提供します。' },
  { lang: 'ko', text: 'PALAEOX은 캐나다 캘거리에서 사이먼 맥삼이 설립한 크리에이티브 테크놀로지 스튜디오입니다. 전 세계 브랜드를 위한 인터랙티브 3D 웹사이트, 제품 컨피규레이터, 건축 시각화, AI 어시스턴트를 만듭니다.' },
  { lang: 'zh', text: 'PALAEOX 是由 Simon Maxam 在加拿大卡尔加里创立的创意科技工作室，为全球品牌打造交互式 3D 网站、产品配置器、建筑可视化和 AI 助手。' },
  { lang: 'hi', text: 'PALAEOX कनाडा के कैलगरी में साइमन मैक्सम द्वारा स्थापित एक क्रिएटिव टेक्नोलॉजी स्टूडियो है। दुनिया भर के ब्रांड्स के लिए इंटरैक्टिव 3D वेबसाइट, प्रोडक्ट कॉन्फ़िगरेटर, आर्किटेक्चरल विज़ुअलाइज़ेशन और AI असिस्टेंट।' },
  { lang: 'id', text: 'PALAEOX adalah studio teknologi kreatif yang didirikan oleh Simon Maxam di Calgary, Kanada. Situs web 3D interaktif, konfigurator produk, visualisasi arsitektur, dan asisten AI untuk merek di seluruh dunia.' },
]

export const ABOUT_LANGS = ABOUT.map((a) => a.lang)

export default function AboutLocales() {
  return (
    <>
      {ABOUT.map((a) => (
        <p key={a.lang} lang={a.lang} dir={a.dir}>
          {a.text}
        </p>
      ))}
    </>
  )
}
