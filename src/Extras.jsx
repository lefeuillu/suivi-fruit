import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Plus, MoreHorizontal, Pencil, Target, FileSpreadsheet, ArrowRightLeft, Archive, ArchiveRestore, Shield, Smartphone, X } from 'lucide-react';
import { T, CATEGORIES, catLabel } from './theme';
import { Sheet, Field, LevelCell, input } from './ui';
import { errorText } from './useStore';

/* ---------- Barre des classes : onglets (≤ 2 classes) ou liste déroulante (≥ 3), + et ⋯ ---------- */

export const TAB_LIMIT = 2; // à partir de 3 classes actives : liste déroulante

export function ClassBar({ sorted, klass, onPick, onOpenPicker, onNew, onMenu, readOnly, bump }) {
  const active = sorted.filter((c) => !c.archivee);
  const dropdown = active.length > TAB_LIMIT;
  const tabs = active.slice(0, TAB_LIMIT);
  if (klass && !tabs.some((c) => c.id === klass.id) && !dropdown) tabs.push(klass);
  const oldCount = sorted.length - active.length;
  // Soulignement jaune qui glisse d'un onglet à l'autre
  const tabsRef = useRef(null);
  const [bar, setBar] = useState(null);
  const key = tabs.map((c) => c.id + c.nom).join('|') + '|' + (klass && klass.id) + '|' + dropdown;
  useLayoutEffect(() => {
    const root = tabsRef.current;
    if (!root || dropdown) return undefined;
    const measure = () => {
      const el = root.querySelector('[data-active="true"]');
      setBar(el ? { left: el.offsetLeft, width: el.offsetWidth } : null);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const icon = { width: 44, height: 44, border: 'none', background: 'transparent', color: T.text, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
  const dots = (c) => (
    <button aria-label={`Plus d'actions pour ${c.nom}`} aria-haspopup="dialog" title="Plus d'actions" onClick={() => onMenu(c)}
      style={{ ...icon, width: 40, marginLeft: -6 }}><MoreHorizontal size={18} /></button>
  );
  return (
    <div data-classbar className={`extras-1 ${bump ? 'bump' : ''}`} key={bump ? bump.key : 'bar'} >
      {bump && <span className="bubble extras-2" aria-hidden >+{bump.n}</span>}
      {dropdown ? (<>
        <button type="button" aria-haspopup="dialog" aria-label="Choisir la classe" onClick={onOpenPicker}
          className="extras-3">
          <span className="extras-4">{klass ? klass.nom : 'Classe'}{klass && klass.archivee ? ' (archivée)' : ''}</span>
          <span aria-hidden>▾</span>
          <span className="extras-5">{sorted.length} classes</span>
        </button>
        {klass && dots(klass)}
      </>) : (
        <div ref={tabsRef} role="tablist" aria-label="Classes" className="extras-6">
          {bar && <span aria-hidden className="extras-7" style={{ left: bar.left, width: bar.width }} />}
          {tabs.map((c) => (
            <div key={c.id} data-active={!!(klass && c.id === klass.id)} className="extras-8">
            <button role="tab" aria-selected={c.id === (klass && klass.id)} onClick={() => onPick(c.id)}
              className="extras-9" style={{ fontWeight: klass && c.id === klass.id ? 800 : 600, color: klass && c.id === klass.id ? T.text : T.muted }}>
              {c.nom}{c.archivee ? ' (archivée)' : ''}
            </button>
            {dots(c)}
            </div>
          ))}
        </div>
      )}
      {!dropdown && oldCount > 0 && (
        <button onClick={onOpenPicker} className="extras-10">Anciennes ({oldCount}) ▾</button>
      )}
      {!readOnly && (
        <button aria-label="Ajouter une classe" title="Ajouter une classe" onClick={onNew} className="plus-spin" style={icon}><Plus size={18} strokeWidth={2.6} /></button>
      )}
    </div>
  );
}

/* ---------- Menu « ⋯ » de la classe ---------- */

export function ClassMenu({ klass, readOnly, onClose, onRename, onGoals, onExcel, onTransfer, onToggleArchive }) {
  const item = (Ic, label, hint, fn, danger) => (
    <button key={label} onClick={() => { onClose(); fn(); }}
      className="extras-11" style={{ color: danger ? T.danger : T.text }}>
      <Ic size={20} className="extras-12" />
      <span className="app-13">
        <span className="extras-13">{label}</span>
        {hint && <span className="extras-14">{hint}</span>}
      </span>
    </button>
  );
  return (
    <Sheet title={klass.nom} onClose={onClose} pop>
      {!readOnly && item(Pencil, 'Renommer', 'Changer le nom de la classe', onRename)}
      {!readOnly && item(Target, 'Modifier les objectifs', 'Objectifs finaux et cibles par semaine', onGoals)}
      {item(FileSpreadsheet, "Exporter l'Excel de la classe", 'Un onglet par catégorie, avec les commentaires', onExcel)}
      {!readOnly && item(ArrowRightLeft, 'Passer des fruits à une autre classe', 'Copier ou déplacer, avec leurs commentaires', onTransfer)}
      {!readOnly && (klass.archivee
        ? item(ArchiveRestore, 'Désarchiver', 'La classe revient dans la liste', onToggleArchive)
        : item(Archive, 'Archiver', 'Fruits, objectifs et historique conservés', onToggleArchive, true))}
      {readOnly && <p className="extras-15">Accès en lecture seule : les modifications sont réservées à l'équipe.</p>}
    </Sheet>
  );
}

/* ---------- Renommer ---------- */

export function RenameClassModal({ klass, classes, store, onClose }) {
  const [nom, setNom] = useState(klass.nom);
  const [busy, setBusy] = useState(false);
  const clean = nom.trim();
  const dup = classes.some((c) => c.id !== klass.id && c.nom.trim().toLowerCase() === clean.toLowerCase());
  const err = !clean ? 'Le nom est obligatoire.' : dup ? 'Une autre classe porte déjà ce nom.' : '';
  async function save() {
    if (err || clean === klass.nom) return onClose();
    setBusy(true);
    try { await store.renameClass(klass.id, clean); store.notify('Classe renommée'); onClose(); }
    catch (e) { store.notify(errorText(e), 'err'); setBusy(false); }
  }
  return (
    <Sheet title="Renommer la classe" onClose={onClose} footer={<>
      <button className="btn-ghost" onClick={onClose}>Annuler</button>
      <button className="btn-primary" onClick={save} disabled={busy || !!err}>Enregistrer</button>
    </>}>
      <Field label="Nom de la classe" error={nom !== klass.nom ? err : ''}>
        <input style={input} value={nom} onChange={(e) => setNom(e.target.value)} autoFocus maxLength={60} onKeyDown={(e) => e.key === 'Enter' && save()} />
      </Field>
    </Sheet>
  );
}

/* ---------- Passer des fruits à une autre classe ---------- */

export function TransferModal({ store, klass, sorted, fruits, onClose, onDone }) {
  const targets = sorted.filter((c) => c.id !== klass.id && !c.archivee);
  const [to, setTo] = useState(targets[0] ? targets[0].id : '');
  const [mode, setMode] = useState('move');
  const [withComments, setWithComments] = useState(true);
  const [nextTo, setNextTo] = useState('keep'); // catégorie des « Next class » dans la nouvelle classe
  const [picked, setPicked] = useState(() => fruits.filter((f) => f.categorie === 'NextClass').map((f) => f.id));
  const [busy, setBusy] = useState(false);
  const list = [...fruits].sort((a, b) => (a.categorie === 'NextClass' ? 0 : 1) - (b.categorie === 'NextClass' ? 0 : 1) || a.nom.localeCompare(b.nom, 'fr'));
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const nextIds = picked.filter((id) => (fruits.find((f) => f.id === id) || {}).categorie === 'NextClass');
  const otherIds = picked.filter((id) => !nextIds.includes(id));
  const target = sorted.find((c) => c.id === to);

  async function go() {
    setBusy(true);
    try {
      const groups = [];
      if (nextIds.length) groups.push({ ids: nextIds, changes: nextTo === 'keep' ? null : { categorie: nextTo, niveau: '' }, back: { categorie: 'NextClass', niveau: '' } });
      if (otherIds.length) groups.push({ ids: otherIds, changes: null, back: null });
      const done = [];
      for (const g of groups) {
        const r = await store.transferFruits(g.ids, to, mode, withComments, g.changes);
        done.push({ g, created: (r || []).map((x) => x.id) });
      }
      const n = picked.length;
      const undo = async () => {
        try {
          for (const d of done) {
            if (mode === 'copy') await store.remove(d.created);
            else await store.transferFruits(d.g.ids, klass.id, 'move', false, d.g.changes ? d.g.back : null);
          }
          store.notify('Transfert annulé');
        } catch (e) { store.notify(errorText(e), 'err'); }
      };
      store.notify(`${n} fruit${n > 1 ? 's' : ''} ${mode === 'copy' ? 'copié' : 'déplacé'}${n > 1 ? 's' : ''} vers ${target ? target.nom : 'la classe'}`, 'ok', { fn: undo });
      onDone(to, n);
    } catch (e) { store.notify(errorText(e), 'err'); setBusy(false); }
  }

  if (!targets.length) {
    return <Sheet title="Passer des fruits" onClose={onClose} footer={<button className="btn-primary" onClick={onClose}>OK</button>}>
      <p className="extras-16">Il n'y a pas d'autre classe active. Crée d'abord la classe suivante avec le bouton +.</p>
    </Sheet>;
  }
  const radio = (k, l, hint) => (
    <label key={k} className="extras-17">
      <input type="radio" name="mode" checked={mode === k} onChange={() => setMode(k)} className="extras-18" />
      <span><b>{l}</b><span className="extras-19">{hint}</span></span>
    </label>
  );
  return (
    <Sheet title="Passer des fruits à une autre classe" onClose={onClose} wide footer={<>
      <button className="btn-ghost" onClick={onClose}>Annuler</button>
      <button className="btn-primary" onClick={go} disabled={busy || !picked.length || !to}>{mode === 'copy' ? 'Copier' : 'Déplacer'} {picked.length} fruit{picked.length > 1 ? 's' : ''}</button>
    </>}>
      <Field label="Vers la classe">
        <select style={input} value={to} onChange={(e) => setTo(e.target.value)}>{targets.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}</select>
      </Field>
      <div role="radiogroup" aria-label="Mode" className="extras-20">
        {radio('move', 'Déplacer', 'Le fruit quitte cette classe (son historique le suit).')}
        {radio('copy', 'Copier', 'Le fruit reste ici et une copie est créée dans l\'autre classe.')}
      </div>
      <label className="extras-21">
        <input type="checkbox" checked={withComments} onChange={(e) => setWithComments(e.target.checked)} disabled={mode === 'move'} className="extras-22" />
        <span>Emporter les commentaires{mode === 'move' ? ' (toujours le cas en déplacement)' : ''}</span>
      </label>
      {nextIds.length > 0 && (
        <Field label={`Les ${nextIds.length} « Next class » deviennent`} hint="Le niveau est à définir ensuite dans la nouvelle classe.">
          <select style={input} value={nextTo} onChange={(e) => setNextTo(e.target.value)}>
            <option value="keep">Next class (inchangé)</option><option value="GBB">GBB</option><option value="IndivBB">Indiv BB</option>
          </select>
        </Field>
      )}
      <div className="extras-23">
        <b className="app-12">Fruits à passer ({picked.length}/{fruits.length})</b>
        <button className="btn-ghost extras-24" onClick={() => setPicked(picked.length === fruits.length ? [] : fruits.map((f) => f.id))}>{picked.length === fruits.length ? 'Tout décocher' : 'Tout cocher'}</button>
      </div>
      {list.map((f) => (
        <label key={f.id} className="extras-25" style={{ background: picked.includes(f.id) ? '#FFFBEB' : '#fff', border: `1px solid ${picked.includes(f.id) ? T.yellow : T.line}` }}>
          <input type="checkbox" checked={picked.includes(f.id)} onChange={() => toggle(f.id)} className="extras-22" />
          <span className="extras-26">{f.nom}</span>
          <span className="dashboard-61">{catLabel(f.categorie)}</span>
          <LevelCell fruit={f} size={32} />
        </label>
      ))}
    </Sheet>
  );
}

/* ---------- Accès : lecture seule et administrateur ---------- */

export function AccessModal({ store, onClose }) {
  const [names, setNames] = useState(null);
  const [txt, setTxt] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { store.getReaders().then(setNames).catch((e) => { store.notify(errorText(e), 'err'); setNames([]); }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const add = () => {
    const n = txt.trim();
    if (!n || (names || []).some((x) => x.toLowerCase() === n.toLowerCase())) return setTxt('');
    setNames([...(names || []), n]); setTxt('');
  };
  async function save() {
    setBusy(true);
    try { await store.setReaders(names || []); store.notify('Accès enregistrés'); onClose(); }
    catch (e) { store.notify(errorText(e), 'err'); setBusy(false); }
  }
  return (
    <Sheet title="Accès en lecture seule" onClose={onClose} footer={<>
      <button className="btn-ghost" onClick={onClose}>Annuler</button>
      <button className="btn-primary" onClick={save} disabled={busy || names === null}>Enregistrer</button>
    </>}>
      <p className="extras-27">Les personnes de cette liste peuvent <b>tout consulter</b> (fruits, tableau de bord, exports) mais <b>ne peuvent rien modifier</b>, même avec le code d'équipe. Tape le prénom exactement comme la personne le saisit à la connexion (majuscules ignorées).</p>
      <div className="extras-28">
        <input style={input} placeholder="Prénom à ajouter" value={txt} onChange={(e) => setTxt(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} aria-label="Prénom à ajouter" />
        <button className="btn-primary" onClick={add}>Ajouter</button>
      </div>
      {names === null ? <p className="dashboard-59">Chargement…</p> : names.length === 0 ? <p className="dashboard-59">Personne n'est en lecture seule pour l'instant.</p> : (
        <div className="extras-29">
          {names.map((n) => (
            <span key={n} className="extras-30">
              {n}
              <button aria-label={`Retirer ${n}`} onClick={() => setNames(names.filter((x) => x !== n))} className="extras-31"><X size={16} /></button>
            </span>
          ))}
        </div>
      )}
      <p className="extras-32">Astuce : pour une personne extérieure, donne-lui plutôt le <b>code lecture</b> (onglet <code>reglages</code> → <code>code_lecture</code>) : elle ne pourra jamais écrire, quel que soit le prénom saisi. Cette liste par prénom est un garde-fou pratique, pas une sécurité forte.</p>
    </Sheet>
  );
}

/* ---------- Ajouter à l'écran d'accueil ---------- */

export function InstallModal({ onClose }) {
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const step = (n, t) => <li key={n} className="extras-33">{t}</li>;
  return (
    <Sheet title="Ajouter à l'écran d'accueil" onClose={onClose} footer={<button className="btn-primary" onClick={onClose}>OK</button>}>
      {standalone && <p className="extras-34">✅ L'app est déjà installée sur cet appareil.</p>}
      <p className="extras-35">L'app s'ouvre alors en plein écran, comme une application, avec son icône. Elle a toujours besoin d'internet (pas de mode hors ligne).</p>
      <b>Sur iPhone (Safari)</b>
      <ol className="extras-36">
        {step(1, <>Ouvre l'app dans <b>Safari</b> (pas dans une autre app).</>)}
        {step(2, <>Touche le bouton <b>Partager</b> (le carré avec une flèche vers le haut).</>)}
        {step(3, <>Choisis <b>Sur l'écran d'accueil</b>, puis <b>Ajouter</b>.</>)}
      </ol>
      <b>Sur Android (Chrome)</b>
      <ol className="extras-36">
        {step(1, <>Touche le menu <b>⋮</b> en haut à droite.</>)}
        {step(2, <>Choisis <b>Installer l'application</b> (ou « Ajouter à l'écran d'accueil »).</>)}
      </ol>
    </Sheet>
  );
}

export const InstallIcon = Smartphone;
export const AccessIcon = Shield;

/* ---------- Recherche dans les autres classes ---------- */

export function OtherClassesResults({ results, classes, onOpen }) {
  if (!results.length) return null;
  const name = (id) => (classes.find((c) => c.id === id) || {}).nom || '';
  return (
    <section aria-label="Résultats dans les autres classes" className="extras-37">
      <h3 className="extras-38">Aussi dans d'autres classes ({results.length})</h3>
      {results.slice(0, 30).map((f) => (
        <button key={f.id} onClick={() => onOpen(f)} className="extras-39">
          <span className="app-13">
            <span className="extras-40">{f.nom}</span>
            <span className="extras-41">{name(f.class_id)} · {catLabel(f.categorie)}</span>
          </span>
          <LevelCell fruit={f} size={36} />
        </button>
      ))}
      {results.length > 30 && <p className="extras-42">… et {results.length - 30} autres. Précise la recherche.</p>}
    </section>
  );
}

/* ---------- Balayage à gauche : actions rapides (mobile) ---------- */

export function SwipeRow({ children, onSwipe, disabled }) {
  const [dx, setDx] = useState(0);
  const st = useRef(null);
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const start = (e) => { const t = e.touches[0]; st.current = { x: t.clientX, y: t.clientY, lock: null }; };
  const move = (e) => {
    const s = st.current; if (!s) return;
    const t = e.touches[0], mx = t.clientX - s.x, my = t.clientY - s.y;
    if (s.lock === null && (Math.abs(mx) > 8 || Math.abs(my) > 8)) s.lock = Math.abs(mx) > Math.abs(my) * 1.5 ? 'x' : 'y';
    if (s.lock === 'x') setDx(Math.max(-110, Math.min(0, mx)));
  };
  const end = () => { const s = st.current; st.current = null; if (s && s.lock === 'x' && dx < -64) onSwipe(); setDx(0); };
  if (disabled) return <div className="extras-20">{children}</div>;
  return (
    <div className="app-26">
      <div aria-hidden className="extras-43" style={{ opacity: dx < 0 ? 1 : 0 }}>Actions</div>
      <div onTouchStart={start} onTouchMove={move} onTouchEnd={end} onTouchCancel={() => { st.current = null; setDx(0); }}
        className="extras-44" style={{ transform: `translateX(${dx}px)`, transition: st.current || reduce ? 'none' : 'transform .4s cubic-bezier(.34,1.56,.64,1)' }}>
        {children}
      </div>
    </div>
  );
}

export function QuickActionsSheet({ fruit, store, onOpen, onClose }) {
  const [txt, setTxt] = useState('');
  const levels = fruit.categorie === 'GBB' ? ['A', 'B'] : fruit.categorie === 'IndivBB' ? ['A', 'B', 'C', 'D', 'E', 'TT'] : [];
  const run = async (p) => { try { await p; return true; } catch (e) { store.notify(errorText(e), 'err'); return false; } };

  async function setLevel(niveau) {
    if (niveau === fruit.niveau) return;
    const before = { categorie: fruit.categorie, niveau: fruit.niveau || '' };
    onClose();
    if (await run(store.bulkUpdate([fruit.id], { niveau }))) {
      store.notify(`${fruit.nom} : niveau ${niveau}`, 'ok', { fn: async () => { if (await run(store.bulkUpdate([fruit.id], before))) store.notify('Changement annulé'); } });
    }
  }
  async function setCat(categorie) {
    if (categorie === fruit.categorie) return;
    const before = { categorie: fruit.categorie, niveau: fruit.niveau || '' };
    const niveau = categorie === 'GBB' || categorie === 'IndivBB' ? (fruit.niveau && (categorie === 'IndivBB' || ['A', 'B'].includes(fruit.niveau)) ? fruit.niveau : 'A') : '';
    onClose();
    if (await run(store.bulkUpdate([fruit.id], { categorie, niveau }))) {
      store.notify(`${fruit.nom} : ${catLabel(categorie)}`, 'ok', { fn: async () => { if (await run(store.bulkUpdate([fruit.id], before))) store.notify('Changement annulé'); } });
    }
  }
  async function comment() {
    if (!txt.trim()) return;
    if (await run(store.addComment(fruit.id, txt.trim()))) { store.notify('Commentaire ajouté'); onClose(); }
  }
  const chip = (active) => ({ minHeight: 48, minWidth: 48, padding: '0 14px', borderRadius: 999, border: `1px solid ${active ? T.yellow : T.line}`, background: active ? T.pill : '#fff', fontWeight: 700, fontSize: 15 });
  return (
    <Sheet title={fruit.nom} onClose={onClose} footer={<button className="btn-ghost" onClick={() => { onClose(); onOpen(fruit); }}>Ouvrir la fiche</button>}>
      {levels.length > 0 && (
        <Field label="Niveau"><div className="extras-45">{levels.map((l, i) => <button key={l} className="chip-in" style={{ ...chip(fruit.niveau === l), animationDelay: `${i * 40}ms` }} onClick={() => setLevel(l)} aria-pressed={fruit.niveau === l}>{l}</button>)}</div></Field>
      )}
      <Field label="Catégorie"><div className="extras-45">{CATEGORIES.map((c, i) => <button key={c.id} className="chip-in" style={{ ...chip(fruit.categorie === c.id), animationDelay: `${(i + 2) * 40}ms` }} onClick={() => setCat(c.id)} aria-pressed={fruit.categorie === c.id}>{c.label}</button>)}</div></Field>
      <Field label="Ajouter un commentaire">
        <textarea className="field-input extras-46" value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="Un mot sur ce fruit…" />
      </Field>
      <button className="btn-primary" onClick={comment} disabled={!txt.trim()}>Ajouter le commentaire</button>
    </Sheet>
  );
}
