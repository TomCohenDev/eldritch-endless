import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Minus, 
  Plus, 
  Skull, 
  ArrowRight, 
  Search,
  Check,
  User,
  ArrowLeft
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { useGameData } from '../hooks/useGameData';
import type { AncientOnePage, WikiPage } from '../types';

type SetupStep = 'count' | 'ancientOne' | 'investigators' | 'summary';

export function GameSetup() {
  const navigate = useNavigate();
  const { 
    state, 
    startNewGame, 
    setAncientOne, 
    setPlayerInvestigator, 
    confirmSetup 
  } = useGame();
  
  const { ancientOnes, investigators, helpers, loading } = useGameData();
  
  const [step, setStep] = useState<SetupStep>('count');
  const [playerCount, setPlayerCount] = useState(2);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPlayerIndex, setEditingPlayerIndex] = useState<number | null>(null);

  // --- Step 1: Player Count Handlers ---
  const handleStartSetup = () => {
    startNewGame(playerCount);
    setStep('ancientOne');
  };

  // --- Step 2: Ancient One Handlers ---
  const filteredAncientOnes = useMemo(() => {
    // Show only main board ancient ones (no side board required)
    const byBoard = ancientOnes.filter((ao: AncientOnePage) => !ao.setup?.requiresSideBoard);

    return byBoard;
  }, [ancientOnes]);

  const handleSelectAncientOne = (ao: AncientOnePage) => {
    setAncientOne(ao);
    setStep('investigators');
  };

  // --- Step 3: Investigator Handlers ---
  const filteredInvestigators = useMemo(() => {
    if (!searchQuery) return investigators;
    return investigators.filter(inv => 
      inv.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [investigators, searchQuery]);

  const handleSelectInvestigator = (inv: WikiPage) => {
    if (editingPlayerIndex !== null) {
      setPlayerInvestigator(editingPlayerIndex, inv);
      setEditingPlayerIndex(null);
      setSearchQuery('');
    }
  };

  const getUnassignedPlayers = () => {
    return state.players.filter(p => !p.investigator).length;
  };

  const handleFinishSetup = () => {
    confirmSetup();
    navigate('/game');
  };

  // --- Render Functions ---

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-void">
        <p className="font-display text-parchment animate-pulse">Opening the Tome...</p>
      </div>
    );
  }

  const renderStepCount = () => (
    <div className="flex flex-col gap-8 max-w-md mx-auto w-full animate-fade-in">
      <section className="bg-shadow/50 rounded-lg p-6 border border-obsidian">
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-5 h-5 text-eldritch-light" />
          <h2 className="font-display text-xl text-parchment-light">
            Investigators
          </h2>
        </div>

        <div className="flex items-center justify-center gap-6">
          <button
            onClick={() => setPlayerCount(p => Math.max(1, p - 1))}
            disabled={playerCount <= 1}
            className="touch-target w-12 h-12 flex items-center justify-center rounded-full bg-obsidian hover:bg-eldritch-dark disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Minus className="w-6 h-6 text-parchment" />
          </button>

          <div className="text-center min-w-[80px]">
            <span className="font-display text-5xl text-parchment-light">
              {playerCount}
            </span>
            <p className="font-accent text-xs text-parchment-dark mt-1">
              {playerCount === 1 ? 'SOLO' : 'PLAYERS'}
            </p>
          </div>

          <button
            onClick={() => setPlayerCount(p => Math.min(8, p + 1))}
            disabled={playerCount >= 8}
            className="touch-target w-12 h-12 flex items-center justify-center rounded-full bg-obsidian hover:bg-eldritch-dark disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-6 h-6 text-parchment" />
          </button>
        </div>
      </section>

      <button
        onClick={handleStartSetup}
        className="touch-target w-full flex items-center justify-center gap-3 px-8 py-4 bg-eldritch text-parchment-light font-display text-lg tracking-wide rounded hover:bg-eldritch-light transition-colors"
      >
        Next: Choose Threat
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );

  const renderStepAncientOne = () => (
    <div className="flex flex-col h-full animate-fade-in pt-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-20">
        {filteredAncientOnes.map((ao) => (
          <button
            key={ao.pageId}
            onClick={() => handleSelectAncientOne(ao)}
            className="text-left bg-shadow/30 hover:bg-shadow/80 border border-obsidian hover:border-eldritch rounded-lg p-4 transition-all group relative overflow-hidden"
          >
            <div className="relative z-10">
              <h3 className="font-display text-lg text-parchment-light group-hover:text-eldritch-light transition-colors">
                {ao.title}
              </h3>
              <div className="mt-2 space-y-1">
                <p className="font-accent text-xs text-blood-light">
                  Starting Doom: {ao.setup?.startingDoom ?? '—'}
                </p>
                <p className="font-accent text-xs text-parchment-dark">
                  Difficulty: {ao.setup?.difficulty ?? '—'}
                </p>
                <p className="font-body text-xs text-parchment-dark opacity-70">
                  Mythos: {ao.setup?.mythosDeckSize ?? '—'} • Mysteries: {ao.setup?.mysteries ?? '—'}
                </p>
                <p className="font-body text-xs text-parchment-dark opacity-70">
                  Set: {ao.setup?.set ?? '—'}
                </p>
                {ao.setup?.requiresSideBoard && (
                  <p className="font-accent text-xs text-gold-light">
                    Requires Side Board: {ao.setup.requiresSideBoard}
                  </p>
                )}
                {ao.setup?.notes && (
                  <p className="font-body text-xs text-parchment-dark opacity-70">
                    {ao.setup.notes}
                  </p>
                )}
              </div>
            </div>
            {/* Background Image Placeholder */}
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-eldritch-dark/20 to-transparent pointer-events-none" />
          </button>
        ))}
      </div>
    </div>
  );

  const renderInvestigatorSelection = () => (
    <div className="fixed inset-0 z-50 bg-void/95 backdrop-blur-sm flex flex-col p-6 animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => { setEditingPlayerIndex(null); setSearchQuery(''); }}
          className="touch-target p-2 -m-2"
        >
          <ArrowLeft className="w-6 h-6 text-parchment" />
        </button>
        <h2 className="font-display text-xl text-parchment-light">Select Investigator</h2>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-parchment-dark" />
          <input
            type="text"
            placeholder="Search Investigators..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-shadow border border-obsidian rounded pl-10 pr-4 py-3 text-parchment placeholder:text-parchment-dark/50 focus:outline-none focus:border-eldritch"
            autoFocus
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto grid grid-cols-1 gap-3 pb-20">
        {filteredInvestigators.map((inv) => (
          <button
            key={inv.pageId}
            onClick={() => handleSelectInvestigator(inv)}
            className="flex items-center gap-4 text-left bg-shadow/30 hover:bg-shadow/80 border border-obsidian hover:border-eldritch rounded-lg p-3 transition-all"
          >
            <div className="w-12 h-12 rounded bg-obsidian flex items-center justify-center shrink-0">
              <User className="w-6 h-6 text-parchment-dark" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-base text-parchment-light truncate">
                {inv.title}
              </h3>
              <p className="font-accent text-xs text-parchment-dark truncate">
                {(helpers.getField(inv, 'profession') || helpers.getField(inv, 'occupation') || 'Investigator')} • {(helpers.getField(inv, 'startloc') || 'Unknown Loc')}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderStepInvestigators = () => (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="flex-1 overflow-y-auto pb-24 space-y-4">
        {state.players.map((player, idx) => (
          <div 
            key={player.id}
            className="bg-shadow/50 border border-obsidian rounded-lg p-4"
          >
            <div className="flex justify-between items-start mb-2">
              <p className="font-accent text-xs text-eldritch-light">
                PLAYER {idx + 1}
              </p>
              {player.investigator && (
                <Check className="w-4 h-4 text-sickly-light" />
              )}
            </div>
            
            {player.investigator ? (
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg text-parchment-light">
                    {player.investigator.title}
                  </h3>
                  <p className="font-body text-xs text-parchment-dark">
                    {player.investigator.infobox?.startloc}
                  </p>
                </div>
                <button
                  onClick={() => setEditingPlayerIndex(idx)}
                  className="text-xs text-parchment-dark hover:text-eldritch underline px-2 py-1"
                >
                  Change
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingPlayerIndex(idx)}
                className="w-full py-3 border-2 border-dashed border-obsidian rounded hover:border-eldritch text-parchment-dark hover:text-eldritch-light transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Select Investigator
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-void via-void to-transparent">
        <button
          onClick={() => setStep('summary')}
          disabled={getUnassignedPlayers() > 0}
          className="touch-target w-full flex items-center justify-center gap-3 px-8 py-4 bg-eldritch text-parchment-light font-display text-lg tracking-wide rounded hover:bg-eldritch-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Review Ritual
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {editingPlayerIndex !== null && renderInvestigatorSelection()}
    </div>
  );

  const renderStepSummary = () => (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="bg-shadow/30 rounded-lg p-6 border border-eldritch-dark mb-8 text-center">
        <h2 className="font-display text-2xl text-eldritch-light mb-2">
          {state.ancientOne?.title}
        </h2>
        <p className="font-body text-parchment-dark italic text-sm mb-4">
          The stars align. The doom track begins at {state.doom}.
        </p>
        
        <div className="grid grid-cols-2 gap-2 text-left">
          {state.players.map(p => (
            <div key={p.id} className="bg-void/50 p-2 rounded border border-obsidian/50">
              <p className="font-display text-xs text-parchment-light">{p.investigator?.title}</p>
              <p className="font-accent text-[10px] text-parchment-dark">{p.location}</p>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleFinishSetup}
        className="touch-target w-full flex items-center justify-center gap-3 px-8 py-4 bg-blood hover:bg-blood-light text-parchment-light font-display text-lg tracking-wide rounded shadow-lg shadow-blood/20 transition-all"
      >
        <Skull className="w-5 h-5" />
        Summon the Darkness
      </button>

      <button
        onClick={() => setStep('investigators')}
        className="mt-4 text-parchment-dark hover:text-parchment text-sm text-center"
      >
        Go Back
      </button>
    </div>
  );

  return (
    <div className="min-h-dvh flex flex-col p-6 bg-void relative">
      {/* Progress Header */}
      <header className="mb-6 flex items-center justify-between">
        {step !== 'count' && (
          <button 
            onClick={() => {
              if (step === 'ancientOne') setStep('count');
              if (step === 'investigators') setStep('ancientOne');
              if (step === 'summary') setStep('investigators');
            }}
            className="touch-target p-2 -m-2"
          >
            <ArrowLeft className="w-5 h-5 text-parchment-dark" />
          </button>
        )}
        <div className="flex-1 text-center">
          <h1 className="font-display text-xl text-parchment-light">
            {step === 'count' && 'The Gathering'}
            {step === 'ancientOne' && 'The Threat'}
            {step === 'investigators' && 'The Investigators'}
            {step === 'summary' && 'The Ritual'}
          </h1>
          <div className="flex justify-center gap-1 mt-2">
            {['count', 'ancientOne', 'investigators', 'summary'].map((s, i) => (
              <div 
                key={s} 
                className={`h-1 rounded-full transition-all ${
                  s === step ? 'w-8 bg-eldritch-light' : 'w-2 bg-obsidian'
                }`}
              />
            ))}
          </div>
        </div>
        <div className="w-9" /> {/* Spacer for centering */}
      </header>

      {/* Main Content */}
      <div className="flex-1">
        {step === 'count' && renderStepCount()}
        {step === 'ancientOne' && renderStepAncientOne()}
        {step === 'investigators' && renderStepInvestigators()}
        {step === 'summary' && renderStepSummary()}
      </div>
    </div>
  );
}
