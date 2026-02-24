import { useEffect, useRef, useState } from 'react'
import { Canvas, useLoader } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import { BackSide, DoubleSide, RepeatWrapping, SRGBColorSpace, TextureLoader, Vector3 } from 'three'
import './App.css'

const INITIAL_AREAS = [
  {
    id: 'sistemas',
    nombre: 'Sistemas',
    descripcion: 'Punto de entrada principal y orientación al paciente.',
    pano: '/panos/sistemas.webp',
    hotspots: [
      { id: 'pasillo', nombre: 'Ir a Pasillo', yaw: -16.7, pitch: -24.1, radius: 8 },
    ],
  },
  {
    id: 'pasillo',
    nombre: 'Pasillo',
    descripcion: 'Conexión principal entre áreas del hospital.',
    pano: '/panos/pasillo.webp',
    hotspots: [
      { id: 'sistemas', nombre: 'Volver a Sistemas', yaw: 162.6, pitch: -25.1, radius: 8 },
      { id: 'entrada', nombre: 'Ir a Entrada', yaw: -102.9, pitch: -20.1, radius: 8 }
    ],
  },
  {
    id: 'entrada',
    nombre: 'Entrada',
    descripcion: 'Acceso principal al hospital.',
    pano: '/panos/entrada.webp',
    rotacionYaw: 180,
    hotspots: [
      { id: 'pasillo', nombre: 'Ir a Pasillo', yaw: -91.2, pitch: -19.4, radius: 8 },
    ],
  },
]

function esManifestValido(areas) {
  if (!Array.isArray(areas) || areas.length === 0) return false

  return areas.every((area) => {
    if (!area || typeof area !== 'object') return false
    if (!area.id || !area.nombre || !area.pano) return false

    if (area.hotspots && !Array.isArray(area.hotspots)) return false

    return (area.hotspots ?? []).every((hotspot) => (
      hotspot
      && typeof hotspot === 'object'
      && typeof hotspot.id === 'string'
      && typeof hotspot.nombre === 'string'
      && typeof hotspot.yaw === 'number'
      && typeof hotspot.pitch === 'number'
      && (hotspot.radius === undefined || typeof hotspot.radius === 'number')
    ))
  })
}

function normalizarYaw(yaw) {
  let resultado = yaw
  while (resultado > 180) resultado -= 360
  while (resultado < -180) resultado += 360
  return Number(resultado.toFixed(1))
}

function hotspotPosition(yaw, pitch, radius = 18) {
  const phi = (90 - pitch) * (Math.PI / 180)
  const theta = yaw * (Math.PI / 180)
  const x = radius * Math.sin(phi) * Math.sin(theta)
  const y = radius * Math.cos(phi)
  const z = radius * Math.sin(phi) * Math.cos(theta)
  return new Vector3(x, y + 1.6, z)
}

function pointToYawPitch(point) {
  const center = new Vector3(0, 1.6, 0)
  const direction = point.clone().sub(center).normalize()
  const clampedY = Math.min(1, Math.max(-1, direction.y))
  const pitch = 90 - ((Math.acos(clampedY) * 180) / Math.PI)
  const yaw = (Math.atan2(direction.x, direction.z) * 180) / Math.PI

  return {
    yaw: Number(yaw.toFixed(1)),
    pitch: Number(pitch.toFixed(1)),
  }
}

function Hotspot({ nombre, yaw, pitch, radius, onClick }) {
  const position = hotspotPosition(yaw, pitch, radius ?? 18)

  return (
    <group position={position}>
      <mesh
        rotation={[Math.PI / 2, 0, 0]}
        onClick={(event) => {
          event.stopPropagation()
          onClick()
        }}
      >
        <circleGeometry args={[0.62, 32]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.85} side={DoubleSide} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.68, 0.82, 32]} />
        <meshBasicMaterial color="#0ea5e9" side={DoubleSide} />
      </mesh>
      <Html center position={[0, 0.95, 0]} distanceFactor={8}>
        <div className="hotspot-label">{nombre}</div>
      </Html>
    </group>
  )
}

function Panorama360({ area, onPanoErrorChange, onMoveToArea, editMode, onPlaceHotspot }) {
  const texture = useLoader(TextureLoader, area.pano)
  const rotacionYawGrados = area?.rotacionYaw ?? 0
  const rotacionYawRadianes = (rotacionYawGrados * Math.PI) / 180

  useEffect(() => {
    texture.colorSpace = SRGBColorSpace
    texture.flipY = true
    texture.wrapS = RepeatWrapping
    texture.repeat.x = -1
    texture.offset.x = 1
    texture.generateMipmaps = true
    texture.needsUpdate = true
    onPanoErrorChange(false)
  }, [texture, onPanoErrorChange])

  return (
    <>
      <group rotation={[0, rotacionYawRadianes, 0]}>
        <mesh
          position={[0, 1.6, 0]}
          onClick={(event) => {
            if (!editMode) return
            event.stopPropagation()
            const { yaw, pitch } = pointToYawPitch(event.point)
            onPlaceHotspot({
              yaw: normalizarYaw(yaw - rotacionYawGrados),
              pitch,
            })
          }}
        >
          <sphereGeometry args={[60, 64, 64]} />
          <meshBasicMaterial
            map={texture}
            color="#ffffff"
            side={BackSide}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>

        {(area.hotspots ?? []).map((hotspot) => (
          <Hotspot
            key={`${area.id}-${hotspot.id}`}
            nombre={hotspot.nombre}
            yaw={hotspot.yaw}
            pitch={hotspot.pitch}
            radius={hotspot.radius}
            onClick={() => onMoveToArea(hotspot.id)}
          />
        ))}

      </group>
    </>
  )
}

function App() {
  const [areas, setAreas] = useState(INITIAL_AREAS)
  const [areaActiva, setAreaActiva] = useState('sistemas')
  const [panoConError, setPanoConError] = useState(false)
  const [modoColocar, setModoColocar] = useState(false)
  const [destinoHotspot, setDestinoHotspot] = useState('pasillo')
  const [radioHotspot, setRadioHotspot] = useState(18)
  const [ultimoPunto, setUltimoPunto] = useState(null)
  const controlsRef = useRef(null)
  const textureLoaderRef = useRef(new TextureLoader())
  const preloadPromisesRef = useRef(new Map())

  const areaSeleccionada = areas.find((item) => item.id === areaActiva)
  const destinosDisponibles = areas.filter((item) => item.id !== areaActiva)

  const precargarPanorama = (ruta) => {
    if (!ruta) return Promise.resolve()

    const cache = preloadPromisesRef.current
    if (cache.has(ruta)) return cache.get(ruta)

    const promise = new Promise((resolve) => {
      textureLoaderRef.current.load(
        ruta,
        () => resolve(true),
        undefined,
        () => resolve(false),
      )
    })

    cache.set(ruta, promise)
    return promise
  }

  useEffect(() => {
    areas.forEach((area) => {
      void precargarPanorama(area.pano)
    })
  }, [areas])

  useEffect(() => {
    let cancelado = false

    const cargarManifest = async () => {
      try {
        const respuesta = await fetch('/hospital-manifest.json')
        if (!respuesta.ok) return

        const payload = await respuesta.json()
        const areasManifest = Array.isArray(payload) ? payload : payload?.areas

        if (cancelado || !esManifestValido(areasManifest)) return

        setAreas(areasManifest)
        setAreaActiva((actual) => (
          areasManifest.some((area) => area.id === actual)
            ? actual
            : areasManifest[0].id
        ))
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('No se pudo cargar hospital-manifest.json, se usa configuración local.', error)
        }
      }
    }

    cargarManifest()

    return () => {
      cancelado = true
    }
  }, [])

  useEffect(() => {
    if (!destinosDisponibles.length) {
      setDestinoHotspot('')
      return
    }

    const existe = destinosDisponibles.some((item) => item.id === destinoHotspot)
    if (!existe) setDestinoHotspot(destinosDisponibles[0].id)
  }, [areaActiva, destinoHotspot, destinosDisponibles])

  const moverAArea = async (idDestino) => {
    const destino = areas.find((item) => item.id === idDestino)
    if (!destino) return

    await precargarPanorama(destino.pano)
    setAreaActiva(destino.id)
  }

  const colocarHotspot = ({ yaw, pitch }) => {
    const destino = areas.find((item) => item.id === destinoHotspot)
    if (!destino) return

    setAreas((prev) => prev.map((area) => {
      if (area.id !== areaActiva) return area

      return {
        ...area,
        hotspots: [
          ...(area.hotspots ?? []),
          {
            id: destino.id,
            nombre: `Ir a ${destino.nombre}`,
            yaw,
            pitch,
            radius: Number(radioHotspot.toFixed(1)),
          },
        ],
      }
    }))

    setUltimoPunto({
      origen: areaActiva,
      destino: destino.id,
      yaw,
      pitch,
      radius: Number(radioHotspot.toFixed(1)),
    })
    setModoColocar(false)
  }

  const jsonHotspots = JSON.stringify(
    areas.map((area) => ({
      id: area.id,
      hotspots: area.hotspots ?? [],
    })),
    null,
    2,
  )

  return (
    <main className="app">
      <section className="viewport">
        <Canvas camera={{ position: [0, 1.6, 0.1], fov: 75 }}>
          <color attach="background" args={['#eff6ff']} />

          {areaSeleccionada ? (
            <Panorama360
              area={areaSeleccionada}
              onPanoErrorChange={setPanoConError}
              onMoveToArea={moverAArea}
              editMode={modoColocar}
              onPlaceHotspot={colocarHotspot}
            />
          ) : null}

          <OrbitControls
            ref={controlsRef}
            makeDefault
            target={[0, 1.6, 0]}
            enablePan={false}
            enableZoom={false}
            minDistance={0.1}
            maxDistance={0.1}
          />
        </Canvas>
      </section>

      <aside className="panel">
        <h1>Recorrido Virtual Hospital</h1>
        <p>
          Haz clic en los puntos dentro de la panorámica para avanzar entre Sistemas y Pasillo.
        </p>

        <div className="areas">
          {areas.map((area) => (
            <button
              key={area.id}
              type="button"
              className={area.id === areaActiva ? 'area-btn active' : 'area-btn'}
              onClick={() => moverAArea(area.id)}
            >
              {area.nombre}
            </button>
          ))}
        </div>

        <div className="editor-box">
          <h2>Editor de puntos</h2>
          <p>Selecciona destino y luego haz clic en la panorámica para colocar el punto.</p>
          <select
            value={destinoHotspot}
            onChange={(event) => setDestinoHotspot(event.target.value)}
            disabled={!destinosDisponibles.length}
            className="editor-select"
          >
            {destinosDisponibles.map((area) => (
              <option key={area.id} value={area.id}>{area.nombre}</option>
            ))}
          </select>
          <button
            type="button"
            className={modoColocar ? 'editor-btn active' : 'editor-btn'}
            onClick={() => setModoColocar((prev) => !prev)}
            disabled={!destinoHotspot}
          >
            {modoColocar ? 'Haz clic en la imagen...' : 'Colocar punto'}
          </button>
          <div className="editor-range-row">
            <label htmlFor="radius-hotspot">Cercanía del punto (radius):</label>
            <input
              id="radius-hotspot"
              className="editor-range"
              type="range"
              min="8"
              max="28"
              step="0.5"
              value={radioHotspot}
              onChange={(event) => setRadioHotspot(Number(event.target.value))}
            />
            <strong>{radioHotspot}</strong>
          </div>
          {ultimoPunto ? (
            <p>
              Último punto: <strong>{ultimoPunto.origen}</strong> → <strong>{ultimoPunto.destino}</strong> (yaw: <strong>{ultimoPunto.yaw}</strong>, pitch: <strong>{ultimoPunto.pitch}</strong>, radius: <strong>{ultimoPunto.radius}</strong>)
            </p>
          ) : null}
          <textarea className="editor-json" readOnly value={jsonHotspots} />
        </div>

        <div className="detalle">
          <h2>{areaSeleccionada?.nombre}</h2>
          <p>{areaSeleccionada?.descripcion}</p>
          <p>
            Foto 360: <strong>{areaSeleccionada?.pano}</strong>
          </p>
          <img
            className="pano-preview"
            src={areaSeleccionada?.pano}
            alt={`Preview de ${areaSeleccionada?.nombre}`}
          />
          {panoConError ? (
            <p className="pano-warning">
              No se encontró la imagen. Verifica que exista en <strong>public{areaSeleccionada?.pano}</strong>
            </p>
          ) : null}
        </div>
      </aside>
    </main>
  )
}

export default App
