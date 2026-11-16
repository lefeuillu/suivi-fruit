import { useCallback, useMemo, useState } from 'react';
import { Plus, Search, FileSpreadsheet, Send, Upload, Archive, Target, RefreshCw, LogOut, Table2, BarChart3, Pencil, Smartphone, Shield } from 'lucide-react';
import Dashboard from './Dashboard';
import Login from './Login';
import FruitsView from './FruitsView';
import FruitForm from './FruitForm';
import FruitSheet from './FruitSheet';
import { FlyDots } from './anim';
import { ClassBar, ClassMenu, RenameClassModal, TransferModal, AccessModal, InstallModal, OtherClassesResults, QuickActionsSheet } from './Extras';
import { TelegramModal, ImportModal, ArchivesModal, ObjectivesModal, BulkModal, NewClassModal, ClassPickerModal } from './Modals';
import { Count, GrowFill } from './anim';
import { Toast, Confirm, useIsDesktop } from './ui';
import { useStore, errorText } from './useStore';
import { DEMO } from './api';
import { T, CATEGORIES, LEVEL_COLORS } from './theme';
import { needsFollowUp, objectivesOf, currentCounts, exportExcel, GOAL_LABELS } from './logic';

const CREDS_KEY = 'suivi-fruits-creds';
const loadCreds = () => { try { return JSON.parse(localStorage.getItem(CREDS_KEY)); } catch { return null; } };

export default function App() {
  const [creds, setCreds] = useState(loadCreds);
  const [authErr, setAuthErr] = useState('');
  const logout = useCallback((msg) => {
    try { localStorage.removeItem(CREDS_KEY); } catch { /* ignore */ }
    setAuthErr(typeof msg === 'string' ? msg : ''); setCreds(null);
  }, []);

  if (!creds) {
    return <Login initialError={authErr} onDone={(c) => { try { localStorage.setItem(CREDS_KEY, JSON.stringify(c)); } catch { /* ignore */ } setCreds(c); }} />;
  }
  return <Main creds={creds} onLogout={logout} />;
}

function Main({ creds, onLogout }) {
  const store = useStore(creds, () => onLogout("Le code d'équipe n'est plus valide."));
  const desktop = useIsDesktop();
  const { data, classId } = store;

  const [view, setView] = useState('table');
  const [mode, setMode] = useState('liste');
  const [cat, setCat] = useState('all');
  const [onlyFollow, setOnlyFollow] = useState(false);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState([]);
  const [modal, setModal] = useState(null); // {type, fruit}
  const [fly, setFly] = useState(null); // vol des fruits vers la barre des classes
  const [bump, setBump] = useState(null);
  const needle = q.trim().toLowerCase();
  const others = useMemo(() => (needle.length < 2 ? [] : data.fruits.filter((f) => f.class_id !== classId && !f.archive && `${f.nom} ${f.statut} ${f.enseignement} ${f.indoja_nom} ${f.bbt_nom}`.toLowerCase().includes(needle))), [data.fruits, classId, needle]);

  const klass = data.classes.find((c) => c.id === classId);
  const classFruits = useMemo(() => data.fruits.filter((f) => f.class_id === classId), [data.fruits, classId]);
  const live = classFruits.filter((f) => !f.archive);
  const goals = objectivesOf(data.objectifs, classId);
  const counts = currentCounts(classFruits);

  const shown = live.filter((f) =>
    (cat === 'all' || f.categorie === cat) &&
    (!onlyFollow || needsFollowUp(f)) &&
    (!q.trim() || `${f.nom} ${f.statut} ${f.enseignement} ${f.indoja_nom} ${f.bbt_nom}`.toLowerCase().includes(q.trim().toLowerCase())));

  const closeModal = () => setModal(null);
  const openFruit = (f) => setModal({ type: 'sheet', fruit: f });
  const current = modal && modal.fruit && data.fruits.find((f) => f.id === modal.fruit.id);

  const MODES = [['liste', 'Liste'], ['cartes', 'Cartes'], ['enseignement', 'Par enseignement'], ['niveau', 'Par niveau']];
  const pill = (active) => ({ minHeight: 44, padding: '0 14px', borderRadius: 999, border: `1px solid ${active ? T.yellow : T.line}`, background: active ? T.pill : '#fff', fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap' });

  // Classes triées de la plus récente à la plus ancienne ; les onglets n'en montrent que quelques-unes
  const sortedClasses = data.classes.map((c, i) => ({ c, i })).sort((x, y) => String(y.c.date_debut || '').localeCompare(String(x.c.date_debut || '')) || y.i - x.i).map((x) => x.c);
  const activeClasses = sortedClasses.filter((c) => !c.archivee);
  const ro = store.readOnly;
  const toggleArchive = async (c) => {
    const archiving = !c.archivee;
    try {
      await store.archiveClass(c.id, archiving);
      if (archiving && c.id === classId) { const next = activeClasses.find((x) => x.id !== c.id); if (next) pickClass(next.id); }
      store.notify(archiving ? 'Classe archivée' : 'Classe désarchivée', 'ok', { fn: async () => {
        try { await store.archiveClass(c.id, !archiving); if (archiving) pickClass(c.id); store.notify('Annulé'); } catch (e) { store.notify(errorText(e), 'err'); }
      } });
    } catch (e) { store.notify(errorText(e), 'err'); }
  };
  const pickClass = (id) => { store.setClassId(id); setSelected([]); };
  const openMenu = (c) => { pickClass(c.id); setModal({ type: 'classmenu' }); };
  const classBar = (
    <ClassBar sorted={sortedClasses} klass={klass} readOnly={ro} bump={bump} onPick={pickClass}
      onOpenPicker={() => setModal({ type: 'classes' })} onNew={() => setModal({ type: 'newclass' })} onMenu={openMenu} />
  );

  const actions = (
    <>
      {!ro && <button className="plus-spin btn-primary app-1" aria-label="Nouveau fruit" onClick={() => setModal({ type: 'form' })}><Plus size={22} /></button>}
      <button className="btn-ghost" onClick={() => exportExcel(live, data.commentaires, klass && klass.nom)}><FileSpreadsheet size={16} className="app-2" /> Excel</button>
      <button className="btn-ghost" onClick={() => setModal({ type: 'telegram' })}><Send size={16} className="app-2" /> Form Telegram</button>
    </>
  );

  if (store.loading) return (
    <div role="status" aria-label="Chargement" className="app-3">
      <div className="skeleton app-4" />
      <div className="skeleton app-5" />
      {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton app-6" style={{ opacity: 1 - i * 0.12 }} />)}
    </div>
  );

  return (
    <div className="app-7">
      {desktop && (
        <aside className="app-8">
          <h1 className="app-9">🍇 Suivi des fruits</h1>
          <div className="app-10">Vues</div>
          {[['table', 'Fruits par classe', Table2], ['dashboard', 'Tableau de bord', BarChart3]].map(([k, l, Ic]) => (
            <button key={k} onClick={() => setView(k)} aria-current={view === k ? 'page' : undefined}
              className="app-11" style={{ background: view === k ? '#E0E7FF' : 'transparent', color: view === k ? '#1E1B4B' : '#334155', fontWeight: view === k ? 700 : 600 }}><Ic size={17} />{l}</button>
          ))}
          <div className="app-12" />
          <button className="btn-ghost" onClick={() => setModal({ type: 'goals' })}><Target size={16} className="app-2" /> {ro ? 'Voir les objectifs' : 'Objectifs'}</button>
          {!ro && <button className="btn-ghost" onClick={() => setModal({ type: 'import' })}><Upload size={16} className="app-2" /> Importer Excel</button>}
          {!ro && <button className="btn-ghost" onClick={() => setModal({ type: 'archives' })}><Archive size={16} className="app-2" /> Archives</button>}
          {store.isAdmin && <button className="btn-ghost" onClick={() => setModal({ type: 'access' })}><Shield size={16} className="app-2" /> Accès</button>}
          <button className="btn-ghost" onClick={() => setModal({ type: 'install' })}><Smartphone size={16} className="app-2" /> Installer l'app</button>
          <button className="btn-ghost" onClick={() => store.reload()}><RefreshCw size={16} className="app-2" /> Actualiser</button>
          <button className="btn-ghost" onClick={() => onLogout()}><LogOut size={16} className="app-2" /> {creds.user}{store.isAdmin ? ' (admin)' : ro ? ' (lecture)' : ''}</button>
        </aside>
      )}

      <main className="app-13" style={{ padding: desktop ? '20px 24px' : '0 12px', paddingBottom: desktop ? 90 : 150 }}>
        {!desktop && (
          <div role="tablist" aria-label="Vues" className="app-14">
            {[['table', 'Fruits par classe'], ['dashboard', 'Tableau de bord']].map(([k, l]) => (
              <button key={k} role="tab" aria-selected={view === k} onClick={() => setView(k)} className="app-15" style={{ background: view === k ? '#fff' : 'transparent', fontWeight: view === k ? 800 : 600 }}>{l}</button>
            ))}
          </div>
        )}
        {klass && klass.archivee && (
          <div role="status" className="app-16">
            <b className="app-17">Classe archivée</b>
            <span className="app-18">Consultation et modifications possibles.</span>
            {!ro && <button className="btn-primary" onClick={() => toggleArchive(klass)}>Désarchiver</button>}
          </div>
        )}
        {view === 'dashboard' ? (
          <div className="app-19">
            {classBar}
            <Dashboard store={store} klass={klass} fruits={classFruits} goals={goals} classId={classId} onGoals={ro ? null : () => setModal({ type: 'goals' })} onTelegram={() => setModal({ type: 'telegram' })} onOpenFruit={openFruit} />
          </div>
        ) : (<>
        <header className="app-20" style={{ padding: desktop ? '0 0 12px' : '10px 0 14px' }}>
          <div className="app-21">
            {!desktop && <h1 className="app-22">Suivi des fruits</h1>}
            {desktop && <div className="app-12"><div className="app-23">{klass ? klass.nom : 'Aucune classe'}</div>{(DEMO || ro) && <div className="app-24">{[DEMO && 'mode démo', ro && 'lecture seule'].filter(Boolean).join(' · ')}</div>}</div>}
            {actions}
          </div>
          {!desktop && ro && <div className="app-25">Lecture seule</div>}
          {classBar}
          <div className="app-26">
            <Search size={18} className="app-27" />
            <input className="field-input app-28" placeholder="Rechercher un fruit, un statut…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher" />
          </div>
          <div className="no-scrollbar app-29" >
            {MODES.map(([k, l]) => <button key={k} style={pill(mode === k)} onClick={() => setMode(k)}>{l}</button>)}
          </div>
        </header>

        <Recap goals={goals} counts={counts} readOnly={ro} onEdit={() => setModal({ type: 'goals' })} />

        {selected.length > 0 && desktop && !ro && (
          <div className="app-30">
            <b className="app-31">{selected.length} sélectionné(s)</b>
            <button className="btn-ghost" onClick={() => setSelected([])}>Désélectionner</button>
            <button className="btn-primary" onClick={() => setModal({ type: 'bulk' })}>Actions groupées</button>
          </div>
        )}

        <div key={classId} className="slide-x"><FruitsView animKey={`${classId}|${cat}|${onlyFollow}|${q}|${mode}|${desktop}`} fruits={shown} mode={mode} desktop={desktop} onOpen={openFruit} onQuick={(f) => setModal({ type: 'quick', fruit: f })} readOnly={ro} selected={selected} setSelected={setSelected} /></div>
        <OtherClassesResults results={others} classes={data.classes} onOpen={(f) => { pickClass(f.class_id); setQ(''); setModal({ type: 'sheet', fruit: f }); }} />
        </>)}
      </main>

      {/* Barre du bas (mobile) : filtres + menu */}
      {!desktop && (
        <nav aria-label="Filtres" className="app-32">
          {view === 'table' && (
            <div className="app-33">
              {[{ id: 'all', label: 'Tous' }, ...CATEGORIES].map((c) => <button key={c.id} style={pill(cat === c.id)} onClick={() => setCat(c.id)}>{c.label}</button>)}
              <button style={{ ...pill(onlyFollow), color: T.relance }} onClick={() => setOnlyFollow(!onlyFollow)}>À relancer</button>
            </div>
          )}
          <div className="app-34">
            <button className="btn-ghost" onClick={() => setModal({ type: 'goals' })} aria-label={ro ? 'Voir les objectifs' : 'Objectifs'}><Target size={16} /></button>
            {!ro && <button className="btn-ghost" onClick={() => setModal({ type: 'import' })} aria-label="Importer"><Upload size={16} /></button>}
            {!ro && <button className="btn-ghost" onClick={() => setModal({ type: 'archives' })} aria-label="Archives"><Archive size={16} /></button>}
            {store.isAdmin && <button className="btn-ghost" onClick={() => setModal({ type: 'access' })} aria-label="Accès"><Shield size={16} /></button>}
            <button className="btn-ghost" onClick={() => setModal({ type: 'install' })} aria-label="Installer l'app"><Smartphone size={16} /></button>
            <button className="btn-ghost" onClick={() => onLogout()} aria-label="Changer d'utilisateur"><LogOut size={16} /></button>
          </div>
        </nav>
      )}
      {desktop && view === 'table' && (
        <div className="app-35">
          {[{ id: 'all', label: 'Tous' }, ...CATEGORIES].map((c) => <button key={c.id} style={pill(cat === c.id)} onClick={() => setCat(c.id)}>{c.label}</button>)}
          <button style={{ ...pill(onlyFollow), color: T.relance }} onClick={() => setOnlyFollow(!onlyFollow)}>À relancer</button>
        </div>
      )}

      {modal && modal.type === 'sheet' && current && <FruitSheet fruit={current} store={store} user={creds.user} onClose={closeModal} onEdit={(f) => setModal({ type: 'form', fruit: f })} />}
      {modal && modal.type === 'form' && <FruitForm fruit={modal.fruit && data.fruits.find((f) => f.id === modal.fruit.id)} classId={classId} fruits={classFruits} store={store} onClose={closeModal} />}
      {modal && modal.type === 'telegram' && <TelegramModal store={store} classFruits={live} goals={goals} classId={classId} onClose={closeModal} />}
      {modal && modal.type === 'import' && <ImportModal store={store} classFruits={live} onClose={closeModal} />}
      {modal && modal.type === 'archives' && <ArchivesModal store={store} classFruits={classFruits} onClose={closeModal} />}
      {modal && modal.type === 'goals' && <ObjectivesModal key={classId} store={store} classId={classId} onClose={closeModal} />}
      {modal && modal.type === 'classes' && <ClassPickerModal store={store} sorted={sortedClasses} activeId={classId} onPick={(id) => { pickClass(id); closeModal(); }} onMenu={(c) => { pickClass(c.id); setModal({ type: 'classmenu' }); }} onNew={() => setModal({ type: 'newclass' })} onClose={closeModal} />}
      {modal && modal.type === 'archiveclass' && (modal.cls.archivee
        ? <Confirm title="Désarchiver cette classe ?" text={`${modal.cls.nom} réapparaîtra dans les onglets.`} confirmLabel="Désarchiver" onCancel={() => setModal({ type: 'classes' })} onConfirm={async () => { const c = modal.cls; closeModal(); await toggleArchive(c); }} />
        : <Confirm title="Archiver cette classe ?" text={`${modal.cls.nom} disparaît des onglets. Ses fruits, objectifs et historique sont conservés : tu pourras la rouvrir ou la désarchiver depuis « Toutes les classes ».`} confirmLabel="Archiver" onCancel={() => setModal({ type: 'classes' })} onConfirm={async () => { const c = modal.cls; closeModal(); await toggleArchive(c); }} />)}
      {modal && modal.type === 'classmenu' && klass && <ClassMenu klass={klass} readOnly={ro} onClose={closeModal}
        onRename={() => setModal({ type: 'rename' })} onGoals={() => setModal({ type: 'goals' })}
        onExcel={() => exportExcel(live, data.commentaires, klass.nom)} onTransfer={() => setModal({ type: 'transfer' })}
        onToggleArchive={() => (klass.archivee ? toggleArchive(klass) : setModal({ type: 'archiveclass', cls: klass }))} />}
      {modal && modal.type === 'rename' && klass && <RenameClassModal klass={klass} classes={data.classes} store={store} onClose={closeModal} />}
      {modal && modal.type === 'transfer' && klass && <TransferModal store={store} klass={klass} sorted={sortedClasses} fruits={live} onClose={closeModal} onDone={(to, n) => { setSelected([]); closeModal(); setFly({ n, key: Date.now() }); setBump({ n, key: Date.now() }); setTimeout(() => setBump(null), 2400); }} />}
      {modal && modal.type === 'access' && <AccessModal store={store} onClose={closeModal} />}
      {modal && modal.type === 'install' && <InstallModal onClose={closeModal} />}
      {modal && modal.type === 'quick' && !ro && <QuickActionsSheet fruit={data.fruits.find((f) => f.id === modal.fruit.id) || modal.fruit} store={store} onOpen={openFruit} onClose={closeModal} />}
      {modal && modal.type === 'newclass' && <NewClassModal store={store} onClose={closeModal} />}
      {modal && modal.type === 'bulk' && <BulkModal ids={selected} store={store} onClose={closeModal} onDone={() => { setSelected([]); closeModal(); }} />}
      {fly && <FlyDots key={fly.key} n={fly.n} onEnd={() => setFly(null)} />}
      <Toast toast={store.toast} onDismiss={store.dismissToast} />
    </div>
  );
}

function Recap({ goals, counts, onEdit, readOnly }) {
  const keys = Object.keys(GOAL_LABELS);
  if (!keys.some((k) => goals[k] > 0)) {
    if (readOnly) return null;
    return <button onClick={onEdit} className="btn-ghost app-36"><Target size={16} className="app-2" /> Définir les objectifs de cette classe</button>;
  }
  const col = { ctt: '#D4AF37', bbGroup: LEVEL_COLORS.A.group, ab: LEVEL_COLORS.B.group, c: LEVEL_COLORS.C.group, de: LEVEL_COLORS.D.group, tt: LEVEL_COLORS.TT.group };
  return (
    <div className="app-37">
      <section aria-label="Objectifs de la classe" className="app-38">
        {keys.filter((k) => goals[k] > 0).map((k) => {
          const pct = Math.min(100, Math.round((counts[k] / goals[k]) * 100));
          return (
            <div key={k} className="app-39">
              <div className="app-40"><span>{GOAL_LABELS[k]}</span><span><Count value={counts[k]} dur={600} />/{goals[k]}</span></div>
              <div className="app-41"><GrowFill pct={pct} style={{ height: '100%', borderRadius: 999, background: col[k] }} /></div>
            </div>
          );
        })}
      </section>
      {!readOnly && <button onClick={onEdit} aria-label="Modifier les objectifs de la classe" title="Modifier les objectifs de la classe" className="btn-ghost app-42"><Pencil size={16} /></button>}
    </div>
  );
}
