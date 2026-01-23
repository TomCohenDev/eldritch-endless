import { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { useGameData } from '../hooks/useGameData';
import { selectMythosCard, getAvailableCardCounts, getMythosStageConfig, getMythosDeckComposition, type MythosColor } from '../services/ai/mythosSelection';
import { generateMythos } from '../api';
import type { GenerateMythosRequest, MythosCard } from '../types';
import { 
  Scroll, 
  Loader2, 
  AlertCircle,
  Sparkles,
  ChevronLeft,
} from 'lucide-react';

export function MythosPhase() {
  const {
    state,
    advancePhase,
    goBackPhase,
    addNarrativeEvent,
    updatePlotTension,
    addPlotPoint,
    drawMythosCard,
    updateMythosStage,
    getRecentMythosDescriptions,
    recordMythosDescription,
  } = useGame();
  
  const { helpers, ancientOneDetailed } = useGameData();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentCard, setCurrentCard] = useState<{
    card: MythosCard;
    generated: any;
  } | null>(null);
  const [availableCounts, setAvailableCounts] = useState<Record<MythosColor, number>>({
    Green: 0,
    Yellow: 0,
    Blue: 0,
  });
  
  // Default stage draws for backwards compatibility
  const defaultStageDraws = {
    stage1: { green: 0, yellow: 0, blue: 0 },
    stage2: { green: 0, yellow: 0, blue: 0 },
    stage3: { green: 0, yellow: 0, blue: 0 },
  };
  
  const defaultStageCards = {
    stage1: [] as Array<{ pageId: number; title: string; color: 'Green' | 'Yellow' | 'Blue' }>,
    stage2: [] as Array<{ pageId: number; title: string; color: 'Green' | 'Yellow' | 'Blue' }>,
    stage3: [] as Array<{ pageId: number; title: string; color: 'Green' | 'Yellow' | 'Blue' }>,
  };
  
  const mythosDeck = state.mythosDeck ? {
    ...state.mythosDeck,
    stageDraws: state.mythosDeck.stageDraws || defaultStageDraws,
    stageCards: state.mythosDeck.stageCards || defaultStageCards,
  } : { 
    stage: 1, 
    usedCardIds: [],
    stageDraws: defaultStageDraws,
    stageCards: defaultStageCards,
  };
  const detailed = state.ancientOne ? ancientOneDetailed.get(state.ancientOne.title) : undefined;
  const stageConfig = state.ancientOne 
    ? getMythosStageConfig(state.ancientOne.title, mythosDeck.stage, detailed)
    : { stage: 1, green: 4, yellow: 4, blue: 2 };
  
  // Get current stage draws
  const stageKey = `stage${mythosDeck.stage}` as 'stage1' | 'stage2' | 'stage3';
  const currentStageDraws = mythosDeck.stageDraws?.[stageKey] || { green: 0, yellow: 0, blue: 0 };
  
  // Calculate remaining cards per color in current stage
  const remainingInStage = {
    Green: Math.max(0, stageConfig.green - currentStageDraws.green),
    Yellow: Math.max(0, stageConfig.yellow - currentStageDraws.yellow),
    Blue: Math.max(0, stageConfig.blue - currentStageDraws.blue),
  };
  
  // Check if current stage is depleted
  const isStageDepleted = remainingInStage.Green === 0 && remainingInStage.Yellow === 0 && remainingInStage.Blue === 0;
  
  // Load available card counts (global, for reference)
  useEffect(() => {
    async function loadCounts() {
      const usedIds = mythosDeck.usedCardIds.map(id => {
        if (typeof id === 'string') {
          const parsed = parseInt(id, 10);
          return isNaN(parsed) ? 0 : parsed;
        }
        return id;
      }).filter(id => id > 0);
      const counts = await getAvailableCardCounts(usedIds);
      setAvailableCounts(counts);
    }
    loadCounts();
  }, [mythosDeck.usedCardIds]);
  
  // Get available colors in current stage
  const getAvailableColors = (): MythosColor[] => {
    const available: MythosColor[] = [];
    if (remainingInStage.Green > 0) available.push('Green');
    if (remainingInStage.Yellow > 0) available.push('Yellow');
    if (remainingInStage.Blue > 0) available.push('Blue');
    return available;
  };
  
  // Determine which color to draw - randomly pick from available colors in stage
  const getNextColor = (): MythosColor | null => {
    const available = getAvailableColors();
    if (available.length === 0) return null;
    // Randomly select from available colors
    return available[Math.floor(Math.random() * available.length)];
  };
  
  const handleRevealMythosCard = async () => {
    if (!state.ancientOne || !state.plotContext) {
      console.error('Cannot draw mythos card: missing ancient one or plot context');
      return;
    }
    
    // Check if stage is depleted - advance to next stage automatically
    // Note: We need to check the current state, not the stale closure value
    const currentDeck = state.mythosDeck || { 
      stage: 1, 
      usedCardIds: [],
      stageDraws: defaultStageDraws,
    };
    const currentStageKey = `stage${currentDeck.stage}` as 'stage1' | 'stage2' | 'stage3';
    const currentStageDraws = currentDeck.stageDraws?.[currentStageKey] || { green: 0, yellow: 0, blue: 0 };
    const currentStageConfig = state.ancientOne 
      ? getMythosStageConfig(state.ancientOne.title, currentDeck.stage, detailed)
      : { stage: 1, green: 4, yellow: 4, blue: 2 };
    
    const currentRemaining = {
      Green: Math.max(0, currentStageConfig.green - currentStageDraws.green),
      Yellow: Math.max(0, currentStageConfig.yellow - currentStageDraws.yellow),
      Blue: Math.max(0, currentStageConfig.blue - currentStageDraws.blue),
    };
    
    const isCurrentStageDepleted = currentRemaining.Green === 0 && currentRemaining.Yellow === 0 && currentRemaining.Blue === 0;
    
    if (isCurrentStageDepleted) {
      if (currentDeck.stage < 3) {
        console.log(`[Mythos Phase] Stage ${currentDeck.stage} depleted, advancing to Stage ${currentDeck.stage + 1}`);
        updateMythosStage((currentDeck.stage + 1) as 2 | 3);
        // Don't return - let the state update and user can try again
        // The button will be re-enabled after state updates
        return;
      } else {
        console.error('All mythos stages depleted');
        return;
      }
    }
    
    setIsGenerating(true);
    setStreamingStory('');
    setCurrentCard(null);

    try {
      // Get fresh state values after potential stage advancement
      const freshDeck = state.mythosDeck || { 
        stage: 1, 
        usedCardIds: [],
        stageDraws: defaultStageDraws,
      };
      const freshStageKey = `stage${freshDeck.stage}` as 'stage1' | 'stage2' | 'stage3';
      const freshStageDraws = freshDeck.stageDraws?.[freshStageKey] || { green: 0, yellow: 0, blue: 0 };
      const freshStageConfig = state.ancientOne 
        ? getMythosStageConfig(state.ancientOne.title, freshDeck.stage, detailed)
        : { stage: 1, green: 4, yellow: 4, blue: 2 };
      
      const freshRemaining = {
        Green: Math.max(0, freshStageConfig.green - freshStageDraws.green),
        Yellow: Math.max(0, freshStageConfig.yellow - freshStageDraws.yellow),
        Blue: Math.max(0, freshStageConfig.blue - freshStageDraws.blue),
      };
      
      // Get available colors in the current (possibly advanced) stage
      const availableColors: MythosColor[] = [];
      if (freshRemaining.Green > 0) availableColors.push('Green');
      if (freshRemaining.Yellow > 0) availableColors.push('Yellow');
      if (freshRemaining.Blue > 0) availableColors.push('Blue');
      
      if (availableColors.length === 0) {
        console.error('No available colors in current stage after advancement check');
        setIsGenerating(false);
        return;
      }
      
      // Randomly select from available colors
      const color = availableColors[Math.floor(Math.random() * availableColors.length)];
      
      // Convert usedCardIds to numbers for comparison
      const usedCardIdsAsNumbers = freshDeck.usedCardIds.map(id => {
        if (typeof id === 'string') {
          const parsed = parseInt(id, 10);
          return isNaN(parsed) ? 0 : parsed;
        }
        return id;
      }).filter(id => id > 0);
      
      // Select a card with stage tracking
      const selectedCard = await selectMythosCard(
        freshDeck.stage,
        color,
        usedCardIdsAsNumbers,
        freshStageDraws,
        { green: freshStageConfig.green, yellow: freshStageConfig.yellow, blue: freshStageConfig.blue }
      );
      
      if (!selectedCard) {
        console.error('No available mythos cards');
        setIsGenerating(false);
        return;
      }
      
      // Build recent mythos cards context
      const recentMythos = state.narrativeLog
        .filter(e => e.type === 'mythos')
        .slice(-3)
        .map(e => ({
          title: e.title,
          color: color, // Would need to track this in narrative events
          stage: freshDeck.stage,
          summary: e.content.slice(0, 100),
        }));
      
      // Build investigators context
      const investigators = state.players.map(player => ({
        name: player.investigator?.title || player.name,
        profession: player.investigator?.infobox?.profession || undefined,
        location: player.location,
        health: player.health,
        sanity: player.sanity,
        clues: player.clues,
        conditions: player.conditions,
        assets: player.assets,
      }));
      
      // Build recent timeline (actions and encounters from current and previous round)
      const recentTimeline = [
        // Get recent actions from action history
        ...state.actionHistory
          .filter(action => action.round >= state.round - 1)
          .slice(-10)
          .map(action => {
            const player = state.players.find(p => p.id === action.playerId);
            return {
              type: 'action' as const,
              playerName: player?.name,
              investigatorName: player?.investigator?.title,
              description: `${action.actionType}${action.details.description ? ': ' + action.details.description : ''}${action.details.toLocation ? ' to ' + action.details.toLocation : ''}`,
              location: action.details.toLocation || action.details.fromLocation,
              outcome: action.details.healthChange || action.details.sanityChange ? 
                `Health: ${action.details.healthChange || 0}, Sanity: ${action.details.sanityChange || 0}` : undefined,
              timestamp: action.timestamp,
              round: action.round,
            };
          }),
        // Get recent encounters and mythos from narrative log
        ...state.narrativeLog
          .filter(e => e.type === 'encounter' || e.type === 'mythos' || e.type === 'story')
          .slice(-10)
          .map(e => {
            const playerIds = e.playerIds || [];
            const players = playerIds.map(id => state.players.find(p => p.id === id)).filter(Boolean);
            return {
              type: e.type as 'encounter' | 'mythos' | 'story',
              playerName: players[0]?.name,
              investigatorName: players[0]?.investigator?.title,
              description: e.title + (e.content ? ': ' + e.content.slice(0, 150) : ''),
              location: players[0]?.location,
              outcome: e.outcome,
              timestamp: e.timestamp,
              round: state.round, // Narrative events don't have round, use current
            };
          }),
      ]
        .sort((a, b) => b.timestamp - a.timestamp) // Most recent first
        .slice(0, 15); // Limit to 15 most recent events
      
      // Generate story for the card
      const request: GenerateMythosRequest = {
        sessionId: state.sessionId,
        card: selectedCard,
        stage: freshDeck.stage,
        gameContext: {
          round: state.round,
          doom: state.doom,
          maxDoom: state.maxDoom,
          ancientOneName: state.ancientOne.title,
          currentTension: state.plotContext.currentTension,
        },
        plotContext: {
          premise: state.plotContext.premise,
          currentAct: state.plotContext.currentAct,
          activeThemes: state.plotContext.activeThemes,
          majorPlotPoints: state.plotContext.majorPlotPoints,
          ancientOneMotivation: state.plotContext.ancientOneMotivation,
          cultistAgenda: state.plotContext.cultistAgenda,
          cosmicThreat: state.plotContext.cosmicThreat,
        },
        recentMythosCards: recentMythos.length > 0 ? recentMythos : undefined,
        investigators: investigators,
        recentTimeline: recentTimeline.length > 0 ? recentTimeline : undefined,
      };
      
      // Get recent descriptions for anti-repetition
      const recentDescriptions = getRecentMythosDescriptions();

      // Generate mythos story
      const response = await generateMythos(request, recentDescriptions);

      // Record description for future anti-repetition
      recordMythosDescription(
        response.card.title,
        response.card.flavor,
        response.card.narrative
      );

      setCurrentCard({
        card: selectedCard,
        generated: response,
      });

      // Update tension if needed
      if (response.tensionChange) {
        updatePlotTension((state.plotContext?.currentTension || 3) + response.tensionChange);
      }

      // Add plot points if any
      if (response.newPlotPoints) {
        response.newPlotPoints.forEach(point => addPlotPoint(point));
      }

      // Mark card as used
      drawMythosCard(selectedCard.pageId, selectedCard.title, color);
      
    } catch (error) {
      console.error('Failed to generate mythos card:', error);
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleCompleteMythos = () => {
    if (!currentCard) return;
    
    // Add to narrative log
    addNarrativeEvent({
      type: 'mythos',
      title: currentCard.generated.card.title,
      content: `${currentCard.generated.card.flavor}\n\n${currentCard.generated.card.narrative}\n\nEffect: ${currentCard.generated.card.effect}`,
    });
    
    // Clear current card and advance phase
    setCurrentCard(null);
    advancePhase();
  };
  
  return (
    <div className="min-h-dvh flex flex-col bg-void">
      {/* Header */}
      <header className="px-4 py-2 border-b border-obsidian/50 bg-abyss/50 sticky top-0 z-10 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-lg font-bold text-parchment-light">
                  Round {state.round}
                </span>
                <span className="font-accent text-xs text-eldritch-light">
                  Mythos Phase
                </span>
              </div>
              {state.ancientOne && (
                <p className="font-accent text-[10px] text-parchment-dark">
                  vs <span className="text-parchment">{state.ancientOne.title}</span>
                </p>
              )}
            </div>
          </div>
          
          {/* DOOM */}
          <div className="flex items-center gap-2 bg-blood/10 px-3 py-1 rounded-lg border border-blood/30">
            <span className="font-accent text-[10px] text-parchment-dark uppercase">Doom</span>
            <span className="font-display text-xl font-bold text-blood-light">
              {state.doom}
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 p-4 overflow-y-auto space-y-6">
        {/* Mythos Deck Info */}
        <section className="bg-shadow/50 rounded-lg p-4 border border-eldritch-dark">
          <div className="flex items-center gap-2 mb-4">
            <Scroll className="w-4 h-4 text-eldritch-light" />
            <h2 className="font-accent text-sm text-parchment-dark">
              MYTHOS DECK
            </h2>
          </div>
          
          {state.ancientOne && (() => {
            // Get detailed data for the Ancient One
            const detailed = ancientOneDetailed.get(state.ancientOne.title);
            const composition = getMythosDeckComposition(state.ancientOne.title, detailed);
            const drawnCards = mythosDeck.usedCardIds || [];
            
            // Calculate remaining cards per stage (simplified - would need to track which stage each card came from)
            // For now, we'll show the composition and total remaining
            const totalCards = composition.stage1.green + composition.stage1.yellow + composition.stage1.blue +
                              composition.stage2.green + composition.stage2.yellow + composition.stage2.blue +
                              composition.stage3.green + composition.stage3.yellow + composition.stage3.blue;
            const cardsDrawn = drawnCards.length;
            const cardsRemaining = totalCards - cardsDrawn;
            
            return (
              <div className="space-y-4">
                {/* Current Stage Indicator */}
                <div className="bg-eldritch-dark/50 rounded p-3 border border-eldritch">
                  <p className="font-accent text-xs text-parchment-dark mb-1">
                    Current Stage
                  </p>
                  <p className="font-display text-lg text-parchment-light">
                    Stage {mythosDeck.stage} {mythosDeck.stage === 1 ? '(Early)' : mythosDeck.stage === 2 ? '(Mid)' : '(Late)'}
                  </p>
                  <p className="font-accent text-xs text-parchment-dark mt-1">
                    {cardsRemaining} cards remaining in deck
                  </p>
                </div>
                
                {/* Deck Composition by Stage */}
                <div>
                  <p className="font-accent text-xs text-parchment-dark mb-2 uppercase">
                    Deck Composition
                  </p>
                  <div className="space-y-2">
                    {/* Stage I */}
                    {(() => {
                      const stage1Draws = mythosDeck.stageDraws?.stage1 || { green: 0, yellow: 0, blue: 0 };
                      const stage1Cards = mythosDeck.stageCards?.stage1 || [];
                      const stage1Remaining = {
                        green: composition.stage1.green - stage1Draws.green,
                        yellow: composition.stage1.yellow - stage1Draws.yellow,
                        blue: composition.stage1.blue - stage1Draws.blue,
                      };
                      return (
                        <div className={`bg-obsidian/30 rounded p-3 border ${mythosDeck.stage === 1 ? 'border-eldritch-light' : 'border-obsidian'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-display text-sm font-semibold text-parchment-light">
                              Stage I {mythosDeck.stage === 1 && <span className="text-eldritch-light">(Current)</span>}
                            </p>
                            <p className="font-accent text-xs text-parchment-dark">
                              {composition.stage1.green + composition.stage1.yellow + composition.stage1.blue} cards • {stage1Cards.length} drawn
                            </p>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center mb-2">
                            <div className={`bg-green-900/20 border rounded p-1.5 ${stage1Remaining.green > 0 ? 'border-green-800/40' : 'border-green-900/20 opacity-50'}`}>
                              <p className="font-accent text-[10px] text-green-300">Green</p>
                              <p className="font-display text-sm text-green-100">{composition.stage1.green}</p>
                              <p className="font-accent text-[9px] text-green-400/70">
                                {stage1Draws.green} drawn • {stage1Remaining.green} left
                              </p>
                            </div>
                            <div className={`bg-yellow-900/20 border rounded p-1.5 ${stage1Remaining.yellow > 0 ? 'border-yellow-800/40' : 'border-yellow-900/20 opacity-50'}`}>
                              <p className="font-accent text-[10px] text-yellow-300">Yellow</p>
                              <p className="font-display text-sm text-yellow-100">{composition.stage1.yellow}</p>
                              <p className="font-accent text-[9px] text-yellow-400/70">
                                {stage1Draws.yellow} drawn • {stage1Remaining.yellow} left
                              </p>
                            </div>
                            <div className={`bg-blue-900/20 border rounded p-1.5 ${stage1Remaining.blue > 0 ? 'border-blue-800/40' : 'border-blue-900/20 opacity-50'}`}>
                              <p className="font-accent text-[10px] text-blue-300">Blue</p>
                              <p className="font-display text-sm text-blue-100">{composition.stage1.blue}</p>
                              <p className="font-accent text-[9px] text-blue-400/70">
                                {stage1Draws.blue} drawn • {stage1Remaining.blue} left
                              </p>
                            </div>
                          </div>
                          {stage1Cards.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-obsidian/50">
                              <p className="font-accent text-[10px] text-parchment-dark mb-1">Drawn Cards:</p>
                              <div className="space-y-1">
                                {stage1Cards.map((card, idx) => (
                                  <div key={idx} className={`text-left text-[10px] px-2 py-0.5 rounded ${
                                    card.color === 'Green' ? 'bg-green-900/20 text-green-200' :
                                    card.color === 'Yellow' ? 'bg-yellow-900/20 text-yellow-200' :
                                    'bg-blue-900/20 text-blue-200'
                                  }`}>
                                    <span className="font-accent">{card.color}:</span> {card.title}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    
                    {/* Stage II */}
                    {(() => {
                      const stage2Draws = mythosDeck.stageDraws?.stage2 || { green: 0, yellow: 0, blue: 0 };
                      const stage2Cards = mythosDeck.stageCards?.stage2 || [];
                      const stage2Remaining = {
                        green: composition.stage2.green - stage2Draws.green,
                        yellow: composition.stage2.yellow - stage2Draws.yellow,
                        blue: composition.stage2.blue - stage2Draws.blue,
                      };
                      return (
                        <div className={`bg-obsidian/30 rounded p-3 border ${mythosDeck.stage === 2 ? 'border-eldritch-light' : 'border-obsidian'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-display text-sm font-semibold text-parchment-light">
                              Stage II {mythosDeck.stage === 2 && <span className="text-eldritch-light">(Current)</span>}
                            </p>
                            <p className="font-accent text-xs text-parchment-dark">
                              {composition.stage2.green + composition.stage2.yellow + composition.stage2.blue} cards • {stage2Cards.length} drawn
                            </p>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center mb-2">
                            <div className={`bg-green-900/20 border rounded p-1.5 ${stage2Remaining.green > 0 ? 'border-green-800/40' : 'border-green-900/20 opacity-50'}`}>
                              <p className="font-accent text-[10px] text-green-300">Green</p>
                              <p className="font-display text-sm text-green-100">{composition.stage2.green}</p>
                              <p className="font-accent text-[9px] text-green-400/70">
                                {stage2Draws.green} drawn • {stage2Remaining.green} left
                              </p>
                            </div>
                            <div className={`bg-yellow-900/20 border rounded p-1.5 ${stage2Remaining.yellow > 0 ? 'border-yellow-800/40' : 'border-yellow-900/20 opacity-50'}`}>
                              <p className="font-accent text-[10px] text-yellow-300">Yellow</p>
                              <p className="font-display text-sm text-yellow-100">{composition.stage2.yellow}</p>
                              <p className="font-accent text-[9px] text-yellow-400/70">
                                {stage2Draws.yellow} drawn • {stage2Remaining.yellow} left
                              </p>
                            </div>
                            <div className={`bg-blue-900/20 border rounded p-1.5 ${stage2Remaining.blue > 0 ? 'border-blue-800/40' : 'border-blue-900/20 opacity-50'}`}>
                              <p className="font-accent text-[10px] text-blue-300">Blue</p>
                              <p className="font-display text-sm text-blue-100">{composition.stage2.blue}</p>
                              <p className="font-accent text-[9px] text-blue-400/70">
                                {stage2Draws.blue} drawn • {stage2Remaining.blue} left
                              </p>
                            </div>
                          </div>
                          {stage2Cards.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-obsidian/50">
                              <p className="font-accent text-[10px] text-parchment-dark mb-1">Drawn Cards:</p>
                              <div className="space-y-1">
                                {stage2Cards.map((card, idx) => (
                                  <div key={idx} className={`text-left text-[10px] px-2 py-0.5 rounded ${
                                    card.color === 'Green' ? 'bg-green-900/20 text-green-200' :
                                    card.color === 'Yellow' ? 'bg-yellow-900/20 text-yellow-200' :
                                    'bg-blue-900/20 text-blue-200'
                                  }`}>
                                    <span className="font-accent">{card.color}:</span> {card.title}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    
                    {/* Stage III */}
                    {(() => {
                      const stage3Draws = mythosDeck.stageDraws?.stage3 || { green: 0, yellow: 0, blue: 0 };
                      const stage3Cards = mythosDeck.stageCards?.stage3 || [];
                      const stage3Remaining = {
                        green: composition.stage3.green - stage3Draws.green,
                        yellow: composition.stage3.yellow - stage3Draws.yellow,
                        blue: composition.stage3.blue - stage3Draws.blue,
                      };
                      return (
                        <div className={`bg-obsidian/30 rounded p-3 border ${mythosDeck.stage === 3 ? 'border-eldritch-light' : 'border-obsidian'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-display text-sm font-semibold text-parchment-light">
                              Stage III {mythosDeck.stage === 3 && <span className="text-eldritch-light">(Current)</span>}
                            </p>
                            <p className="font-accent text-xs text-parchment-dark">
                              {composition.stage3.green + composition.stage3.yellow + composition.stage3.blue} cards • {stage3Cards.length} drawn
                            </p>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center mb-2">
                            <div className={`bg-green-900/20 border rounded p-1.5 ${stage3Remaining.green > 0 ? 'border-green-800/40' : 'border-green-900/20 opacity-50'}`}>
                              <p className="font-accent text-[10px] text-green-300">Green</p>
                              <p className="font-display text-sm text-green-100">{composition.stage3.green}</p>
                              <p className="font-accent text-[9px] text-green-400/70">
                                {stage3Draws.green} drawn • {stage3Remaining.green} left
                              </p>
                            </div>
                            <div className={`bg-yellow-900/20 border rounded p-1.5 ${stage3Remaining.yellow > 0 ? 'border-yellow-800/40' : 'border-yellow-900/20 opacity-50'}`}>
                              <p className="font-accent text-[10px] text-yellow-300">Yellow</p>
                              <p className="font-display text-sm text-yellow-100">{composition.stage3.yellow}</p>
                              <p className="font-accent text-[9px] text-yellow-400/70">
                                {stage3Draws.yellow} drawn • {stage3Remaining.yellow} left
                              </p>
                            </div>
                            <div className={`bg-blue-900/20 border rounded p-1.5 ${stage3Remaining.blue > 0 ? 'border-blue-800/40' : 'border-blue-900/20 opacity-50'}`}>
                              <p className="font-accent text-[10px] text-blue-300">Blue</p>
                              <p className="font-display text-sm text-blue-100">{composition.stage3.blue}</p>
                              <p className="font-accent text-[9px] text-blue-400/70">
                                {stage3Draws.blue} drawn • {stage3Remaining.blue} left
                              </p>
                            </div>
                          </div>
                          {stage3Cards.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-obsidian/50">
                              <p className="font-accent text-[10px] text-parchment-dark mb-1">Drawn Cards:</p>
                              <div className="space-y-1">
                                {stage3Cards.map((card, idx) => (
                                  <div key={idx} className={`text-left text-[10px] px-2 py-0.5 rounded ${
                                    card.color === 'Green' ? 'bg-green-900/20 text-green-200' :
                                    card.color === 'Yellow' ? 'bg-yellow-900/20 text-yellow-200' :
                                    'bg-blue-900/20 text-blue-200'
                                  }`}>
                                    <span className="font-accent">{card.color}:</span> {card.title}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
                
                {/* Last Drawn Card */}
                {mythosDeck.lastDrawnCard && (
                  <div>
                    <p className="font-accent text-xs text-parchment-dark mb-1">
                      Last Card Drawn
                    </p>
                    <div className={`p-2 rounded border ${
                      mythosDeck.lastDrawnCard.color === 'Green' ? 'bg-green-900/20 border-green-800/40' :
                      mythosDeck.lastDrawnCard.color === 'Yellow' ? 'bg-yellow-900/20 border-yellow-800/40' :
                      'bg-blue-900/20 border-blue-800/40'
                    }`}>
                      <p className="font-display text-sm text-parchment-light">
                        {mythosDeck.lastDrawnCard.title}
                      </p>
                      <p className="font-accent text-xs text-parchment-dark">
                        {mythosDeck.lastDrawnCard.color} • Stage {mythosDeck.lastDrawnCard.stage}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </section>

        {/* Current Mythos Card */}
        {!isGenerating && currentCard ? (
          <section className="bg-shadow/50 rounded-lg p-4 border border-cosmic-light/30">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-cosmic-light" />
              <h2 className="font-accent text-sm text-parchment-dark">
                MYTHOS CARD
              </h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-display text-xl text-parchment-light mb-2">
                  {currentCard.generated.card.title}
                </h3>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-2 py-1 rounded text-xs font-accent ${
                    currentCard.generated.card.color === 'Green' ? 'bg-green-900/30 text-green-200' :
                    currentCard.generated.card.color === 'Yellow' ? 'bg-yellow-900/30 text-yellow-200' :
                    'bg-blue-900/30 text-blue-200'
                  }`}>
                    {currentCard.generated.card.color}
                  </span>
                  <span className="px-2 py-1 rounded text-xs font-accent bg-obsidian/50 text-parchment-dark">
                    {currentCard.generated.card.difficulty}
                  </span>
                  <span className="px-2 py-1 rounded text-xs font-accent bg-eldritch-dark/50 text-eldritch-light">
                    Stage {currentCard.generated.card.stage}
                  </span>
                </div>
              </div>
              
              <div className="bg-abyss/50 rounded p-4 border border-obsidian/50">
                <p className="font-body text-parchment leading-relaxed mb-3">
                  {currentCard.generated.card.flavor}
                </p>
                <p className="font-body text-sm text-parchment-dark italic">
                  {currentCard.generated.card.narrative}
                </p>
              </div>
              
              {/* Mythos Card Icons */}
              {(currentCard.card.icons && currentCard.card.icons.length > 0) || (currentCard.generated.card.icons && currentCard.generated.card.icons.length > 0) ? (
                <div className="bg-eldritch-dark/50 rounded p-4 border border-eldritch">
                  <p className="font-accent text-xs text-parchment-dark uppercase mb-3">
                    Mythos Card Icons (Resolve in order)
                  </p>
                  <div className="space-y-2">
                    {(currentCard.generated.card.icons || currentCard.card.icons || []).map((icon, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <span className="font-display text-eldritch-light w-6 text-center">{idx + 1}.</span>
                        <span className="font-body text-parchment-light">{icon}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              
              <div className="bg-obsidian/30 rounded p-4 border border-obsidian">
                <p className="font-accent text-xs text-parchment-dark uppercase mb-2">
                  Effect
                </p>
                <p className="font-body text-sm text-parchment-light whitespace-pre-line">
                  {currentCard.generated.card.effect}
                  {(currentCard.generated.card.testSkill || currentCard.card.testSkill) && (
                    <span className="text-eldritch-light font-semibold"> (Test: {currentCard.generated.card.testSkill || currentCard.card.testSkill})</span>
                  )}
                </p>
                {currentCard.generated.card.reckoning && (
                  <>
                    <p className="font-accent text-xs text-parchment-dark uppercase mt-3 mb-2">
                      Reckoning
                    </p>
                    <p className="font-body text-sm text-parchment-light">
                      {currentCard.generated.card.reckoning}
                    </p>
                  </>
                )}
              </div>
            </div>
          </section>
        ) : !isGenerating ? (
          <section className="bg-shadow/50 rounded-lg p-4 border border-eldritch-dark">
            <div className="text-center py-8">
              <Scroll className="w-12 h-12 text-eldritch-light mx-auto mb-4 opacity-50" />
              <p className="font-body text-parchment-dark mb-4">
                No mythos card drawn yet
              </p>
            </div>
          </section>
        ) : null}
      </div>

      {/* Bottom Action Bar */}
      <div className="p-4 border-t border-obsidian/50 space-y-3 bg-void z-10">
        <button
          onClick={() => goBackPhase()}
          className="touch-target w-full flex items-center justify-center gap-2 px-4 py-3 bg-shadow hover:bg-obsidian text-parchment-dark hover:text-parchment border border-obsidian hover:border-eldritch-dark font-display text-sm tracking-wide rounded transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Go Back to Encounter Phase
        </button>
        
        {!currentCard ? (
          <button
            onClick={handleRevealMythosCard}
            disabled={isGenerating}
            className="touch-target w-full flex items-center justify-center gap-2 px-4 py-4 bg-eldritch hover:bg-eldritch-light disabled:bg-eldritch/50 disabled:opacity-50 text-parchment-light font-display text-lg tracking-wide rounded transition-colors"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Reveal Mythos Card
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleCompleteMythos}
            className="touch-target w-full flex items-center justify-center gap-2 px-4 py-4 bg-cosmic hover:bg-cosmic-light text-parchment-light font-display text-lg tracking-wide rounded transition-colors"
          >
            <Sparkles className="w-5 h-5" />
            Complete Mythos Phase
          </button>
        )}
      </div>
    </div>
  );
}

