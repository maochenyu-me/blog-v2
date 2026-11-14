export type AirMode = 'cool' | 'heat'
export interface AirConditionerState { powered: boolean; temperature: number; mode: AirMode }
export const MIN_TEMPERATURE = 16
export const MAX_TEMPERATURE = 31

export function createAirConditioner(): AirConditionerState {
  return { powered: false, temperature: 26, mode: 'cool' }
}
export function changeTemperature(state: AirConditionerState, delta: number): AirConditionerState {
  if (!Number.isFinite(delta)) return { ...state }
  return { ...state, temperature: Math.min(MAX_TEMPERATURE, Math.max(MIN_TEMPERATURE, state.temperature + Math.sign(delta))) }
}
export function changeMode(state: AirConditionerState, mode: AirMode): AirConditionerState {
  return { ...state, mode }
}
export function togglePower(state: AirConditionerState): AirConditionerState {
  return { ...state, powered: !state.powered }
}
export function energyHint(state: AirConditionerState): AirMode | null {
  if (state.mode === 'cool' && state.temperature < 26) return 'cool'
  if (state.mode === 'heat' && state.temperature > 20) return 'heat'
  return null
}
