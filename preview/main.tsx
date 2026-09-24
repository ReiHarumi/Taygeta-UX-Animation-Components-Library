import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import PreviewPage from './PreviewPage';
import './preview.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PreviewPage />
  </StrictMode>,
);
