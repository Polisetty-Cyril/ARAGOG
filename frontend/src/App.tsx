
import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import ChatInterface from './components/ChatInterface';
import { useStore } from './store';

const App: React.FC = () => {
  const user = useStore(state => state.user);
  const theme = useStore(state => state.settings.theme);

  useEffect(() => {
    const root = window.document.documentElement;
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    if (isDark) {
      root.classList.remove('light-theme');
      root.classList.add('dark-theme');
    } else {
      root.classList.remove('dark-theme');
      root.classList.add('light-theme');
    }
  }, [theme]);

  return (
    <Router>
      <div className="min-h-screen transition-colors duration-300 overflow-x-hidden">
        <Routes>
          <Route path="/" element={user ? <Navigate to="/chat" /> : <LandingPage />} />
          <Route path="/chat" element={user ? <ChatInterface /> : <Navigate to="/" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
