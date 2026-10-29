import { useEffect, useRef } from 'react';

// Zásobník otevřených oken – Escape zavře jen to nejvyšší (formulář univerzity nad formulářem programu).
const stack = [];

export default function Modal({ title, onClose, children, footer, wide = false }) {
  const id = useRef(Symbol('modal'));
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const me = id.current;
    stack.push(me);
    const onKey = (e) => {
      if (e.key === 'Escape' && stack.at(-1) === me) close.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      stack.splice(stack.indexOf(me), 1);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-2 sm:p-6" onMouseDown={onClose}>
      <div
        className={`my-4 w-full ${wide ? 'max-w-4xl' : 'max-w-lg'} rounded-xl bg-white shadow-xl`}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-2xl leading-none text-slate-400 hover:text-slate-700" aria-label="Zavřít">×</button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}
