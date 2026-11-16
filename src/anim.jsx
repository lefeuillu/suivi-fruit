import { useEffect, useRef, useState } from 'react';

export const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Compte de 0 (ou de l'ancienne valeur) jusqu'à la valeur ; texte inchangé si la valeur n'est pas un nombre. */
export function Count({ value, dur = 700 }) {
  const num = typeof value === 'number' && isFinite(value);
  const [shown, setShown] = useState(num && !reducedMotion() ? 0 : value);
  const from = useRef(0);
  useEffect(() => {
    if (!num || reducedMotion()) { setShown(value); return undefined; }
    const a = from.current, b = value, t0 = performance.now();
    let raf;
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      setShown(Math.round(a + (b - a) * e));
      if (k < 1) raf = requestAnimationFrame(tick); else from.current = b;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, num, dur]);
  return <>{shown}</>;
}

/** Remplissage d'une barre : part de 0 à l'ouverture puis glisse vers la valeur. */
export function GrowFill({ pct, style }) {
  const [w, setW] = useState(reducedMotion() ? pct : 0);
  useEffect(() => { const id = requestAnimationFrame(() => setW(pct)); return () => cancelAnimationFrame(id); }, [pct]);
  return <div style={{ ...style, width: `${w}%`, transition: 'width .8s cubic-bezier(.22,1,.36,1)' }} />;
}

const COLORS = ['#FACC15', '#2DD4BF', '#38BDF8', '#818CF8', '#C084FC', '#F472B6', '#FB923C'];
export function Confetti() {
  if (reducedMotion()) return null;
  return (
    <span aria-hidden className="anim-1">
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2 + (i % 2) * 0.2, r = 34 + (i % 3) * 14;
        return <i key={i} className="confetti" style={{ '--cx': `${Math.cos(a) * r}px`, '--cy': `${Math.sin(a) * r}px`, background: COLORS[i % COLORS.length], animationDelay: `${(i % 4) * 20}ms` }} />;
      })}
    </span>
  );
}

/** Vrai pendant ~650 ms après chaque changement de `value` (pas au premier affichage). */
export function useChanged(value) {
  const prev = useRef(value);
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (prev.current === value) return undefined;
    prev.current = value; setOn(true);
    const id = setTimeout(() => setOn(false), 650);
    return () => clearTimeout(id);
  }, [value]);
  return on;
}

export const CheckAnim = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#86EFAC" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path className="check-draw" d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

/** Fruits qui s'envolent vers la barre des classes après un transfert. */
export function FlyDots({ n, onEnd }) {
  const [dots, setDots] = useState([]);
  useEffect(() => {
    if (reducedMotion()) { onEnd(); return undefined; }
    const t = document.querySelector('[data-classbar]');
    const r = t ? t.getBoundingClientRect() : { left: innerWidth / 2, top: 60, width: 0, height: 0 };
    const sx = innerWidth / 2, sy = innerHeight * 0.55, tx = r.left + Math.min(r.width, 160) / 2, ty = r.top + r.height / 2;
    setDots(Array.from({ length: Math.min(n, 7) }, (_, i) => ({ dx: tx - sx + (i - 3) * 6, dy: ty - sy, sx: sx + (i - 3) * 14, sy, c: COLORS[i % COLORS.length], d: i * 70 })));
    const id = setTimeout(onEnd, 1500);
    return () => clearTimeout(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return dots.map((d, i) => <span key={i} aria-hidden className="fly-dot" style={{ left: d.sx, top: d.sy, background: d.c, '--dx': `${d.dx}px`, '--dy': `${d.dy}px`, animationDelay: `${d.d}ms` }} />);
}
