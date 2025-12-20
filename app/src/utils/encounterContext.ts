/**
 * Encounter Context Utilities
 * 
 * Functions to build context for the encounter generation workflow.
 * These package game state into a format suitable for the n8n AI workflow.
 */

import type {
  ActionRecord,
  EncounterRequest,
  GameState,
  GenerateEncounterRequest,
  InvestigatorSnapshot,
  Player,
  RoundTimeline,
} from '../types';

/**
 * Build a timeline of actions for the current round
 * This provides context about what happened before the encounter
 */
export function buildRoundTimeline(
  actionHistory: ActionRecord[],
  players: Player[],
  currentRound: number
): RoundTimeline {
  const roundActions = actionHistory.filter(a => a.round === currentRound);
  
  return {
    round: currentRound,
    actions: roundActions.map(action => {
      const player = players.find(p => p.id === action.playerId);
      return {
        playerId: action.playerId,
        playerName: player?.name || 'Unknown',
        investigatorName: player?.investigator?.title || 'Unknown Investigator',
        actionType: action.actionType,
        description: formatActionDescription(action),
        timestamp: action.timestamp,
      };
    }),
  };
}

/**
 * Format an action record into a human-readable description
 */
function formatActionDescription(action: ActionRecord): string {
  const { actionType, details } = action;
  
  switch (actionType) {
    case 'travel':
      return `Traveled from ${details.fromLocation || 'unknown'} to ${details.toLocation || 'unknown'}`;
    case 'rest':
      return 'Rested to recover health and sanity';
    case 'trade':
      return `Traded items: ${details.itemsTraded?.join(', ') || 'various items'}`;
    case 'prepare_travel':
      return `Acquired a ${details.ticketAcquired || 'travel'} ticket`;
    case 'acquire_assets':
      return `Acquired assets: ${details.assetsAcquired?.join(', ') || 'various assets'}`;
    case 'component':
      return `Used component: ${details.componentUsed || 'unknown'}`;
    case 'local_action':
      return details.description || 'Performed a local action';
    default:
      return details.description || 'Performed an action';
  }
}

/**
 * Create a snapshot of an investigator's current state
 * Used to provide context to the encounter generation workflow
 */
export function createInvestigatorSnapshot(player: Player): InvestigatorSnapshot {
  // Extract max health/sanity from investigator data if available
  const investigatorData = player.investigator;
  const infobox = investigatorData?.infobox || {};
  
  // Parse max values from infobox (format might be "Health: 7" or just "7")
  const maxHealth = parseInt(infobox['Health'] || infobox['health'] || '7', 10) || 7;
  const maxSanity = parseInt(infobox['Sanity'] || infobox['sanity'] || '7', 10) || 7;
  
  return {
    id: player.id,
    name: player.name,
    investigatorName: investigatorData?.title || 'Unknown Investigator',
    profession: infobox['Occupation'] || infobox['occupation'] || 'Unknown',
    health: player.health,
    maxHealth,
    sanity: player.sanity,
    maxSanity,
    clues: player.clues,
    focus: player.focus,
    location: player.location,
    conditions: player.conditions,
    assets: player.assets,
    actionsRemaining: player.actionsRemaining,
  };
}

/**
 * Build the complete encounter request context
 * Packages all context needed for the n8n encounter generation workflow
 */
export function buildEncounterContext(
  state: GameState,
  request: EncounterRequest
): GenerateEncounterRequest {
  const player = state.players.find(p => p.id === request.investigatorId);
  
  if (!player) {
    throw new Error(`Player not found: ${request.investigatorId}`);
  }
  
  if (!state.plotContext) {
    throw new Error('Plot context is required for encounter generation');
  }
  
  if (!state.ancientOne) {
    throw new Error('Ancient One is required for encounter generation');
  }
  
  // Find the investigator's personal thread
  const investigatorThread = state.plotContext.investigatorThreads.find(
    t => t.playerId === player.id
  );
  
  // Build the round timeline
  const roundTimeline = buildRoundTimeline(
    state.actionHistory || [],
    state.players,
    state.round
  );
  
  // Build recent encounters context (last 3 encounters with full history)
  const recentEncounters = (state.narrativeLog || [])
    .filter(event => event.type === 'encounter' && event.encounterHistory)
    .slice(-3)
    .map(event => {
      const encounterPlayer = state.players.find(p => 
        event.playerIds?.includes(p.id)
      );
      
      // Extract choices made
      const choicesMade = event.encounterHistory!.nodes
        .filter(n => n.choiceMade || n.testResult)
        .map(n => n.choiceMade || `${n.testResult} test`)
        .filter(Boolean) as string[];
      
      return {
        title: event.title,
        location: encounterPlayer?.location || 'Unknown',
        investigatorName: encounterPlayer?.investigator?.title || encounterPlayer?.name || 'Unknown',
        summary: event.content.split('\n\n')[0], // First paragraph
        choicesMade,
        outcome: event.encounterHistory!.finalOutcome || {},
      };
    });
  
  return {
    sessionId: state.sessionId,
    encounterType: request.type,
    subType: request.subType,
    
    selectedCard: request.selectedCard || {
      title: 'Unknown Encounter',
      originalText: '',
    },
    
    investigator: createInvestigatorSnapshot(player),
    
    gameContext: {
      round: state.round,
      doom: state.doom,
      maxDoom: state.maxDoom,
      phase: state.phase,
      ancientOneName: state.ancientOne.title,
      currentTension: state.plotContext.currentTension,
    },
    
    plotContext: {
      premise: state.plotContext.premise,
      currentAct: state.plotContext.currentAct,
      activeThemes: state.plotContext.activeThemes,
      majorPlotPoints: state.plotContext.majorPlotPoints,
      investigatorThread,
      // Rich narrative context for the Ancient One
      ancientOneMotivation: state.plotContext.ancientOneMotivation,
      cultistAgenda: state.plotContext.cultistAgenda,
      cosmicThreat: state.plotContext.cosmicThreat,
      locationSignificance: state.plotContext.locationSignificance,
    },
    
    roundTimeline,
    
    recentEncounters,
  };
}
