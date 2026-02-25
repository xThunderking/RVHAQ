const DEFAULT_MANIFEST_URL = '/hospital-manifest.json'

function esManifestValido(areas) {
  if (!Array.isArray(areas) || areas.length === 0) return false

  return areas.every((area) => (
    area
    && typeof area === 'object'
    && typeof area.id === 'string'
    && typeof area.nombre === 'string'
    && typeof area.pano === 'string'
    && (area.previewUrl === undefined || typeof area.previewUrl === 'string')
    && (area.marzipanoUrl === undefined || typeof area.marzipanoUrl === 'string')
  ))
}

export async function fetchScenesFromManifest() {
  const manifestUrl = import.meta.env.VITE_SCENES_MANIFEST_URL || DEFAULT_MANIFEST_URL

  const response = await fetch(manifestUrl)
  if (!response.ok) {
    throw new Error(`Manifest no disponible: ${manifestUrl}`)
  }

  const payload = await response.json()
  const areasManifest = Array.isArray(payload) ? payload : payload?.areas

  if (!esManifestValido(areasManifest)) {
    throw new Error('Formato de manifest inválido')
  }

  return areasManifest.map((area) => ({
    id: area.id,
    nombre: area.nombre,
    descripcion: area.descripcion ?? 'Escena 360 del área.',
    pano: area.pano,
    previewUrl: area.previewUrl,
    marzipanoUrl: area.marzipanoUrl,
  }))
}
