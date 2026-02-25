import { create } from 'zustand'

export const useViewerStore = create((set) => ({
  scenes: [],
  activeSceneId: null,
  sceneSeleccionada: false,

  setScenes: (scenes) => set((state) => {
    const normalized = Array.isArray(scenes) ? scenes : []
    const hasCurrent = normalized.some((scene) => scene.id === state.activeSceneId)

    return {
      scenes: normalized,
      activeSceneId: hasCurrent
        ? state.activeSceneId
        : (state.activeSceneId ?? null),
    }
  }),

  seleccionarEscena: (sceneId) => set({
    activeSceneId: sceneId,
    sceneSeleccionada: true,
  }),

  volverAlMenu: () => set({ sceneSeleccionada: false }),

  sincronizarEscenaActiva: () => set((state) => {
    if (!state.scenes.length) return { activeSceneId: null }

    const existe = state.scenes.some((scene) => scene.id === state.activeSceneId)
    if (existe) return {}

    return {
      activeSceneId: state.activeSceneId ?? state.scenes[0].id,
    }
  }),
}))
