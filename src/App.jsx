import { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase.js';

const ago = (iso) => {
  const m = Math.max(1, Math.round((Date.now() - new Date(iso)) / 60000));
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
};

function useAuth() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);
  return user;
}

function SignIn() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  if (!supabase) return <p className="note">Comments are switched off until Supabase keys are added (see README).</p>;
  const magic = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + window.location.pathname } });
    setMsg(error ? error.message : 'Check your inbox for the sign-in link.');
  };
  return (
    <div className="signin">
      <p><strong>Sign in to join the conversation.</strong> Enter your email and we will send you a one-click link. No password needed.</p>
      <form onSubmit={magic}>
        <input type="email" required placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
        <button className="btn" type="submit">Email me a link</button>
      </form>
      {msg && <p className="note">{msg}</p>}
    </div>
  );
}

function Comments({ postId, user }) {
  const [items, setItems] = useState([]);
  const [body, setBody] = useState('');
  const [err, setErr] = useState('');
  const load = async () => {
    if (!supabase) return;
    const { data } = await supabase.from('comments').select('*').eq('post_id', postId).order('created_at', { ascending: false });
    setItems(data || []);
  };
  useEffect(() => { load(); }, [postId]);
  const send = async (e) => {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    const name = user.email.split('@')[0];
    const { error } = await supabase.from('comments').insert({ post_id: postId, user_id: user.id, user_name: name, body: text.slice(0, 1000) });
    if (error) return setErr('Your comment could not be posted. Try again.');
    setBody(''); setErr(''); load();
  };
  const remove = async (id) => { await supabase.from('comments').delete().eq('id', id); load(); };
  return (
    <section className="comments">
      <h3>{items.length} {items.length === 1 ? 'comment' : 'comments'}</h3>
      {user ? (
        <form onSubmit={send}>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} placeholder="What's your take?" aria-label="Your comment" />
          <div className="row">
            <button className="btn" type="submit">Post comment</button>
            <button type="button" className="link" onClick={() => supabase.auth.signOut()}>Sign out</button>
          </div>
          {err && <p className="note err">{err}</p>}
        </form>
      ) : <SignIn />}
      <ul>
        {items.map((c) => (
          <li key={c.id}>
            <div className="who"><b>{c.user_name}</b><span>{ago(c.created_at)}</span>
              {user?.id === c.user_id && <button className="link" onClick={() => remove(c.id)}>Delete</button>}
            </div>
            <p>{c.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Story({ post, user, onClose }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, []);
  return (
    <div className="overlay" onClick={onClose}>
      <article className="story" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={post.title}>
        <button className="close" onClick={onClose} aria-label="Close story">×</button>
        {post.image && <img src={post.image} alt="" />}
        <div className="story-body">
          <span className="tag">{post.category}</span>
          <h2>{post.title}</h2>
          <p className="meta">{post.source} · {ago(post.date)}</p>
          <p className="summary">{post.summary}</p>
          <a className="btn btn-hot" href={post.link} target="_blank" rel="noopener noreferrer">Read the full story at {post.source}</a>
          <Comments postId={post.id} user={user} />
        </div>
      </article>
    </div>
  );
}

export default function App() {
  const [posts, setPosts] = useState(null);
  const [cat, setCat] = useState('All');
  const [open, setOpen] = useState(null);
  const user = useAuth();

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/posts.json?t=${Date.now()}`)
      .then((r) => r.json()).then(setPosts).catch(() => setPosts([]));
  }, []);

  const cats = useMemo(() => ['All', ...new Set((posts || []).map((p) => p.category))], [posts]);
  const list = useMemo(() => (posts || []).filter((p) => cat === 'All' || p.category === cat), [posts, cat]);
  const [lead, ...rest] = list;

  return (
    <>
      <header className="masthead">
        <div className="wrap bar">
          <a className="logo" href="./">WUZZY<em>ARENA</em></a>
          <div className="auth">
            {supabase && user && <><span>{user.email}</span><button className="link light" onClick={() => supabase.auth.signOut()}>Sign out</button></>}
          </div>
        </div>
        <nav className="wrap cats" aria-label="Sports">
          {cats.map((c) => <button key={c} className={c === cat ? 'chip on' : 'chip'} onClick={() => setCat(c)}>{c}</button>)}
        </nav>
      </header>

      <main className="wrap">
        {posts === null && <p className="empty">Loading the latest…</p>}
        {posts && !list.length && <p className="empty">No stories yet. Run <code>npm run scrape</code> to pull the first batch.</p>}
        {lead && (
          <button className="lead" onClick={() => setOpen(lead)} style={lead.image ? { backgroundImage: `linear-gradient(180deg, rgba(10,14,60,.05) 30%, rgba(10,14,60,.92)), url(${lead.image})` } : undefined}>
            <span className="tag">{lead.category}</span>
            <h1>{lead.title}</h1>
            <span className="meta">{lead.source} · {ago(lead.date)}</span>
          </button>
        )}
        <div className="grid">
          {rest.slice(0, 48).map((p) => (
            <button className="card" key={p.id} onClick={() => setOpen(p)}>
              {p.image ? <img src={p.image} alt="" loading="lazy" /> : <div className="ph" />}
              <div>
                <span className="tag sm">{p.category}</span>
                <h2>{p.title}</h2>
                <span className="meta">{p.source} · {ago(p.date)}</span>
              </div>
            </button>
          ))}
        </div>
      </main>

      <footer className="foot">
        <div className="wrap">Wuzzy Arena by Sampson “Wuzzy” Ewuzie. Headlines and summaries link back to their original publishers. Updated automatically every 30 minutes.</div>
      </footer>
      {open && <Story post={open} user={user} onClose={() => setOpen(null)} />}
    </>
  );
}
