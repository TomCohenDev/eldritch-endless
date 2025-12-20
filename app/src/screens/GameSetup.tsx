import { useState, useMemo, useEffect, useRef } from 'react';
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
  ArrowLeft,
  Loader2,
  Star,
  BookOpen,
  MapPin,
  Sparkles,
  Volume2,
  Play,
  Square,
  Music,
  Pause
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { useGameData } from '../hooks/useGameData';
import { NARRATOR_VOICES, type AncientOnePage, type WikiPage } from '../types';
import { playVoiceSample, stopVoiceSample } from '../utils/voiceSamples';
import { generateNarration } from '../api';
import { 
  startAmbiance, 
  pauseAmbiance, 
  resumeAmbiance, 
  setAmbianceVolume, 
  isAmbiancePlaying,
  stopAmbiance 
} from '../utils/ambianceAudio';

type SetupStep = 'count' | 'ancientOne' | 'investigators' | 'summary' | 'prologue';

export function GameSetup() {
  const navigate = useNavigate();
  const { 
    state, 
    startNewGame, 
    setAncientOne, 
    setPlayerInvestigator, 
    setNarratorVoice,
    confirmSetupAndGeneratePlot,
    isGeneratingPlot,
    setPlotContext
  } = useGame();
  
  const { ancientOnes, investigators, helpers, loading } = useGameData();
  
  const [step, setStep] = useState<SetupStep>('count');
  const [playerCount, setPlayerCount] = useState(2);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPlayerIndex, setEditingPlayerIndex] = useState<number | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [isGeneratingNarration, setIsGeneratingNarration] = useState(false);
  const [playingAudioKey, setPlayingAudioKey] = useState<string | null>(null);
  const [ambiancePlaying, setAmbiancePlaying] = useState(false);
  const [ambianceVol, setAmbianceVol] = useState(0.3);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);

  // Start ambiance when entering prologue
  useEffect(() => {
    if (step === 'prologue') {
      startAmbiance(ambianceVol);
      setAmbiancePlaying(true);
    }
  }, [step]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (musicRef.current) {
        musicRef.current.pause();
        musicRef.current = null;
      }
      stopAmbiance();
    };
  }, []);

  const handleAmbianceToggle = () => {
    if (ambiancePlaying) {
      pauseAmbiance();
      setAmbiancePlaying(false);
    } else {
      resumeAmbiance();
      setAmbiancePlaying(true);
    }
  };

  const handleAmbianceVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setAmbianceVol(vol);
    setAmbianceVolume(vol);
  };

  const playAudio = (key: string, base64: string, isMusic = false) => {
    if (playingAudioKey === key) {
      // Stop logic
      if (isMusic) {
        if (musicRef.current) {
          musicRef.current.pause();
          musicRef.current = null;
        }
      } else {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
      }
      setPlayingAudioKey(null);
      return;
    }

    // Play logic
    if (isMusic) {
       // Stop prev music if any (though usually we toggle)
       if (musicRef.current) musicRef.current.pause();
       musicRef.current = new Audio(base64);
       musicRef.current.loop = true;
       musicRef.current.volume = 0.3;
       musicRef.current.play().catch(e => console.error("Failed to play music", e));
       // We don't necessarily set playingAudioKey for music if we want independent control, 
       // but for now let's track it separately or just use a boolean for music?
       // Let's use a specific key suffix for music
       setPlayingAudioKey(key);
    } else {
      // Stop other narration
      if (audioRef.current) audioRef.current.pause();
      
      audioRef.current = new Audio(base64);
      audioRef.current.onended = () => setPlayingAudioKey(null);
      audioRef.current.play().catch(e => console.error("Failed to play audio", e));
      setPlayingAudioKey(key);
    }
  };
  
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingAudioKey(null);
  };
  
  const stopMusic = () => {
    if (musicRef.current) {
      musicRef.current.pause();
      musicRef.current = null;
    }
    // Only clear key if it was the music key
    if (playingAudioKey === 'music') {
       setPlayingAudioKey(null);
    }
  };

  const handleGenerateNarration = async () => {
    if (!state.plotContext || isGeneratingNarration) return;
    
    setIsGeneratingNarration(true);
    try {
      const audioData = await generateNarration(state.plotContext, state.narratorVoiceId);
      
      if (audioData) {
        // Update context with audio data
        setPlotContext({
          ...state.plotContext,
          audioNarration: {
            premise: audioData.premise,
            investigatorStakes: audioData.investigatorStakes,
            backgroundMusic: audioData.backgroundMusic
          }
        });
      } else {
        alert("Failed to summon the voices from the void.");
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred while generating narration.");
    } finally {
      setIsGeneratingNarration(false);
    }
  };

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

  const handleFinishSetup = async () => {
    stopVoiceSample();
    setPlayingVoiceId(null);
    const success = await confirmSetupAndGeneratePlot();
    // Show prologue if plot generation succeeded
    if (success) {
      setStep('prologue');
    } else {
      // Show error message to user
      alert('Failed to generate plot. Please try again.');
    }
  };

  const handleBeginGame = () => {
    stopAmbiance();
    navigate('/game');
  };

  // --- Render Functions ---

  // Show ritual loading screen while generating plot
  if (isGeneratingPlot) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-void p-6 z-50">
        <div className="flex flex-col items-center justify-center max-w-md w-full">
          {/* Animated eldritch symbol */}
          <div className="relative w-32 h-32 mb-8">
            <div className="absolute inset-0 rounded-full border-2 border-eldritch-dark animate-ping opacity-20" />
            <div className="absolute inset-2 rounded-full border border-eldritch animate-pulse" />
            <div className="absolute inset-4 rounded-full border border-cosmic-light opacity-60 animate-spin" style={{ animationDuration: '3s' }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <Star className="w-12 h-12 text-eldritch-light animate-pulse" />
            </div>
          </div>
          
          {/* Loading text */}
          <div className="text-center w-full">
            <h2 className="font-display text-2xl text-parchment-light mb-3">
              The Stars Align...
            </h2>
            <div className="flex items-center justify-center gap-2 mb-4">
              <Loader2 className="w-4 h-4 text-eldritch-light animate-spin" />
              <p className="font-accent text-sm text-parchment-dark">
                Weaving the threads of fate
              </p>
            </div>
            <p className="font-body text-xs text-parchment-dark/70 max-w-xs mx-auto">
              {state.ancientOne?.title} stirs in the darkness as the investigators' destinies intertwine...
            </p>
          </div>
        </div>
        
        {/* Atmospheric background elements */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-eldritch/5 blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-cosmic/5 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 right-1/3 w-32 h-32 rounded-full bg-blood/5 blur-2xl animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>
      </div>
    );
  }

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

      {/* Narrator Voice Selection */}
      <div className="bg-shadow/30 rounded-lg p-4 border border-obsidian mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Volume2 className="w-4 h-4 text-eldritch-light" />
          <h3 className="font-display text-sm text-parchment-light">Narrator Voice</h3>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {NARRATOR_VOICES.map((voice) => {
            const isPlaying = playingVoiceId === voice.id;
            return (
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
                    if (isPlaying) {
                      stopVoiceSample();
                      setPlayingVoiceId(null);
                    } else {
                      playVoiceSample(voice.sampleFile, () => setPlayingVoiceId(null));
                      setPlayingVoiceId(voice.id);
                    }
                  }}
                  className="shrink-0 w-8 h-8 rounded-full bg-eldritch/50 hover:bg-eldritch flex items-center justify-center transition-colors"
                  title={isPlaying ? "Stop sample" : "Play sample"}
                >
                  {isPlaying ? (
                    <Square className="w-3 h-3 fill-current text-parchment-light" />
                  ) : (
                    <Play className="w-4 h-4 text-parchment-light ml-0.5" />
                  )}
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
            );
          })}
        </div>
      </div>

      <button
        onClick={handleFinishSetup}
        disabled={isGeneratingPlot}
        className="touch-target w-full flex items-center justify-center gap-3 px-8 py-4 bg-blood hover:bg-blood-light text-parchment-light font-display text-lg tracking-wide rounded shadow-lg shadow-blood/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGeneratingPlot ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Summoning...
          </>
        ) : (
          <>
            <Skull className="w-5 h-5" />
            Summon the Darkness
          </>
        )}
      </button>

      <button
        onClick={() => setStep('investigators')}
        disabled={isGeneratingPlot}
        className="mt-4 text-parchment-dark hover:text-parchment text-sm text-center disabled:opacity-50"
      >
        Go Back
      </button>
    </div>
  );

  const renderStepPrologue = () => {
    const plot = state.plotContext;
    if (!plot) return null;

    const hasAudio = !!plot.audioNarration;

    return (
      <div className="flex flex-col h-full animate-fade-in overflow-hidden">
        <div className="flex-1 overflow-y-auto pb-32 space-y-6">
          {/* Title Card */}
          <div className="text-center py-6 border-b border-obsidian/50 relative">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Star className="w-5 h-5 text-eldritch-light" />
              <span className="font-accent text-xs text-eldritch-light uppercase tracking-widest">
                The Story Begins
              </span>
              <Star className="w-5 h-5 text-eldritch-light" />
            </div>
            <h1 className="font-display text-3xl text-parchment-light mb-2">
              {state.ancientOne?.title}
            </h1>
            <p className="font-accent text-sm text-blood-light">
              {state.ancientOne?.infobox?.epithet || 'Ancient Horror'}
            </p>
          </div>

          {/* Ambiance Controls */}
          <div className="bg-shadow/30 rounded-lg p-3 border border-obsidian/50 flex items-center gap-3">
            <button
              onClick={handleAmbianceToggle}
              className={`p-2 rounded-full border transition-all ${
                ambiancePlaying 
                  ? 'bg-eldritch text-parchment-light border-eldritch-light' 
                  : 'bg-obsidian/50 text-parchment-dark border-obsidian hover:border-eldritch'
              }`}
              title={ambiancePlaying ? "Pause Ambience" : "Play Ambience"}
            >
              {ambiancePlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            
            <div className="flex items-center gap-2 flex-1">
              <Music className="w-4 h-4 text-parchment-dark shrink-0" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={ambianceVol}
                onChange={handleAmbianceVolumeChange}
                className="flex-1 h-1 bg-obsidian rounded-lg appearance-none cursor-pointer accent-eldritch"
                title="Ambience Volume"
              />
              <span className="font-accent text-xs text-parchment-dark w-8 text-right">
                {Math.round(ambianceVol * 100)}%
              </span>
            </div>
          </div>

          {/* Generate Narration Button */}
          {!hasAudio && (
            <div className="flex justify-center">
              <button
                onClick={handleGenerateNarration}
                disabled={isGeneratingNarration}
                className="flex items-center gap-2 px-4 py-2 bg-obsidian border border-eldritch/50 rounded hover:bg-eldritch/20 hover:border-eldritch text-parchment-light text-sm transition-all disabled:opacity-50"
              >
                {isGeneratingNarration ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Communing with the Void...
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4" />
                    Generate Narration
                  </>
                )}
              </button>
            </div>
          )}

          {/* The Premise */}
          <section className="bg-shadow/30 rounded-lg p-5 border border-obsidian relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-eldritch-light" />
                <h2 className="font-display text-lg text-parchment-light">The Situation</h2>
              </div>
              {plot.audioNarration?.premise && (
                <button
                  onClick={() => playAudio('premise', plot.audioNarration!.premise!)}
                  className="p-1.5 rounded-full bg-obsidian border border-obsidian hover:border-eldritch text-parchment-light hover:text-eldritch-light transition-colors"
                >
                  {playingAudioKey === 'premise' ? (
                    <Square className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current" />
                  )}
                </button>
              )}
            </div>
            <p className="font-body text-sm text-parchment leading-relaxed">
              {plot.premise}
            </p>
          </section>

          {/* Active Themes */}
          {plot.activeThemes && plot.activeThemes.length > 0 && (
            <section className="bg-shadow/20 rounded-lg p-4 border border-obsidian/50">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-cosmic-light" />
                <h3 className="font-accent text-xs text-cosmic-light uppercase tracking-wide">Themes of Dread</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {plot.activeThemes.slice(0, 5).map((theme, idx) => (
                  <span 
                    key={idx}
                    className="px-3 py-1 bg-void/50 rounded-full font-body text-xs text-parchment-dark border border-obsidian/30"
                  >
                    {theme}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Investigator Stories */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-sickly-light" />
              <h2 className="font-display text-lg text-parchment-light">The Investigators</h2>
            </div>
            
            <div className="space-y-4">
              {state.players.map((player, idx) => {
                const thread = plot.investigatorThreads?.find(t => t.playerId === player.id) 
                  || plot.investigatorThreads?.[idx];
                
                if (!thread || !player.investigator) return null;

                const audioUrl = plot.audioNarration?.investigatorStakes?.[player.id];
                const isPlaying = playingAudioKey === `inv-${player.id}`;

                return (
                  <div 
                    key={player.id}
                    className="bg-shadow/40 rounded-lg p-4 border border-obsidian hover:border-eldritch-dark transition-colors relative"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-eldritch-dark flex items-center justify-center shrink-0">
                          <User className="w-5 h-5 text-parchment" />
                        </div>
                        <div>
                          <h3 className="font-display text-base text-parchment-light">
                            {player.investigator.title}
                          </h3>
                          <p className="font-accent text-xs text-parchment-dark">
                            {player.investigator.infobox?.profession || 'Investigator'} • {player.location}
                          </p>
                        </div>
                      </div>
                      
                      {audioUrl && (
                        <button
                          onClick={() => playAudio(`inv-${player.id}`, audioUrl)}
                          className="p-1.5 rounded-full bg-obsidian border border-obsidian hover:border-eldritch text-parchment-light hover:text-eldritch-light transition-colors"
                        >
                          {isPlaying ? (
                            <Square className="w-4 h-4 fill-current" />
                          ) : (
                            <Play className="w-4 h-4 fill-current" />
                          )}
                        </button>
                      )}
                    </div>
                    
                    {thread.personalStakes && (
                      <div className="mb-3">
                        <p className="font-accent text-[10px] text-blood-light uppercase tracking-wide mb-1">Personal Stakes</p>
                        <p className="font-body text-xs text-parchment leading-relaxed">
                          {thread.personalStakes}
                        </p>
                      </div>
                    )}
                    
                    {thread.connectionToThreat && (
                      <div>
                        <p className="font-accent text-[10px] text-eldritch-light uppercase tracking-wide mb-1">Connection to the Threat</p>
                        <p className="font-body text-xs text-parchment-dark leading-relaxed">
                          {thread.connectionToThreat}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Key Locations */}
          {plot.locationSignificance && Object.keys(plot.locationSignificance).length > 0 && (
            <section className="bg-shadow/20 rounded-lg p-4 border border-obsidian/50">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-gold-light" />
                <h3 className="font-accent text-xs text-gold-light uppercase tracking-wide">Locations of Interest</h3>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(plot.locationSignificance).slice(0, 4).map(([location, significance]) => (
                  <div key={location} className="bg-void/30 rounded p-2">
                    <p className="font-display text-xs text-parchment-light">{location}</p>
                    <p className="font-body text-[10px] text-parchment-dark leading-relaxed">
                      {String(significance).slice(0, 120)}...
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Fixed Bottom Button */}
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-void via-void to-transparent">
          <button
            onClick={handleBeginGame}
            className="touch-target w-full flex items-center justify-center gap-3 px-8 py-4 bg-eldritch hover:bg-eldritch-light text-parchment-light font-display text-lg tracking-wide rounded shadow-lg shadow-eldritch/20 transition-all"
          >
            <Skull className="w-5 h-5" />
            Begin the Investigation
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  };

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
            {step === 'prologue' && 'The Prologue'}
          </h1>
          <div className="flex justify-center gap-1 mt-2">
            {['count', 'ancientOne', 'investigators', 'summary', 'prologue'].map((s) => (
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
        {step === 'prologue' && renderStepPrologue()}
      </div>
    </div>
  );
}
