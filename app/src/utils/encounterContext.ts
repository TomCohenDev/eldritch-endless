/**
 * Encounter Context Builder
 * 
 * Utilities for building the complete context package needed by the
 * n8n encounter generation workflow. This ensures the AI has all the
 * information needed to generate contextual, narrative-appropriate encounters.
 */

import type {
  GameState,
  Player,
  ActionRecord,
  PlotContext,
  RoundTimeline,
  ActionTimelineEntry,
  InvestigatorSnapshot,
  GenerateEncounterRequest,
  EncounterRequest,
  EncounterType,
  ActionType,
} from '../types';

/**
 * Get a human-readable description of an action
 */
function describeAction(action: ActionRecord, playerName: string): string {
  const { actionType, details } = action;
  
  switch (actionType) {
    case 'travel':
      return `${playerName} traveled from ${details.fromLocation || 'unknown'} to ${details.toLocation || 'unknown'}`;
    case 'rest':
      return `${playerName} rested, recovering health and sanity`;
    case 'trade':
      const items = details.itemsTraded?.join(', ') || 'items';
      return `${playerName} traded ${items} with another investigator`;
    case 'prepare_travel':
      const ticket = details.ticketAcquired === 'ship' ? 'ship ticket' : 'train ticket';
      return `${playerName} acquired a ${ticket}`;
    case 'acquire_assets':
      const assets = details.assetsAcquired?.join(', ') || 'assets';
      return `${playerName} acquired ${assets}`;
    case 'component':
      return `${playerName} used ${details.componentUsed || 'a component action'}`;
    case 'local_action':
      return `${playerName} performed a local action${details.description ? `: ${details.description}` : ''}`;
    default:
      return `${playerName} performed an action`;
  }
}

/**
 * Build a timeline of actions for a specific round
 */
export function buildRoundTimeline(
  actionHistory: ActionRecord[],
  players: Player[],
  round: number
): RoundTimeline {
  // Filter actions for this round
  const roundActions = actionHistory
    .filter(a => a.round === round)
    .sort((a, b) => a.timestamp - b.timestamp);
  
  // Convert to timeline entries
  const entries: ActionTimelineEntry[] = roundActions.map(action => {
    const player = players.find(p => p.id === action.playerId);
    const playerName = player?.investigator?.title || player?.name || 'Unknown Investigator';
    
    return {
      timestamp: action.timestamp,
      investigatorName: playerName,
      investigatorId: action.playerId,
      actionType: action.actionType,
      description: describeAction(action, playerName),
      fromLocation: action.details.fromLocation,
      toLocation: action.details.toLocation,
      currentLocation: action.details.toLocation || player?.location || 'Unknown',
    };
  });
  
  // Build a narrative summary
  const summary = buildRoundSummary(entries, players);
  
  return {
    round,
    actions: entries,
    summary,
  };
}

/**
 * Build a narrative summary of what happened during the round
 */
function buildRoundSummary(entries: ActionTimelineEntry[], players: Player[]): string {
  if (entries.length === 0) {
    return 'No actions were taken this round.';
  }
  
  // Group actions by investigator
  const byInvestigator = new Map<string, ActionTimelineEntry[]>();
  entries.forEach(entry => {
    const existing = byInvestigator.get(entry.investigatorName) || [];
    existing.push(entry);
    byInvestigator.set(entry.investigatorName, existing);
  });
  
  // Build summary parts
  const parts: string[] = [];
  
  byInvestigator.forEach((actions, name) => {
    const actionDescriptions = actions.map(a => {
      if (a.actionType === 'travel') {
        return `traveled to ${a.toLocation}`;
      } else if (a.actionType === 'rest') {
        return 'rested';
      } else if (a.actionType === 'prepare_travel') {
        return 'prepared for travel';
      } else if (a.actionType === 'acquire_assets') {
        return 'acquired assets';
      } else if (a.actionType === 'trade') {
        return 'traded with another investigator';
      } else if (a.actionType === 'component') {
        return 'used an ability';
      } else if (a.actionType === 'local_action') {
        return 'took a local action';
      }
      return 'acted';
    });
    
    if (actionDescriptions.length === 1) {
      parts.push(`${name} ${actionDescriptions[0]}`);
    } else {
      const last = actionDescriptions.pop();
      parts.push(`${name} ${actionDescriptions.join(', ')} and ${last}`);
    }
  });
  
  // Add current locations
  const locationParts = players.map(p => {
    const name = p.investigator?.title || p.name;
    return `${name} is now in ${p.location}`;
  });
  
  return parts.join('. ') + '. ' + locationParts.join('. ') + '.';
}

/**
 * Create a snapshot of an investigator's current state
 */
export function createInvestigatorSnapshot(
  player: Player,
  plotContext: PlotContext | null
): InvestigatorSnapshot {
  // Find the investigator's thread in the plot context
  const thread = plotContext?.investigatorThreads.find(t => t.playerId === player.id);
  
  // Get max health/sanity from investigator data
  // These are typically in the infobox
  const maxHealth = player.investigator?.infobox?.health 
    ? parseInt(player.investigator.infobox.health, 10) 
    : 7;
  const maxSanity = player.investigator?.infobox?.sanity
    ? parseInt(player.investigator.infobox.sanity, 10)
    : 5;
  
  // Get profession from infobox
  const profession = player.investigator?.infobox?.occupation 
    || player.investigator?.infobox?.profession
    || 'Investigator';
  
  return {
    id: player.id,
    name: player.investigator?.title || player.name,
    profession,
    location: player.location,
    health: player.health,
    maxHealth: isNaN(maxHealth) ? 7 : maxHealth,
    sanity: player.sanity,
    maxSanity: isNaN(maxSanity) ? 5 : maxSanity,
    clues: player.clues,
    conditions: player.conditions,
    assets: player.assets,
    shipTickets: player.shipTickets,
    trainTickets: player.trainTickets,
    // Narrative context from plot
    personalStakes: thread?.personalStakes,
    connectionToThreat: thread?.connectionToThreat,
    potentialArc: thread?.potentialArc,
  };
}

/**
 * Build the complete encounter generation request
 * This packages ALL context needed by the n8n workflow
 */
export function buildEncounterContext(
  gameState: GameState,
  encounterRequest: EncounterRequest
): GenerateEncounterRequest {
  if (!gameState.plotContext) {
    throw new Error('Cannot build encounter context: plotContext is not set');
  }
  
  if (!gameState.ancientOne) {
    throw new Error('Cannot build encounter context: ancientOne is not set');
  }
  
  const plotContext = gameState.plotContext;
  
  // Build investigator snapshots
  const investigators = gameState.players.map(p => 
    createInvestigatorSnapshot(p, plotContext)
  );
  
  // Find the active investigator
  const activePlayer = gameState.players.find(p => p.id === encounterRequest.investigatorId);
  if (!activePlayer) {
    throw new Error(`Cannot find investigator with id: ${encounterRequest.investigatorId}`);
  }
  const activeInvestigator = createInvestigatorSnapshot(activePlayer, plotContext);
  
  // Build the current round timeline
  const currentRoundTimeline = buildRoundTimeline(
    gameState.actionHistory,
    gameState.players,
    gameState.round
  );
  
  // Get recent narrative events (last 10)
  const recentNarrative = gameState.narrativeLog
    .slice(-10)
    .map(event => ({
      type: event.type,
      title: event.title,
      content: event.content,
      outcome: event.outcome,
    }));
  
  // Check if the encounter location has significance in the plot
  const locationSignificance = plotContext.locationSignificance[encounterRequest.location];
  
  // Calculate doom percentage
  const doomPercentage = gameState.maxDoom > 0 
    ? Math.round((1 - gameState.doom / gameState.maxDoom) * 100)
    : 0;
  
  return {
    sessionId: gameState.sessionId,
    
    gameState: {
      round: gameState.round,
      doom: gameState.doom,
      maxDoom: gameState.maxDoom,
      doomPercentage,
      phase: gameState.phase,
    },
    
    plotContext,
    
    ancientOne: {
      name: gameState.ancientOne.title,
      epithet: gameState.ancientOne.infobox?.epithet,
      motivation: plotContext.ancientOneMotivation,
      cultistAgenda: plotContext.cultistAgenda,
    },
    
    investigators,
    activeInvestigator,
    encounterRequest,
    currentRoundTimeline,
    recentNarrative,
    locationSignificance,
    currentTension: plotContext.currentTension,
    activeThemes: plotContext.activeThemes,
    majorPlotPoints: plotContext.majorPlotPoints,
  };
}

/**
 * Determine encounter type based on location
 */
export function inferEncounterType(
  location: string,
  locationType?: 'City' | 'Sea' | 'Wilderness'
): { type: EncounterType; subType?: string } {
  // Check for special locations
  const locationLower = location.toLowerCase();
  
  // Expedition locations
  const expeditionLocations = [
    'the heart of africa',
    'antarctica',
    'the amazon',
    'the pyramids',
    'tunguska',
    'the himalayas',
  ];
  if (expeditionLocations.some(exp => locationLower.includes(exp))) {
    return { type: 'expedition', subType: location };
  }
  
  // Other world locations
  if (locationLower.includes('other world') || locationLower.includes('gate')) {
    return { type: 'other_world' };
  }
  
  // Region-based encounters
  const regionMapping: Record<string, string> = {
    'london': 'Europe',
    'rome': 'Europe',
    'istanbul': 'Europe',
    'arkham': 'Americas',
    'san francisco': 'Americas',
    'buenos aires': 'Americas',
    'tokyo': 'Asia-Australia',
    'shanghai': 'Asia-Australia',
    'sydney': 'Asia-Australia',
    // Add more as needed
  };
  
  for (const [city, region] of Object.entries(regionMapping)) {
    if (locationLower.includes(city)) {
      return { type: 'location_region', subType: region };
    }
  }
  
  // Fall back to general based on location type
  if (locationType) {
    return { 
      type: 'general', 
      subType: locationType // "City", "Sea", or "Wilderness"
    };
  }
  
  // Default to general
  return { type: 'general' };
}

/**
 * Get a readable label for an action type
 */
export function getActionTypeLabel(actionType: ActionType): string {
  const labels: Record<ActionType, string> = {
    travel: 'Travel',
    rest: 'Rest',
    trade: 'Trade',
    prepare_travel: 'Prepare for Travel',
    acquire_assets: 'Acquire Assets',
    component: 'Component Action',
    local_action: 'Local Action',
  };
  return labels[actionType] || actionType;
}

