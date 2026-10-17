import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest, clearTokens, saveTokens } from './api.js';

function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem('cloudnotes_access'));
  const [username, setUsername] = useState(() => sessionStorage.getItem('cloudnotes_username') || '');
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '' });
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const loadNotes = useCallback(async () => {
    try {
      const data = await apiRequest('/notes/');
      setNotes(data);
      setMessage('');
    } catch (error) {
      setMessage(error.message);
    }
  }, []);

  useEffect(() => {
    if (token) loadNotes();
    else setNotes([]);
  }, [token, loadNotes]);

  useEffect(() => {
    function handleExpiredSession() {
      setToken(null);
      setUsername('');
      setNotes([]);
      setMessage('Your session expired. Please sign in again.');
    }
    window.addEventListener('cloudnotes:session-expired', handleExpiredSession);
    return () => window.removeEventListener('cloudnotes:session-expired', handleExpiredSession);
  }, []);

  const sortedNotes = useMemo(() => notes, [notes]);

  function updateAuthForm(event) {
    setAuthForm({ ...authForm, [event.target.name]: event.target.value });
  }

  async function handleAuth(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      if (authMode === 'register') {
        await apiRequest('/auth/register/', {
          method: 'POST',
          authenticated: false,
          body: { username: authForm.username.trim(), email: authForm.email.trim(), password: authForm.password },
        });
      }
      const tokens = await apiRequest('/auth/token/', {
        method: 'POST',
        authenticated: false,
        body: { username: authForm.username.trim(), password: authForm.password },
      });
      saveTokens(tokens);
      sessionStorage.setItem('cloudnotes_username', authForm.username.trim());
      setUsername(authForm.username.trim());
      setToken(tokens.access);
      setAuthForm({ username: '', email: '', password: '' });
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveNote(event) {
    event.preventDefault();
    if (!title.trim()) {
      setMessage('Please enter a title for your note.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const payload = { title: title.trim(), content };
      if (editingId) {
        await apiRequest(`/notes/${editingId}/`, { method: 'PATCH', body: payload });
      } else {
        await apiRequest('/notes/', { method: 'POST', body: payload });
      }
      setTitle('');
      setContent('');
      setEditingId(null);
      await loadNotes();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  function beginEdit(note) {
    setEditingId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setTitle('');
    setContent('');
  }

  async function deleteNote(note) {
    if (!window.confirm(`Delete “${note.title}”? This cannot be undone.`)) return;
    try {
      await apiRequest(`/notes/${note.id}/`, { method: 'DELETE' });
      if (editingId === note.id) cancelEdit();
      await loadNotes();
    } catch (error) {
      setMessage(error.message);
    }
  }

  function logout() {
    clearTokens();
    setToken(null);
    setUsername('');
    setNotes([]);
    cancelEdit();
    setMessage('You have been signed out.');
  }

  if (!token) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="brand-mark">C</div>
          <p className="eyebrow">YOUR PERSONAL WORKSPACE</p>
          <h1>{authMode === 'login' ? 'Welcome back.' : 'Create your space.'}</h1>
          <p className="muted">Keep your thoughts organised, wherever you work.</p>
          {message && <div className="notice" role="alert">{message}</div>}
          <form onSubmit={handleAuth} className="form-stack">
            <label>Username<input name="username" autoComplete="username" value={authForm.username} onChange={updateAuthForm} minLength="3" required /></label>
            {authMode === 'register' && <label>Email address<input name="email" type="email" autoComplete="email" value={authForm.email} onChange={updateAuthForm} required /></label>}
            <label>Password<input name="password" type="password" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} value={authForm.password} onChange={updateAuthForm} minLength="8" required /></label>
            <button className="button button-primary button-full" disabled={busy}>{busy ? 'Please wait…' : authMode === 'login' ? 'Sign in' : 'Create account'}</button>
          </form>
          <p className="switch-mode">
            {authMode === 'login' ? 'New to CloudNotes?' : 'Already have an account?'}{' '}
            <button className="text-button" onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setMessage(''); }}> {authMode === 'login' ? 'Create an account' : 'Sign in'} </button>
          </p>
          <p className="security-note"><span>●</span> Your notes are private to your account.</p>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="CloudNotes home"><span className="brand-icon">C</span><span>CloudNotes</span></a>
        <div className="topbar-right"><span className="avatar">{username.slice(0, 1).toUpperCase()}</span><span className="user-name">{username}</span><button className="button button-quiet" onClick={logout}>Sign out</button></div>
      </header>
      <main className="workspace">
        <section className="welcome-row">
          <div><p className="eyebrow">YOUR PERSONAL WORKSPACE</p><h1>Your thoughts, <span>in one place.</span></h1><p className="muted">Capture ideas now. Find them whenever you need them.</p></div>
          <div className="note-count"><strong>{notes.length.toString().padStart(2, '0')}</strong><span>{notes.length === 1 ? 'NOTE SAVED' : 'NOTES SAVED'}</span></div>
        </section>
        {message && <div className="notice" role="status">{message}<button onClick={() => setMessage('')} aria-label="Dismiss message">×</button></div>}
        <section className="editor-card">
          <div className="section-heading"><div><span className="section-icon">{editingId ? '↗' : '+'}</span><h2>{editingId ? 'Edit note' : 'Create a note'}</h2></div>{editingId && <button className="text-button" onClick={cancelEdit}>Cancel edit</button>}</div>
          <form onSubmit={handleSaveNote} className="form-stack note-form">
            <label>Title<input value={title} onChange={event => setTitle(event.target.value)} maxLength="120" placeholder="Give your note a clear title…" required /></label>
            <label>What's on your mind?<textarea value={content} onChange={event => setContent(event.target.value)} rows="4" placeholder="Write down an idea, reminder, or something worth remembering…" /></label>
            <div className="editor-footer"><span className="muted small">Saved securely to your account</span><button className="button button-primary" disabled={busy}>{busy ? 'Saving…' : editingId ? 'Save changes' : 'Save note'}</button></div>
          </form>
        </section>
        <section className="notes-section">
          <div className="section-heading notes-heading"><div><h2>Your notes</h2><span className="muted small">Recent notes appear first</span></div></div>
          {sortedNotes.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">✎</div><h3>Your page is still blank.</h3><p className="muted">Create your first note above. The good ideas deserve a place to live.</p></div>
          ) : (
            <div className="notes-grid">
              {sortedNotes.map((note, index) => (
                <article className={`note-card tone-${index % 4}`} key={note.id}>
                  <div className="note-card-top"><span className="note-dot" /><span className="note-date">{new Date(note.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span><div className="note-actions"><button onClick={() => beginEdit(note)} aria-label={`Edit ${note.title}`} title="Edit note">✎</button><button onClick={() => deleteNote(note)} aria-label={`Delete ${note.title}`} title="Delete note">×</button></div></div>
                  <h3>{note.title}</h3><p className="note-content">{note.content || 'No extra details.'}</p>
                  <button className="edit-link" onClick={() => beginEdit(note)}>Open note <span>↗</span></button>
                </article>
              ))}
            </div>
          )}
        </section>
        <footer className="app-footer"><span>CloudNotes</span><span>Simple notes. Thoughtfully built.</span></footer>
      </main>
    </div>
  );
}

export default App;
