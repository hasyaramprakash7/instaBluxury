import React, { useState, useEffect, useCallback } from "react";
import { Avatar } from "./FeedView";
import { IconHeart, IconComment, IconReels, IconBookmark, IconGrid, IconTrash } from "./Icons";

function parseBioAndLinks(rawBio = "") {
  const lines = String(rawBio || "").split("\n");
  const bioLines = [];
  const links = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^(https?:\/\/|www\.)\S+$/i.test(trimmed)) {
      links.push(trimmed);
    } else {
      bioLines.push(line);
    }
  }
  return { cleanBio: bioLines.join("\n").trim(), links };
}

function serializeBioAndLinks(cleanBio, links) {
  const validLinks = links
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => (/^https?:\/\//i.test(l) ? l : `https://${l}`));
  return [cleanBio.trim(), ...validLinks].filter(Boolean).join("\n");
}

const IconGear = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

export default function ProfileView({
  api,
  token,
  me,
  profileId,
  refreshTrigger,
  requireAuth,
  onLike,
  onDeletePost,
  onDeleteAccount,
  onFollow,
  onOpenChat,
  onMeUpdated,
}) {
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [saved, setSaved] = useState([]);
  const [tab, setTab] = useState("all");
  const [selectedItem, setSelectedItem] = useState(null);

  const [editing, setEditing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [links, setLinks] = useState([""]);
  const [avatarFile, setAvatarFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const isMe = me && profileId === me.id;
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const load = useCallback(async () => {
    if (!profileId) return;
    const [uRes, pRes] = await Promise.all([
      fetch(`${api}/api/users/${profileId}`, { headers: authHeaders }),
      fetch(`${api}/api/feed?user_id=${profileId}`, { headers: authHeaders }),
    ]);
    if (uRes.ok) {
      const u = await uRes.json();
      setProfile(u);
      const parsed = parseBioAndLinks(u.bio);
      setFullName(u.full_name || "");
      setBio(parsed.cleanBio);
      setLinks(parsed.links.length ? parsed.links : [""]);
    }
    if (pRes.ok) {
      const p = await pRes.json();
      setPosts(p.items || []);
    }
    if (isMe && token) {
      const sRes = await fetch(`${api}/api/feed?saved=1`, { headers: authHeaders });
      if (sRes.ok) setSaved((await sRes.json()).items || []);
    }
  }, [api, profileId, token, isMe]);

  useEffect(() => {
    setTab("all");
    load();
  }, [load, refreshTrigger]);

  const updateLinkField = (idx, val) => {
    setLinks((prev) => prev.map((item, i) => (i === idx ? val : item)));
  };

  const addLinkField = () => {
    if (links.length < 5) setLinks((prev) => [...prev, ""]);
  };

  const removeLinkField = (idx) => {
    setLinks((prev) => (prev.length === 1 ? [""] : prev.filter((_, i) => i !== idx)));
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData();
    fd.append("full_name", fullName.trim() || profile.full_name);
    fd.append("bio", serializeBioAndLinks(bio, links));
    if (avatarFile) fd.append("avatar", avatarFile);

    const res = await fetch(`${api}/api/profile`, {
      method: "POST",
      headers: authHeaders,
      body: fd,
    });
    if (res.ok) {
      const updated = await res.json();
      onMeUpdated(updated);
      setEditing(false);
      setAvatarFile(null);
      load();
    }
    setBusy(false);
  };

  if (!profile) return <div style={{ padding: 40, textAlign: "center" }}>Loading profile...</div>;

  const { cleanBio, links: profileLinks } = parseBioAndLinks(profile.bio);

  const shown =
    tab === "all"
      ? posts
      : tab === "posts"
      ? posts.filter((p) => p.type === "post")
      : tab === "reels"
      ? posts.filter((p) => p.type === "reel")
      : saved;

  const activeModalItem = selectedItem
    ? posts.find((p) => p.id === selectedItem.id) || saved.find((p) => p.id === selectedItem.id) || null
    : null;

  return (
    <div style={{ maxWidth: 920, margin: "0 auto", padding: "24px 16px" }}>
      <div className="prof-hd">
        <Avatar url={profile.avatar_url} name={profile.username} size={96} ring />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontWeight: 400 }}>
              {profile.username} {profile.verified ? <span className="badge-v">✓</span> : null}
            </h2>
            {isMe ? (
              <div style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 8 }}>
                <button className="btn-sec" onClick={() => setEditing(!editing)}>
                  {editing ? "Cancel" : "Edit profile"}
                </button>
                <button
                  type="button"
                  className="ic-btn"
                  style={{ padding: 6 }}
                  aria-label="Account settings"
                  title="Account settings"
                  onClick={() => setSettingsOpen((o) => !o)}
                >
                  <IconGear />
                </button>

                {settingsOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "115%",
                      right: 0,
                      background: "#fff",
                      border: "1px solid #dbdbdb",
                      borderRadius: 10,
                      boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
                      padding: 6,
                      minWidth: 190,
                      zIndex: 40,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSettingsOpen(false);
                        onDeleteAccount();
                      }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "9px 12px",
                        border: 0,
                        background: "transparent",
                        color: "#c0392b",
                        fontWeight: 600,
                        fontSize: 13.5,
                        borderRadius: 6,
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <IconTrash /> Delete account
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button
                  className={profile.following ? "btn-sec" : "btn-primary"}
                  style={{ width: "auto", padding: "7px 18px", marginTop: 0 }}
                  onClick={() => requireAuth(async () => { await onFollow(profile.id); load(); })}
                >
                  {profile.following ? "Following" : "Follow"}
                </button>
                <button className="btn-sec" onClick={() => requireAuth(() => onOpenChat(profile.id))}>Message</button>
              </>
            )}
          </div>

          <div style={{ display: "flex", gap: 24, marginBottom: 12, fontSize: 14.5 }}>
            <span><b>{posts.length}</b> posts</span>
            <span><b>{profile.followers_count}</b> followers</span>
            <span><b>{profile.following_count}</b> following</span>
          </div>

          <b style={{ fontSize: 15 }}>{profile.full_name}</b>
          {cleanBio && <p style={{ margin: "4px 0 6px", whiteSpace: "pre-line", fontSize: 14 }}>{cleanBio}</p>}

          {profileLinks.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
              {profileLinks.map((href, i) => {
                const fullHref = /^https?:\/\//i.test(href) ? href : `https://${href}`;
                const display = href.replace(/^https?:\/\/(www\.)?/i, "");
                return (
                  <a
                    key={i}
                    href={fullHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#00376b", fontWeight: 600, fontSize: 13.5, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}
                  >
                    🔗 {display}
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {editing && (
        <form onSubmit={saveProfile} className="edit-prof-box">
          <h4 style={{ margin: "0 0 12px" }}>Edit Profile</h4>

          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#737373", marginBottom: 4 }}>Name</label>
          <input className="c-input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your display name" />

          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#737373", marginBottom: 4 }}>Bio</label>
          <textarea className="c-input" rows={2} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Write about yourself..." />

          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#737373", marginBottom: 4 }}>
            Website &amp; Social Links (up to 5)
          </label>
          {links.map((lk, idx) => (
            <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input
                className="c-input"
                style={{ marginBottom: 0, flex: 1 }}
                value={lk}
                onChange={(e) => updateLinkField(idx, e.target.value)}
                placeholder="https://yourwebsite.com or instagram.com/..."
              />
              <button
                type="button"
                className="btn-sec"
                onClick={() => removeLinkField(idx)}
                aria-label="Remove link"
              >
                ✕
              </button>
            </div>
          ))}
          {links.length < 5 && (
            <button
              type="button"
              className="btn-sec"
              style={{ marginBottom: 12, fontSize: 12 }}
              onClick={addLinkField}
            >
              + Add another link
            </button>
          )}

          <div style={{ marginBottom: 12, fontSize: 13 }}>
            Profile Photo: <input type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files[0])} />
          </div>
          <button className="btn-primary" style={{ width: "auto" }} disabled={busy}>
            {busy ? "Saving..." : "Save Profile"}
          </button>
        </form>
      )}

      <div className="prof-tabs">
        <button className={tab === "all" ? "on" : ""} onClick={() => setTab("all")}>
          <IconGrid /> ALL ({posts.length})
        </button>
        <button className={tab === "posts" ? "on" : ""} onClick={() => setTab("posts")}>
          POSTS ({posts.filter((p) => p.type === "post").length})
        </button>
        <button className={tab === "reels" ? "on" : ""} onClick={() => setTab("reels")}>
          <IconReels /> REELS ({posts.filter((p) => p.type === "reel").length})
        </button>
        {isMe && (
          <button className={tab === "saved" ? "on" : ""} onClick={() => setTab("saved")}>
            <IconBookmark /> SAVED ({saved.length})
          </button>
        )}
      </div>

      {shown.length === 0 ? (
        <div className="empty-box"><p style={{ color: "#737373" }}>No posts or reels here yet.</p></div>
      ) : (
        <div className="explore-grid">
          {shown.map((p) => (
            <div key={p.id} className="exp-tile" onClick={() => setSelectedItem(p)}>
              {p.media_type === "video" ? (
                <video src={p.media_url} muted playsInline preload="metadata" />
              ) : (
                <img src={p.media_url} alt="" />
              )}
              <div className="exp-ov">
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}><IconHeart filled size={18} /> {p.like_count}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}><IconComment size={18} /> {p.comment_count}</span>
              </div>
              {p.type === "reel" && <span className="tile-badge"><IconReels /></span>}
            </div>
          ))}
        </div>
      )}

      {activeModalItem && (
        <div className="modal-bg" onClick={() => setSelectedItem(null)}>
          <div className="exp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="exp-m-media">
              {activeModalItem.media_type === "video" ? (
                <video src={activeModalItem.media_url} controls autoPlay loop />
              ) : (
                <img src={activeModalItem.media_url} alt="" />
              )}
            </div>
            <div className="exp-m-side">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, borderBottom: "1px solid #efefef" }}>
                <b>{profile.username}</b>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {isMe && (
                    <button
                      className="btn-del"
                      title="Delete permanently from Cloudflare R2 & SQL"
                      onClick={async () => {
                        await onDeletePost(activeModalItem.id);
                        setSelectedItem(null);
                        load();
                      }}
                    >
                      <IconTrash />
                    </button>
                  )}
                  <button style={{ border: 0, background: "none", fontSize: 18, cursor: "pointer" }} onClick={() => setSelectedItem(null)}>✕</button>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}>
                <p><b>{profile.username}</b> {activeModalItem.caption}</p>
                {activeModalItem.comments?.map((c) => (
                  <p key={c.id} style={{ fontSize: 13 }}><b>{c.username}</b> {c.text}</p>
                ))}
              </div>
              <div style={{ borderTop: "1px solid #efefef", paddingTop: 10 }}>
                <button
                  className="ic-btn"
                  style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600 }}
                  onClick={() => requireAuth(async () => { await onLike(activeModalItem.id); load(); })}
                >
                  <IconHeart filled={activeModalItem.liked} size={22} /> {activeModalItem.like_count} likes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}