// Narration ambiance audio imports
import ambiance1 from '../assets/narration-ambiance/1.mp3';
import ambiance2 from '../assets/narration-ambiance/2.mp3';
import ambiance3 from '../assets/narration-ambiance/3.mp3';
import ambiance4 from '../assets/narration-ambiance/4.mp3';

export const AMBIANCE_TRACKS = [ambiance1, ambiance2, ambiance3, ambiance4];

// Singleton audio element for ambiance
let ambianceAudio: HTMLAudioElement | null = null;
let currentTrackUrl: string | null = null;

/**
 * Get a random ambiance track URL
 */
export function getRandomAmbianceTrack(): string {
  const randomIndex = Math.floor(Math.random() * AMBIANCE_TRACKS.length);
  return AMBIANCE_TRACKS[randomIndex];
}

/**
 * Initialize and play ambiance (picks random track if not already playing)
 */
export function startAmbiance(volume: number = 0.3): HTMLAudioElement {
  if (!ambianceAudio) {
    currentTrackUrl = getRandomAmbianceTrack();
    ambianceAudio = new Audio(currentTrackUrl);
    ambianceAudio.loop = true;
    ambianceAudio.volume = volume;
  }
  
  ambianceAudio.play().catch(err => {
    console.error('Failed to play ambiance:', err);
  });
  
  return ambianceAudio;
}

/**
 * Pause ambiance (keeps position)
 */
export function pauseAmbiance(): void {
  if (ambianceAudio) {
    ambianceAudio.pause();
  }
}

/**
 * Resume ambiance from where it was paused
 */
export function resumeAmbiance(): void {
  if (ambianceAudio) {
    ambianceAudio.play().catch(err => {
      console.error('Failed to resume ambiance:', err);
    });
  }
}

/**
 * Toggle play/pause
 */
export function toggleAmbiance(): boolean {
  if (!ambianceAudio) {
    startAmbiance();
    return true;
  }
  
  if (ambianceAudio.paused) {
    resumeAmbiance();
    return true;
  } else {
    pauseAmbiance();
    return false;
  }
}

/**
 * Set ambiance volume (0-1)
 */
export function setAmbianceVolume(volume: number): void {
  if (ambianceAudio) {
    ambianceAudio.volume = Math.max(0, Math.min(1, volume));
  }
}

/**
 * Get current ambiance volume
 */
export function getAmbianceVolume(): number {
  return ambianceAudio?.volume ?? 0.3;
}

/**
 * Check if ambiance is currently playing
 */
export function isAmbiancePlaying(): boolean {
  return ambianceAudio !== null && !ambianceAudio.paused;
}

/**
 * Stop and cleanup ambiance completely
 */
export function stopAmbiance(): void {
  if (ambianceAudio) {
    ambianceAudio.pause();
    ambianceAudio.currentTime = 0;
    ambianceAudio = null;
    currentTrackUrl = null;
  }
}

/**
 * Get the audio element for direct control
 */
export function getAmbianceAudio(): HTMLAudioElement | null {
  return ambianceAudio;
}

