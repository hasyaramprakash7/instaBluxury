import React, { useState, useEffect, useRef } from "react";
import { Avatar } from "./FeedView";
import { IconHeart, IconComment, IconBookmark, IconVolume, IconReels } from "./Icons";

function SingleReelCard({
  reel,
  isActive,
  muted,
  onToggleMute,
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

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isActive) {
      v.muted = muted;
      v.play().catch(() => {
        v.muted = true;
        v.play().catch(() => {});
      });
    } else {
      v.pause();
      v.currentTime = 0;
    }
  }, [isActive, muted]);

  return (
    <div className="reel-card" data-reel-id={reel.id} ref={(el) => registerRef(reel.id, el)}>
      {reel.media_type === "video" ? (
        <video
          ref={videoRef}
          src={reel.media_url}
          className="reel-media"
          loop
          playsInline
          muted={muted}
          onClick={onToggleMute}
        />
      ) : (
        <img src={reel.media_url} alt="" className="reel-media" />
      )}

      {reel.media_type === "video" && (
        <button className="mute-btn" onClick={onToggleMute} aria-label="Toggle sound">
          <IconVolume muted={muted} />
        </button>
      )}

      <div className="reel-info">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <Avatar url={reel.avatar_url} name={reel.username} size={36} onClick={() => onOpenProfile(reel.user_id)} />
          <b style={{ cursor: "pointer" }} onClick={() => onOpenProfile(reel.user_id)}>{reel.username}</b>
          {(!me || reel.user_id !== me.id) && (
            <button className="reel-follow" onClick={() => requireAuth(() => onFollow(reel.user_id))}>
              {reel.following ? "Following" : "Follow"}
            </button>
          )}
        </div>
        {reel.caption && <p className="reel-cap">{reel.caption}</p>}
        {reel.location && <small style={{ opacity: 0.85 }}>{reel.location}</small>}
      </div>

      <div className="reel-rail">
        <button onClick={() => requireAuth(() => onLike(reel.id))}>
          <IconHeart filled={reel.liked} size={27} />
          <small>{reel.like_count}</small>
        </button>
        <button onClick={() => setDrawerOpen(!drawerOpen)}>
          <IconComment size={27} />
          <small>{reel.comment_count}</small>
        </button>
        <button onClick={() => requireAuth(() => onSave(reel.id))}>
          <IconBookmark filled={reel.saved} size={27} />
          <small>Save</small>
        </button>
      </div>

      {drawerOpen && (
        <div className="reel-drawer">
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
  const cardRefs = useRef({});

  useEffect(() => {
    if (!activeId && reels[0]) setActiveId(reels[0].id);
  }, [reels, activeId]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.65) {
            const id = entry.target.getAttribute("data-reel-id");
            if (id) setActiveId(id);
          }
        }
      },
      { threshold: [0.65] }
    );

    Object.values(cardRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [reels]);

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
    <div className="reels-container">
      {reels.map((r) => (
        <SingleReelCard
          key={r.id}
          reel={r}
          isActive={activeId === r.id}
          muted={muted}
          onToggleMute={() => setMuted((m) => !m)}
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
  );
}