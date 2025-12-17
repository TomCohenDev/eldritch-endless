import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GameProvider } from './context/GameContext';
import { Home } from './screens/Home';
import { GameSetup } from './screens/GameSetup';
import { GameSession } from './screens/GameSession';
import { EncounterView } from './screens/EncounterView';

function App() {
  return (
    <GameProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/setup" element={<GameSetup />} />
          <Route path="/game" element={<GameSession />} />
          <Route path="/encounter" element={<EncounterView />} />
        </Routes>
      </BrowserRouter>
    </GameProvider>
  );
}

export default App;
