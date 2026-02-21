import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import { BackSide, CanvasTexture, DoubleSide, SRGBColorSpace, Vector3 } from 'three'
import './App.css'

const INITIAL_AREAS = [
  {
    id: 'recepcion',
    nombre: 'Recepción',
    descripcion: 'Punto de entrada principal y orientación al paciente.',
    pano: '/panos/recepcion.jpeg',
    hotspots: [
      { id: 'pasillo', nombre: 'Ir a Pasillo', yaw: -162.7, pitch: -23.8, radius: 8 },
    ],
  },
  {
    id: 'pasillo',
    nombre: 'Pasillo',
    descripcion: 'Conexión principal entre áreas del hospital.',
    pano: '/panos/pasillo.jpeg',
    hotspots: [
      { id: 'recepcion', nombre: 'Volver a Recepción', yaw: 15.3, pitch: -27.5, radius: 8 },
      { id: 'entrada', nombre: 'Ir a Entrada', yaw: -78.4, pitch: -13.5, radius: 8 }
    ],
  },
  {
    id: 'entrada',
    nombre: 'Entrada',
    descripcion: 'Acceso principal al hospital.',
    pano: '/panos/entrada.jpeg',
    hotspots: [],
  },
]

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
  const [baseTexture, setBaseTexture] = useState(null)
  const [incomingTexture, setIncomingTexture] = useState(null)
  const [blend, setBlend] = useState(1)
  const baseTextureRef = useRef(null)
  const incomingTextureRef = useRef(null)

  useEffect(() => {
    baseTextureRef.current = baseTexture
  }, [baseTexture])

  useEffect(() => {
    incomingTextureRef.current = incomingTexture
  }, [incomingTexture])

  useEffect(() => () => {
    if (baseTextureRef.current) baseTextureRef.current.dispose()
    if (incomingTextureRef.current && incomingTextureRef.current !== baseTextureRef.current) {
      incomingTextureRef.current.dispose()
    }
  }, [])

  useEffect(() => {
    let isDisposed = false

    onPanoErrorChange(false)

    if (!area?.pano) {
      onPanoErrorChange(true)
      return undefined
    }

    const basePath = area.pano
    const extensiones = ['.jpg', '.jpeg', '.png', '.webp']
    const posiblesRutas = /\.[a-zA-Z0-9]+$/.test(basePath)
      ? [basePath]
      : extensiones.map((ext) => `${basePath}${ext}`)

    const intentarCarga = (index) => {
      if (index >= posiblesRutas.length) {
        if (!isDisposed) onPanoErrorChange(true)
        return
      }

      const image = new Image()
      image.decoding = 'async'

      image.onload = () => {
        if (isDisposed) return

        const canvas = document.createElement('canvas')
        canvas.width = image.naturalWidth
        canvas.height = image.naturalHeight
        const context = canvas.getContext('2d')

        if (!context) {
          intentarCarga(index + 1)
          return
        }

        context.drawImage(image, 0, 0)

        const nextTexture = new CanvasTexture(canvas)
        nextTexture.colorSpace = SRGBColorSpace
        nextTexture.needsUpdate = true
        onPanoErrorChange(false)

        if (baseTextureRef.current) {
          setIncomingTexture((prev) => {
            if (prev) prev.dispose()
            return nextTexture
          })
          setBlend(0)
        } else {
          setBaseTexture(nextTexture)
          setBlend(1)
        }
      }

      image.onerror = () => {
        if (isDisposed) return
        intentarCarga(index + 1)
      }

      image.src = posiblesRutas[index]
    }

    intentarCarga(0)

    return () => {
      isDisposed = true
    }
  }, [area?.pano, onPanoErrorChange])

  useFrame((_, delta) => {
    if (!incomingTextureRef.current || blend >= 1) return

    const nextBlend = Math.min(1, blend + delta * 2.4)
    setBlend(nextBlend)

    if (nextBlend >= 1) {
      const textureToPromote = incomingTextureRef.current
      setIncomingTexture(null)
      setBaseTexture((prev) => {
        if (prev && prev !== textureToPromote) prev.dispose()
        return textureToPromote
      })
    }
  })

  return (
    <>
      <mesh
        position={[0, 1.6, 0]}
        onClick={(event) => {
          if (!editMode) return
          event.stopPropagation()
          const { yaw, pitch } = pointToYawPitch(event.point)
          onPlaceHotspot({ yaw, pitch })
        }}
      >
        <sphereGeometry args={[60, 64, 64]} />
        <meshBasicMaterial
          map={baseTexture ?? null}
          color={baseTexture ? '#ffffff' : '#cbd5e1'}
          side={BackSide}
          toneMapped={false}
          transparent={Boolean(incomingTexture)}
          opacity={incomingTexture ? 1 - blend : 1}
          depthWrite={false}
        />
      </mesh>

      {incomingTexture ? (
        <mesh position={[0, 1.6, 0]}>
          <sphereGeometry args={[59.8, 64, 64]} />
          <meshBasicMaterial
            map={incomingTexture}
            color="#ffffff"
            side={BackSide}
            toneMapped={false}
            transparent
            opacity={blend}
            depthWrite={false}
          />
        </mesh>
      ) : null}

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
    </>
  )
}

function App() {
  const [areas, setAreas] = useState(INITIAL_AREAS)
  const [areaActiva, setAreaActiva] = useState('recepcion')
  const [panoConError, setPanoConError] = useState(false)
  const [modoColocar, setModoColocar] = useState(false)
  const [destinoHotspot, setDestinoHotspot] = useState('pasillo')
  const [radioHotspot, setRadioHotspot] = useState(18)
  const [ultimoPunto, setUltimoPunto] = useState(null)
  const controlsRef = useRef(null)

  const areaSeleccionada = areas.find((item) => item.id === areaActiva)
  const destinosDisponibles = areas.filter((item) => item.id !== areaActiva)

  useEffect(() => {
    if (!destinosDisponibles.length) {
      setDestinoHotspot('')
      return
    }

    const existe = destinosDisponibles.some((item) => item.id === destinoHotspot)
    if (!existe) setDestinoHotspot(destinosDisponibles[0].id)
  }, [areaActiva, destinoHotspot, destinosDisponibles])

  const moverAArea = (idDestino) => {
    const destino = areas.find((item) => item.id === idDestino)
    if (!destino) return
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
          Haz clic en los puntos dentro de la panorámica para avanzar entre Recepción y Pasillo.
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
