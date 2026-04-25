export type MoodBand = 'chill' | 'flow' | 'hype'

export type MoodParams = {
  band: MoodBand
  label: string
  valence: number
  energy: number
  accent: 'blue' | 'violet' | 'red'
}

export function bpmToMood(bpm: number | null | undefined): MoodParams {
  const safe = typeof bpm === 'number' && Number.isFinite(bpm) ? bpm : 0

  if (safe < 80) {
    return {
      band: 'chill',
      label: 'Chill / Lo‑Fi',
      valence: 0.5,
      energy: 0.2,
      accent: 'blue',
    }
  }

  if (safe < 110) {
    return {
      band: 'flow',
      label: 'Flow State',
      valence: 0.7,
      energy: 0.6,
      accent: 'violet',
    }
  }

  return {
    band: 'hype',
    label: 'High Intensity / Hype',
    valence: 0.9,
    energy: 0.9,
    accent: 'red',
  }
}

