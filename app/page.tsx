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
      </section>
    </>
  )
}
