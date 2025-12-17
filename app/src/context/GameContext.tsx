import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { createInitialGameState } from '../types';
import type { GameState, GamePhase, Player, NarrativeEvent } from '../types';

const STORAGE_KEY = 'eldritch-endless-state';

interface GameContextValue {
  state: GameState;
  hasSavedGame: boolean;
  startNewGame: (playerCount: number) => void;
  clearGame: () => void;
  addPlayer: (name: string) => void;
  updatePlayer: (playerId: string, updates: Partial<Player>) => void;
  advancePhase: () => void;
  setPhase: (phase: GamePhase) => void;
  addNarrativeEvent: (event: Omit<NarrativeEvent, 'id' | 'timestamp'>) => void;
  setCurrentEncounter: (encounter: NarrativeEvent | null) => void;
  resolveEncounter: (outcome: 'pass' | 'fail' | 'neutral') => void;
  adjustDoom: (amount: number) => void;
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
    return crypto.randomUUID();
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

  const hasSavedGame = state.players.length > 0 || state.narrativeLog.length > 0;

  useEffect(() => {
    const updatedState = { ...state, lastUpdatedAt: Date.now() };
    saveState(updatedState);
  }, [state]);

  const startNewGame = useCallback((playerCount: number) => {
    const newState = createInitialGameState();
    newState.playerCount = playerCount;
    newState.sessionId = generateUUID(); // Use safe UUID generator
    
    const players: Player[] = [];
    for (let i = 0; i < playerCount; i++) {
      players.push({
        id: generateUUID(),
        name: `Investigator ${i + 1}`,
        investigator: null,
        health: 7,
        sanity: 5,
        clues: 0,
        focus: 0,
        conditions: [],
        assets: [],
        location: 'Unknown',
      });
    }
    newState.players = players;
    newState.phase = 'action';
    
    newState.narrativeLog.push({
      id: generateUUID(),
      timestamp: Date.now(),
      type: 'story',
      title: 'The Journey Begins',
      content: 'Dark omens gather on the horizon. Something ancient stirs in the spaces between worlds, and only a handful of investigators stand between humanity and oblivion...',
    });

    setState(newState);
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
      if (prev.phase === 'resolution') {
        newRound = prev.round + 1;
      }

      return {
        ...prev,
        phase: nextPhase,
        round: newRound,
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

  const value: GameContextValue = {
    state,
    hasSavedGame,
    startNewGame,
    clearGame,
    addPlayer,
    updatePlayer,
    advancePhase,
    setPhase,
    addNarrativeEvent,
    setCurrentEncounter,
    resolveEncounter,
    adjustDoom,
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
