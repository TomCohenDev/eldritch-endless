/**
 * Mythos Card Selection Service
 * 
 * Selects appropriate mythos cards based on stage and color requirements.
 * Never selects the same card twice.
 */

import type { MythosCard, MythosColor } from '../../../types';

interface MythosCardData {
  metadata: {
    source: string;
    extractedAt: string;
    totalMythosCards: number;
  };
  mythosCards: Array<{
    title: string;
    pageId: number;
    categories: string[];
    infobox: Record<string, string>;
    cardData: Record<string, string>;
    sections: Record<string, string>;
    links: string[];
    templates: string[];
    fullText: string;
    rawWikitext: string;
  }>;
}

let mythosCardsCache: MythosCard[] | null = null;

/**
 * Parse a mythos card's color from its fullText
 */
function parseMythosColor(fullText: string): MythosColor | undefined {
  const colorMatch = fullText.match(/\|Color\s*=\s*(Green|Yellow|Blue)/i);
  if (colorMatch) {
    return colorMatch[1] as MythosColor;
  }
  return undefined;
}

/**
 * Parse a mythos card's difficulty from its fullText
 */
function parseMythosDifficulty(fullText: string): 'Easy' | 'Normal' | 'Hard' | undefined {
  const difficultyMatch = fullText.match(/\|Difficulty\s*=\s*(Easy|Normal|Hard|Medium)/i);
  if (difficultyMatch) {
    const diff = difficultyMatch[1];
    // Normalize "Medium" to "Normal"
    return diff === 'Medium' ? 'Normal' : (diff as 'Easy' | 'Normal' | 'Hard');
  }
  return undefined;
}

/**
 * Parse a mythos card's trait from its fullText
 */
function parseMythosTrait(fullText: string): 'Event' | 'Ongoing' | 'Ongoing - Rumor' | undefined {
  const traitMatch = fullText.match(/\|Traits\s*=\s*(Event|Ongoing(?:\s*-\s*Rumor)?)/i);
  if (traitMatch) {
    const trait = traitMatch[1];
    if (trait.toLowerCase().includes('rumor')) {
      return 'Ongoing - Rumor';
    }
    if (trait.toLowerCase().includes('ongoing')) {
      return 'Ongoing';
    }
    return 'Event';
  }
  return undefined;
}

/**
 * Parse flavor text from fullText
 */
function parseFlavor(fullText: string): string | undefined {
  const flavorMatch = fullText.match(/\|Flavor\s*=\s*(.+?)(?:\n\|Effect|\n\|Reckoning|$)/s);
  if (flavorMatch) {
    return flavorMatch[1].trim();
  }
  return undefined;
}

/**
 * Parse effect text from fullText
 */
function parseEffect(fullText: string): string | undefined {
  const effectMatch = fullText.match(/\|Effect\s*=\s*(.+?)(?:\n\|Reckoning|$)/s);
  if (effectMatch) {
    return effectMatch[1].trim();
  }
  return undefined;
}

/**
 * Parse reckoning text from fullText
 */
function parseReckoning(fullText: string): string | undefined {
  const reckoningMatch = fullText.match(/\|Reckoning\s*=\s*(.+?)(?:\n\||\n}}|$)/s);
  if (reckoningMatch) {
    const text = reckoningMatch[1].trim();
    return text === 'N/A' ? undefined : text;
  }
  return undefined;
}

/**
 * Load and parse mythos cards from JSON
 */
async function loadMythosCards(): Promise<MythosCard[]> {
  if (mythosCardsCache) {
    return mythosCardsCache;
  }

  try {
    const response = await fetch('/mythos_cards.json');
    if (!response.ok) {
      throw new Error(`Failed to load mythos cards: ${response.statusText}`);
    }
    
    const data: MythosCardData = await response.json();
    
    // Parse each card
    mythosCardsCache = data.mythosCards.map(card => ({
      ...card,
      color: parseMythosColor(card.fullText),
      difficulty: parseMythosDifficulty(card.fullText),
      trait: parseMythosTrait(card.fullText),
      flavor: parseFlavor(card.fullText),
      effect: parseEffect(card.fullText),
      reckoning: parseReckoning(card.fullText),
    })).filter(card => card.color !== undefined) as MythosCard[]; // Filter out cards without color
    
    console.log(`[Mythos Selection] Loaded ${mythosCardsCache.length} mythos cards`);
    return mythosCardsCache;
  } catch (error) {
    console.error('[Mythos Selection] Failed to load mythos cards:', error);
    throw error;
  }
}

/**
 * Get mythos deck stage configuration for an Ancient One
 * 
 * For now, we'll use a default configuration. In a full implementation,
 * this would be read from the Ancient One's sheet data.
 * 
 * Default Core Game configuration:
 * - Stage 1: 4 Green, 4 Yellow, 2 Blue
 * - Stage 2: 4 Green, 4 Yellow, 2 Blue  
 * - Stage 3: 4 Green, 4 Yellow, 2 Blue
 */
export interface MythosStageConfig {
  stage: number;
  green: number;
  yellow: number;
  blue: number;
}

export function getMythosStageConfig(ancientOneName: string, stage: number): MythosStageConfig {
  // Default configuration for Core Game Ancient Ones
  // In a full implementation, this would vary by Ancient One
  return {
    stage,
    green: 4,
    yellow: 4,
    blue: 2,
  };
}

/**
 * Select a random mythos card from the appropriate stage and color
 * 
 * @param stage - Current mythos deck stage (1, 2, or 3)
 * @param color - Required color (Green, Yellow, or Blue)
 * @param usedCardIds - Array of pageIds that have already been used
 * @returns Selected mythos card or null if none available
 */
export async function selectMythosCard(
  stage: number,
  color: MythosColor,
  usedCardIds: number[] = []
): Promise<MythosCard | null> {
  const cards = await loadMythosCards();
  
  // Filter by color and exclude used cards
  const availableCards = cards.filter(card => 
    card.color === color && 
    !usedCardIds.includes(card.pageId)
  );
  
  if (availableCards.length === 0) {
    console.warn(`[Mythos Selection] No available ${color} cards for stage ${stage}`);
    return null;
  }
  
  // Random selection
  const randomIndex = Math.floor(Math.random() * availableCards.length);
  const selectedCard = availableCards[randomIndex];
  
  console.log(`[Mythos Selection] Selected card: ${selectedCard.title} (${color}, Stage ${stage})`);
  
  return selectedCard;
}

/**
 * Get count of available cards by color
 */
export async function getAvailableCardCounts(
  usedCardIds: number[] = []
): Promise<Record<MythosColor, number>> {
  const cards = await loadMythosCards();
  
  const available = cards.filter(card => !usedCardIds.includes(card.pageId));
  
  return {
    Green: available.filter(c => c.color === 'Green').length,
    Yellow: available.filter(c => c.color === 'Yellow').length,
    Blue: available.filter(c => c.color === 'Blue').length,
  };
}

