import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { T, LEVEL_COLORS, catLabel, levelColor } from './theme';
import { LevelCell, CttBadge } from './ui';
import { SwipeRow } from './Extras';
import { groupBy, sortByName, needsFollowUp } from './logic';

const COLS = '44px minmax(150px,1.3fr) minmax(150px,1.3fr) minmax(110px,1fr) minmax(110px,1fr) 84px 64px minmax(180px,2fr) 84px 96px';

const Relance = () => <span className="relance-pulse fruitsheet-5" >À relancer</span>;

function MobileRow({ f, onOpen }) {
  return (
    <button onClick={() => onOpen(f)} className={`fruitsview-1 ${f.ctt ? 'ctt-card' : ''}`}
 style={{ border: `1px solid ${f.ctt ? T.gold : T.line}` }}>
      <div className="app-13">
        <div className="fruitsview-2">
          <span className="fruitsview-3">{f.nom}</span>
          {f.ctt && <CttBadge />}
          {needsFollowUp(f) && <Relance />}
        </div>
        <div className="fruitsview-4">{f.statut || f.enseignement || '—'}</div>
        <div className="fruitsview-5">{f.format} · {f.jours} j</div>
      </div>
      <LevelCell fruit={f} />
    </button>
  );
}

function Card({ f, onOpen }) {
  const c = levelColor(f);
  return (
    <button onClick={() => onOpen(f)} className={`fruitsview-6 ${f.ctt ? 'ctt-card' : ''}`}
 style={{ border: `1px solid ${f.ctt ? T.gold : T.line}`, borderTop: `5px solid ${c ? c.bg : T.line}` }}>
      <div className="fruitsview-7">
        <span className="fruitsview-8">{f.nom}</span>
        <LevelCell fruit={f} size={40} />
      </div>
      <div className="fruitsview-9">{f.ctt && <CttBadge />}{needsFollowUp(f) && <Relance />}</div>
      <div className="fruitsview-10">{f.statut || f.enseignement || '—'}</div>
      <div className="fruitsview-11">{catLabel(f.categorie)} · {f.format} · {f.jours} j</div>
    </button>
  );
}

function DesktopHeader({ allChecked, onAll }) {
  const h = { fontSize: 12, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: .4 };
  return (
    <div className="fruitsview-12" style={{ gridTemplateColumns: COLS }}>
      <input type="checkbox" aria-label="Tout sélectionner" checked={allChecked} onChange={onAll} className="fruitsview-13" />
      {['Nom', 'Enseignement', 'Indoja', 'BBT', 'Format', 'Jours', 'Statut', 'Niveau', 'Catégorie'].map((t) => <span key={t} style={h}>{t}</span>)}
    </div>
  );
}

function DesktopRow({ f, onOpen, sel, toggle }) {
  const cell = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14 };
  return (
    <div className={`fruitsview-14 ${f.ctt ? 'ctt-card' : ''}`} style={{ gridTemplateColumns: COLS, background: sel ? '#FFFBEB' : '#fff', border: `1px solid ${f.ctt ? T.gold : T.line}` }}>
      <input type="checkbox" aria-label={`Sélectionner ${f.nom}`} checked={sel} onChange={() => toggle(f.id)} className="fruitsview-13" />
      <button onClick={() => onOpen(f)} style={{ ...cell, background: 'none', border: 'none', textAlign: 'left', fontFamily: T.font, fontWeight: 700, fontSize: 16, display: 'flex', gap: 6, alignItems: 'center', minHeight: 44 }}>
        <span style={cell}>{f.nom}</span>{f.ctt && <CttBadge />}
      </button>
      <span style={cell} title={f.enseignement}>{f.enseignement || '—'}</span>
      <span style={cell}>{[f.indoja_nom, f.indoja_groupe].filter(Boolean).join(' · ') || '—'}</span>
      <span style={cell}>{[f.bbt_nom, f.bbt_tjn].filter(Boolean).join(' · ') || '—'}</span>
      <span style={cell}>{f.format}</span>
      <span style={cell}>{f.jours}</span>
      <span style={{ ...cell, display: 'flex', gap: 6, alignItems: 'center' }} title={f.statut}>{needsFollowUp(f) && <Relance />}<span style={cell}>{f.statut || '—'}</span></span>
      <LevelCell fruit={f} size={44} square={false} />
      <span style={cell}>{catLabel(f.categorie)}</span>
    </div>
  );
}

function GroupFooter({ items }) {
  const on = items.filter((f) => f.format === 'Online').length;
  const segs = {};
  items.forEach((f) => { const k = f.categorie === 'NextClass' ? 'Next' : f.categorie === 'Talak' ? 'Talak' : f.niveau || 'Next'; segs[k] = (segs[k] || 0) + 1; });
  return (
    <div className="fruitsview-15">
      <div className="fruitsview-16" aria-hidden>
        {Object.entries(segs).map(([k, n]) => <div key={k} style={{ width: `${(n / items.length) * 100}%`, background: (LEVEL_COLORS[k] || LEVEL_COLORS.Next).bg }} />)}
      </div>
      <span className="dashboard-61">{on} on / {items.length - on} off</span>
    </div>
  );
}

/** Garde brièvement les lignes qui viennent de disparaître (archivage…) pour les replier en douceur. */
function useGhosts(list, key) {
  const prev = useRef({ key, list });
  const [ghosts, setGhosts] = useState([]);
  useEffect(() => {
    const p = prev.current;
    if (p.key === key) {
      const ids = new Set(list.map((x) => x.id));
      const gone = p.list.map((x, i) => ({ f: x, i, k: Math.random() })).filter((x) => !ids.has(x.f.id));
      if (gone.length && gone.length <= 3) {
        setGhosts((g) => [...g, ...gone]);
        setTimeout(() => setGhosts((g) => g.filter((x) => !gone.includes(x))), 380);
      }
    }
    prev.current = { key, list };
  }, [list, key]);
  return ghosts;
}

const delay = (i) => ({ animationDelay: `${Math.min(i, 12) * 30}ms` });

export default function FruitsView({ fruits, mode, desktop, onOpen, onQuick, readOnly, selected, setSelected, animKey }) {
  const [collapsed, setCollapsed] = useState({});
  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const sorted = sortByName(fruits);
  const ghosts = useGhosts(sorted, animKey);

  if (!fruits.length) return <p className="fruitsview-17">Aucun fruit ne correspond.</p>;

  const one = (f, i) => (desktop
    ? <div key={f.id} className="row-in" style={delay(i)}><DesktopRow f={f} onOpen={onOpen} sel={selected.includes(f.id)} toggle={toggle} /></div>
    : <div key={f.id} className="row-in" style={delay(i)}><SwipeRow onSwipe={() => onQuick && onQuick(f)} disabled={readOnly || !onQuick}><MobileRow f={f} onOpen={onOpen} /></SwipeRow></div>);
  const list = (items, withGhosts) => {
    const out = items.map(one);
    if (withGhosts) {
      [...ghosts].sort((a, b) => a.i - b.i).forEach((g) => {
        const row = desktop ? <DesktopRow f={g.f} onOpen={() => {}} sel={false} toggle={() => {}} /> : <MobileRow f={g.f} onOpen={() => {}} />;
        out.splice(Math.min(g.i, out.length), 0, <div key={`ghost-${g.k}`} className="row-out" aria-hidden>{row}</div>);
      });
    }
    return out;
  };

  const header = (items) => desktop && (
    <DesktopHeader allChecked={items.length > 0 && items.every((f) => selected.includes(f.id))}
      onAll={() => setSelected((s) => (items.every((f) => s.includes(f.id)) ? s.filter((id) => !items.some((f) => f.id === id)) : [...new Set([...s, ...items.map((f) => f.id)])]))} />
  );

  if (mode === 'cartes') {
    return <div className="fruitsview-18">{sorted.map((f, i) => <div key={f.id} className="row-in" style={{ ...delay(i), display: 'flex' }}><Card f={f} onOpen={onOpen} /></div>)}</div>;
  }

  if (mode === 'enseignement' || mode === 'niveau') {
    return groupBy(sorted, mode).map((g) => {
      const open = !collapsed[g.key];
      return (
        <section key={g.key} className="fruitsview-19" style={{ borderLeft: `5px solid ${g.color}` }}>
          <button onClick={() => setCollapsed((c) => ({ ...c, [g.key]: open }))} aria-expanded={open}
            className="fruitsview-20">
            <span className="fruitsview-21" style={{ transform: open ? 'none' : 'rotate(-90deg)', color: g.color }}><ChevronDown size={18} /></span>
            <span className="fruitsview-22" style={{ color: g.color }}>{g.title}</span>
            <span className="fruitsview-23">{g.items.length} {g.items.length > 1 ? 'fruits' : 'fruit'} · {g.days} j</span>
          </button>
          {open && (<div className="fruitsview-24">{header(g.items)}{list(g.items)}<GroupFooter items={g.items} /></div>)}
        </section>
      );
    });
  }

  return (<>{header(sorted)}{list(sorted, true)}</>);
}
