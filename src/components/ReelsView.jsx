import React, { useState, useEffect, useRef } from "react";
import { Avatar, parseCaptionLink, VideoScrubber } from "./FeedView";
import { IconHeart, IconComment, IconBookmark, IconVolume, IconReels } from "./Icons";

export function SingleReelCard({
  reel,
  isActive,
  muted,
  autoScroll,
  onToggleMute,
  onVideoEnded,
  me,
  requireAuth,
  onLike,
  onSave,
  onComment,
  onFollow,
  onOpenProfile,
  registerRef,
}) {
  const videoRef = useRef(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [txt, setTxt] = useState("");
  const [heartAnim, setHeartAnim] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const { text: cleanCaption, link: reelLink } = parseCaptionLink(reel.caption);

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
    if (videoRef.current) {
      videoRef.current.muted = muted;
    }
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
      if (!reel.liked) onLike(reel.id);
    });
  };

  return (
    <div
      className="reel-card"
      data-reel-id={reel.id}
      ref={(el) => registerRef(reel.id, el)}
      onDoubleClick={handleDoubleTap}
    >
      {reel.media_type === "video" ? (
        <video
          ref={videoRef}
          src={reel.media_url}
          className="reel-media"
          loop={!autoScroll}
          playsInline
          muted={muted}
          onEnded={() => {
            if (autoScroll && isActive && onVideoEnded) onVideoEnded();
          }}
          onClick={togglePlayPause}
        />
      ) : (
        <img src={reel.media_url} alt="" className="reel-media" />
      )}

      {userPaused && reel.media_type === "video" && (
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

      {reel.media_type === "video" && (
        <button className="mute-btn" onClick={(e) => { e.stopPropagation(); onToggleMute(); }} aria-label="Toggle sound">
          <IconVolume muted={muted} />
        </button>
      )}

      {heartAnim && (
        <div className="big-heart" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
          <IconHeart filled size={90} />
        </div>
      )}

      <div className="reel-info">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <Avatar url={reel.avatar_url} name={reel.username} size={36} ring onClick={() => onOpenProfile(reel.user_id)} />
          <b style={{ cursor: "pointer" }} onClick={() => onOpenProfile(reel.user_id)}>{reel.username}</b>
          {(!me || reel.user_id !== me.id) && (
            <button
              className="reel-follow"
              onClick={(e) => { e.stopPropagation(); requireAuth(() => onFollow(reel.user_id)); }}
            >
              {reel.following ? "Following" : "Follow"}
            </button>
          )}
        </div>
        {cleanCaption && <p className="reel-cap">{cleanCaption}</p>}
        {reel.location && <small style={{ opacity: 0.85, display: "block", marginBottom: 6 }}>{reel.location}</small>}
        {reelLink && (
          <a
            href={reelLink.url}
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
            🔗 {reelLink.label} ↗
          </a>
        )}
      </div>

      <div className="reel-rail">
        <button onClick={(e) => { e.stopPropagation(); requireAuth(() => onLike(reel.id)); }}>
          <IconHeart filled={reel.liked} size={28} />
          <small>{reel.like_count}</small>
        </button>
        <button onClick={(e) => { e.stopPropagation(); setDrawerOpen(!drawerOpen); }}>
          <IconComment size={28} />
          <small>{reel.comment_count}</small>
        </button>
        <button onClick={(e) => { e.stopPropagation(); requireAuth(() => onSave(reel.id)); }}>
          <IconBookmark filled={reel.saved} size={28} />
          <small>Save</small>
        </button>
      </div>

      {reel.media_type === "video" && <VideoScrubber videoRef={videoRef} />}

      {drawerOpen && (
        <div className="reel-drawer" onClick={(e) => e.stopPropagation()}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <b>Comments ({reel.comments.length})</b>
            <button style={{ border: 0, background: "none", fontSize: 16, cursor: "pointer" }} onClick={() => setDrawerOpen(false)}>✕</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {reel.comments.length === 0 ? (
              <p style={{ color: "#737373", fontSize: 13 }}>No comments yet.</p>
            ) : (
              reel.comments.map((c) => (
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
                onComment(reel.id, txt.trim());
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

export default function ReelsView({
  me,
  reels,
  requireAuth,
  onLike,
  onSave,
  onComment,
  onFollow,
  onOpenProfile,
  onOpenCreateReel,
}) {
  const [activeId, setActiveId] = useState(reels[0]?.id || null);
  const [muted, setMuted] = useState(false);
  const [autoScroll, setAutoScroll] = useState(false);
  const cardRefs = useRef({});
  const containerRef = useRef(null);

  useEffect(() => {
    if (!activeId && reels[0]) setActiveId(reels[0].id);
  }, [reels, activeId]);

  useEffect(() => {
    const rootEl = containerRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.7) {
            const id = entry.target.getAttribute("data-reel-id");
            if (id) setActiveId(id);
          }
        }
      },
      { root: rootEl, threshold: [0.7] }
    );

    Object.values(cardRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [reels]);

  const scrollToNext = (currentIndex) => {
    const nextReel = reels[currentIndex + 1];
    if (nextReel && cardRefs.current[nextReel.id]) {
      cardRefs.current[nextReel.id].scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (reels.length === 0) {
    return (
      <div className="empty-box" style={{ maxWidth: 460, margin: "40px auto" }}>
        <div style={{ marginBottom: 10 }}><IconReels /></div>
        <h2 style={{ margin: "0 0 8px" }}>No Reels Yet</h2>
        <p style={{ color: "#737373" }}>Upload short vertical videos to watch them in full-screen Reels mode.</p>
        <button className="btn-primary" style={{ maxWidth: 200, margin: "14px auto 0" }} onClick={() => requireAuth(onOpenCreateReel)}>
          Create Reel
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", maxWidth: 440, margin: "0 auto", background: "#000" }}>
      <button
        type="button"
        onClick={() => setAutoScroll((a) => !a)}
        style={{
          position: "absolute",
          top: 14,
          left: 14,
          zIndex: 15,
          background: autoScroll ? "#0095f6" : "rgba(0,0,0,0.58)",
          color: "#fff",
          border: "1px solid rgba(255,255,255,0.28)",
          borderRadius: 20,
          padding: "5px 12px",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        <span>{autoScroll ? "⟳ Auto-Scroll ON" : "⟳ Auto-Scroll"}</span>
      </button>

      <div className="reels-container" ref={containerRef}>
        {reels.map((r, idx) => (
          <SingleReelCard
            key={r.id}
            reel={r}
            isActive={activeId === r.id}
            muted={muted}
            autoScroll={autoScroll}
            onToggleMute={() => setMuted((m) => !m)}
            onVideoEnded={() => scrollToNext(idx)}
            me={me}
            requireAuth={requireAuth}
            onLike={onLike}
            onSave={onSave}
            onComment={onComment}
            onFollow={onFollow}
            onOpenProfile={onOpenProfile}
            registerRef={(id, el) => { cardRefs.current[id] = el; }}
          />
        ))}
      </div>
    </div>
  );
}