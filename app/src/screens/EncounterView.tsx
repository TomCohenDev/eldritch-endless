import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X, Dices, ChevronDown } from 'lucide-react';
import { useGame } from '../context/GameContext';

export function EncounterView() {
  const navigate = useNavigate();
  const { state, resolveEncounter } = useGame();
  const [showingOutcome, setShowingOutcome] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);

  // Mock encounter data (will come from AI backend)
  const mockEncounter = state.currentEncounter || {
    id: 'mock-1',
    timestamp: Date.now(),
    type: 'encounter' as const,
    title: 'The Whispering Shadows',
    content: `As you enter the abandoned library, the air grows thick with the scent of ancient paper and something else... something wrong. The shadows between the towering bookshelves seem to move of their own accord, whispering secrets in languages that predate humanity.

A leather-bound tome lies open on the central reading table, its pages turning slowly despite the still air. The text writhes and shifts as you watch, forming words that call to you by name.`,
    choices: [
      { id: 'read', label: 'Read the tome', description: 'Test Lore (2)' },
      { id: 'flee', label: 'Leave immediately', description: 'No test required' },
      { id: 'burn', label: 'Burn the book', description: 'Test Will (1)' },
    ],
  };

  const handleChoice = (choiceId: string) => {
    setSelectedChoice(choiceId);
    setShowingOutcome(true);
  };

  const handleContinue = () => {
    resolveEncounter(selectedChoice === 'read' ? 'pass' : 'neutral');
    navigate('/game');
  };

  return (
    <div className="min-h-dvh flex flex-col bg-void">
      {/* Header */}
      <header className="p-4 border-b border-obsidian/50 flex items-center gap-4">
        <button
          onClick={() => navigate('/game')}
          className="touch-target p-2 -m-2"
        >
          <ArrowLeft className="w-5 h-5 text-parchment-dark hover:text-parchment transition-colors" />
        </button>
        <div className="flex-1">
          <p className="font-accent text-xs text-eldritch-light">ENCOUNTER</p>
          <h1 className="font-display text-lg text-parchment-light">
            {mockEncounter.title}
          </h1>
        </div>
      </header>

      {/* Encounter content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {/* Narrative text */}
          <div className="prose prose-invert max-w-none mb-8">
            <p className="font-body text-parchment leading-relaxed whitespace-pre-line">
              {mockEncounter.content}
            </p>
          </div>

          {/* Outcome display */}
          {showingOutcome && (
            <div className="mb-8 animate-fade-in">
              <div className="bg-shadow/50 rounded-lg p-6 border border-eldritch-dark">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-sickly flex items-center justify-center">
                    <Check className="w-5 h-5 text-parchment-light" />
                  </div>
                  <div>
                    <p className="font-accent text-xs text-sickly-light">SUCCESS</p>
                    <p className="font-display text-parchment-light">
                      The Tome Yields Its Secrets
                    </p>
                  </div>
                </div>
                
                <p className="font-body text-parchment-dark text-sm">
                  The words burn themselves into your mind, revealing fragments of 
                  a greater truth. You gain 1 Clue and 1 Spell, but lose 1 Sanity 
                  as forbidden knowledge takes its toll.
                </p>
              </div>
            </div>
          )}

          {/* Choice buttons */}
          {!showingOutcome && mockEncounter.choices && (
            <div className="space-y-3">
              <p className="font-accent text-xs text-parchment-dark mb-4">
                CHOOSE YOUR ACTION
              </p>
              {mockEncounter.choices.map((choice) => (
                <button
                  key={choice.id}
                  onClick={() => handleChoice(choice.id)}
                  className="touch-target w-full text-left p-4 bg-shadow/50 hover:bg-shadow rounded-lg border border-obsidian hover:border-eldritch-dark transition-all"
                >
                  <p className="font-display text-parchment-light mb-1">
                    {choice.label}
                  </p>
                  {choice.description && (
                    <p className="font-accent text-xs text-parchment-dark">
                      {choice.description}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Continue button */}
      {showingOutcome && (
        <div className="p-4 border-t border-obsidian/50">
          <button
            onClick={handleContinue}
            className="touch-target w-full flex items-center justify-center gap-2 px-6 py-4 bg-eldritch hover:bg-eldritch-light text-parchment-light font-display text-lg tracking-wide rounded transition-colors"
          >
            Continue
            <ChevronDown className="w-5 h-5 rotate-[-90deg]" />
          </button>
        </div>
      )}

      {/* Scroll indicator */}
      {!showingOutcome && (
        <div className="p-4 flex justify-center">
          <ChevronDown className="w-6 h-6 text-parchment-dark animate-bounce" />
        </div>
      )}
    </div>
  );
}





