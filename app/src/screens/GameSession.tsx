import { useState } from 'react';
import { Link } from 'react-router-dom';

// Encounter card images
import africaCard from '../assets/encounter-cards/Africa_Encounter.webp';
import americasCard from '../assets/encounter-cards/Americas_Encounter.webp';
import asiaAustraliaCard from '../assets/encounter-cards/Asia-Australia_Encounter.webp';
import azathothCard from '../assets/encounter-cards/Azathoth_Research_Encounter.webp';
import devastationCard from '../assets/encounter-cards/Devastation_Encounter.webp';
import dreamlandsCard from '../assets/encounter-cards/Dreamlands_Encounter.webp';
import egyptCard from '../assets/encounter-cards/Egypt_Encounter.webp';
import europeCard from '../assets/encounter-cards/Europe_Encounter.webp';
import generalCard from '../assets/encounter-cards/General_Encounter.webp';
import moaiCard from '../assets/encounter-cards/Moai_Statues_Encounter.webp';
import mountainCard from '../assets/encounter-cards/Mountain_Encounter.webp';
import otherWorldCard from '../assets/encounter-cards/Other_World_Encounter.webp';
import outpostCard from '../assets/encounter-cards/Outpost_Encounter.webp';
import keyGateCard from '../assets/encounter-cards/The_Key_and_the_Gate_Encounter.webp';
import moonCard from '../assets/encounter-cards/The_Moon_Encounter.webp';
import pyramidsCard from '../assets/encounter-cards/The_Pyramids_Encounter.webp';

import { 
  Users, 
  Scroll, 
  Eye, 
  Zap, 
  BookOpen,
  Home,
  Heart,
  Brain,
  MapPin,
  Footprints,
  Bed,
  ArrowLeftRight,
  Ticket,
  ShoppingBag,
  Sparkles,
  Building2,
  ChevronRight,
  ChevronLeft,
  X,
  Undo2,
  FileText,
  Search,
  Check,
  Loader2,
  Settings,
  Volume2,
  Play
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { useGameData } from '../hooks/useGameData';
import { generateEncounter } from '../api';
import { NARRATOR_VOICES, type ActionType, type EncounterType, type GenerateEncounterResponse } from '../types';
import { playVoiceSample } from '../utils/voiceSamples';

// Action definitions with icons and descriptions
const ACTIONS: { type: ActionType; label: string; icon: typeof Footprints; description: string }[] = [
  { type: 'travel', label: 'Travel', icon: Footprints, description: 'Move to an adjacent space' },
  { type: 'rest', label: 'Rest', icon: Bed, description: 'Recover 1 Health and 1 Sanity' },
  { type: 'trade', label: 'Trade', icon: ArrowLeftRight, description: 'Exchange with another investigator here' },
  { type: 'prepare_travel', label: 'Prepare Travel', icon: Ticket, description: 'Acquire a Ship or Train ticket' },
  { type: 'acquire_assets', label: 'Acquire Assets', icon: ShoppingBag, description: 'Roll Influence to gain assets' },
  { type: 'component', label: 'Component Action', icon: Sparkles, description: 'Use a card ability' },
  { type: 'local_action', label: 'Local Action', icon: Building2, description: 'City-specific action' },
];

export function GameSession() {
  const { 
    state, 
    advancePhase, 
    goBackPhase,
    setActivePlayer, 
    performAction,
    setPlayerLocation,
    undoLastAction,
    canUndo,
    buildEncounterRequest,
    addNarrativeEvent,
    updatePlotTension,
    addPlotPoint,
    setNarratorVoice
  } = useGame();
  const { mapLocations, allEncounters, helpers } = useGameData();
  
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [isLocationPickerForTravel, setIsLocationPickerForTravel] = useState(false); // true = uses action, false = free move
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  
  // Encounter phase state
  const [showEncounterPicker, setShowEncounterPicker] = useState(false);
  const [selectedEncounterCategory, setSelectedEncounterCategory] = useState<string | null>(null);
  const [selectedCombatSubCategory, setSelectedCombatSubCategory] = useState<string | null>(null);
  const [selectedOtherWorldSubCategory, setSelectedOtherWorldSubCategory] = useState<string | null>(null);
  const [encounterSearch, setEncounterSearch] = useState('');
  const [selectedEncounter, setSelectedEncounter] = useState<{ 
    title: string; 
    content: string;
    type: EncounterType;
    subType?: string;
  } | null>(null);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [encounterResult, setEncounterResult] = useState<GenerateEncounterResponse | null>(null);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [isGeneratingEncounter, setIsGeneratingEncounter] = useState(false);

  const activePlayer = state.players[state.activePlayerIndex];

  // Get encounter card image based on encounter title
  const getEncounterCardImage = (title: string): string => {
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('africa')) return africaCard;
    if (titleLower.includes('america')) return americasCard;
    if (titleLower.includes('asia') || titleLower.includes('australia')) return asiaAustraliaCard;
    if (titleLower.includes('europe')) return europeCard;
    if (titleLower.includes('egypt')) return egyptCard;
    if (titleLower.includes('dreamland') || titleLower.includes('dream quest')) return dreamlandsCard;
    if (titleLower.includes('devastation')) return devastationCard;
    if (titleLower.includes('mountain')) return mountainCard;
    if (titleLower.includes('outpost')) return outpostCard;
    if (titleLower.includes('other world')) return otherWorldCard;
    if (titleLower.includes('moai') || titleLower.includes('statue')) return moaiCard;
    if (titleLower.includes('pyramid')) return pyramidsCard;
    if (titleLower.includes('moon')) return moonCard;
    if (titleLower.includes('key') && titleLower.includes('gate')) return keyGateCard;
    if (titleLower.includes('azathoth')) return azathothCard;
    if (titleLower.includes('city') || titleLower.includes('sea') || titleLower.includes('wilderness')) return generalCard;
    
    // Default to general card
    return generalCard;
  };

  const phaseLabels: Record<string, string> = {
    setup: 'Preparation',
    action: 'Action Phase',
    encounter: 'Encounter Phase',
    mythos: 'Mythos Phase',
    resolution: 'Resolution',
  };

  // Filter locations for the picker
  const filteredLocations = mapLocations.filter(loc => 
    loc.name.toLowerCase().includes(locationSearch.toLowerCase()) ||
    loc.id.toLowerCase().includes(locationSearch.toLowerCase())
  );

  const handleSelectLocation = (locationId: string) => {
    if (activePlayer) {
      if (isLocationPickerForTravel) {
        // Travel action - consumes an action point
        performAction(activePlayer.id, 'travel', {
          fromLocation: activePlayer.location,
          toLocation: locationId,
        });
      } else {
        // Free move - just update location (card effect, event, etc.)
        setPlayerLocation(activePlayer.id, locationId);
      }
    }
    setShowLocationPicker(false);
    setIsLocationPickerForTravel(false);
    setLocationSearch('');
  };

  // Open location picker for free move (tapping on location)
  const openLocationPickerFreeMove = () => {
    setIsLocationPickerForTravel(false);
    setShowLocationPicker(true);
  };

  const handlePerformAction = (actionType: ActionType) => {
    if (!activePlayer) return;
    
    if (actionType === 'travel') {
      setShowActionMenu(false);
      setIsLocationPickerForTravel(true); // This will consume an action
      setShowLocationPicker(true);
      return;
    }
    
    // For other actions, just perform them
    const details: Record<string, unknown> = {};
    
    if (actionType === 'prepare_travel') {
      // For now, default to train ticket
      details.ticketAcquired = 'train';
    }
    
    performAction(activePlayer.id, actionType, details);
    setShowActionMenu(false);
  };

  // Check if all players have used their actions
  const allActionsUsed = state.players.every(p => p.actionsRemaining === 0);

  // Filter encounters - research encounters are filtered to current Ancient One only
  const filteredEncounters = allEncounters.map(cat => {
    if (cat.category === 'research' && state.ancientOne) {
      // Filter research encounters to only show those for the current Ancient One
      const ancientOneName = state.ancientOne.title.toLowerCase();
      const filteredCards = cat.cards.filter(card => {
        // Check if card title or infobox.ao matches the Ancient One
        const cardAO = card.infobox?.ao?.toLowerCase() || '';
        const cardTitle = card.title.toLowerCase();
        return cardAO.includes(ancientOneName) || 
               cardTitle.includes(ancientOneName) ||
               ancientOneName.includes(cardAO);
      });
      return { ...cat, cards: filteredCards };
    }
    return cat;
  }).filter(cat => cat.cards.length > 0); // Remove empty categories

  return (
    <div className="min-h-dvh flex flex-col bg-void">
      {/* Header - Compact */}
      <header className="px-4 py-2 border-b border-obsidian/50 bg-abyss/50 sticky top-0 z-10 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4">
          {/* Home + Settings + Round/Phase */}
          <div className="flex items-center gap-3">
            <Link to="/" className="touch-target p-1">
              <Home className="w-5 h-5 text-parchment-dark hover:text-parchment transition-colors" />
            </Link>
            <button 
              onClick={() => setShowSettings(true)}
              className="touch-target p-1"
            >
              <Settings className="w-5 h-5 text-parchment-dark hover:text-parchment transition-colors" />
            </button>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-lg font-bold text-parchment-light">
                  Round {state.round}
                </span>
                <span className="font-accent text-xs text-eldritch-light">
                  {phaseLabels[state.phase]}
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
        
        {/* Active Player Selector (tabs) */}
        {state.phase === 'action' && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-eldritch-light" />
              <h2 className="font-accent text-sm text-parchment-dark">
                SELECT INVESTIGATOR
              </h2>
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-2">
              {state.players.map((player, idx) => (
                <button
                  key={player.id}
                  onClick={() => setActivePlayer(idx)}
                  className={`shrink-0 px-4 py-2 rounded-lg border transition-all ${
                    state.activePlayerIndex === idx
                      ? 'bg-eldritch border-eldritch-light text-parchment-light'
                      : 'bg-shadow/30 border-obsidian text-parchment-dark hover:border-eldritch-dark'
                  }`}
                >
                  <p className="font-display text-sm truncate max-w-[120px]">
                    {player.investigator?.title || player.name}
                  </p>
                  <p className={`font-accent text-xs mt-0.5 ${
                    player.actionsRemaining > 0 ? 'text-sickly-light' : 'text-blood-light'
                  }`}>
                    {player.actionsRemaining} actions left
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Active Player Details */}
        {activePlayer && state.phase === 'action' && (
          <section className="bg-shadow/50 rounded-lg p-4 border border-eldritch-dark">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-display text-xl text-parchment-light">
                  {activePlayer.investigator?.title || activePlayer.name}
                </h3>
                <button
                  onClick={openLocationPickerFreeMove}
                  className="flex items-center gap-1 mt-1 text-parchment-dark hover:text-eldritch-light transition-colors"
                >
                  <MapPin className="w-3 h-3" />
                  <span className="font-accent text-xs underline">{activePlayer.location}</span>
                </button>
              </div>
              
              {/* Stats */}
              <div className="flex gap-3 bg-abyss/50 rounded px-3 py-2">
                <div className="flex items-center gap-1">
                  <Heart className="w-4 h-4 text-blood-light" fill="currentColor" />
                  <span className="font-display text-lg text-parchment">{activePlayer.health}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Brain className="w-4 h-4 text-cosmic-light" fill="currentColor" />
                  <span className="font-display text-lg text-parchment">{activePlayer.sanity}</span>
                </div>
              </div>
            </div>
            
            {/* Actions Remaining */}
            <div className="flex items-center justify-between mb-4">
              <p className="font-accent text-sm text-parchment-dark">
                ACTIONS REMAINING
              </p>
              <div className="flex gap-2">
                {[...Array(2)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                      i < activePlayer.actionsRemaining
                        ? 'bg-eldritch border-eldritch-light'
                        : 'bg-obsidian/50 border-obsidian'
                    }`}
                  >
                    {i < activePlayer.actionsRemaining && (
                      <Zap className="w-4 h-4 text-parchment-light" />
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Tickets */}
            {(activePlayer.shipTickets > 0 || activePlayer.trainTickets > 0) && (
              <div className="flex gap-4 mb-4 text-xs">
                {activePlayer.shipTickets > 0 && (
                  <span className="font-accent text-parchment-dark">
                    🚢 Ship Tickets: {activePlayer.shipTickets}
                  </span>
                )}
                {activePlayer.trainTickets > 0 && (
                  <span className="font-accent text-parchment-dark">
                    🚂 Train Tickets: {activePlayer.trainTickets}
                  </span>
                )}
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex gap-3">
              {activePlayer.actionsRemaining > 0 ? (
                <button
                  onClick={() => setShowActionMenu(true)}
                  className="flex-1 py-3 bg-eldritch hover:bg-eldritch-light text-parchment-light font-display tracking-wide rounded flex items-center justify-center gap-2 transition-colors"
                >
                  Take Action
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <p className="flex-1 text-center font-body text-parchment-dark italic py-3">
                  No actions remaining
                </p>
              )}
              
              {/* Undo Button */}
              {canUndo && (
                <button
                  onClick={undoLastAction}
                  className="px-4 py-3 bg-shadow hover:bg-obsidian border border-obsidian hover:border-blood text-parchment-dark hover:text-blood-light font-display tracking-wide rounded flex items-center justify-center gap-2 transition-colors"
                  title="Undo last action"
                >
                  <Undo2 className="w-4 h-4" />
                  Undo
                </button>
              )}
            </div>
          </section>
        )}

        {/* Encounter Phase UI */}
        {state.phase === 'encounter' && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 text-cosmic-light" />
              <h2 className="font-accent text-sm text-parchment-dark">
                ENCOUNTER PHASE
              </h2>
            </div>
            
            {/* Investigator Selector */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
              {state.players.map((player, idx) => (
                <button
                  key={player.id}
                  onClick={() => setActivePlayer(idx)}
                  className={`shrink-0 px-4 py-2 rounded-lg border transition-all ${
                    state.activePlayerIndex === idx
                      ? 'bg-cosmic border-cosmic-light text-parchment-light'
                      : 'bg-shadow/30 border-obsidian text-parchment-dark hover:border-cosmic-light'
                  }`}
                >
                  <p className="font-display text-sm truncate max-w-[120px]">
                    {player.investigator?.title || player.name}
                  </p>
                </button>
              ))}
            </div>
            
            {/* Selected Investigator Info */}
            {activePlayer && (
              <div className="bg-shadow/50 rounded-lg p-4 border border-cosmic-light/30 mb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-display text-lg text-parchment-light">
                      {activePlayer.investigator?.title || activePlayer.name}
                    </h3>
                    <p className="font-accent text-xs text-parchment-dark flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {activePlayer.location}
                    </p>
                  </div>
                  <div className="flex gap-3 bg-abyss/50 rounded px-2 py-1">
                    <div className="flex items-center gap-1">
                      <Heart className="w-3 h-3 text-blood-light" fill="currentColor" />
                      <span className="font-display text-sm text-parchment">{activePlayer.health}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Brain className="w-3 h-3 text-cosmic-light" fill="currentColor" />
                      <span className="font-display text-sm text-parchment">{activePlayer.sanity}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Draw Encounter Button */}
            <button
              onClick={() => setShowEncounterPicker(true)}
              className="w-full py-4 bg-cosmic hover:bg-cosmic-light text-parchment-light font-display text-lg tracking-wide rounded flex items-center justify-center gap-2 transition-colors"
            >
              <FileText className="w-5 h-5" />
              Draw Encounter Card
            </button>
          </section>
        )}

        {/* All Players Summary (non-action phase or overview) */}
        {state.phase !== 'action' && state.phase !== 'encounter' && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-eldritch-light" />
              <h2 className="font-accent text-sm text-parchment-dark">
                INVESTIGATORS ({state.players.length})
              </h2>
            </div>

            <div className="grid gap-3">
              {state.players.map((player) => (
                <div
                  key={player.id}
                  className="bg-shadow/50 rounded-lg p-3 border border-obsidian/50 relative overflow-hidden"
                >
                  <div className="flex justify-between items-start relative z-10">
                    <div>
                      <p className="font-display text-parchment-light text-lg">
                        {player.investigator?.title || player.name}
                      </p>
                      <p className="font-accent text-xs text-parchment-dark mt-0.5">
                        {player.location}
                      </p>
                    </div>
                    
                    <div className="flex gap-3 bg-abyss/50 rounded px-2 py-1">
                      <div className="flex items-center gap-1">
                        <Heart className="w-3 h-3 text-blood-light" fill="currentColor" />
                        <span className="font-display text-sm text-parchment">{player.health}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Brain className="w-3 h-3 text-cosmic-light" fill="currentColor" />
                        <span className="font-display text-sm text-parchment">{player.sanity}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-eldritch-dark/10 to-transparent pointer-events-none" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Narrative log preview */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Scroll className="w-4 h-4 text-eldritch-light" />
            <h2 className="font-accent text-sm text-parchment-dark">
              RECENT EVENTS
            </h2>
          </div>

          <div className="bg-shadow/30 rounded p-4 border border-obsidian/50 max-h-48 overflow-y-auto">
            {state.narrativeLog.length === 0 ? (
              <p className="font-body text-parchment-dark italic text-sm">
                The story has yet to begin...
              </p>
            ) : (
              <div className="space-y-4">
                {state.narrativeLog.slice().reverse().slice(0, 3).map((event) => (
                  <div key={event.id} className="border-l-2 border-eldritch-dark pl-3">
                    <p className="font-display text-sm text-parchment-light mb-1">
                      {event.title}
                    </p>
                    <p className="font-body text-xs text-parchment-dark line-clamp-3">
                      {event.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Bottom Action Bar */}
      <div className="p-4 border-t border-obsidian/50 space-y-3 bg-void z-10">
        {state.phase === 'action' ? (
          <>
            {allActionsUsed && (
              <p className="text-center font-body text-sickly-light text-sm mb-2">
                All investigators have used their actions
              </p>
            )}
            <button
              onClick={() => advancePhase()}
              className="touch-target w-full flex items-center justify-center gap-2 px-4 py-4 bg-cosmic hover:bg-cosmic-light text-parchment-light font-display text-lg tracking-wide rounded transition-colors"
            >
              <Eye className="w-5 h-5" />
              Encounter Phase
            </button>
          </>
        ) : (
          <>
            {/* Go Back button - only show if not in action phase */}
            <button
              onClick={() => goBackPhase()}
              className="touch-target w-full flex items-center justify-center gap-2 px-4 py-3 bg-shadow hover:bg-obsidian text-parchment-dark hover:text-parchment border border-obsidian hover:border-eldritch-dark font-display text-sm tracking-wide rounded transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Go Back to {state.phase === 'encounter' ? 'Action' : state.phase === 'mythos' ? 'Encounter' : 'Mythos'} Phase
            </button>
            
            <button
              onClick={() => advancePhase()}
              className="touch-target w-full flex items-center justify-center gap-2 px-4 py-4 bg-eldritch hover:bg-eldritch-light text-parchment-light font-display text-lg tracking-wide rounded transition-colors"
            >
              <Zap className="w-5 h-5" />
              {state.phase === 'encounter' ? 'Mythos Phase' : state.phase === 'mythos' ? 'Resolution' : 'Next Round'}
            </button>
          </>
        )}
      </div>

      {/* Action Menu Modal */}
      {showActionMenu && activePlayer && (
        <div className="fixed inset-0 z-50 bg-void/95 backdrop-blur-sm flex flex-col">
          <div className="p-4 border-b border-obsidian flex items-center justify-between">
            <h2 className="font-display text-xl text-parchment-light">Choose Action</h2>
            <button
              onClick={() => setShowActionMenu(false)}
              className="touch-target p-2 -m-2"
            >
              <X className="w-6 h-6 text-parchment-dark" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {ACTIONS.map(({ type, label, icon: Icon, description }) => (
              <button
                key={type}
                onClick={() => handlePerformAction(type)}
                className="w-full text-left bg-shadow/50 hover:bg-shadow border border-obsidian hover:border-eldritch rounded-lg p-4 transition-all flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-eldritch-dark flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-eldritch-light" />
                </div>
                <div>
                  <h3 className="font-display text-lg text-parchment-light">
                    {label}
                  </h3>
                  <p className="font-body text-sm text-parchment-dark">
                    {description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Location Picker Modal */}
      {showLocationPicker && (
        <div className="fixed inset-0 z-50 bg-void/95 backdrop-blur-sm flex flex-col">
          <div className="p-4 border-b border-obsidian">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="font-display text-xl text-parchment-light">Select Location</h2>
                <p className={`font-accent text-xs ${isLocationPickerForTravel ? 'text-eldritch-light' : 'text-parchment-dark'}`}>
                  {isLocationPickerForTravel ? 'Travel Action (uses 1 action)' : 'Free Move (no action used)'}
                </p>
              </div>
              <button
                onClick={() => { setShowLocationPicker(false); setIsLocationPickerForTravel(false); setLocationSearch(''); }}
                className="touch-target p-2 -m-2"
              >
                <X className="w-6 h-6 text-parchment-dark" />
              </button>
            </div>
            
            <input
              type="text"
              placeholder="Search locations..."
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              className="w-full bg-shadow border border-obsidian rounded px-4 py-3 text-parchment placeholder:text-parchment-dark/50 focus:outline-none focus:border-eldritch"
              autoFocus
            />
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {filteredLocations.map((location) => (
              <button
                key={location.id}
                onClick={() => handleSelectLocation(location.id)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                  activePlayer?.location === location.id
                    ? 'bg-eldritch/30 border-eldritch-light'
                    : 'bg-shadow/30 border-obsidian hover:border-eldritch'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-display text-parchment-light">
                      {location.name}
                    </p>
                    {location.realWorld && location.id !== location.name && (
                      <p className="font-body text-xs text-parchment-dark">
                        {location.realWorld}
                      </p>
                    )}
                  </div>
                  <span className={`font-accent text-xs px-2 py-1 rounded ${
                    location.type === 'City' ? 'bg-gold/20 text-gold-light' :
                    location.type === 'Sea' ? 'bg-cosmic/30 text-cosmic-light' :
                    'bg-sickly/20 text-sickly-light'
                  }`}>
                    {location.type}
                  </span>
                </div>
                {activePlayer?.location === location.id && (
                  <p className="font-accent text-xs text-eldritch-light mt-1">
                    Current Location
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Encounter Picker Modal */}
      {showEncounterPicker && (
        <div className="fixed inset-0 z-50 bg-void/95 backdrop-blur-sm flex flex-col">
          <div className="p-4 border-b border-obsidian">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-xl text-parchment-light">Select Encounter</h2>
                <p className="font-accent text-xs text-parchment-dark">
                  {selectedCombatSubCategory || selectedOtherWorldSubCategory 
                    ? 'Choose a card' 
                    : selectedEncounterCategory 
                    ? 'Choose a sub-category' 
                    : 'Choose a category'}
                </p>
              </div>
              <button
                onClick={() => { 
                  setShowEncounterPicker(false); 
                  setSelectedEncounterCategory(null);
                  setSelectedCombatSubCategory(null);
                  setSelectedOtherWorldSubCategory(null);
                  setEncounterSearch('');
                }}
                className="touch-target p-2 -m-2"
              >
                <X className="w-6 h-6 text-parchment-dark" />
              </button>
            </div>
            
            {selectedEncounterCategory && (
              <div className="flex gap-2">
                <button
                  onClick={() => { 
                    if (selectedCombatSubCategory) {
                      setSelectedCombatSubCategory(null);
                    } else if (selectedOtherWorldSubCategory) {
                      setSelectedOtherWorldSubCategory(null);
                    } else {
                      setSelectedEncounterCategory(null); 
                    }
                    setEncounterSearch('');
                  }}
                  className="px-3 py-1 bg-shadow border border-obsidian rounded text-parchment-dark text-sm flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-parchment-dark" />
                  <input
                    type="text"
                    placeholder="Search encounters..."
                    value={encounterSearch}
                    onChange={(e) => setEncounterSearch(e.target.value)}
                    className="w-full bg-shadow border border-obsidian rounded pl-10 pr-4 py-2 text-parchment placeholder:text-parchment-dark/50 focus:outline-none focus:border-cosmic text-sm"
                  />
                </div>
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {!selectedEncounterCategory ? (
              // Category Selection
              filteredEncounters.map((cat) => (
                <button
                  key={cat.category}
                  onClick={() => {
                    // General encounters - direct select with player location
                    if (cat.category === 'general') {
                      setSelectedEncounter({
                        title: `General Encounter`,
                        content: `General encounter at ${activePlayer?.location || 'unknown location'}.`,
                        type: 'general',
                        subType: activePlayer?.location,
                      });
                      setShowEncounterPicker(false);
                      setSelectedEncounterCategory(null);
                      setEncounterSearch('');
                      return;
                    }
                    // Research encounters - direct select with Ancient One name
                    if (cat.category === 'research') {
                      setSelectedEncounter({
                        title: `${state.ancientOne?.title || 'Ancient One'} Research Encounter`,
                        content: 'Research encounter for the current threat.',
                        type: 'research',
                        subType: state.ancientOne?.title,
                      });
                      setShowEncounterPicker(false);
                      setSelectedEncounterCategory(null);
                      setEncounterSearch('');
                      return;
                    }
                    // Other World encounters - direct select
                    if (cat.category === 'otherWorld') {
                      setSelectedEncounter({
                        title: 'Other World Encounter',
                        content: 'An encounter from beyond the veil of reality.',
                        type: 'other_world',
                      });
                      setShowEncounterPicker(false);
                      setSelectedEncounterCategory(null);
                      setEncounterSearch('');
                      return;
                    }
                    // Expedition encounters - direct select with player location
                    if (cat.category === 'expedition') {
                      setSelectedEncounter({
                        title: `Expedition Encounter`,
                        content: `Expedition at ${activePlayer?.location || 'unknown location'}.`,
                        type: 'expedition',
                        subType: activePlayer?.location,
                      });
                      setShowEncounterPicker(false);
                      setSelectedEncounterCategory(null);
                      setEncounterSearch('');
                      return;
                    }
                    // Location encounters - direct select with player location
                    if (cat.category === 'locationRegion') {
                      setSelectedEncounter({
                        title: `Location Encounter`,
                        content: `Location encounter at ${activePlayer?.location || 'unknown location'}.`,
                        type: 'location_region',
                        subType: activePlayer?.location,
                      });
                      setShowEncounterPicker(false);
                      setSelectedEncounterCategory(null);
                      setEncounterSearch('');
                      return;
                    }
                    // If only 1 card and not combat (which has sub-categories), select it directly
                    if (cat.cards.length === 1 && cat.category !== 'combat') {
                      const card = cat.cards[0];
                      const content = helpers.stripWikiMarkup(card.fullText || card.sections?.[''] || 'No encounter text available.');
                      // Map category to encounter type
                      const typeMap: Record<string, EncounterType> = {
                        general: 'general',
                        locationRegion: 'location_region',
                        research: 'research',
                        otherWorld: 'other_world',
                        expedition: 'expedition',
                        devastation: 'devastation',
                        combat: 'combat',
                        special: 'special',
                      };
                      setSelectedEncounter({
                        title: card.title,
                        content: content.slice(0, 2000),
                        type: typeMap[cat.category] || 'general',
                        subType: card.title,
                      });
                      setShowEncounterPicker(false);
                    } else {
                      setSelectedEncounterCategory(cat.category);
                    }
                  }}
                  className="w-full text-left bg-shadow/30 hover:bg-shadow border border-obsidian hover:border-cosmic rounded-lg p-4 transition-all flex items-center justify-between"
                >
                  <div>
                    <h3 className="font-display text-lg text-parchment-light">
                      {cat.label}
                    </h3>
                    {/* Hide card count for direct select categories */}
                    {cat.cards.length > 1 && !['general', 'research', 'otherWorld', 'expedition', 'locationRegion'].includes(cat.category) && (
                      <p className="font-accent text-xs text-parchment-dark">
                        {cat.cards.length} cards
                      </p>
                    )}
                  </div>
                  {/* Hide chevron for direct select categories */}
                  {cat.cards.length > 1 && !['general', 'research', 'otherWorld', 'expedition', 'locationRegion'].includes(cat.category) && <ChevronRight className="w-5 h-5 text-parchment-dark" />}
                </button>
              ))
            ) : (
              // Card Selection (with combat sub-category support)
              (() => {
                const category = filteredEncounters.find(c => c.category === selectedEncounterCategory);
                if (!category) return null;
                
                // Handle combat sub-categories
                if (selectedEncounterCategory === 'combat' && !selectedCombatSubCategory) {
                  // Show sub-category selection (Monsters, Epic Monsters, Ancient Ones)
                  return category.cards.map((subCat) => (
                    <button
                      key={subCat.pageId}
                      onClick={() => setSelectedCombatSubCategory(subCat.title)}
                      className="w-full text-left bg-shadow/30 hover:bg-shadow border border-obsidian hover:border-cosmic rounded-lg p-4 transition-all flex items-center justify-between"
                    >
                      <div>
                        <h3 className="font-display text-lg text-parchment-light">
                          {subCat.title}
                        </h3>
                        <p className="font-accent text-xs text-parchment-dark">
                          {subCat.fullText}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-parchment-dark" />
                    </button>
                  ));
                }
                
                // Handle other world sub-categories (location selection)
                if (selectedEncounterCategory === 'otherWorld' && !selectedOtherWorldSubCategory) {
                  // Show other world location selection
                  return category.cards.map((location) => (
                    <button
                      key={location.pageId}
                      onClick={() => setSelectedOtherWorldSubCategory(location.title)}
                      className="w-full text-left bg-shadow/30 hover:bg-shadow border border-obsidian hover:border-cosmic rounded-lg p-4 transition-all flex items-center justify-between"
                    >
                      <div>
                        <h3 className="font-display text-lg text-parchment-light">
                          {location.title}
                        </h3>
                      </div>
                      <ChevronRight className="w-5 h-5 text-parchment-dark" />
                    </button>
                  ));
                }
                
                // Get the actual cards to display
                let cardsToShow = category.cards;
                
                // If combat with sub-category selected, get monsters from subCategories
                if (selectedEncounterCategory === 'combat' && selectedCombatSubCategory && category.subCategories) {
                  cardsToShow = category.subCategories[selectedCombatSubCategory] || [];
                }
                
                // If other world with sub-category selected, get location encounters from subCategories
                if (selectedEncounterCategory === 'otherWorld' && selectedOtherWorldSubCategory && category.subCategories) {
                  cardsToShow = category.subCategories[selectedOtherWorldSubCategory] || [];
                }
                
                const filteredCards = encounterSearch
                  ? cardsToShow.filter(card => 
                      card.title.toLowerCase().includes(encounterSearch.toLowerCase()) ||
                      card.fullText?.toLowerCase().includes(encounterSearch.toLowerCase())
                    )
                  : cardsToShow;
                
                return filteredCards.map((card) => (
                  <button
                    key={card.pageId}
                    onClick={() => {
                      // Extract encounter text from the card
                      const content = helpers.stripWikiMarkup(card.fullText || card.sections?.[''] || 'No encounter text available.');
                      // Map category to encounter type
                      const typeMap: Record<string, EncounterType> = {
                        general: 'general',
                        locationRegion: 'location_region',
                        research: 'research',
                        otherWorld: 'other_world',
                        expedition: 'expedition',
                        devastation: 'devastation',
                        combat: 'combat',
                        special: 'special',
                      };
                      setSelectedEncounter({
                        title: card.title,
                        content: content.slice(0, 2000),
                        type: typeMap[selectedEncounterCategory || ''] || 'general',
                        subType: selectedCombatSubCategory || selectedOtherWorldSubCategory || card.title,
                      });
                      setShowEncounterPicker(false);
                      setSelectedEncounterCategory(null);
                      setSelectedCombatSubCategory(null);
                      setSelectedOtherWorldSubCategory(null);
                      setEncounterSearch('');
                    }}
                    className="w-full text-left bg-shadow/30 hover:bg-shadow border border-obsidian hover:border-cosmic rounded-lg p-3 transition-all"
                  >
                    <h3 className="font-display text-base text-parchment-light">
                      {card.title}
                    </h3>
                  </button>
                ));
              })()
            )}
          </div>
        </div>
      )}

      {/* Encounter Resolution Screen */}
      {selectedEncounter && !showEncounterPicker && (
        <div className="fixed inset-0 z-50 bg-void flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-obsidian/50 flex items-center justify-between">
            <button
              onClick={() => {
                if (isCardFlipped) {
                  setIsCardFlipped(false);
                  setEncounterResult(null);
                } else {
                  setSelectedEncounter(null);
                }
              }}
              className="flex items-center gap-2 text-parchment-dark hover:text-parchment transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="font-display text-sm">
                {isCardFlipped ? 'Back' : 'Change Encounter'}
              </span>
            </button>
            <button
              onClick={() => {
                setSelectedEncounter(null);
                setIsCardFlipped(false);
                setEncounterResult(null);
              }}
              className="text-parchment-dark hover:text-parchment p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Card Area */}
          <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-hidden">
            {/* Active Investigator */}
            {activePlayer && (
              <p className="font-accent text-xs text-parchment-dark mb-2">
                {activePlayer.investigator?.title || activePlayer.name} • {activePlayer.location}
              </p>
            )}

            {/* Flip Card Container */}
            <div 
              className="relative w-[90vw] max-w-md mb-4"
              style={{ perspective: '1000px', aspectRatio: '2.5/3.5' }}
            >
              <div 
                className={`relative w-full h-full transition-transform duration-700 ease-in-out`}
                style={{ 
                  transformStyle: 'preserve-3d',
                  transform: isCardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                }}
              >
                {/* Card Front (Face Down) - Shows encounter card art */}
                <div 
                  className="absolute inset-0 rounded-xl border-2 border-eldritch overflow-hidden"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  {/* Card Art Background */}
                  <img 
                    src={getEncounterCardImage(selectedEncounter.title)}
                    alt={selectedEncounter.title}
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                  
                  {/* Dark overlay at bottom for text */}
                  <div className="absolute inset-0 bg-gradient-to-t from-void via-void/60 to-transparent" />
                  
                  {/* Content overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-end p-6">
                    {/* Encounter Type */}
                    <h3 className="font-display text-xl text-parchment-light text-center mb-1 drop-shadow-lg">
                      {selectedEncounter.title}
                    </h3>
                    <p className="font-accent text-xs text-parchment text-center uppercase tracking-widest drop-shadow-lg">
                      Encounter
                    </p>
                  </div>
                </div>

                {/* Card Back (Result) */}
                <div 
                  className="absolute inset-0 rounded-xl border-2 border-cosmic bg-gradient-to-br from-abyss via-shadow to-cosmic-light/20 flex flex-col p-4 overflow-hidden"
                  style={{ 
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)'
                  }}
                >
                  <h3 className="font-display text-lg text-parchment-light text-center mb-2 shrink-0">
                    {encounterResult?.encounter.title || selectedEncounter.title}
                  </h3>
                  
                  <div className="flex-1 overflow-y-auto space-y-3">
                    {(() => {
                      // Find current node
                      const currentNode = encounterResult?.nodes?.find(n => n.id === currentNodeId);
                      
                      if (!encounterResult && isGeneratingEncounter) {
                        return (
                          <div className="flex flex-col items-center justify-center h-full space-y-4">
                            <Loader2 className="w-8 h-8 animate-spin text-eldritch-light" />
                            <p className="font-accent text-sm text-parchment-dark animate-pulse text-center">
                              Consulting the archives...
                            </p>
                          </div>
                        );
                      }

                      if (!currentNode) {
                        return (
                          <p className="font-body text-sm text-parchment-dark leading-relaxed">
                            {encounterResult ? "Encounter complete." : "Waiting for encounter..."}
                          </p>
                        );
                      }

                      return (
                        <div className="space-y-4 animate-in fade-in duration-500">
                          {/* Encounter setup (shown once, before the first node) */}
                          {currentNode.id === encounterResult.encounter.startingNodeId &&
                            encounterResult.encounter.narrative &&
                            encounterResult.encounter.narrative.trim() &&
                            encounterResult.encounter.narrative.trim() !== currentNode.text.trim() && (
                              <div className="bg-abyss/40 rounded p-3 border border-cosmic-light/20">
                                <p className="font-accent text-xs text-parchment-dark uppercase tracking-wide mb-1">
                                  Setup
                                </p>
                                <p className="font-body text-sm text-parchment leading-relaxed whitespace-pre-line">
                                  {encounterResult.encounter.narrative}
                                </p>
                              </div>
                            )}

                          {/* Narrative */}
                          <p className="font-body text-sm text-parchment leading-relaxed whitespace-pre-line">
                            {currentNode.text}
                          </p>
                          
                          {/* Flavor text only on first node */}
                          {currentNode.id === encounterResult.encounter.startingNodeId && encounterResult.encounter.flavorText && (
                            <p className="font-accent text-xs text-parchment-dark italic border-l-2 border-cosmic-light/30 pl-2">
                              {encounterResult.encounter.flavorText}
                            </p>
                          )}
                          
                          {/* Decisions */}
                          {currentNode.type === 'decision' && currentNode.choices && (
                            <div className="space-y-2 pt-2">
                              <p className="font-accent text-xs text-parchment-dark uppercase tracking-wide mb-2">
                                Make a Choice
                              </p>
                              {currentNode.choices.map(choice => (
                                <button 
                                  key={choice.id}
                                  onClick={() => setCurrentNodeId(choice.nextNodeId)}
                                  className="w-full text-left bg-shadow/50 hover:bg-eldritch/30 border border-obsidian hover:border-eldritch rounded p-3 transition-colors group"
                                >
                                  <div className="flex items-center justify-between">
                                    <p className="font-display text-sm text-parchment-light group-hover:text-parchment transition-colors">
                                      {choice.label}
                                    </p>
                                    <ChevronRight className="w-4 h-4 text-parchment-dark group-hover:text-parchment opacity-0 group-hover:opacity-100 transition-all" />
                                  </div>
                                  {choice.description && (
                                    <p className="font-body text-xs text-parchment-dark mt-1">
                                      {choice.description}
                                    </p>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Skill Tests */}
                          {currentNode.type === 'test' && currentNode.test && (
                            <div className="bg-obsidian/30 rounded p-4 border border-obsidian text-center mt-2">
                              <p className="font-display text-parchment-light mb-1">
                                Test {currentNode.test.skill}
                              </p>
                              <p className="font-accent text-xs text-parchment-dark mb-3">
                                Difficulty {currentNode.test.difficulty > 0 ? '+' : ''}{currentNode.test.difficulty}
                              </p>
                              
                              <div className="grid grid-cols-2 gap-3">
                                <button
                                  onClick={() => setCurrentNodeId(currentNode.test!.passNodeId)}
                                  className="px-4 py-3 bg-green-900/30 hover:bg-green-800/40 border border-green-800/50 hover:border-green-700 text-green-100 rounded transition-colors flex flex-col items-center"
                                >
                                  <span className="font-display text-lg">Pass</span>
                                  <span className="text-[10px] opacity-70">Success</span>
                                </button>
                                <button
                                  onClick={() => setCurrentNodeId(currentNode.test!.failNodeId)}
                                  className="px-4 py-3 bg-red-900/30 hover:bg-red-800/40 border border-red-800/50 hover:border-red-700 text-red-100 rounded transition-colors flex flex-col items-center"
                                >
                                  <span className="font-display text-lg">Fail</span>
                                  <span className="text-[10px] opacity-70">Failure</span>
                                </button>
                              </div>
                              <p className="text-[10px] text-parchment-dark mt-2 italic">
                                (Resolve this test using your real-life dice, then choose Pass/Fail.)
                              </p>
                            </div>
                          )}

                          {/* Outcome Effects */}
                          {currentNode.type === 'outcome' && currentNode.effects && (
                             <div className="mt-4 p-3 bg-eldritch/10 rounded border border-eldritch/20 animate-in slide-in-from-bottom-2">
                                <p className="font-display text-sm text-parchment-light mb-2 flex items-center gap-2">
                                  <Sparkles className="w-3 h-3 text-gold" />
                                  Consequences
                                </p>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                   {currentNode.effects.healthChange ? (
                                     <div className={`flex items-center gap-1 ${currentNode.effects.healthChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                       <Heart className="w-3 h-3" />
                                       {currentNode.effects.healthChange > 0 ? '+' : ''}{currentNode.effects.healthChange} Health
                                     </div>
                                   ) : null}
                                   {currentNode.effects.sanityChange ? (
                                     <div className={`flex items-center gap-1 ${currentNode.effects.sanityChange > 0 ? 'text-blue-400' : 'text-red-400'}`}>
                                       <Brain className="w-3 h-3" />
                                       {currentNode.effects.sanityChange > 0 ? '+' : ''}{currentNode.effects.sanityChange} Sanity
                                     </div>
                                   ) : null}
                                   {currentNode.effects.cluesGained ? (
                                     <div className="flex items-center gap-1 text-gold-400">
                                       <Search className="w-3 h-3" />
                                       +{currentNode.effects.cluesGained} Clue(s)
                                     </div>
                                   ) : null}
                                   {currentNode.effects.doomChange ? (
                                     <div className="flex items-center gap-1 text-purple-400">
                                       <Zap className="w-3 h-3" />
                                       {currentNode.effects.doomChange > 0 ? '+' : ''}{currentNode.effects.doomChange} Doom
                                     </div>
                                   ) : null}
                                </div>
                                {(!currentNode.effects.healthChange && !currentNode.effects.sanityChange && !currentNode.effects.cluesGained && !currentNode.effects.doomChange) && (
                                  <p className="text-xs text-parchment-dark italic">No mechanical effects.</p>
                                )}
                             </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Button */}
            {!isCardFlipped ? (
              <button
                onClick={async () => {
                  if (!activePlayer || !selectedEncounter) return;
                  
                  setIsGeneratingEncounter(true);
                  
                  // Build the encounter request with full context
                  const encounterRequest = buildEncounterRequest({
                    type: selectedEncounter.type,
                    subType: selectedEncounter.subType,
                    investigatorId: activePlayer.id,
                    location: activePlayer.location,
                    selectedCard: {
                      title: selectedEncounter.title,
                      originalText: selectedEncounter.content,
                    },
                  });
                  
                  if (encounterRequest) {
                    try {
                      // Call the n8n encounter generation workflow
                      const response = await generateEncounter(encounterRequest);
                      setEncounterResult(response);
                      setCurrentNodeId(response.encounter.startingNodeId);
                      
                      // Update tension if the encounter suggests it
                      if (response.tensionChange) {
                        updatePlotTension((state.plotContext?.currentTension || 3) + response.tensionChange);
                      }
                      
                      // Add any new plot points
                      if (response.newPlotPoints) {
                        response.newPlotPoints.forEach(point => addPlotPoint(point));
                      }
                    } catch (error) {
                      console.error('Failed to generate encounter:', error);
                      // Fallback handled by API
                    }
                  }
                  
                  setIsGeneratingEncounter(false);
                  setIsCardFlipped(true);
                }}
                disabled={isGeneratingEncounter}
                className="w-full max-w-xs py-4 bg-eldritch hover:bg-eldritch-light disabled:bg-eldritch/50 text-parchment-light font-display text-lg tracking-wide rounded-lg flex items-center justify-center gap-3 transition-colors shadow-lg shadow-eldritch/30"
              >
                {isGeneratingEncounter ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Resolve Encounter
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={() => {
                  // Log the encounter to narrative
                  if (encounterResult) {
                    addNarrativeEvent({
                      type: 'encounter',
                      title: encounterResult.encounter.title,
                      content: encounterResult.encounter.narrative,
                      playerIds: activePlayer ? [activePlayer.id] : undefined,
                    });
                  }
                  
                  setSelectedEncounter(null);
                  setIsCardFlipped(false);
                  setEncounterResult(null);
                  setCurrentNodeId(null);
                }}
                disabled={encounterResult ? encounterResult.nodes.find(n => n.id === currentNodeId)?.type !== 'outcome' : false}
                className={`w-full max-w-xs py-4 font-display text-lg tracking-wide rounded-lg flex items-center justify-center gap-3 transition-colors ${
                  encounterResult && encounterResult.nodes.find(n => n.id === currentNodeId)?.type !== 'outcome'
                    ? 'bg-obsidian/50 text-parchment-dark cursor-not-allowed opacity-50'
                    : 'bg-cosmic hover:bg-cosmic-light text-parchment-light'
                }`}
              >
                <Check className="w-5 h-5" />
                Complete Encounter
              </button>
            )}
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-void/95 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-shadow/95 rounded-lg border border-obsidian overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-obsidian flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-eldritch-light" />
                <h2 className="font-display text-lg text-parchment-light">Settings</h2>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="touch-target p-1 text-parchment-dark hover:text-parchment"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-4 space-y-6">
              {/* Narrator Voice Selection */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Volume2 className="w-4 h-4 text-eldritch-light" />
                  <h3 className="font-accent text-sm text-parchment-light uppercase tracking-wide">
                    Narrator Voice
                  </h3>
                </div>
                <p className="font-body text-xs text-parchment-dark mb-3">
                  Select the voice for AI narration (ElevenLabs)
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {NARRATOR_VOICES.map((voice) => (
                    <div
                      key={voice.id}
                      className={`flex items-center gap-2 p-3 rounded border transition-all ${
                        state.narratorVoiceId === voice.id
                          ? 'bg-eldritch-dark/50 border-eldritch text-parchment-light'
                          : 'bg-void/30 border-obsidian/50 text-parchment-dark hover:border-eldritch-dark'
                      }`}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playVoiceSample(voice.sampleFile);
                        }}
                        className="shrink-0 w-8 h-8 rounded-full bg-eldritch/50 hover:bg-eldritch flex items-center justify-center transition-colors"
                        title="Play sample"
                      >
                        <Play className="w-4 h-4 text-parchment-light ml-0.5" />
                      </button>
                      <button
                        onClick={() => setNarratorVoice(voice.id)}
                        className="flex-1 text-left"
                      >
                        <p className="font-display text-sm">{voice.name}</p>
                        <p className="font-body text-xs opacity-70">{voice.description}</p>
                      </button>
                      {state.narratorVoiceId === voice.id && (
                        <Check className="w-4 h-4 text-eldritch-light shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </div>
            
            {/* Footer */}
            <div className="px-4 py-3 border-t border-obsidian">
              <button
                onClick={() => setShowSettings(false)}
                className="w-full py-2 bg-eldritch hover:bg-eldritch-light text-parchment-light font-display rounded transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
