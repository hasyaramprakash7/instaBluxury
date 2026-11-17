import React, { useState, useEffect, useRef } from "react";
import { Avatar, parseCaptionLink, VideoScrubber } from "./FeedView";
import { IconSearch, IconHeart, IconComment, IconReels, IconBookmark, IconVolume, IconBack } from "./Icons";

function ExploreSlide({
  item,
  isActive,
  muted,
  onToggleMute,
  requireAuth,
  onLike,
  onSave,
  onComment,
  onOpenProfile,
  onClose,
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

  const handleDoubleTap = () => {
    requireAuth(() => {
      setHeartAnim(true);
      setTimeout(() => setHeartAnim(false), 700);
      if (!item.liked) onLike(item.id);
    });
  };

  return (
    <div
      data-explore-slide-id={item.id}
      ref={(el) => registerRef(item.id, el)}
      onDoubleClick={handleDoubleTap}
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

      <button
        type="button"
        onClick={onClose}
        aria-label="Back to explore"
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

      {item.media_type === "video" && (
        <button
          className="mute-btn"
          onClick={(e) => { e.stopPropagation(); onToggleMute(); }}
          aria-label="Toggle sound"
          style={{ top: 14, right: 14, zIndex: 15 }}
        >
          <IconVolume muted={muted} />
        </button>
      )}

      <div className="reel-info">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <Avatar url={item.avatar_url} name={item.username} size={36} ring onClick={() => onOpenProfile(item.user_id)} />
          <b style={{ cursor: "pointer" }} onClick={() => onOpenProfile(item.user_id)}>{item.username}</b>
          {item.verified ? <span className="badge-v">✓</span> : null}
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

function ExploreReelsViewer({ items, initialId, requireAuth, onLike, onSave, onComment, onOpenProfile, onClose }) {
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
            const id = entry.target.getAttribute("data-explore-slide-id");
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
            <ExploreSlide
              key={item.id}
              item={item}
              isActive={activeId === item.id}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
              requireAuth={requireAuth}
              onLike={onLike}
              onSave={onSave}
              onComment={onComment}
              onOpenProfile={(uid) => { onClose(); onOpenProfile(uid); }}
              onClose={onClose}
              registerRef={(id, el) => { refs.current[id] = el; }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ExploreView({ posts, users, requireAuth, onOpenProfile, onLike, onSave, onComment }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const q = query.trim().toLowerCase();
  const filteredUsers = q ? users.filter((u) => u.username.includes(q) || u.full_name.toLowerCase().includes(q)) : [];
  const filteredPosts = q
    ? posts.filter((p) => p.caption.toLowerCase().includes(q) || p.location.toLowerCase().includes(q) || p.username.includes(q))
    : posts;

  return (
    <div style={{ maxWidth: 940, margin: "0 auto", padding: "16px" }}>
      <div className="search-box">
        <IconSearch />
        <input
          placeholder="Search creators, captions, or locations..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && <button onClick={() => setQuery("")}>✕</button>}
      </div>

      {filteredUsers.length > 0 && (
        <div className="user-results">
          {filteredUsers.map((u) => (
            <div key={u.id} className="user-pill" onClick={() => onOpenProfile(u.id)}>
              <Avatar url={u.avatar_url} name={u.username} size={36} />
              <div>
                <b>{u.username}</b>
                <div style={{ fontSize: 12, color: "#737373" }}>{u.full_name}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="explore-grid">
        {filteredPosts.map((p) => (
          <div key={p.id} className="exp-tile" onClick={() => setSelectedId(p.id)}>
            {p.media_type === "video" ? (
              <video src={p.media_url} muted playsInline preload="metadata" />
            ) : (
              <img src={p.media_url} alt="" loading="lazy" />
            )}
            <div className="exp-ov">
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><IconHeart filled size={18} /> {p.like_count}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><IconComment size={18} /> {p.comment_count}</span>
            </div>
            {p.type === "reel" && <span className="tile-badge"><IconReels /></span>}
          </div>
        ))}
      </div>

      {selectedId && filteredPosts.length > 0 && (
        <ExploreReelsViewer
          items={filteredPosts}
          initialId={selectedId}
          requireAuth={requireAuth}
          onLike={onLike}
          onSave={onSave}
          onComment={onComment}
          onOpenProfile={onOpenProfile}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}