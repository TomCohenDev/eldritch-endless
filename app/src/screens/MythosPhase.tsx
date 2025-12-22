import { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { useGameData } from '../hooks/useGameData';
import { selectMythosCard, getAvailableCardCounts, getMythosStageConfig, type MythosColor } from '../services/ai/mythosSelection';
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
  } = useGame();
  
  const { helpers } = useGameData();
  
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
  
  const mythosDeck = state.mythosDeck || { stage: 1, usedCardIds: [] };
  const stageConfig = state.ancientOne 
    ? getMythosStageConfig(state.ancientOne.title, mythosDeck.stage)
    : { stage: 1, green: 4, yellow: 4, blue: 2 };
  
  // Load available card counts
  useEffect(() => {
    async function loadCounts() {
      const counts = await getAvailableCardCounts(mythosDeck.usedCardIds);
      setAvailableCounts(counts);
    }
    loadCounts();
  }, [mythosDeck.usedCardIds]);
  
  // Determine which color to draw based on stage configuration
  // For simplicity, we'll cycle through colors or let the user choose
  // In a full implementation, this would be determined by the stage composition
  const getNextColor = (): MythosColor => {
    // Simple logic: prioritize colors with available cards
    if (availableCounts.Green > 0) return 'Green';
    if (availableCounts.Yellow > 0) return 'Yellow';
    if (availableCounts.Blue > 0) return 'Blue';
    return 'Green'; // Fallback
  };
  
  const handleRevealMythosCard = async () => {
    if (!state.ancientOne || !state.plotContext) {
      console.error('Cannot draw mythos card: missing ancient one or plot context');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // Determine color (in a full implementation, this would be based on stage composition)
      const color = getNextColor();
      
      // Select a card
      const selectedCard = await selectMythosCard(
        mythosDeck.stage,
        color,
        mythosDeck.usedCardIds
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
          stage: mythosDeck.stage,
          summary: e.content.slice(0, 100),
        }));
      
      // Generate story for the card
      const request: GenerateMythosRequest = {
        sessionId: state.sessionId,
        card: selectedCard,
        stage: mythosDeck.stage,
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
      };
      
      const response = await generateMythos(request);
      
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
          <div className="flex items-center gap-2 mb-3">
            <Scroll className="w-4 h-4 text-eldritch-light" />
            <h2 className="font-accent text-sm text-parchment-dark">
              MYTHOS DECK
            </h2>
          </div>
          
          <div className="space-y-3">
            <div>
              <p className="font-accent text-xs text-parchment-dark mb-1">
                Current Stage
              </p>
              <p className="font-display text-lg text-parchment-light">
                Stage {mythosDeck.stage} {mythosDeck.stage === 1 ? '(Early)' : mythosDeck.stage === 2 ? '(Mid)' : '(Late)'}
              </p>
            </div>
            
            <div>
              <p className="font-accent text-xs text-parchment-dark mb-2">
                Cards Remaining
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-green-900/20 border border-green-800/40 rounded p-2 text-center">
                  <p className="font-accent text-xs text-green-300">Green</p>
                  <p className="font-display text-lg text-green-100">{availableCounts.Green}</p>
                </div>
                <div className="bg-yellow-900/20 border border-yellow-800/40 rounded p-2 text-center">
                  <p className="font-accent text-xs text-yellow-300">Yellow</p>
                  <p className="font-display text-lg text-yellow-100">{availableCounts.Yellow}</p>
                </div>
                <div className="bg-blue-900/20 border border-blue-800/40 rounded p-2 text-center">
                  <p className="font-accent text-xs text-blue-300">Blue</p>
                  <p className="font-display text-lg text-blue-100">{availableCounts.Blue}</p>
                </div>
              </div>
            </div>
            
            {mythosDeck.lastDrawnCard && (
              <div>
                <p className="font-accent text-xs text-parchment-dark mb-1">
                  Last Card
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
        </section>
        
        {/* Current Mythos Card */}
        {currentCard ? (
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
              
              <div className="bg-obsidian/30 rounded p-4 border border-obsidian">
                <p className="font-accent text-xs text-parchment-dark uppercase mb-2">
                  Effect
                </p>
                <p className="font-body text-sm text-parchment-light">
                  {currentCard.generated.card.effect}
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
        ) : (
          <section className="bg-shadow/50 rounded-lg p-4 border border-eldritch-dark">
            <div className="text-center py-8">
              <Scroll className="w-12 h-12 text-eldritch-light mx-auto mb-4 opacity-50" />
              <p className="font-body text-parchment-dark mb-4">
                No mythos card drawn yet
              </p>
            </div>
          </section>
        )}
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
            className="touch-target w-full flex items-center justify-center gap-2 px-4 py-4 bg-eldritch hover:bg-eldritch-light disabled:bg-eldritch/50 text-parchment-light font-display text-lg tracking-wide rounded transition-colors"
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

