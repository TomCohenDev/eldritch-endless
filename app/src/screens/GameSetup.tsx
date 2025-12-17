import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Minus, Plus, Skull, ArrowRight } from 'lucide-react';
import { useGame } from '../context/GameContext';

export function GameSetup() {
  const navigate = useNavigate();
  const { startNewGame } = useGame();
  const [playerCount, setPlayerCount] = useState(2);

  const decrementPlayers = () => {
    setPlayerCount((prev) => Math.max(1, prev - 1));
  };

  const incrementPlayers = () => {
    setPlayerCount((prev) => Math.min(8, prev + 1));
  };

  const handleStartGame = () => {
    startNewGame(playerCount);
    navigate('/game');
  };

  return (
    <div className="min-h-dvh flex flex-col p-6 bg-gradient-to-b from-void to-abyss">
      {/* Header */}
      <header className="text-center mb-8">
        <h1 className="font-display text-3xl text-parchment-light tracking-wide">
          Prepare the Ritual
        </h1>
        <p className="font-body text-parchment-dark mt-2">
          Configure your descent into madness
        </p>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col gap-8 max-w-md mx-auto w-full">
        {/* Player count selector */}
        <section className="bg-shadow/50 rounded-lg p-6 border border-obsidian">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5 text-eldritch-light" />
            <h2 className="font-display text-xl text-parchment-light">
              Investigators
            </h2>
          </div>

          <div className="flex items-center justify-center gap-6">
            <button
              onClick={decrementPlayers}
              disabled={playerCount <= 1}
              className="touch-target w-12 h-12 flex items-center justify-center rounded-full bg-obsidian hover:bg-eldritch-dark disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Decrease player count"
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
              onClick={incrementPlayers}
              disabled={playerCount >= 8}
              className="touch-target w-12 h-12 flex items-center justify-center rounded-full bg-obsidian hover:bg-eldritch-dark disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Increase player count"
            >
              <Plus className="w-6 h-6 text-parchment" />
            </button>
          </div>
        </section>

        {/* Ancient One selection (placeholder) */}
        <section className="bg-shadow/50 rounded-lg p-6 border border-obsidian">
          <div className="flex items-center gap-3 mb-4">
            <Skull className="w-5 h-5 text-eldritch-light" />
            <h2 className="font-display text-xl text-parchment-light">
              Ancient One
            </h2>
          </div>

          <div className="bg-abyss rounded p-4 border border-obsidian/50">
            <p className="font-body text-parchment-dark text-center italic">
              The AI will weave a tale of cosmic horror, 
              selecting threats that match your investigators' journey.
            </p>
          </div>

          <p className="font-accent text-xs text-parchment-dark mt-3 text-center opacity-70">
            ANCIENT ONE WILL BE REVEALED DURING GAMEPLAY
          </p>
        </section>

        {/* Difficulty hint */}
        <div className="text-center">
          <p className="font-body text-sm text-parchment-dark">
            {playerCount <= 2 && 'A lonely path into darkness...'}
            {playerCount > 2 && playerCount <= 4 && 'A small band of brave souls...'}
            {playerCount > 4 && playerCount <= 6 && 'Strength in numbers, but also... attention.'}
            {playerCount > 6 && 'A full expedition. The stars are watching.'}
          </p>
        </div>
      </div>

      {/* Start button */}
      <div className="mt-8 max-w-md mx-auto w-full">
        <button
          onClick={handleStartGame}
          className="touch-target w-full flex items-center justify-center gap-3 px-8 py-4 bg-eldritch hover:bg-eldritch-light text-parchment-light font-display text-lg tracking-wide rounded transition-all duration-300 hover:shadow-lg hover:shadow-eldritch/30"
        >
          Summon the Darkness
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

