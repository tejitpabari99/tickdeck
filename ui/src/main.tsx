import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import './types/index.ts'; // registers all card types
import './styles/main.css';
import './styles/site.css';
import './styles/utils.css';
import './styles/widgets.css';
import './styles/types/kpi.css';
import './styles/types/list.css';
import './styles/types/markdown.css';
import './styles/types/media.css';
import './styles/types/table.css';
import './styles/types/calendar.css';
import './styles/mobile.css';

const el = document.getElementById('root');
if (el) {
  createRoot(el).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
