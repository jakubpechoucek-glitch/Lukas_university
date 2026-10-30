import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { DEMO, leaveDemo } from './demo/demo';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {DEMO && (
      <div className="bg-amber-300 px-4 py-1.5 text-center text-sm font-semibold text-slate-900">
        Ukázkový režim – smyšlené známky, změny se neukládají.{' '}
        <button onClick={leaveDemo} className="underline underline-offset-2">Ukončit</button>
      </div>
    )}
    <App />
    <Toaster position="top-right" toastOptions={{ duration: 4000, style: { borderRadius: '10px', fontSize: '14px' } }} />
  </React.StrictMode>
);
