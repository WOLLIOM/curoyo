import Scene from '@/components/Scene'
import Objects from '@/components/Objects'
import Cursor from '@/components/Cursor'
import Overlay from '@/components/Overlay'

export default function Home() {
  return (
    <>
      <Scene />
      <Objects />
      <Cursor />
      <Overlay />
      <section className="sr-only" aria-label="About BEAVIK">
        <h2>BEAVIK — creative technology studio by Simon Maxam</h2>
        <p>
          BEAVIK (formerly CUROYO) is a creative technology studio founded and owned by Simon Maxam in Calgary,
          Alberta, Canada. Simon Maxam designs and builds 3D product configurators, interactive websites, architecture
          visualization, real-time experiences and AI assistants for brands worldwide.
        </p>
        <p lang="fr">
          BEAVIK est un studio de technologie créative fondé par Simon Maxam à Calgary, au Canada. Sites web
          interactifs en 3D, configurateurs de produits, visualisation architecturale et assistants IA pour des
          marques du monde entier, en France comme ailleurs.
        </p>
        <p lang="es">
          BEAVIK es un estudio de tecnología creativa fundado por Simon Maxam en Calgary, Canadá. Sitios web
          interactivos en 3D, configuradores de producto, visualización arquitectónica y asistentes de IA para marcas
          de todo el mundo.
        </p>
        <p lang="de">
          BEAVIK ist ein kreatives Technologiestudio von Simon Maxam aus Calgary, Kanada. Interaktive 3D-Websites,
          Produktkonfiguratoren, Architekturvisualisierung und KI-Assistenten für Marken weltweit.
        </p>
      </section>
    </>
  )
}
