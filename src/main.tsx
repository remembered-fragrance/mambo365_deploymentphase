import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Font tự host — subset vietnamese + latin, ba độ đậm đang dùng.
import '@fontsource/be-vietnam-pro/vietnamese-400.css';
import '@fontsource/be-vietnam-pro/vietnamese-600.css';
import '@fontsource/be-vietnam-pro/vietnamese-800.css';
import '@fontsource/be-vietnam-pro/latin-400.css';
import '@fontsource/be-vietnam-pro/latin-600.css';
import '@fontsource/be-vietnam-pro/latin-800.css';

import './index.css';
import { App } from './App';

const container = document.getElementById('root');
if (!container) throw new Error('Không tìm thấy #root');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
