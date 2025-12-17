import { useState } from 'react';
import { Link } from 'react-router-dom';
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
  Search
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { useGameData } from '../hooks/useGameData';
import type { ActionType } from '../types';

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
    canUndo
  } = useGame();
  const { mapLocations, allEncounters, helpers } = useGameData();
  
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [isLocationPickerForTravel, setIsLocationPickerForTravel] = useState(false); // true = uses action, false = free move
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  
  // Encounter phase state
  const [showEncounterPicker, setShowEncounterPicker] = useState(false);
  const [selectedEncounterCategory, setSelectedEncounterCategory] = useState<string | null>(null);
  const [selectedCombatSubCategory, setSelectedCombatSubCategory] = useState<string | null>(null);
  const [encounterSearch, setEncounterSearch] = useState('');
  const [selectedEncounter, setSelectedEncounter] = useState<{ title: string; content: string } | null>(null);

  const activePlayer = state.players[state.activePlayerIndex];

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
          {/* Home + Round/Phase */}
          <div className="flex items-center gap-3">
            <Link to="/" className="touch-target p-1">
              <Home className="w-5 h-5 text-parchment-dark hover:text-parchment transition-colors" />
            </Link>
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
            
            {/* Currently Selected Encounter Display */}
            {selectedEncounter && (
              <div className="mt-4 bg-shadow/30 rounded-lg p-3 border border-obsidian flex items-center justify-between">
                <h3 className="font-display text-base text-parchment-light">
                  {selectedEncounter.title}
                </h3>
                <button
                  onClick={() => setSelectedEncounter(null)}
                  className="text-parchment-dark hover:text-parchment p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
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
                  {selectedEncounterCategory ? 'Choose a card' : 'Choose a category'}
                </p>
              </div>
              <button
                onClick={() => { 
                  setShowEncounterPicker(false); 
                  setSelectedEncounterCategory(null);
                  setSelectedCombatSubCategory(null);
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
                    // If only 1 card and not combat (which has sub-categories), select it directly
                    if (cat.cards.length === 1 && cat.category !== 'combat') {
                      const card = cat.cards[0];
                      const content = helpers.stripWikiMarkup(card.fullText || card.sections?.[''] || 'No encounter text available.');
                      setSelectedEncounter({
                        title: card.title,
                        content: content.slice(0, 2000),
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
                    {cat.cards.length > 1 && (
                      <p className="font-accent text-xs text-parchment-dark">
                        {cat.cards.length} cards
                      </p>
                    )}
                  </div>
                  {cat.cards.length > 1 && <ChevronRight className="w-5 h-5 text-parchment-dark" />}
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
                
                // Get the actual cards to display
                let cardsToShow = category.cards;
                
                // If combat with sub-category selected, get monsters from subCategories
                if (selectedEncounterCategory === 'combat' && selectedCombatSubCategory && category.subCategories) {
                  cardsToShow = category.subCategories[selectedCombatSubCategory] || [];
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
                      setSelectedEncounter({
                        title: card.title,
                        content: content.slice(0, 2000), // Limit length
                      });
                      setShowEncounterPicker(false);
                      setSelectedEncounterCategory(null);
                      setSelectedCombatSubCategory(null);
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
    </div>
  );
}
