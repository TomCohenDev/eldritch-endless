import { genAI, AUDIO_TAG_MODEL } from "./geminiClient";

interface AudioItem {
  type: 'premise' | 'investigator';
  text: string;
  voiceId: string;
  id?: string; // Only for investigator type
}

const AUDIO_TAG_PROMPT = `You are an audio director for a dark cosmic horror narration game inspired by H.P. Lovecraft and Eldritch Horror. Your task is to add ElevenLabs Audio Tags to text to create immersive, theatrical voice performances.

## Audio Tags Reference
- Emotions: [ominous], [dread], [whispers], [hushed], [sorrowful], [nervous], [awe], [fearful], [unsettled]
- Delivery: [slowly], [deliberately], [quietly], [dramatic tone], [grave tone], [mysterious]
- Reactions: [pause], [sigh], [gulps], [shudders], [gasps], [inhales sharply]
- Pacing: [drawn out], [building tension], [rushed], [trailing off...]

## Guidelines
1. Use tags sparingly but effectively - typically 2-5 per paragraph
2. Place tags BEFORE the words they should affect
3. Use [pause] for dramatic effect between revelations
4. Use [whispers] or [hushed] for secrets and dread
5. Use [ominous] or [dread] for cosmic horror moments
6. Use [slowly] or [deliberately] for important names or concepts
7. End ominous passages with [trailing off...] or [pause]
8. Match tag intensity to content - ancient ones deserve more drama than travel descriptions

## Input Format
You will receive JSON items with: type, text, voiceId, and optionally id

## Output Format
Return the EXACT same JSON structure, but with the "text" field enhanced with audio tags.
Only modify the "text" field. Keep all other fields unchanged.

Return ONLY valid JSON array - no markdown, no explanation.`;

/**
 * Add audio tags to narration text using Google Gemini
 * This enhances text with ElevenLabs audio direction tags for theatrical narration
 */
export async function addAudioTags(items: AudioItem[]): Promise<AudioItem[]> {
  console.log('[Audio Tags] Starting audio tag generation...');
  console.log('[Audio Tags] Processing', items.length, 'items');
  
  try {
    console.log(`[Audio Tags] Using model: ${AUDIO_TAG_MODEL}`);
    console.log('[Audio Tags] Input items:', items.map(i => ({
      type: i.type,
      id: i.id,
      textLength: i.text.length,
      textPreview: i.text.substring(0, 50) + '...'
    })));
    
    const model = genAI.getGenerativeModel({ model: AUDIO_TAG_MODEL });
    
    const fullPrompt = `${AUDIO_TAG_PROMPT}

Add appropriate audio tags to these narration items for an Eldritch Horror game:

${JSON.stringify(items, null, 2)}

Return the enhanced JSON with audio tags added to the text fields. Return ONLY the JSON array.`;

    console.log('[Audio Tags] Prompt prepared, calling Gemini API...');
    const startTime = Date.now();
    
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();
    
    const duration = Date.now() - startTime;
    console.log(`[Audio Tags] API call completed in ${duration}ms`);
    console.log('[Audio Tags] Raw response:');
    console.log('--- RESPONSE START ---');
    console.log(text);
    console.log('--- RESPONSE END ---');
    
    // Clean up the response (remove markdown code blocks if present)
    let cleanedText = text.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/```\s*/g, '').replace(/```\s*$/g, '').trim();
    }
    
    console.log('[Audio Tags] Parsing JSON response...');
    const enhancedItems = JSON.parse(cleanedText) as AudioItem[];
    
    console.log('[Audio Tags] ✅ Successfully enhanced', enhancedItems.length, 'items');
    console.log('[Audio Tags] Enhanced items:', enhancedItems.map(i => ({
      type: i.type,
      id: i.id,
      originalLength: items.find(orig => orig.type === i.type && orig.id === i.id)?.text.length,
      enhancedLength: i.text.length,
      tagsAdded: (i.text.match(/\[[\w\s]+\]/g) || []).length,
      preview: i.text.substring(0, 100) + '...'
    })));
    
    return enhancedItems;
  } catch (error) {
    console.error('[Audio Tags] ❌ Failed to add audio tags:', error);
    console.error('[Audio Tags] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
    });
    
    // Fallback: return items unchanged if tagging fails
    console.warn('[Audio Tags] ⚠️ Returning items without audio tags');
    return items;
  }
}

