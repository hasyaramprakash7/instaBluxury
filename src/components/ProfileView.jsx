import React, { useState, useEffect, useCallback, useRef } from "react";
import { Avatar, parseCaptionLink, VideoScrubber } from "./FeedView";
import { IconHeart, IconComment, IconReels, IconBookmark, IconGrid, IconTrash, IconVolume, IconBack } from "./Icons";

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

function ProfileReelSlide({
  item,
  profile,
  isMe,
  isActive,
  muted,
  onToggleMute,
  requireAuth,
  onLike,
  onSave,
  onComment,
  onDeletePost,
  registerRef,
}) {
  const videoRef = useRef(null);
  const [userPaused, setUserPaused] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [txt, setTxt] = useState("");
  const [heartAnim, setHeartAnim] = useState(false);
  const { text: cleanCaption, link: itemLink } = parseCaptionLink(item.caption);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isActive) {
      setUserPaused(false);
      v.muted = muted;
      v.play().catch(() => {
        v.muted = true;
        v.play().catch(() => {});
      });
    } else {
      v.pause();
      v.currentTime = 0;
      setUserPaused(false);
    }
  }, [isActive]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  const togglePlayPause = (e) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setUserPaused(false);
    } else {
      v.pause();
      setUserPaused(true);
    }
  };

  return (
    <div
      data-prof-reel-id={item.id}
      ref={(el) => registerRef(item.id, el)}
      onDoubleClick={() => {
        requireAuth(() => {
          setHeartAnim(true);
          setTimeout(() => setHeartAnim(false), 700);
          if (!item.liked) onLike(item.id);
        });
      }}
      style={{
        position: "relative",
        width: "100%",
        height: "100dvh",
        flex: "0 0 100dvh",
        scrollSnapAlign: "start",
        scrollSnapStop: "always",
        background: "#000",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {item.media_type === "video" ? (
        <video
          ref={videoRef}
          src={item.media_url}
          loop
          playsInline
          muted={muted}
          onClick={togglePlayPause}
          style={{ width: "100%", height: "100%", objectFit: "contain", cursor: "pointer" }}
        />
      ) : (
        <img src={item.media_url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      )}

      {userPaused && item.media_type === "video" && (
        <div
          style={{
            position: "absolute",
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "rgba(0,0,0,0.6)",
            color: "#fff",
            display: "grid",
            placeItems: "center",
            pointerEvents: "none",
            zIndex: 6,
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="7 4 20 12 7 20 7 4" />
          </svg>
        </div>
      )}

      {heartAnim && (
        <div className="big-heart" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
          <IconHeart filled size={90} />
        </div>
      )}

      <div style={{ position: "absolute", top: 14, right: 14, zIndex: 15, display: "flex", gap: 8 }}>
        {item.media_type === "video" && (
          <button
            type="button"
            className="mute-btn"
            style={{ position: "static" }}
            onClick={(e) => { e.stopPropagation(); onToggleMute(); }}
            aria-label="Toggle sound"
          >
            <IconVolume muted={muted} />
          </button>
        )}
        {isMe && (
          <button
            type="button"
            className="mute-btn"
            style={{ position: "static", color: "#ff6b6b" }}
            title="Delete permanently"
            onClick={(e) => { e.stopPropagation(); onDeletePost(item.id); }}
          >
            <IconTrash />
          </button>
        )}
      </div>

      <div className="reel-info">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <Avatar url={profile.avatar_url} name={profile.username} size={36} ring />
          <b>{profile.username}</b>
          {profile.verified ? <span className="badge-v">✓</span> : null}
        </div>
        {cleanCaption && <p className="reel-cap">{cleanCaption}</p>}
        {item.location && <small style={{ opacity: 0.85, display: "block", marginBottom: 6 }}>{item.location}</small>}
        {itemLink && (
          <a
            href={itemLink.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginTop: 6,
              background: "rgba(255,255,255,0.94)",
              color: "#000",
              padding: "6px 12px",
              borderRadius: 18,
              fontSize: 12.5,
              fontWeight: 600,
              textDecoration: "none",
              textShadow: "none",
            }}
          >
            🔗 {itemLink.label} ↗
          </a>
        )}
      </div>

      <div className="reel-rail">
        <button onClick={(e) => { e.stopPropagation(); requireAuth(() => onLike(item.id)); }}>
          <IconHeart filled={item.liked} size={28} />
          <small>{item.like_count}</small>
        </button>
        <button onClick={(e) => { e.stopPropagation(); setDrawerOpen(!drawerOpen); }}>
          <IconComment size={28} />
          <small>{item.comment_count}</small>
        </button>
        <button onClick={(e) => { e.stopPropagation(); requireAuth(() => onSave(item.id)); }}>
          <IconBookmark filled={item.saved} size={28} />
          <small>Save</small>
        </button>
      </div>

      {item.media_type === "video" && <VideoScrubber videoRef={videoRef} />}

      {drawerOpen && (
        <div className="reel-drawer" onClick={(e) => e.stopPropagation()}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <b>Comments ({item.comments?.length || 0})</b>
            <button style={{ border: 0, background: "none", fontSize: 16, cursor: "pointer" }} onClick={() => setDrawerOpen(false)}>✕</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {!item.comments || item.comments.length === 0 ? (
              <p style={{ color: "#737373", fontSize: 13 }}>No comments yet.</p>
            ) : (
              item.comments.map((c) => (
                <div key={c.id} style={{ marginBottom: 8, fontSize: 13 }}>
                  <b>{c.username}</b> {c.text}
                </div>
              ))
            )}
          </div>
          <form
            className="comment-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!txt.trim()) return;
              requireAuth(() => {
                onComment(item.id, txt.trim());
                setTxt("");
              });
            }}
          >
            <input placeholder="Add a comment..." value={txt} onChange={(e) => setTxt(e.target.value)} />
            <button type="submit">Post</button>
          </form>
        </div>
      )}
    </div>
  );
}

function ProfileReelsViewer({
  items,
  initialId,
  profile,
  isMe,
  requireAuth,
  onLike,
  onSave,
  onComment,
  onDeletePost,
  onClose,
}) {
  const [activeId, setActiveId] = useState(initialId);
  const [muted, setMuted] = useState(false);
  const containerRef = useRef(null);
  const refs = useRef({});

  useEffect(() => {
    const el = refs.current[initialId];
    if (el) {
      el.scrollIntoView({ behavior: "auto", block: "start" });
    }
  }, [initialId]);

  useEffect(() => {
    const rootEl = containerRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.7) {
            const id = entry.target.getAttribute("data-prof-reel-id");
            if (id) setActiveId(id);
          }
        }
      },
      { root: rootEl, threshold: [0.7] }
    );
    Object.values(refs.current).forEach((el) => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [items]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        zIndex: 120,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div style={{ position: "relative", width: "100%", maxWidth: 440, height: "100dvh", background: "#000" }}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Back to profile"
          style={{
            position: "absolute",
            top: 14,
            left: 14,
            zIndex: 25,
            background: "rgba(0,0,0,0.6)",
            color: "#fff",
            border: 0,
            borderRadius: "50%",
            width: 38,
            height: 38,
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
          }}
        >
          <IconBack />
        </button>

        <div
          ref={containerRef}
          style={{
            width: "100%",
            height: "100dvh",
            overflowY: "scroll",
            scrollSnapType: "y mandatory",
            scrollbarWidth: "none",
          }}
        >
          {items.map((item) => (
            <ProfileReelSlide
              key={item.id}
              item={item}
              profile={profile}
              isMe={isMe}
              isActive={activeId === item.id}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
              requireAuth={requireAuth}
              onLike={onLike}
              onSave={onSave}
              onComment={onComment}
              onDeletePost={onDeletePost}
              registerRef={(id, el) => { refs.current[id] = el; }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ProfileView({
  api,
  token,
  me,
  profileId,
  refreshTrigger,
  requireAuth,
  onLike,
  onSave,
  onComment,
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
  const [viewerItemId, setViewerItemId] = useState(null);

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

  const handleLocalLike = async (postId) => {
    await onLike(postId);
    load();
  };

  const handleLocalSave = async (postId) => {
    await onSave(postId);
    load();
  };

  const handleLocalComment = async (postId, text) => {
    await onComment(postId, text);
    load();
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
            <div key={p.id} className="exp-tile" onClick={() => setViewerItemId(p.id)}>
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

      {viewerItemId && shown.length > 0 && (
        <ProfileReelsViewer
          items={shown}
          initialId={viewerItemId}
          profile={profile}
          isMe={isMe}
          requireAuth={requireAuth}
          onLike={handleLocalLike}
          onSave={handleLocalSave}
          onComment={handleLocalComment}
          onDeletePost={async (postId) => {
            await onDeletePost(postId);
            setViewerItemId(null);
            load();
          }}
          onClose={() => setViewerItemId(null)}
        />
      )}
    </div>
  );
}