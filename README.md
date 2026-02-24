# Recorrido virtual de hospital (React + Three.js)

Este proyecto es un MVP de recorrido virtual de hospital usando:

- React
- Three.js
- React Three Fiber (`@react-three/fiber`)
- Drei (`@react-three/drei`)

## Qué incluye

- Escena 3D tipo planta de hospital
- Puntos interactivos de áreas clave (Recepción, Emergencias, Laboratorio, UCI)
- Panel lateral para navegar entre zonas
- Transiciones suaves de cámara
- Carga de fotos 360 por área

## Dónde van las fotos 360

Colócalas en [public/panos](public/panos) con estos nombres base:

- `recepcion`
- `emergencias`
- `laboratorio`
- `uci`

Extensiones soportadas automáticamente: `.jpg`, `.jpeg`, `.png`, `.webp`.

Formato recomendado: equirectangular 2:1 (por ejemplo 4096x2048).

## Manifest escalable (fase 1)

La app ahora intenta cargar áreas desde [public/hospital-manifest.json](public/hospital-manifest.json).

- Si el manifest es válido, se usa esa configuración.
- Si falla la carga o el JSON no es válido, la app usa el fallback local (`INITIAL_AREAS`) y no se rompe.

Esto permite migrar progresivamente a backend/CDN sin interrumpir el visor actual.

## Ejecutar

```bash
npm install
npm run dev
```

## Compilar producción

```bash
npm run build
```
