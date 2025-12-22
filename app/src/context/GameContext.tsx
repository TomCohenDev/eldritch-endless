import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { createInitialGameState } from '../types';
import type { 
  AncientOnePage, 
  WikiPage, 
  GameState, 
  GamePhase, 
  Player, 
  NarrativeEvent, 
  ActionType, 
  ActionRecord,
  PlotContext,
  GeneratePlotRequest,
  GenerateEncounterRequest,
  EncounterRequest,
  RoundTimeline,
} from '../types';
import { useGameData } from '../hooks/useGameData';
import { generatePlot } from '../api';
import { 
  buildEncounterContext, 
  buildRoundTimeline, 
  createInvestigatorSnapshot 
} from '../utils/encounterContext';

const STORAGE_KEY = 'eldritch-endless-state';

interface GameContextValue {
  state: GameState;
  hasSavedGame: boolean;
  isGeneratingPlot: boolean;
  
  // Game lifecycle
  startNewGame: (playerCount: number) => void;
  confirmSetupAndGeneratePlot: () => Promise<boolean>;  // Async - generates plot, returns true on success
  clearGame: () => void;
  
  // Setup flow
  setAncientOne: (ancientOne: AncientOnePage) => void;
  setPlayerInvestigator: (playerIndex: number, investigator: WikiPage) => void;
  
  // Narrator voice
  setNarratorVoice: (voiceId: string) => void;
  
  // Plot management
  setPlotContext: (plotContext: PlotContext) => void;
  updatePlotTension: (tension: number) => void;
  addPlotPoint: (plotPoint: string) => void;
  
  // Player management
  addPlayer: (name: string) => void;
  updatePlayer: (playerId: string, updates: Partial<Player>) => void;
  
  // Phase management
  advancePhase: () => void;
  goBackPhase: () => void;
  setPhase: (phase: GamePhase) => void;
  
  // Action Phase
  setActivePlayer: (playerIndex: number) => void;
  performAction: (playerId: string, actionType: ActionType, details: ActionRecord['details']) => void;
  movePlayer: (playerId: string, toLocation: string) => void;
  setPlayerLocation: (playerId: string, location: string) => void; // Free move (no action consumed)
  resetActionsForRound: () => void;
  undoLastAction: () => void;
  canUndo: boolean;
  
  // Narrative
  addNarrativeEvent: (event: Omit<NarrativeEvent, 'id' | 'timestamp'>) => void;
  setCurrentEncounter: (encounter: NarrativeEvent | null) => void;
  resolveEncounter: (outcome: 'pass' | 'fail' | 'neutral') => void;
  
  // Doom tracking
  adjustDoom: (amount: number) => void;
  
  // Encounter Context Building (for n8n workflow)
  getCurrentRoundTimeline: () => RoundTimeline;
  buildEncounterRequest: (encounterRequest: EncounterRequest) => GenerateEncounterRequest | null;
  
  // Mythos deck management
  drawMythosCard: (cardPageId: number, cardTitle: string, color: 'Green' | 'Yellow' | 'Blue') => void;
  updateMythosStage: (stage: 1 | 2 | 3) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

function loadSavedState(): GameState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved) as GameState;
    }
  } catch (e) {
    console.error('Failed to load saved game state:', e);
  }
  return null;
}

function saveState(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save game state:', e);
  }
}

function clearSavedState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear saved game state:', e);
  }
}

// Simple fallback UUID generator if crypto.randomUUID is missing (e.g. non-secure contexts)
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (e) {
      // Fallback
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(() => {
    return loadSavedState() || createInitialGameState();
  });
  const [isGeneratingPlot, setIsGeneratingPlot] = useState(false);

  const { helpers } = useGameData();

  const hasSavedGame = state.players && state.players.length > 0 && state.phase !== 'setup';

  // Auto-save on state changes
  useEffect(() => {
    const updatedState = { ...state, lastUpdatedAt: Date.now() };
    saveState(updatedState);
  }, [state]);

  const startNewGame = useCallback((playerCount: number) => {
    const newState = createInitialGameState();
    newState.playerCount = playerCount;
    newState.sessionId = generateUUID();
    
    // Initialize placeholder players
    const players: Player[] = [];
    for (let i = 0; i < playerCount; i++) {
      players.push({
        id: generateUUID(),
        name: `Investigator ${i + 1}`,
        investigator: null,
        health: 0,
        sanity: 0,
        clues: 0,
        focus: 0,
        conditions: [],
        assets: [],
        location: 'Unknown',
        actionsRemaining: 2,
        shipTickets: 0,
        trainTickets: 0,
      });
    }
    newState.players = players;
    newState.phase = 'setup'; // Keep in setup phase
    
    setState(newState);
  }, []);

  const setAncientOne = useCallback((ancientOne: AncientOnePage) => {
    setState(prev => {
      // Eldritch Horror doom typically starts at Starting Doom and counts down to 0.
      // We track state.doom as the current doom value.
      const startingDoom = ancientOne.setup?.startingDoom ?? 15;

      return {
        ...prev,
        ancientOne,
        maxDoom: startingDoom,
        doom: startingDoom,
      };
    });
  }, []);

  const setNarratorVoice = useCallback((voiceId: string) => {
    setState(prev => ({
      ...prev,
      narratorVoiceId: voiceId,
    }));
  }, []);

  const setPlayerInvestigator = useCallback((playerIndex: number, investigator: WikiPage) => {
    setState(prev => {
      const newPlayers = [...prev.players];
      if (!newPlayers[playerIndex]) return prev;

      // Extract stats
      const health = helpers.getStat(investigator, 'health') || 7;
      const sanity = helpers.getStat(investigator, 'sanity') || 5;
      
      // Extract starting location from infobox or raw text
      // Wiki data format: startloc = "San Francisco" or similar
      const location = helpers.getField(investigator, 'startloc') || 'Unknown';

      newPlayers[playerIndex] = {
        ...newPlayers[playerIndex],
        name: investigator.title, // Update name to match investigator
        investigator,
        health,
        sanity,
        location,
        // Reset other state
        clues: (() => {
          const raw = helpers.getField(investigator, 'startclues');
          const n = raw ? parseInt(raw, 10) : 0;
          return Number.isFinite(n) ? n : 0;
        })(),
        assets: [], // Could parse starting assets later
        actionsRemaining: 2,
        shipTickets: 0,
        trainTickets: 0,
      };

      return {
        ...prev,
        players: newPlayers
      };
    });
  }, [helpers]);

  /**
   * Confirm setup and generate the plot context via AI
   * This is called when "Summon the Darkness" is clicked
   * Returns true if plot generation succeeded, false otherwise
   */
  const confirmSetupAndGeneratePlot = useCallback(async (): Promise<boolean> => {
    // Validate setup is complete
    if (!state.ancientOne || state.players.some(p => !p.investigator)) {
      console.error('Cannot start game: setup incomplete');
      return false;
    }

    setIsGeneratingPlot(true);

    try {
      // Build the plot generation request
      const request: GeneratePlotRequest = {
        sessionId: state.sessionId,
        ancientOne: helpers.extractAncientOneContext(state.ancientOne),
        investigators: state.players
          .filter(p => p.investigator)
          .map(p => helpers.extractInvestigatorContext(p.investigator!)),
        playerCount: state.playerCount,
        startingDoom: state.doom,
      };

      // Call the n8n webhook to generate the plot
      // This will wait for the API response or timeout
      const plotContext = await generatePlot(request);

      // Update investigator threads with actual player IDs
      const threadsWithIds = plotContext.investigatorThreads.map((thread, idx) => ({
        ...thread,
        playerId: state.players[idx]?.id || thread.playerId,
      }));

      setState(prev => ({
        ...prev,
        phase: 'action', // Begin game
        plotContext: {
          ...plotContext,
          investigatorThreads: threadsWithIds,
        },
        narrativeLog: [
          ...prev.narrativeLog,
          {
            id: generateUUID(),
            timestamp: Date.now(),
            type: 'story',
            title: 'The Ritual Begins',
            content: plotContext.premise || 
              `The Investigators have gathered. ${prev.ancientOne?.title || 'An Ancient Horror'} stirs in the void. The doom track stands at ${prev.doom}.`,
          }
        ]
      }));

      setIsGeneratingPlot(false);
      return true; // Success
    } catch (error) {
      console.error('Failed to generate plot:', error);
      setIsGeneratingPlot(false);
      // Don't update state or navigate - stay on setup screen
      return false; // Failure - app should not continue
    }
  }, [state.ancientOne, state.players, state.sessionId, state.playerCount, state.doom, helpers]);

  /**
   * Set the plot context directly (for testing or manual override)
   */
  const setPlotContext = useCallback((plotContext: PlotContext) => {
    setState(prev => ({
      ...prev,
      plotContext,
    }));
  }, []);

  /**
   * Update the current tension level in the plot
   */
  const updatePlotTension = useCallback((tension: number) => {
    setState(prev => {
      if (!prev.plotContext) return prev;
      return {
        ...prev,
        plotContext: {
          ...prev.plotContext,
          currentTension: Math.max(0, Math.min(10, tension)),
        },
      };
    });
  }, []);

  /**
   * Add a major plot point to the story context
   */
  const addPlotPoint = useCallback((plotPoint: string) => {
    setState(prev => {
      if (!prev.plotContext) return prev;
      return {
        ...prev,
        plotContext: {
          ...prev.plotContext,
          majorPlotPoints: [...prev.plotContext.majorPlotPoints, plotPoint],
        },
      };
    });
  }, []);

  const clearGame = useCallback(() => {
    clearSavedState();
    setState(createInitialGameState());
  }, []);

  const addPlayer = useCallback((name: string) => {
    setState((prev) => ({
      ...prev,
      players: [
        ...prev.players,
        {
          id: generateUUID(),
          name,
          investigator: null,
          health: 7,
          sanity: 5,
          clues: 0,
          focus: 0,
          conditions: [],
          assets: [],
          location: 'Unknown',
          actionsRemaining: 2,
          shipTickets: 0,
          trainTickets: 0,
        },
      ],
    }));
  }, []);

  const updatePlayer = useCallback((playerId: string, updates: Partial<Player>) => {
    setState((prev) => ({
      ...prev,
      players: prev.players.map((p) =>
        p.id === playerId ? { ...p, ...updates } : p
      ),
    }));
  }, []);

  const advancePhase = useCallback(() => {
    setState((prev) => {
      const phaseOrder: GamePhase[] = ['action', 'encounter', 'mythos', 'resolution', 'action'];
      const currentIndex = phaseOrder.indexOf(prev.phase);
      const nextPhase = phaseOrder[(currentIndex + 1) % (phaseOrder.length - 1)];
      
      let newRound = prev.round;
      let newPlayers = prev.players || [];
      let newActivePlayerIndex = prev.activePlayerIndex;
      
      // When entering Action phase (either from resolution or at start), reset actions
      if (nextPhase === 'action') {
        newActivePlayerIndex = 0;
        newPlayers = newPlayers.map(p => ({
          ...p,
          actionsRemaining: 2,
        }));
      }
      
      if (prev.phase === 'resolution') {
        newRound = prev.round + 1;
      }

      return {
        ...prev,
        phase: nextPhase,
        round: newRound,
        players: newPlayers,
        activePlayerIndex: newActivePlayerIndex,
      };
    });
  }, []);

  const goBackPhase = useCallback(() => {
    setState((prev) => {
      const phaseOrder: GamePhase[] = ['action', 'encounter', 'mythos', 'resolution'];
      const currentIndex = phaseOrder.indexOf(prev.phase);
      
      // Can't go back from action phase (it's the first phase of a round)
      if (currentIndex <= 0) return prev;
      
      const prevPhase = phaseOrder[currentIndex - 1];
      
      return {
        ...prev,
        phase: prevPhase,
      };
    });
  }, []);

  const setPhase = useCallback((phase: GamePhase) => {
    setState((prev) => ({ ...prev, phase }));
  }, []);

  const addNarrativeEvent = useCallback((event: Omit<NarrativeEvent, 'id' | 'timestamp'>) => {
    setState((prev) => ({
      ...prev,
      narrativeLog: [
        ...prev.narrativeLog,
        {
          ...event,
          id: generateUUID(),
          timestamp: Date.now(),
        },
      ],
    }));
  }, []);

  const setCurrentEncounter = useCallback((encounter: NarrativeEvent | null) => {
    setState((prev) => ({ ...prev, currentEncounter: encounter }));
  }, []);

  const resolveEncounter = useCallback((outcome: 'pass' | 'fail' | 'neutral') => {
    setState((prev) => {
      if (!prev.currentEncounter) return prev;

      const resolvedEncounter: NarrativeEvent = {
        ...prev.currentEncounter,
        outcome,
      };

      return {
        ...prev,
        currentEncounter: null,
        narrativeLog: [...prev.narrativeLog, resolvedEncounter],
      };
    });
  }, []);

  const adjustDoom = useCallback((amount: number) => {
    setState((prev) => ({
      ...prev,
      doom: Math.max(0, Math.min(prev.maxDoom, prev.doom + amount)),
    }));
  }, []);

  // --- Action Phase Functions ---
  
  const setActivePlayer = useCallback((playerIndex: number) => {
    setState((prev) => {
      // Safety check for empty players array
      if (!prev.players || prev.players.length === 0) {
        return { ...prev, activePlayerIndex: 0 };
      }
      return {
        ...prev,
        activePlayerIndex: Math.max(0, Math.min(prev.players.length - 1, playerIndex)),
      };
    });
  }, []);

  const performAction = useCallback((playerId: string, actionType: ActionType, details: ActionRecord['details']) => {
    setState((prev) => {
      const playerIndex = prev.players.findIndex(p => p.id === playerId);
      if (playerIndex === -1) return prev;
      
      const player = prev.players[playerIndex];
      if (player.actionsRemaining <= 0) return prev; // No actions left
      
      // Create action record
      const actionRecord: ActionRecord = {
        id: generateUUID(),
        playerId,
        actionType,
        timestamp: Date.now(),
        round: prev.round,
        details,
      };
      
      // Apply action effects
      const newPlayers = [...prev.players];
      const updatedPlayer = { ...player };
      
      switch (actionType) {
        case 'travel':
          if (details.toLocation) {
            updatedPlayer.location = details.toLocation;
          }
          updatedPlayer.actionsRemaining -= 1;
          break;
          
        case 'rest':
          updatedPlayer.health = Math.min(updatedPlayer.health + 1, helpers.getStat(player.investigator!, 'health') || 7);
          updatedPlayer.sanity = Math.min(updatedPlayer.sanity + 1, helpers.getStat(player.investigator!, 'sanity') || 5);
          updatedPlayer.actionsRemaining -= 1;
          break;
          
        case 'trade':
          // Trade doesn't modify stats directly - just record it
          updatedPlayer.actionsRemaining -= 1;
          break;
          
        case 'prepare_travel':
          if (details.ticketAcquired === 'ship') {
            updatedPlayer.shipTickets += 1;
          } else if (details.ticketAcquired === 'train') {
            updatedPlayer.trainTickets += 1;
          }
          updatedPlayer.actionsRemaining -= 1;
          break;
          
        case 'acquire_assets':
          // Assets acquired would be added to player
          updatedPlayer.actionsRemaining -= 1;
          break;
          
        case 'component':
        case 'local_action':
          updatedPlayer.actionsRemaining -= 1;
          break;
      }
      
      newPlayers[playerIndex] = updatedPlayer;
      
      return {
        ...prev,
        players: newPlayers,
        actionHistory: [...prev.actionHistory, actionRecord],
      };
    });
  }, [helpers]);

  const movePlayer = useCallback((playerId: string, toLocation: string) => {
    performAction(playerId, 'travel', { 
      fromLocation: state.players?.find(p => p.id === playerId)?.location,
      toLocation 
    });
  }, [performAction, state.players]);

  // Free move - update location without consuming an action (for card effects, events, etc.)
  const setPlayerLocation = useCallback((playerId: string, location: string) => {
    setState((prev) => ({
      ...prev,
      players: (prev.players || []).map((p) =>
        p.id === playerId ? { ...p, location } : p
      ),
    }));
  }, []);

  const resetActionsForRound = useCallback(() => {
    setState((prev) => ({
      ...prev,
      activePlayerIndex: 0,
      players: (prev.players || []).map(p => ({
        ...p,
        actionsRemaining: 2, // Each investigator gets 2 actions per round
      })),
    }));
  }, []);

  // Check if there are actions to undo in the current round
  const canUndo = state.actionHistory?.length > 0 && 
    state.actionHistory[state.actionHistory.length - 1]?.round === state.round;

  /**
   * Get the timeline of actions for the current round
   * Used to provide context to the encounter generation workflow
   */
  const getCurrentRoundTimeline = useCallback((): RoundTimeline => {
    return buildRoundTimeline(state.actionHistory || [], state.players || [], state.round);
  }, [state.actionHistory, state.players, state.round]);

  /**
   * Build the complete encounter request context
   * This packages ALL context needed for the n8n encounter generation workflow
   */
  const buildEncounterRequest = useCallback((encounterRequest: EncounterRequest): GenerateEncounterRequest | null => {
    if (!state.plotContext || !state.ancientOne) {
      console.error('Cannot build encounter request: missing plot context or ancient one');
      return null;
    }
    
    try {
      return buildEncounterContext(state, encounterRequest);
    } catch (error) {
      console.error('Failed to build encounter context:', error);
      return null;
    }
  }, [state]);

  const undoLastAction = useCallback(() => {
    setState((prev) => {
      if (!prev.actionHistory || prev.actionHistory.length === 0) return prev;
      
      const lastAction = prev.actionHistory[prev.actionHistory.length - 1];
      
      // Only allow undo for actions in the current round
      if (lastAction.round !== prev.round) return prev;
      
      const playerIndex = prev.players.findIndex(p => p.id === lastAction.playerId);
      if (playerIndex === -1) return prev;
      
      const player = prev.players[playerIndex];
      const newPlayers = [...prev.players];
      const updatedPlayer = { ...player };
      
      // Reverse the action effects
      switch (lastAction.actionType) {
        case 'travel':
          if (lastAction.details.fromLocation) {
            updatedPlayer.location = lastAction.details.fromLocation;
          }
          updatedPlayer.actionsRemaining += 1;
          break;
          
        case 'rest':
          updatedPlayer.health = Math.max(0, updatedPlayer.health - 1);
          updatedPlayer.sanity = Math.max(0, updatedPlayer.sanity - 1);
          updatedPlayer.actionsRemaining += 1;
          break;
          
        case 'trade':
          updatedPlayer.actionsRemaining += 1;
          break;
          
        case 'prepare_travel':
          if (lastAction.details.ticketAcquired === 'ship') {
            updatedPlayer.shipTickets = Math.max(0, updatedPlayer.shipTickets - 1);
          } else if (lastAction.details.ticketAcquired === 'train') {
            updatedPlayer.trainTickets = Math.max(0, updatedPlayer.trainTickets - 1);
          }
          updatedPlayer.actionsRemaining += 1;
          break;
          
        case 'acquire_assets':
        case 'component':
        case 'local_action':
          updatedPlayer.actionsRemaining += 1;
          break;
      }
      
      newPlayers[playerIndex] = updatedPlayer;
      
      return {
        ...prev,
        players: newPlayers,
        actionHistory: prev.actionHistory.slice(0, -1), // Remove the last action
        activePlayerIndex: playerIndex, // Switch to the player whose action was undone
      };
    });
  }, []);

  /**
   * Mark a mythos card as drawn and update deck state
   */
  const drawMythosCard = useCallback((cardPageId: number, cardTitle: string, color: 'Green' | 'Yellow' | 'Blue') => {
    setState(prev => {
      const currentDeck = prev.mythosDeck || { stage: 1, usedCardIds: [] };
      const currentStage = currentDeck.stage;
      
      return {
        ...prev,
        mythosDeck: {
          ...currentDeck,
          usedCardIds: [...currentDeck.usedCardIds, cardPageId],
          lastDrawnCard: {
            pageId: cardPageId,
            title: cardTitle,
            color,
            stage: currentStage,
          },
        },
      };
    });
  }, []);

  /**
   * Update the current mythos deck stage
   */
  const updateMythosStage = useCallback((stage: 1 | 2 | 3) => {
    setState(prev => ({
      ...prev,
      mythosDeck: {
        ...(prev.mythosDeck || { stage: 1, usedCardIds: [] }),
        stage,
      },
    }));
  }, []);

  const value: GameContextValue = {
    state,
    hasSavedGame,
    isGeneratingPlot,
    startNewGame,
    confirmSetupAndGeneratePlot,
    clearGame,
    setAncientOne,
    setPlayerInvestigator,
    setNarratorVoice,
    setPlotContext,
    updatePlotTension,
    addPlotPoint,
    addPlayer,
    updatePlayer,
    advancePhase,
    goBackPhase,
    setPhase,
    setActivePlayer,
    performAction,
    movePlayer,
    setPlayerLocation,
    resetActionsForRound,
    undoLastAction,
    canUndo,
    addNarrativeEvent,
    setCurrentEncounter,
    resolveEncounter,
    adjustDoom,
    // Encounter context builders
    getCurrentRoundTimeline,
    buildEncounterRequest,
    // Mythos deck management
    drawMythosCard,
    updateMythosStage,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
