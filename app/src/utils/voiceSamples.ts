// Voice sample audio imports
import ameliaTylerAudio from '../assets/voices/amelia_tyler.mp3';
import celestAudio from '../assets/voices/celest.mp3';
import claireAudio from '../assets/voices/claire.mp3';
import priyankaAudio from '../assets/voices/priyanka.mp3';
import cedricAudio from '../assets/voices/cedric.mp3';
import globalArtistAudio from '../assets/voices/global-artist.mp3';

// Map of sample filenames to imported audio URLs
export const voiceSampleUrls: Record<string, string> = {
  'amelia_tyler.mp3': ameliaTylerAudio,
  'celest.mp3': celestAudio,
  'claire.mp3': claireAudio,
  'priyanka.mp3': priyankaAudio,
  'cedric.mp3': cedricAudio,
  'global-artist.mp3': globalArtistAudio,
};

// Currently playing audio element (to stop previous playback)
let currentAudio: HTMLAudioElement | null = null;

/**
 * Play a voice sample by filename
 * Stops any currently playing sample first
 */
export function playVoiceSample(sampleFile: string, onEnded?: () => void): void {
  // Stop current playback if any
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }

  const url = voiceSampleUrls[sampleFile];
  if (!url) {
    console.warn(`Voice sample not found: ${sampleFile}`);
    return;
  }

  currentAudio = new Audio(url);
  
  if (onEnded) {
    currentAudio.addEventListener('ended', onEnded);
  }

  currentAudio.play().catch(err => {
    console.error('Failed to play voice sample:', err);
  });
}

/**
 * Stop currently playing voice sample
 */
export function stopVoiceSample(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}

/**
 * Check if a sample is currently playing
 */
export function isPlayingVoiceSample(): boolean {
  return currentAudio !== null && !currentAudio.paused;
}



