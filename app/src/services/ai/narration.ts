import type { NarrationRequest, NarrationResponse } from "../../api";
import { addAudioTags } from "./audioTags";

const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY || "";
const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

interface AudioItem {
  type: 'premise' | 'investigator';
  text: string;
  voiceId: string;
  id?: string;
}

async function textToSpeech(text: string, voiceId: string): Promise<string | null> {
  console.log('[TTS] Starting text-to-speech generation...');
  console.log('[TTS] Request:', {
    textLength: text.length,
    textPreview: text.substring(0, 100) + '...',
    voiceId,
  });
  
  if (!text || !voiceId) {
    console.warn('[TTS] Missing text or voiceId, skipping narration');
    return null;
  }
  
  if (!ELEVENLABS_API_KEY) {
    console.warn('[TTS] ElevenLabs API key is missing. Skipping narration.');
    return null;
  }

  try {
    console.log(`[TTS] Calling ElevenLabs API: ${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`);
    const startTime = Date.now();
    
    const response = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_v3",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      }),
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      console.error(`[TTS] API error: ${response.status} ${response.statusText}`);
      const errorBody = await response.text();
      console.error('[TTS] Error body:', errorBody);
      return null;
    }
    
    console.log(`[TTS] API call completed in ${duration}ms`);
    console.log('[TTS] Response:', {
      status: response.status,
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length'),
    });

    const blob = await response.blob();
    console.log('[TTS] Blob created:', {
      size: blob.size,
      type: blob.type,
    });
    
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    
    console.log('[TTS] ✅ Audio generated successfully');
    console.log('[TTS] Data URL length:', dataUrl.length);
    
    return dataUrl;
  } catch (error) {
    console.error('[TTS] ❌ Narration generation failed:', error);
    console.error('[TTS] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function generateNarrationWithAI(request: NarrationRequest): Promise<NarrationResponse> {
  console.log('[Narration] Starting narration generation...');
  console.log('[Narration] Request:', {
    voiceId: request.voiceId,
    premiseLength: request.plotContext.premise.length,
    investigatorThreadsCount: request.plotContext.investigatorThreads.length,
  });
  
  const { plotContext, voiceId } = request;
  
  // Step 1: Prepare audio items
  console.log('[Narration] Step 1: Preparing audio items...');
  const audioItems: AudioItem[] = [];
  
  // Add premise
  if (plotContext.premise) {
    audioItems.push({
      type: 'premise',
      text: plotContext.premise,
      voiceId,
    });
  }
  
  // Add investigators
  if (plotContext.investigatorThreads && plotContext.investigatorThreads.length > 0) {
    for (const thread of plotContext.investigatorThreads) {
      const text = `${thread.personalStakes || ""} ${thread.connectionToThreat || ""}`.trim();
      if (text) {
        audioItems.push({
          type: 'investigator',
          text,
          voiceId,
          id: thread.playerId,
        });
      }
    }
  }
  
  console.log('[Narration] Prepared', audioItems.length, 'audio items');
  
  // Step 2: Add audio tags using Gemini
  console.log('[Narration] Step 2: Adding audio tags with Gemini...');
  const enhancedItems = await addAudioTags(audioItems);
  console.log('[Narration] Audio tags added successfully');
  
  // Step 3: Generate speech for each item
  console.log('[Narration] Step 3: Generating speech with ElevenLabs...');
  const response: NarrationResponse = {
    investigators: {},
  };
  
  for (const item of enhancedItems) {
    if (item.type === 'premise') {
      console.log('[Narration] Generating premise audio...');
      const audioData = await textToSpeech(item.text, item.voiceId);
      if (audioData) {
        response.premise = audioData;
        console.log('[Narration] ✅ Premise audio generated');
      } else {
        console.warn('[Narration] ⚠️ Premise audio generation failed');
      }
    } else if (item.type === 'investigator' && item.id) {
      console.log(`[Narration] Generating audio for investigator ${item.id}...`);
      const audioData = await textToSpeech(item.text, item.voiceId);
      if (audioData && response.investigators) {
        response.investigators[item.id] = audioData;
        console.log(`[Narration] ✅ Investigator ${item.id} audio generated`);
      } else {
        console.warn(`[Narration] ⚠️ Investigator ${item.id} audio generation failed`);
      }
    }
  }

  console.log('[Narration] ✅ Narration generation complete');
  console.log('[Narration] Generated audio:', {
    premise: !!response.premise,
    investigators: Object.keys(response.investigators || {}),
  });

  return response;
}

