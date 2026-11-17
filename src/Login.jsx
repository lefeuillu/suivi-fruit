import { useState } from 'react';
import { DEMO, callApi } from './api';

import { Field, input } from './ui';
import { errorText } from './useStore';

export default function Login({ onDone, initialError }) {
  const [user, setUser] = useState('');
  const [code, setCode] = useState(DEMO ? 'demo' : '');
  const [err, setErr] = useState(initialError || '');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!user.trim()) return setErr('Indique ton prénom ou nom.');
    if (!code.trim()) return setErr("Indique le code d'équipe.");
    setBusy(true); setErr('');
    try {
      const creds = { user: user.trim(), code: code.trim() };
      await callApi(creds, 'ping');
      onDone(creds);
    } catch (e2) { setErr(errorText(e2)); } finally { setBusy(false); }
  }

  return (
    <div className="login-1">
      <form onSubmit={submit} className="login-2">
        <div className="login-3">
          <div className="login-4" aria-hidden>
            <svg className="sway" width="30" height="30" viewBox="0 0 30 30">
              <circle cx="10" cy="14" r="4" fill="#7846E5" /><circle cx="18" cy="14" r="4" fill="#7846E5" />
              <circle cx="14" cy="20" r="4" fill="#7846E5" /><path d="M14 10c0-4 3-6 7-6-1 4-3 6-7 6z" fill="#16A34A" />
            </svg>
          </div>
          <h1 className="login-5">Suivi des fruits</h1>
        </div>
        {DEMO && <p className="login-6">Mode démo : les données restent sur cet appareil. Code <b>demo</b> (équipe), <b>admin</b> (administrateur) ou <b>lecture</b> (lecture seule).</p>}
        <Field label="Ton prénom / nom"><input style={input} value={user} onChange={(e) => setUser(e.target.value)} autoComplete="given-name" autoFocus /></Field>
        <Field label="Code d'équipe"><input style={input} type="password" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="current-password" /></Field>
        {err && <p role="alert" className="login-7">{err}</p>}
        <button type="submit" disabled={busy} className="btn-primary login-8">{busy ? 'Connexion…' : 'Entrer'}</button>
      </form>
    </div>
  );
}
