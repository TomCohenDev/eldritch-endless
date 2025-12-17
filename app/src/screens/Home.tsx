import { Link } from 'react-router-dom';
import { Skull, BookOpen } from 'lucide-react';
import { useGame } from '../context/GameContext';

export function Home() {
  const { state, hasSavedGame } = useGame();

  return (
    <div className="min-h-dvh w-full flex flex-col items-center justify-center p-6 relative overflow-hidden bg-void text-parchment">
      {/* Fallback Background for mobile compatibility */}
      <div className="absolute inset-0 bg-void z-0" />
      
      {/* Background atmosphere */}
      <div className="absolute inset-0 bg-gradient-to-b from-void via-abyss to-eldritch-dark opacity-90 z-0" />
      
      {/* Content - explicitly z-10 to sit above backgrounds */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-md mx-auto w-full">
        {/* Logo/Title */}
        <div className="mb-8">
          <Skull className="w-20 h-20 text-eldritch-light mx-auto mb-4 opacity-80" />
          <h1 className="font-display text-4xl text-parchment-light tracking-wide mb-2">
            Eldritch
          </h1>
          <h1 className="font-display text-4xl text-eldritch-light tracking-widest">
            Endless
          </h1>
        </div>

        {/* Tagline */}
        <p className="font-body text-parchment-dark text-lg mb-12 italic">
          "The oldest and strongest emotion of mankind is fear, 
          and the oldest and strongest kind of fear is fear of the unknown."
        </p>

        {/* Action buttons */}
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <Link
            to="/setup"
            className="touch-target flex items-center justify-center gap-3 px-8 py-4 bg-eldritch text-parchment-light font-display text-lg tracking-wide rounded"
            style={{ backgroundColor: '#4a1a6b' }} // Inline style fallback
          >
            <BookOpen className="w-5 h-5" />
            Begin Ritual
          </Link>

          {hasSavedGame && (
            <Link
              to="/game"
              className="touch-target flex items-center justify-center gap-3 px-8 py-4 bg-shadow text-parchment border border-obsidian font-display text-lg tracking-wide rounded"
              style={{ backgroundColor: '#1a1a24' }} // Inline style fallback
            >
              Continue Journey
            </Link>
          )}
        </div>

        {/* Saved game indicator */}
        {hasSavedGame && (
          <p className="font-accent text-xs text-parchment-dark mt-6 opacity-70">
            Round {state.round} • {state.players.length} Investigator{state.players.length !== 1 ? 's' : ''} • {state.ancientOne?.title || 'Unknown Horror'}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-0 right-0 text-center z-10">
        <p className="font-accent text-xs text-parchment-dark opacity-50">
          A Narrative AI Companion for Eldritch Horror
        </p>
      </div>
    </div>
  );
}
