import { useEffect, useRef, useState } from "react";
import "./MembershipPilot.css";
import "./SocialMedia.css";
const FACEBOOK = "https://www.facebook.com/WroughtonYFC/";
const INSTAGRAM = "https://www.instagram.com/wroughtonyouthfc/";
const API = "/api/membership-pilot/social-posts";
let instagramScript;
function loadInstagram() {
  if (window.instgrm?.Embeds) return Promise.resolve();
  if (!instagramScript) instagramScript = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://www.instagram.com/embed.js"; script.async = true;
    script.onload = resolve;
    script.onerror = () => { instagramScript = null; script.remove(); reject(new Error("Preview unavailable")); };
    document.body.appendChild(script);
  });
  return instagramScript;
}
async function request(path = "", options = {}) {
  const response = await fetch(API + path, options);
  if (response.status === 401) { window.location.assign("/auth/login"); throw new Error("Please sign in again."); }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}
function MetaPreview({ url, platform, page = false }) {
  const container = useRef(null);
  const [width, setWidth] = useState(320);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const element = container.current;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(180, Math.min(500, Math.floor(entry.contentRect.width)))));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (platform !== "INSTAGRAM") return;
    const element = container.current;
    let active = true;
    const quote = document.createElement("blockquote");
    quote.className = "instagram-media";
    quote.setAttribute("data-instgrm-permalink", url);
    quote.setAttribute("data-instgrm-version", "14");
    quote.setAttribute("data-instgrm-captioned", "");
    const link = document.createElement("a"); link.href = url; link.textContent = "View this post on Instagram";
    link.target = "_blank"; link.rel = "noopener noreferrer"; quote.appendChild(link);
    element.appendChild(quote);
    loadInstagram().then(() => { if (active) window.instgrm?.Embeds?.process(); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; element.replaceChildren(); };
  }, [url, platform]);
  const plugin = page ? "page" : url.includes("/reel/") ? "video" : "post";
  const params = new URLSearchParams({ href: url, width: String(width), height: "650", show_text: "true", ...(page ? { tabs: "timeline", small_header: "true", adapt_container_width: "true", hide_cover: "false", show_facepile: "false" } : {}) });
  return <><div ref={container} className="social-preview">{platform === "FACEBOOK" && <iframe title={page ? "Club Facebook timeline" : "Facebook post preview"} src={`https://www.facebook.com/plugins/${plugin}.php?${params}`} width={width} height="650" loading="lazy" allow="encrypted-media; picture-in-picture" />}</div>{failed && <p className="social-muted">Preview unavailable. Use the original post link below.</p>}</>;
}
function Metric({ label, value, note, tone = "blue" }) {
  return <div className={`member-metric metric-${tone}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></div>;
}
export default function SocialMedia() {
  const [posts, setPosts] = useState(null), [error, setError] = useState(""), [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all"), [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false), [saving, setSaving] = useState(false);
  const [url, setUrl] = useState(""), [title, setTitle] = useState("");
  const [previews, setPreviews] = useState(false);
  const sequence = useRef(0);
  const [summaryTime, setSummaryTime] = useState(() => Date.now());
  useEffect(() => {
    let active = true;
    request().then(data => { if (active) { setPosts(data.posts); setLoading(false); } }).catch(failure => { if (active) { setError(failure.message); setLoading(false); } });
    return () => { active = false; };
  }, []);
  async function refresh() {
    const current = ++sequence.current; setLoading(true); setError(""); setSummaryTime(Date.now());
    try { const data = await request(); if (current === sequence.current) setPosts(data.posts); }
    catch (failure) { if (current === sequence.current) setError(failure.message); }
    finally { if (current === sequence.current) setLoading(false); }
  }
  async function add(event) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const post = await request("", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url, title }) });
      setPosts(previous => [post, ...(previous || []).filter(item => item.id !== post.id)]);
      setAdding(false); setUrl(""); setTitle("");
    } catch (failure) { setError(failure.message); }
    finally { setSaving(false); }
  }
  async function remove(post) {
    if (!window.confirm("Remove this link from TruDash? The original social media post will remain.")) return;
    setSaving(true); setError("");
    try { await request(`/${post.id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: true }) }); setPosts(previous => previous.filter(item => item.id !== post.id)); }
    catch (failure) { setError(failure.message); }
    finally { setSaving(false); }
  }
  const list = posts || [];
  const counts = { all: list.length, FACEBOOK: list.filter(post => post.platform === "FACEBOOK").length, INSTAGRAM: list.filter(post => post.platform === "INSTAGRAM").length };
  const filtered = list.filter(post => (tab === "all" || post.platform === tab) && `${post.title} ${post.url}`.toLowerCase().includes(search.toLowerCase()));
  const recent = list.filter(post => summaryTime - new Date(post.createdAt).getTime() < 30 * 86400000).length;
  return <div className="admin-page membership-pilot social-media">
    <header className="admin-header"><div><p className="eyebrow">CLUB COMMUNICATIONS</p><strong>Social Media</strong></div><div className="header-actions"><a className="secondary-btn" href={FACEBOOK} target="_blank" rel="noopener noreferrer">Facebook ↗</a><a className="secondary-btn" href={INSTAGRAM} target="_blank" rel="noopener noreferrer">Instagram ↗</a></div></header>
    <main className="members-shell"><div className="page-heading"><div><p className="eyebrow">SOCIAL MEDIA HUB</p><h1>Club social media</h1><p>A shared collection of the club's public posts and reels.</p></div><div className="heading-actions"><button className="secondary-btn" disabled={loading || saving} onClick={refresh}>{loading ? "Refreshing…" : "Refresh"}</button><button className="download-btn" disabled={loading || saving} onClick={() => setAdding(!adding)}>{adding ? "Close form" : "+ Add post URL"}</button></div></div>
      <section className="stats-grid social-stats" aria-label="Saved post summary"><Metric label="Saved post links" value={posts ? counts.all : "—"} note="Curated in TruDash" /><Metric label="Facebook links" value={posts ? counts.FACEBOOK : "—"} note="Saved Facebook posts & reels" /><Metric label="Instagram links" value={posts ? counts.INSTAGRAM : "—"} note="Saved Instagram posts & reels" /><Metric label="Added in last 30 days" value={posts ? recent : "—"} note="Date added to TruDash" tone="green" /></section>
      {error && <p className="error" role="alert">{error}</p>}
      {adding && <form className="social-add-card" onSubmit={add}><h2>Add a public post</h2><p className="social-muted">Paste the post's full permalink, rather than the profile or a shortened share link. Please add only club content.</p><div className="social-form-grid"><label>Post URL<input type="url" required value={url} maxLength={2000} onChange={event => setUrl(event.target.value)} placeholder="https://www.instagram.com/p/…/" /></label><label>Title or label (optional)<input value={title} maxLength={150} onChange={event => setTitle(event.target.value)} placeholder="Team news, recruitment, club update…" /></label></div><button className="download-btn" disabled={saving || loading}>{saving ? "Saving…" : "Save post link"}</button></form>}
      <section className="admin-card"><div className="directory-heading"><div><h2>Public post collection</h2><p>Links are shared across authorised users. New posts are added manually.</p></div><span className="record-count">{filtered.length} links</span></div>
        <div className="member-tabs">{[["all", "All posts"], ["FACEBOOK", "Facebook"], ["INSTAGRAM", "Instagram"]].map(([key,label]) => <button key={key} aria-pressed={tab===key} className={tab===key?"is-active":""} onClick={()=>setTab(key)}>{label}<span>{counts[key]}</span></button>)}</div>
        <div className="social-toolbar"><label>Search posts<input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Title or URL" /></label><button className="secondary-btn" onClick={()=>setPreviews(!previews)} aria-pressed={previews}>{previews ? "Hide previews" : "Load Facebook & Instagram previews"}</button></div>
        <p className="social-summary-note">These counts describe links saved in TruDash. Likes, comments, reach and follower totals are not connected.</p>
        {!posts && loading && <div className="empty-state" role="status"><p>Loading saved links…</p></div>}
        {posts && !filtered.length && <div className="empty-state"><strong>No matching saved posts</strong><p>{list.length ? "Try another filter or search." : "Add a public post URL to start the club's shared collection."}</p></div>}
        <div className="social-post-grid">{filtered.map(post=><article className="social-post-card" key={post.id}><div className="social-post-heading"><span className="member-badge badge-blue">{post.platform === "FACEBOOK" ? "Facebook" : "Instagram"}</span><button className="text-btn" disabled={saving} onClick={()=>remove(post)} aria-label={`Remove ${post.title || "post link"}`}>Remove link</button></div><h3>{post.title || "Club post"}</h3><p className="social-muted">Added {new Date(post.createdAt).toLocaleDateString("en-GB")}</p>{previews && <MetaPreview url={post.url} platform={post.platform} />}<a className="secondary-btn compact-btn" href={post.url} target="_blank" rel="noopener noreferrer">View original post ↗</a></article>)}</div>
      </section>
      {previews && <section className="social-page-timeline social-add-card"><h2>Club Facebook timeline</h2><p className="social-muted">A public Facebook preview. Availability depends on Facebook and your browser; it is separate from the saved links above.</p><MetaPreview url={FACEBOOK} platform="FACEBOOK" page /><a className="secondary-btn" href={FACEBOOK} target="_blank" rel="noopener noreferrer">Open the Facebook page ↗</a></section>}
    </main>
  </div>;
}
