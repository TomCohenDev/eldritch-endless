import { Link } from 'react-router-dom';
import { 
  Users, 
  Scroll, 
  Eye, 
  Zap, 
  Moon,
  BookOpen,
  Home
} from 'lucide-react';
import { useGame } from '../context/GameContext';

export function GameSession() {
  const { state, advancePhase } = useGame();

  const phaseLabels: Record<string, string> = {
    setup: 'Preparation',
    action: 'Action Phase',
    encounter: 'Encounter Phase',
    mythos: 'Mythos Phase',
    resolution: 'Resolution',
  };

  return (
    <div className="min-h-dvh flex flex-col bg-gradient-to-b from-void to-abyss">
      {/* Header */}
      <header className="p-4 border-b border-obsidian/50">
        <div className="flex items-center justify-between">
          <Link to="/" className="touch-target p-2 -m-2">
            <Home className="w-5 h-5 text-parchment-dark hover:text-parchment transition-colors" />
          </Link>
          
          <div className="text-center">
            <h1 className="font-display text-lg text-parchment-light">
              Round {state.round}
            </h1>
            <p className="font-accent text-xs text-eldritch-light">
              {phaseLabels[state.phase]}
            </p>
          </div>

          <div className="text-right">
            <p className="font-accent text-xs text-parchment-dark">DOOM</p>
            <p className="font-display text-lg text-blood-light">
              {state.doom}/{state.maxDoom}
            </p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 p-4 overflow-y-auto">
        {/* Players summary */}
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-eldritch-light" />
            <h2 className="font-accent text-sm text-parchment-dark">
              INVESTIGATORS ({state.players.length})
            </h2>
          </div>

          <div className="grid gap-2">
            {state.players.length === 0 ? (
              <p className="font-body text-parchment-dark italic text-sm">
                No investigators assigned yet...
              </p>
            ) : (
              state.players.map((player) => (
                <div
                  key={player.id}
                  className="bg-shadow/50 rounded p-3 border border-obsidian/50"
                >
                  <p className="font-display text-parchment-light">
                    {player.investigator?.title || player.name}
                  </p>
                  <p className="font-accent text-xs text-parchment-dark">
                    {player.location}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Narrative log preview */}
        <section className="mb-6">
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
              <div className="space-y-3">
                {state.narrativeLog.slice(-3).map((event) => (
                  <div key={event.id} className="border-l-2 border-eldritch-dark pl-3">
                    <p className="font-display text-sm text-parchment-light">
                      {event.title}
                    </p>
                    <p className="font-body text-xs text-parchment-dark line-clamp-2">
                      {event.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Action buttons */}
      <div className="p-4 border-t border-obsidian/50 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/encounter"
            className="touch-target flex items-center justify-center gap-2 px-4 py-3 bg-cosmic hover:bg-cosmic-light text-parchment-light font-display text-sm tracking-wide rounded transition-colors"
          >
            <Eye className="w-4 h-4" />
            Encounter
          </Link>

          <button
            onClick={() => advancePhase()}
            className="touch-target flex items-center justify-center gap-2 px-4 py-3 bg-eldritch hover:bg-eldritch-light text-parchment-light font-display text-sm tracking-wide rounded transition-colors"
          >
            <Zap className="w-4 h-4" />
            Mythos
          </button>
        </div>

        <Link
          to="/encounter"
          className="touch-target w-full flex items-center justify-center gap-2 px-4 py-3 bg-shadow hover:bg-obsidian text-parchment border border-obsidian hover:border-eldritch-dark font-display text-sm tracking-wide rounded transition-colors"
        >
          <BookOpen className="w-4 h-4" />
          View Full Narrative
        </Link>
      </div>
    </div>
  );
}

