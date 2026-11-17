import { useMemo, useState } from 'react';
import { Count, GrowFill } from './anim';
import { Image as ImageIcon, Download, Send } from 'lucide-react';
import { T, LEVEL_COLORS } from './theme';
import { useIsDesktop } from './ui';
import {
  weeklySeries, weeklyGoalsOf, levelDistribution, recentLevelChanges, teamActivity, pendingLevelChanges,
  needsFollowUp, daysSince, GOAL_LABELS, currentCounts, LEVEL_KEYS, downloadBlob,
} from './logic';

const card = { background: '#fff', border: `1px solid ${T.line}`, borderRadius: 18, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 };
const h2 = { margin: 0, fontSize: 17, fontWeight: 800 };
const pillStyle = (key) => {
  const c = LEVEL_COLORS[key] || { bg: '#E5E7EB', fg: T.muted };
  return { minWidth: 34, textAlign: 'center', fontSize: 12, fontWeight: 800, padding: '4px 8px', borderRadius: 999, background: c.bg, color: c.fg };
};
const AVATARS = [['#F97316', '#1C1917'], ['#7C3AED', '#fff'], ['#15803D', '#fff'], ['#C026D3', '#fff'], ['#2563EB', '#fff']];

/** Échelle commune au graphique, à l'export PNG et au PowerPoint */
function scaleOf(active) {
  let max = 0, min = 0;
  active.forEach((d) => [...d.real, ...d.obj].forEach((v) => { max = Math.max(max, v); min = Math.min(min, v); }));
  const step = max - min <= 4 ? 1 : max - min <= 8 ? 2 : max - min <= 20 ? 5 : 10;
  const yMax = Math.max(step * Math.ceil(max / step), step);
  const yMin = step * Math.floor(min / step);
  return { yMax, yMin, step };
}

function toWeekly(a) { return a.map((v, i) => (i === 0 ? v : v - a[i - 1])); }

function drawPng(labels, active, title) {
  const W = 1200, H = 560, L = 70, R = 30, Tp = 80, B = 90;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#0F172A'; g.font = 'bold 26px Georgia, serif'; g.fillText(title, L, 44);
  const { yMax, yMin, step } = scaleOf(active);
  const X = (i) => L + (i / (labels.length - 1)) * (W - L - R);
  const Y = (v) => Tp + (1 - (v - yMin) / (yMax - yMin)) * (H - Tp - B);
  g.font = '15px system-ui, sans-serif'; g.textAlign = 'right'; g.textBaseline = 'middle';
  for (let v = yMin; v <= yMax; v += step) {
    g.strokeStyle = v === 0 ? '#CBD5E1' : '#EEF2F7'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(L, Y(v)); g.lineTo(W - R, Y(v)); g.stroke();
    g.fillStyle = '#475569'; g.fillText(String(v), L - 10, Y(v));
  }
  g.textAlign = 'center'; g.textBaseline = 'top';
  labels.forEach((l, i) => { g.fillStyle = '#475569'; g.fillText(l, X(i), H - B + 12); });
  active.forEach((d) => {
    g.strokeStyle = d.color; g.lineWidth = 2; g.setLineDash([8, 6]); g.globalAlpha = 0.75;
    g.beginPath(); d.obj.forEach((v, i) => (i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v)))); g.stroke();
    g.setLineDash([]); g.globalAlpha = 1; g.lineWidth = 3.5;
    g.beginPath(); d.real.forEach((v, i) => (i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v)))); g.stroke();
    d.real.forEach((v, i) => { g.beginPath(); g.arc(X(i), Y(v), 5, 0, 7); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 3; g.stroke(); });
  });
  let x = L;
  g.textAlign = 'left'; g.textBaseline = 'middle'; g.font = '15px system-ui, sans-serif';
  active.forEach((d) => {
    g.fillStyle = d.color; g.fillRect(x, H - 28, 22, 4);
    g.fillStyle = '#334155'; const t = `${d.label} : ${d.real[d.real.length - 1]} (objectif ${d.obj[d.obj.length - 1]})`;
    g.fillText(t, x + 30, H - 26); x += 30 + g.measureText(t).width + 24;
  });
  return new Promise((res) => cv.toBlob(res, 'image/png'));
}

async function exportPptx(labels, active, title, fileName) {
  const mod = await import('pptxgenjs');
  const Pptx = mod.default || mod;
  const pptx = new Pptx();
  pptx.layout = 'LAYOUT_WIDE';
  const s = pptx.addSlide();
  s.addText(title, { x: 0.5, y: 0.3, w: 12.3, h: 0.7, fontSize: 26, bold: true, fontFace: 'Georgia', color: '0F172A' });
  const data = [], colors = [], dash = [];
  active.forEach((d) => {
    data.push({ name: `${d.label} (réalisé)`, labels, values: d.real }); colors.push(d.color.slice(1)); dash.push('solid');
    data.push({ name: `${d.label} (objectif)`, labels, values: d.obj }); colors.push(d.color.slice(1)); dash.push('dash');
  });
  s.addChart(pptx.charts.LINE, data, {
    x: 0.5, y: 1.1, w: 12.3, h: 5.8, chartColors: colors, lineDash: dash, lineDataSymbol: 'circle', lineDataSymbolSize: 7,
    showLegend: true, legendPos: 'b', legendFontSize: 12, catAxisLabelFontSize: 12, valAxisLabelFontSize: 12,
  });
  await pptx.writeFile({ fileName });
}

export default function Dashboard({ store, klass, fruits, goals, classId, onGoals, onTelegram, onOpenFruit, header }) {
  const desktop = useIsDesktop();
  const { data } = store;
  const live = fruits.filter((f) => !f.archive);
  const [sel, setSel] = useState({ ab: true, tt: true });
  const [calc, setCalc] = useState('cumul');
  const [busy, setBusy] = useState('');

  const weekly = useMemo(() => weeklyGoalsOf(data.objectifs, classId), [data.objectifs, classId]);
  const ws = useMemo(() => weeklySeries(fruits, data.historique, goals, weekly), [fruits, data.historique, goals, weekly]);
  const active = ws.series.filter((d) => sel[d.key]).map((d) => (calc === 'cumul' ? d : { ...d, real: toWeekly(d.real), obj: toWeekly(d.obj) }));
  const { yMax, yMin, step } = scaleOf(active);
  const n = ws.labels.length;
  const X = (i) => (i / (n - 1)) * 1000;
  const Y = (v) => 300 - ((v - yMin) / (yMax - yMin)) * 300;
  const ticks = []; for (let v = yMin; v <= yMax; v += step) ticks.push(v);

  const counts = currentCounts(fruits);
  const gkeys = Object.keys(GOAL_LABELS).filter((k) => goals[k] > 0);
  const reached = gkeys.filter((k) => counts[k] >= goals[k]).length;
  const pending = pendingLevelChanges(live, data.historique, classId);
  const relance = live.filter(needsFollowUp).sort((a, b) => daysSince(b.updated_at) - daysSince(a.updated_at));
  const dist = levelDistribution(fruits);
  const total = LEVEL_KEYS.reduce((s, k) => s + dist[k], 0);
  const moves = recentLevelChanges(fruits, data.historique, classId);
  const team = teamActivity(fruits, data.historique, data.commentaires);
  const online = live.filter((f) => f.format === 'Online').length;
  const delta = ws.learningNow - ws.learningBefore;
  const title = `Évolution par semaine — ${klass ? klass.nom : ''}`;
  const slug = (klass ? klass.nom : 'classe').replace(/[^\w-]+/g, '_');

  async function png() {
    setBusy('png');
    try { downloadBlob(await drawPng(ws.labels, active, title), `evolution-${slug}.png`); } catch { store.notify('Export image impossible', 'err'); }
    setBusy('');
  }
  async function pptx() {
    setBusy('pptx');
    try { await exportPptx(ws.labels, active, title, `evolution-${slug}.pptx`); } catch { store.notify('Export PowerPoint impossible', 'err'); }
    setBusy('');
  }

  const kpis = [
    { label: 'Fruits qui apprennent', value: ws.learningNow, sub: delta ? `${delta > 0 ? '+' : ''}${delta} depuis 7 jours` : 'stable sur 7 jours', good: delta >= 0 },
    { label: 'Objectifs atteints', value: gkeys.length ? `${reached} / ${gkeys.length}` : '—', sub: gkeys.length ? 'objectifs de la classe' : 'aucun objectif défini', good: !gkeys.length || reached > 0 },
    { label: 'Changements de niveau', value: pending.length, sub: 'depuis le dernier export', good: true },
    { label: 'À relancer', value: relance.length, sub: '14 jours sans mise à jour', good: relance.length === 0 },
  ];

  const toggleBtn = (on, label, onClick) => (
    <button onClick={onClick} aria-pressed={on} className="dashboard-1" style={{ background: on ? '#fff' : 'transparent', color: on ? T.text : T.muted, fontWeight: on ? 700 : 600, boxShadow: on ? '0 1px 3px rgba(15,23,42,.12)' : 'none' }}>{label}</button>
  );

  return (
    <div className="dashboard-2">
      <div className="dash-card dashboard-3">
        <div className="dashboard-4">
          <h1 className="dashboard-5" style={{ fontSize: desktop ? 28 : 22 }}>Tableau de bord</h1>
          <div className="dashboard-6">{klass ? klass.nom : ''}</div>
        </div>
        {header}
        <button className="btn-primary dashboard-7" onClick={onTelegram}><Send size={15} className="dashboard-8" /> Form Telegram</button>
      </div>

      <div className="dashboard-9">
        {kpis.map((k) => (
          <div key={k.label} className="dash-card dashboard-10">
            <span className="dashboard-11">{k.label}</span>
            <span className="dashboard-12"><Count value={k.value} /></span>
            <span className="dashboard-13" style={{ color: k.good ? '#15803D' : T.relance }}>{k.sub}</span>
          </div>
        ))}
      </div>

      <section style={card} aria-label="Évolution par semaine">
        <div className="dashboard-14">
          <div className="dashboard-4">
            <h2 className="dash-h2 dashboard-15">Évolution par semaine</h2>
            <span className="dashboard-16">Trait plein : réalisé · pointillés : objectif cumulé (cibles par semaine, sinon progression linéaire)</span>
          </div>
          <div role="group" aria-label="Mode de calcul" className="dashboard-17">
            {toggleBtn(calc === 'cumul', 'Cumulé', () => setCalc('cumul'))}
            {toggleBtn(calc === 'semaine', 'Par semaine', () => setCalc('semaine'))}
          </div>
          <button className="btn-ghost dashboard-18" disabled={!active.length || !!busy} onClick={png}><ImageIcon size={15} className="dashboard-8" /> Image PNG</button>
          <button className="btn-primary dashboard-18" disabled={!active.length || !!busy} onClick={pptx}><Download size={15} className="dashboard-8" /> {busy === 'pptx' ? 'Création…' : 'PowerPoint'}</button>
        </div>

        <div className="dashboard-19">
          <span className="dashboard-20">Niveaux affichés :</span>
          {ws.series.map((d) => {
            const on = !!sel[d.key];
            return (
              <button key={d.key} aria-pressed={on} onClick={() => setSel({ ...sel, [d.key]: !on })}
                className="dashboard-21" style={{ border: `1.5px solid ${d.color}`, background: on ? d.color : '#fff', color: on ? '#fff' : T.text }}>
                <span className="dashboard-22" style={{ background: on ? '#fff' : d.color }} />{d.label}
              </button>
            );
          })}
        </div>

        <div className="dashboard-23">
          <div className="dashboard-24" aria-hidden>
            {ticks.map((v) => <span key={v} className="dashboard-25" style={{ top: `${(Y(v) / 300) * 100}%` }}>{v}</span>)}
          </div>
          <div className="app-13">
            <div key={calc} className="draw dashboard-26" >
              {ticks.map((v) => <div key={v} className="dashboard-27" style={{ top: `${(Y(v) / 300) * 100}%`, background: v === 0 ? 'transparent' : '#EEF2F7' }} />)}
              {active.map((d) => (
                <div key={d.key}>
                  <svg viewBox="0 0 1000 300" preserveAspectRatio="none" className="dashboard-28" aria-hidden>
                    <polyline points={d.obj.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')} fill="none" stroke={d.color} strokeWidth="2" strokeDasharray="7 6" vectorEffect="non-scaling-stroke" opacity=".75" />
                    <polyline points={d.real.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')} fill="none" stroke={d.color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                  </svg>
                  {d.real.map((v, i) => (
                    <div key={i} title={`${d.label} · ${ws.labels[i]} : ${v} (objectif ${d.obj[i]})`}
                      className="dashboard-29" style={{ left: `${X(i) / 10}%`, top: `${(Y(v) / 300) * 100}%`, border: `3px solid ${d.color}` }} />
                  ))}
                </div>
              ))}
              {!active.length && <div className="dashboard-30">Sélectionne au moins un niveau.</div>}
            </div>
            <div className="dashboard-31">
              {ws.labels.map((l, i) => <span key={i} className="dashboard-32">{l}</span>)}
            </div>
          </div>
        </div>

        <div className="dashboard-33">
          {active.map((d) => (
            <div key={d.key} className="dashboard-34">
              <span className="dashboard-35" style={{ background: d.color }} />{d.label} : {d.real[n - 1]}
              <span className="dashboard-36" style={{ borderTop: `2px dashed ${d.color}` }} />objectif {d.obj[n - 1]}
            </div>
          ))}
        </div>
      </section>

      <div className="dashboard-37">
        <section style={card}>
          <div className="dashboard-38"><h2 className="dash-h2 app-12">Objectifs — {klass ? klass.nom : ''}</h2>{onGoals && <button className="btn-ghost dashboard-39" onClick={onGoals}>Modifier</button>}</div>
          {!gkeys.length && <p className="dashboard-40">Aucun objectif défini pour cette classe.</p>}
          {gkeys.map((k) => {
            const ok = counts[k] >= goals[k];
            return (
              <div key={k} className="dashboard-41">
                <span className="dashboard-42">{GOAL_LABELS[k]}</span>
                <div className="dashboard-43"><GrowFill pct={Math.min(100, Math.round((counts[k] / goals[k]) * 100))} style={{ height: '100%', borderRadius: 999, background: ok ? '#15803D' : T.yellow }} /></div>
                <span className="dashboard-44">{counts[k]} / {goals[k]}</span>
                <span className="dashboard-45" style={{ background: ok ? '#DCFCE7' : T.pill, color: ok ? '#14532D' : '#713F12' }}>{ok ? 'Atteint' : 'En cours'}</span>
              </div>
            );
          })}
        </section>

        <section style={card}>
          <h2 style={h2}>Répartition par niveau</h2>
          <div className="dashboard-46" role="img" aria-label="Répartition par niveau">
            {LEVEL_KEYS.filter((k) => dist[k] > 0).map((k) => <div key={k} title={`${k} : ${dist[k]}`} className="dashboard-47" style={{ flex: `${dist[k]} 1 0`, background: LEVEL_COLORS[k].bg }} />)}
          </div>
          <div className="dashboard-48">
            {LEVEL_KEYS.map((k) => (
              <div key={k} className="dashboard-49">
                <span className="dashboard-50" style={{ background: LEVEL_COLORS[k].bg }} />
                <span className="dashboard-51">{k}</span>
                <span className="dashboard-52">{dist[k]}</span>
              </div>
            ))}
          </div>
          <div className="dashboard-53">
            <span>Online : <b>{online}</b></span><span>Offline : <b>{live.length - online}</b></span><span className="dashboard-54">CTT : <b>{live.filter((f) => f.ctt).length}</b></span>
            <span className="dashboard-55">{total} fruits</span>
          </div>
        </section>
      </div>

      <div className="dashboard-56">
        <section style={card}>
          <h2 style={h2}>Changements récents</h2>
          {!moves.length && <p className="dashboard-40">Aucun changement de niveau pour l'instant.</p>}
          {moves.map((m) => (
            <div key={m.id} className="dashboard-57">
              <button onClick={() => onOpenFruit(m.fruit)} className="dashboard-58">{m.fruit.nom}</button>
              <span style={pillStyle(m.ancien)}>{m.ancien || '—'}</span>
              <span aria-hidden className="dashboard-59">→</span>
              <span style={pillStyle(m.nouveau)}>{m.nouveau || '—'}</span>
              <span className="dashboard-60">{m.auteur} · {String(m.date).slice(8, 10)}/{String(m.date).slice(5, 7)}</span>
            </div>
          ))}
          <span className="dashboard-61">Les changements non exportés alimentent la section « Change » du prochain Form Telegram.</span>
        </section>

        <section style={card}>
          <h2 style={h2}>À relancer</h2>
          {!relance.length && <p className="dashboard-40">Personne à relancer.</p>}
          {relance.map((f) => (
            <div key={f.id} className="dashboard-62">
              <div className="app-13">
                <div className="dashboard-63">{f.nom}</div>
                <div className="dashboard-61">Indo : {f.indoja_nom || '—'} · BBT : {f.bbt_nom || '—'}</div>
              </div>
              <span className="dashboard-64">{daysSince(f.updated_at)} j.</span>
              <button className="btn-ghost dashboard-39" onClick={() => onOpenFruit(f)}>Ouvrir</button>
            </div>
          ))}
          <span className="dashboard-61">Seuil : 14 jours sans mise à jour, ou marqué « à relancer ».</span>
        </section>

        <section style={card}>
          <h2 style={h2}>Activité de l'équipe</h2>
          <span className="dashboard-65">Mises à jour et commentaires des 7 derniers jours</span>
          {!team.length && <p className="dashboard-40">Aucune activité cette semaine.</p>}
          {team.slice(0, 6).map((p, i) => {
            const [bg, fg] = AVATARS[i % AVATARS.length];
            return (
              <div key={p.name} className="dashboard-41">
                <span className="dashboard-66" style={{ background: bg, color: fg }}>{p.name.charAt(0).toUpperCase()}</span>
                <span className="dashboard-67">{p.name}</span>
                <div className="dashboard-43"><GrowFill pct={Math.round((p.count / team[0].count) * 100)} style={{ height: '100%', borderRadius: 999, background: '#4F46E5' }} /></div>
                <span className="dashboard-68">{p.count}</span>
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}
