import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './shell';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Không tìm thấy phần tử gốc #root để khởi tạo giao diện DocFlow Studio.');
}

createRoot(rootElement).render(
  <StrictMode>
    <AppShell />
  </StrictMode>
);
