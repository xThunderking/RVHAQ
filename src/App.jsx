import { useEffect, useMemo } from 'react'
import { Canvas, useLoader } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { BackSide, RepeatWrapping, SRGBColorSpace, TextureLoader } from 'three'
import { fetchScenesFromManifest } from './services/scenesService'
import { useViewerStore } from './store/viewerStore'
import './App.css'

const LOGO_URL = 'https://hospital360-panos.s3.amazonaws.com/rvhaq/logohaq.jpg'

const INITIAL_SCENES = [
  {
    id: 'sistemas',
    nombre: 'Sistemas',
    descripcion: 'Área de sistemas del hospital.',
    pano: '/panos/sistemas.jpeg',
    previewUrl: 'https://hospital360-panos.s3.amazonaws.com/sistemas/sistemas.jpeg',
    marzipanoUrl: 'https://hospital360-panos.s3.amazonaws.com/sistemas/app-files/index.html',
  },
  {
    id: 'pasillo',
    nombre: 'Pasillo',
    descripcion: 'Conexión principal entre áreas.',
    pano: '/panos/pasillo.jpeg',
    previewUrl: 'https://hospital360-panos.s3.amazonaws.com/pasillo/pasillo.jpeg',
    marzipanoUrl: 'https://hospital360-panos.s3.amazonaws.com/pasillo/app-files/index.html',
  },
  {
    id: 'entrada',
    nombre: 'Entrada',
    descripcion: 'Acceso principal del hospital.',
    pano: '/panos/entrada.jpeg',
    previewUrl: 'https://hospital360-panos.s3.amazonaws.com/entrada/entrada.jpeg',
    marzipanoUrl: 'https://hospital360-panos.s3.amazonaws.com/entrada/app-files/index.html',
  },
]

function Scene360({ scene }) {
  const texture = useLoader(TextureLoader, scene.pano)

  useEffect(() => {
    texture.colorSpace = SRGBColorSpace
    texture.flipY = true
    texture.wrapS = RepeatWrapping
    texture.repeat.x = -1
    texture.offset.x = 1
    texture.generateMipmaps = true
    texture.needsUpdate = true
  }, [texture])

  return (
    <mesh position={[0, 1.6, 0]}>
      <sphereGeometry args={[60, 64, 64]} />
      <meshBasicMaterial
        map={texture}
        color="#ffffff"
        side={BackSide}
        toneMapped={false}
        depthWrite={false}
      />
    </mesh>
  )
}

export default function App() {
  const scenes = useViewerStore((state) => state.scenes)
  const activeSceneId = useViewerStore((state) => state.activeSceneId)
  const sceneSeleccionada = useViewerStore((state) => state.sceneSeleccionada)
  const setScenes = useViewerStore((state) => state.setScenes)
  const seleccionarEscena = useViewerStore((state) => state.seleccionarEscena)
  const volverAlMenu = useViewerStore((state) => state.volverAlMenu)
  const sincronizarEscenaActiva = useViewerStore((state) => state.sincronizarEscenaActiva)

  useEffect(() => {
    setScenes(INITIAL_SCENES)
    sincronizarEscenaActiva()
  }, [setScenes, sincronizarEscenaActiva])

  const activeScene = useMemo(
    () => scenes.find((item) => item.id === activeSceneId) ?? scenes[0],
    [activeSceneId, scenes],
  )

  useEffect(() => {
    scenes.forEach((scene) => {
      const image = new Image()
      image.decoding = 'async'
      image.src = scene.pano
    })
  }, [scenes])

  useEffect(() => {
    let cancelado = false

    const cargarManifest = async () => {
      try {
        const nextScenes = await fetchScenesFromManifest()
        if (cancelado) return

        setScenes(nextScenes)
      } catch {
      }
    }

    cargarManifest()

    return () => {
      cancelado = true
    }
  }, [setScenes])

  useEffect(() => {
    sincronizarEscenaActiva()
  }, [scenes, sincronizarEscenaActiva])

  if (!sceneSeleccionada) {
    return (
      <main className="selector-screen">
        <section className="selector-card">
          <header className="selector-head">
            <img
              className="brand-logo"
              src={LOGO_URL}
              alt="Logo Hospital Ángeles Querétaro"
              loading="lazy"
            />
            <p className="selector-kicker">Hospital Ángeles Querétaro</p>
            <h1>Selecciona un área</h1>
            <p>Explora escenas 360 por área clínica desde una interfaz rápida, limpia y adaptada a cualquier dispositivo.</p>
          </header>

          <div className="selector-grid">
            {scenes.map((scene) => (
              <button
                key={scene.id}
                type="button"
                className="selector-item"
                onClick={() => seleccionarEscena(scene.id)}
              >
                <img
                  className="selector-thumb"
                  src={scene.previewUrl ?? scene.pano}
                  alt={`Vista previa de ${scene.nombre}`}
                />
                <span className="selector-name">{scene.nombre}</span>
                <small className="selector-desc">{scene.descripcion}</small>
              </button>
            ))}
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="app">
      <section className="viewport">
        {activeScene?.marzipanoUrl ? (
          <iframe
            className="marzipano-frame"
            src={activeScene.marzipanoUrl}
            title={`Visor Marzipano ${activeScene.nombre}`}
            loading="lazy"
            allow="fullscreen"
          />
        ) : (
          <Canvas camera={{ position: [0, 1.6, 0.1], fov: 75 }}>
            <color attach="background" args={['#eff6ff']} />
            {activeScene ? <Scene360 scene={activeScene} /> : null}
            <OrbitControls
              makeDefault
              target={[0, 1.6, 0]}
              enablePan={false}
              enableZoom={false}
              minDistance={0.1}
              maxDistance={0.1}
            />
          </Canvas>
        )}
      </section>

      <aside className="panel">
        <div className="panel-head">
          <img
            className="brand-logo panel-logo"
            src={LOGO_URL}
            alt="Logo Hospital Ángeles Querétaro"
            loading="lazy"
          />
          <p className="panel-kicker">Hospital Ángeles Querétaro</p>
          <h1>Visor de Escenas 360</h1>
          <p>Selecciona un área para visualizar su entorno clínico en 360°.</p>
        </div>
        <button
          type="button"
          className="menu-back-btn"
          onClick={volverAlMenu}
        >
          Regresar al menú
        </button>

        <div className="areas">
          {scenes.map((scene) => (
            <button
              key={scene.id}
              type="button"
              className={scene.id === activeScene?.id ? 'area-btn active' : 'area-btn'}
              onClick={() => seleccionarEscena(scene.id)}
            >
              {scene.nombre}
            </button>
          ))}
        </div>

        <div className="detalle">
          <h2>{activeScene?.nombre}</h2>
          <p>{activeScene?.descripcion}</p>
        </div>
      </aside>
    </main>
  )
}
