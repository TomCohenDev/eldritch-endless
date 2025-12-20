import { useState, useMemo, useEffect } from 'react';
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
  AlertTriangle,
  Music2,
  Pause,
  SkipForward
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { useGameData } from '../hooks/useGameData';
import { NARRATOR_VOICES, type AncientOnePage, type WikiPage } from '../types';
import { playVoiceSample, stopVoiceSample } from '../utils/voiceSamples';
import { generateNarration as generateNarrationApi } from '../api';

// Import ambiance audio
import ambiance1 from '../assets/narration-ambiance/1.mp3';
import ambiance2 from '../assets/narration-ambiance/2.mp3';
import ambiance3 from '../assets/narration-ambiance/3.mp3';
import ambiance4 from '../assets/narration-ambiance/4.mp3';

const AMBIANCE_TRACKS = [ambiance1, ambiance2, ambiance3, ambiance4];

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
    isGeneratingPlot
  } = useGame();
  
  const { ancientOnes, investigators, helpers, loading } = useGameData();
  
  const SETUP_STORAGE_KEY = 'eldritch-endless-setup';
  
  // Load saved setup state from localStorage
  const getSavedSetupState = (): { step: SetupStep; playerCount: number } | null => {
    try {
      const saved = localStorage.getItem(SETUP_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load setup state:', e);
    }
    return null;
  };
  
  // Determine initial step based on saved state and current game state
  const getInitialStep = (): SetupStep => {
    const saved = getSavedSetupState();
    
    // If we have a plot context, go straight to prologue
    if (state.plotContext) {
      return 'prologue';
    }
    
    // If we have players with investigators assigned, go to summary
    if (state.players.length > 0 && state.players.every(p => p.investigator)) {
      return 'summary';
    }
    
    // If we have an ancient one but not all investigators, go to investigators
    if (state.ancientOne && state.players.length > 0) {
      return 'investigators';
    }
    
    // If we have players but no ancient one, go to ancient one selection
    if (state.players.length > 0) {
      return 'ancientOne';
    }
    
    // Otherwise use saved step or default to count
    return saved?.step || 'count';
  };
  
  const getInitialPlayerCount = (): number => {
    // If we already have players, use that count
    if (state.players.length > 0) {
      return state.players.length;
    }
    // Otherwise use saved count or default
    const saved = getSavedSetupState();
    return saved?.playerCount || 2;
  };
  
  const [step, setStep] = useState<SetupStep>(getInitialStep);
  const [playerCount, setPlayerCount] = useState(getInitialPlayerCount);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPlayerIndex, setEditingPlayerIndex] = useState<number | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [plotError, setPlotError] = useState<string | null>(null);
  const [isGeneratingNarration, setIsGeneratingNarration] = useState(false);
  const [narrationUrls, setNarrationUrls] = useState<{
    premise?: string;
    investigators?: Record<string, string>;
  } | null>(null);
  const [playingNarrationId, setPlayingNarrationId] = useState<string | null>(null);
  const [currentNarrationId, setCurrentNarrationId] = useState<string | null>(null); // Track which section is loaded
  const [narrationAudio] = useState(() => typeof Audio !== 'undefined' ? new Audio() : null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.3);
  const [ambianceAudio] = useState(() => {
    if (typeof Audio === 'undefined') return null;
    const audio = new Audio();
    // Pick a random track once
    const randomTrack = AMBIANCE_TRACKS[Math.floor(Math.random() * AMBIANCE_TRACKS.length)];
    audio.src = randomTrack;
    audio.loop = true;
    audio.volume = 0.3;
    return audio;
  });
  
  // Persist setup state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SETUP_STORAGE_KEY, JSON.stringify({ step, playerCount }));
    } catch (e) {
      console.warn('Failed to save setup state:', e);
    }
  }, [step, playerCount]);

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
    setPlotError(null); // Clear any previous error
    const success = await confirmSetupAndGeneratePlot();
    // Show prologue if plot generation succeeded
    if (success) {
      setStep('prologue');
    } else {
      // Show error message and stay on summary page for retry
      setPlotError('Failed to summon the darkness. The stars may not be aligned. Please try again.');
    }
  };

  const handleBeginGame = () => {
    // Stop any playing audio when leaving
    if (ambianceAudio) {
      ambianceAudio.pause();
      ambianceAudio.currentTime = 0;
    }
    setIsMusicPlaying(false);
    navigate('/game');
  };

  const toggleMusic = () => {
    if (!ambianceAudio) return;
    
    if (isMusicPlaying) {
      ambianceAudio.pause();
      setIsMusicPlaying(false);
    } else {
      // Resume from where we left off (track already set on init)
      ambianceAudio.play().catch(console.error);
      setIsMusicPlaying(true);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setMusicVolume(newVolume);
    if (ambianceAudio) {
      ambianceAudio.volume = newVolume;
    }
  };

  const switchTrack = () => {
    if (!ambianceAudio) return;
    
    // Get a different random track
    const currentSrc = ambianceAudio.src;
    let newTrack = AMBIANCE_TRACKS[Math.floor(Math.random() * AMBIANCE_TRACKS.length)];
    
    // Make sure we get a different track if possible
    let attempts = 0;
    while (newTrack === currentSrc && attempts < 5 && AMBIANCE_TRACKS.length > 1) {
      newTrack = AMBIANCE_TRACKS[Math.floor(Math.random() * AMBIANCE_TRACKS.length)];
      attempts++;
    }
    
    const wasPlaying = isMusicPlaying;
    ambianceAudio.src = newTrack;
    ambianceAudio.currentTime = 0;
    
    if (wasPlaying) {
      ambianceAudio.play().catch(console.error);
    }
  };

  const generateNarration = async () => {
    if (!state.plotContext || !state.ancientOne) return;
    
    setIsGeneratingNarration(true);
    
    try {
      // Build investigator threads for narration
      const investigatorThreads = state.plotContext.investigatorThreads?.map(thread => ({
        playerId: thread.playerId,
        personalStakes: thread.personalStakes || '',
        connectionToThreat: thread.connectionToThreat || '',
      })) || [];
      
      // Get the ElevenLabs voice ID from the selected narrator voice
      const selectedVoice = NARRATOR_VOICES.find(v => v.id === state.narratorVoiceId);
      const elevenLabsVoiceId = selectedVoice?.elevenLabsId || NARRATOR_VOICES[0].elevenLabsId;
      
      // Call the narration generation API with plotContext format
      const data = await generateNarrationApi({
        plotContext: {
          premise: state.plotContext.premise,
          investigatorThreads,
        },
        voiceId: elevenLabsVoiceId,
      });
      
      console.log('[Narration] Received response:', data);
      setNarrationUrls(data);
      
      // Auto-play the premise narration if available
      if (data.premise && narrationAudio) {
        playNarrationSection('premise', data.premise);
      }
    } catch (error) {
      console.error('Failed to generate narration:', error);
    } finally {
      setIsGeneratingNarration(false);
    }
  };

  const playNarrationSection = (sectionId: string, audioUrl: string) => {
    if (!narrationAudio) return;
    
    // If same section is playing, pause it (resume later)
    if (playingNarrationId === sectionId) {
      narrationAudio.pause();
      setPlayingNarrationId(null);
      return;
    }
    
    // If same section is paused, resume it
    if (currentNarrationId === sectionId && !playingNarrationId) {
      narrationAudio.play().catch(console.error);
      setPlayingNarrationId(sectionId);
      return;
    }
    
    // Play a new section (different from current)
    narrationAudio.src = audioUrl;
    narrationAudio.onended = () => setPlayingNarrationId(null);
    narrationAudio.play().catch(console.error);
    setPlayingNarrationId(sectionId);
    setCurrentNarrationId(sectionId);
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

      {/* Error message */}
      {plotError && (
        <div className="mb-4 p-4 bg-blood/20 border border-blood/50 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blood shrink-0 mt-0.5" />
            <div>
              <p className="font-body text-sm text-parchment-light">{plotError}</p>
              <p className="font-body text-xs text-parchment-dark mt-1">
                Check your connection and try again.
              </p>
            </div>
          </div>
        </div>
      )}

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
            {plotError ? 'Try Again' : 'Summon the Darkness'}
          </>
        )}
      </button>

      <button
        onClick={() => {
          setPlotError(null);
          setStep('investigators');
        }}
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

    return (
      <div className="flex flex-col h-full animate-fade-in overflow-hidden">
        <div className="flex-1 overflow-y-auto pb-32 space-y-6">
          {/* Music Controls - Top */}
          <div className="bg-shadow/40 rounded-lg p-4 border border-obsidian flex items-center gap-4">
            <button
              onClick={toggleMusic}
              className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${
                isMusicPlaying 
                  ? 'bg-cosmic/30 text-cosmic-light border border-cosmic' 
                  : 'bg-shadow/50 text-parchment-dark border border-obsidian hover:border-cosmic-dark hover:text-parchment'
              }`}
              title={isMusicPlaying ? 'Pause music' : 'Play music'}
            >
              {isMusicPlaying ? <Pause className="w-5 h-5" /> : <Music2 className="w-5 h-5" />}
            </button>
            
            <button
              onClick={switchTrack}
              className="flex items-center justify-center w-10 h-10 rounded-full transition-all bg-shadow/50 text-parchment-dark border border-obsidian hover:border-cosmic-dark hover:text-parchment"
              title="Switch track"
            >
              <SkipForward className="w-5 h-5" />
            </button>
            
            <div className="flex-1 flex items-center gap-3">
              <Volume2 className="w-4 h-4 text-parchment-dark shrink-0" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={musicVolume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-obsidian rounded-lg appearance-none cursor-pointer accent-cosmic"
              />
              <span className="font-accent text-xs text-parchment-dark w-8 text-right">
                {Math.round(musicVolume * 100)}%
              </span>
            </div>
          </div>

          {/* Narration Controls */}
          {!narrationUrls && (
            <div className="flex items-center justify-center">
              <button
                onClick={generateNarration}
                disabled={isGeneratingNarration}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg border transition-all w-full justify-center ${
                  isGeneratingNarration 
                    ? 'bg-eldritch/20 border-eldritch/50 text-eldritch-light cursor-wait' 
                    : 'bg-shadow/50 border-obsidian hover:border-eldritch hover:bg-eldritch/20 text-parchment-dark hover:text-parchment'
                }`}
              >
                {isGeneratingNarration ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="font-accent text-sm">Generating Narration...</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-5 h-5" />
                    <span className="font-accent text-sm">Generate Narration</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Title Card */}
          <div className="text-center py-6 border-b border-obsidian/50">
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

          {/* The Premise */}
          <section className="bg-shadow/30 rounded-lg p-5 border border-obsidian">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-eldritch-light" />
                <h2 className="font-display text-lg text-parchment-light">The Situation</h2>
              </div>
              {narrationUrls?.premise && (
                <button
                  onClick={() => playNarrationSection('premise', narrationUrls.premise!)}
                  className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ${
                    playingNarrationId === 'premise'
                      ? 'bg-eldritch/30 text-eldritch-light border border-eldritch'
                      : 'bg-shadow/50 text-parchment-dark border border-obsidian hover:border-eldritch-dark hover:text-parchment'
                  }`}
                  title={playingNarrationId === 'premise' ? 'Pause' : 'Play narration'}
                >
                  {playingNarrationId === 'premise' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
              )}
            </div>
            <p className="font-body text-base font-medium text-parchment leading-relaxed">
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
                    className="px-3 py-1.5 bg-void/50 rounded-full font-body text-sm font-medium text-parchment-dark border border-obsidian/30"
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
                
                const investigatorAudioUrl = narrationUrls?.investigators?.[player.id];
                // Debug: log what we're looking for
                if (narrationUrls?.investigators) {
                  console.log('[Narration] Looking for investigator:', player.id, 'Available keys:', Object.keys(narrationUrls.investigators), 'Found:', !!investigatorAudioUrl);
                }

                return (
                  <div 
                    key={player.id}
                    className="bg-shadow/40 rounded-lg p-4 border border-obsidian hover:border-eldritch-dark transition-colors"
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
                      {investigatorAudioUrl && (
                        <button
                          onClick={() => playNarrationSection(player.id, investigatorAudioUrl)}
                          className={`flex items-center justify-center w-8 h-8 rounded-full transition-all shrink-0 ${
                            playingNarrationId === player.id
                              ? 'bg-eldritch/30 text-eldritch-light border border-eldritch'
                              : 'bg-shadow/50 text-parchment-dark border border-obsidian hover:border-eldritch-dark hover:text-parchment'
                          }`}
                          title={playingNarrationId === player.id ? 'Pause' : 'Play narration'}
                        >
                          {playingNarrationId === player.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                        </button>
                      )}
                    </div>
                    
                    {thread.personalStakes && (
                      <div className="mb-3">
                        <p className="font-display text-sm font-bold text-gold-light uppercase tracking-wide mb-2">Personal Stakes</p>
                        <p className="font-body text-sm font-medium text-parchment leading-relaxed">
                          {thread.personalStakes}
                        </p>
                      </div>
                    )}
                    
                    {thread.connectionToThreat && (
                      <div>
                        <p className="font-display text-sm font-bold text-sickly-light uppercase tracking-wide mb-2">Connection to the Threat</p>
                        <p className="font-body text-sm font-medium text-parchment leading-relaxed">
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
            className="touch-target w-full flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-8 py-3 sm:py-4 bg-eldritch hover:bg-eldritch-light text-parchment-light font-display text-base sm:text-lg tracking-wide rounded shadow-lg shadow-eldritch/20 transition-all flex-wrap"
          >
            <Skull className="w-5 h-5 shrink-0" />
            <span className="text-center">Begin the Investigation</span>
            <ArrowRight className="w-5 h-5 shrink-0" />
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
