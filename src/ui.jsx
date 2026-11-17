import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Confetti, CheckAnim, useChanged } from './anim';
import { Star, X } from 'lucide-react';
import { T, levelColor, colorKey } from './theme';

export function useIsDesktop() {
  const q = '(min-width: 900px)';
  const [v, setV] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const h = () => setV(m.matches);
    m.addEventListener('change', h);
    return () => m.removeEventListener('change', h);
  }, []);
  return v;
}

export const CttBadge = () => (
  <span className="ctt-badge"><Star size={10} fill="currentColor" strokeWidth={0} />CTT</span>
);

/** Cellule/pastille de niveau colorée */
export function LevelCell({ fruit, size = 52, square = true }) {
  const c = levelColor(fruit);
  const k = colorKey(fruit);
  const label = fruit.categorie === 'NextClass' ? 'Next' : fruit.categorie === 'Talak' ? 'Talak' : fruit.niveau || '—';
  const changed = useChanged(label);
  const small = label.length > 2;
  return (
    <div
 aria-label={`Niveau ${label}`}
 className={`ui-1 ${changed ? 'pop' : ''}`}
 style={{ width: size, minWidth: size, height: square ? size : 28, borderRadius: square ? 14 : 999, background: c ? c.bg : '#E5E7EB', color: c ? c.fg : T.muted, fontSize: small ? 11 : 18 }}
 title={k || ''}
 >
      {label}
      {changed && label === 'TT' && <Confetti />}
    </div>
  );
}

export const btn = {
  primary: { background: T.yellow, color: T.yellowDark, border: 'none', borderRadius: 999, padding: '0 18px', minHeight: 44, fontWeight: 700, fontSize: 15 },
  ghost: { background: '#fff', color: T.text, border: `1px solid ${T.line}`, borderRadius: 999, padding: '0 16px', minHeight: 44, fontWeight: 600, fontSize: 14 },
  danger: { background: '#fff', color: T.danger, border: `1px solid #FCA5A5`, borderRadius: 999, padding: '0 16px', minHeight: 44, fontWeight: 600, fontSize: 14 },
};

export const input = {
  width: '100%', minHeight: 44, padding: '10px 12px', borderRadius: 12, border: `1px solid ${T.line}`,
  background: '#fff', fontSize: 16, color: T.text,
};

export function Field({ label, error, children, hint }) {
  return (
    <label className="ui-2">
      <span className="ui-3">{label}</span>
      {children}
      {hint && !error && <span className="ui-4">{hint}</span>}
      {error && <span role="alert" className="ui-5">{error}</span>}
    </label>
  );
}

/** Fenêtre : feuille du bas sur mobile, boîte centrée sur ordinateur */
let lastPt = { x: 0, y: 0 };
if (typeof window !== 'undefined') window.addEventListener('pointerdown', (e) => { lastPt = { x: e.clientX, y: e.clientY }; }, true);

export function Sheet({ title, onClose, children, footer, wide, pop }) {
  const desktop = useIsDesktop();
  const box = useRef(null);
  useLayoutEffect(() => {
    if (!pop || !box.current) return;
    const r = box.current.getBoundingClientRect();
    box.current.style.setProperty('--ox', `${Math.max(0, Math.min(r.width, lastPt.x - r.left))}px`);
    box.current.style.setProperty('--oy', `${Math.max(0, Math.min(r.height, lastPt.y - r.top))}px`);
  }, [pop]);
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="fade-anim ui-6" onClick={onClose} style={{ alignItems: desktop ? 'center' : 'flex-end' }}>
      <div
 role="dialog" aria-modal="true" aria-label={title}
 ref={box} className={`ui-7 ${pop ? 'pop-anim' : 'sheet-anim'}`} onClick={(e) => e.stopPropagation()}
 style={{ maxWidth: wide ? 720 : 520, maxHeight: desktop ? '88vh' : '92svh', borderRadius: desktop ? 20 : '20px 20px 0 0' }}
 >
        <div className="ui-8">
          <h2 className="ui-9">{title}</h2>
          <button onClick={onClose} aria-label="Fermer" className="ui-10"><X size={22} /></button>
        </div>
        <div className="ui-11 no-scrollbar" >{children}</div>
        {footer && <div className="ui-12">{footer}</div>}
      </div>
    </div>
  );
}

export function Confirm({ title, text, confirmLabel = 'Confirmer', danger, onConfirm, onCancel }) {
  return (
    <Sheet title={title} onClose={onCancel} footer={<>
      <button className="btn-ghost" onClick={onCancel}>Annuler</button>
      <button style={danger ? { ...btn.primary, background: T.danger, color: '#fff' } : btn.primary} onClick={onConfirm}>{confirmLabel}</button>
    </>}>
      <p className="ui-13">{text}</p>
    </Sheet>
  );
}

export function Toast({ toast, onDismiss }) {
  if (!toast) return null;
  const ms = toast.undo ? 6000 : 3500;
  return (
    <div key={toast.id} role="status" className="toast-in ui-14" style={{ background: toast.kind === 'err' ? T.danger : '#1F2433' }}>
      {toast.kind !== 'err' && <CheckAnim />}
      <span className="ui-15">{toast.msg}</span>
      {toast.undo && (
        <button type="button" onClick={() => { onDismiss && onDismiss(); toast.undo.fn(); }} className="ui-16">
          {toast.undo.label || 'Annuler'}
        </button>
      )}
      <span aria-hidden className="toast-timer" style={{ animationDuration: `${ms}ms`, background: toast.kind === 'err' ? '#FCA5A5' : '#FACC15' }} />
    </div>
  );
}

export const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};
