import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { UserStatsProvider } from './contexts/UserStatsContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UserStatsProvider>
      <App />
    </UserStatsProvider>
  </StrictMode>,
);
