import React, { useState, useEffect, useRef } from "react";
import { IconHeart, IconComment, IconShare, IconBookmark, IconTrash, IconReels, IconVolume } from "./Icons";

export const Avatar = ({ url, name = "U", size = 36, ring = false, onClick }) => (
  <div
    className={"av-wrap" + (ring ? " ring" : "")}
    style={{ width: size, height: size, cursor: onClick ? "pointer" : "default" }}
    onClick={onClick}
  >
    {url ? (
      <img src={url} alt={name} className="av-img" />
    ) : (
      <div className="av-fallback" style={{ fontSize: Math.round(size * 0.42) }}>
        {(name[0] || "U").toUpperCase()}
      </div>
    )}
  </div>
);

export const timeAgo = (ts) => {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

export function parseCaptionLink(raw = "") {
  const str = String(raw || "");
  const match = str.match(/\[\[LINK\|([^|\]]+)\|([^\]]+)\]\]/);
  if (!match) return { text: str, link: null };
  return {
    text: str.replace(match[0], "").trim(),
    link: { label: match[1], url: match[2] },
  };
}

export function formatVideoTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export function VideoScrubber({ videoRef }) {
  const barRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onTime = () => {
      if (!dragging && v.duration) {
        setProgress((v.currentTime / v.duration) * 100);
        setDuration(v.duration);
      }
    };
    const onMeta = () => {
      if (v.duration) setDuration(v.duration);
    };

    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
    };
  }, [videoRef, dragging]);

  const seekToClientX = (clientX) => {
    const bar = barRef.current;
    const v = videoRef.current;
    if (!bar || !v || !v.duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    v.currentTime = ratio * v.duration;
    setProgress(ratio * 100);
  };

  const handlePointerDown = (e) => {
    e.stopPropagation();
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    seekToClientX(e.clientX);
  };

  const handlePointerMove = (e) => {
    if (!dragging) return;
    e.stopPropagation();
    seekToClientX(e.clientX);
  };

  const handlePointerUp = (e) => {
    if (!dragging) return;
    e.stopPropagation();
    setDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  const currentSec = duration ? (progress / 100) * duration : 0;

  return (
    <div
      ref={barRef}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: 24,
        display: "flex",
        alignItems: "flex-end",
        cursor: "pointer",
        zIndex: 12,
        touchAction: "none",
      }}
      aria-label="Video timeline scrubber"
    >
      {dragging && duration > 0 && (
        <div
          style={{
            position: "absolute",
            bottom: 26,
            left: `clamp(36px, ${progress}%, calc(100% - 36px))`,
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.82)",
            color: "#fff",
            fontSize: 11.5,
            fontWeight: 600,
            padding: "3px 8px",
            borderRadius: 6,
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          {formatVideoTime(currentSec)} / {formatVideoTime(duration)}
        </div>
      )}

      <div
        style={{
          width: "100%",
          height: dragging ? 6 : 3,
          background: "rgba(255,255,255,0.32)",
          position: "relative",
          transition: "height 0.12s ease",
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            background: "#fff",
            position: "relative",
          }}
        >
          <span
            style={{
              position: "absolute",
              right: -6,
              top: "50%",
              transform: `translateY(-50%) scale(${dragging ? 1.25 : 0.9})`,
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#fff",
              boxShadow: "0 1px 4px rgba(0,0,0,0.6)",
              transition: "transform 0.12s ease",
            }}
          />
        </div>
      </div>
    </div>
  );
}

function FeedVideoPlayer({ src, isActive, muted, onToggleMute }) {
  const vRef = useRef(null);
  const [userPaused, setUserPaused] = useState(false);

  useEffect(() => {
    const v = vRef.current;
    if (!v) return;
    if (isActive) {
      setUserPaused(false);
      v.muted = muted;
      const playPromise = v.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          v.muted = true;
          v.play().catch(() => {});
        });
      }
    } else {
      v.pause();
      v.currentTime = 0;
      setUserPaused(false);
    }
  }, [isActive, src]);

  useEffect(() => {
    if (vRef.current) {
      vRef.current.muted = muted;
    }
  }, [muted]);

  const togglePlayPause = (e) => {
    e.stopPropagation();
    const v = vRef.current;
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
      style={{ position: "relative", width: "100%", minHeight: 240, display: "grid", placeItems: "center", background: "#000", cursor: "pointer" }}
      onClick={togglePlayPause}
    >
      <video
        ref={vRef}
        src={src}
        playsInline
        loop
        muted={muted}
        preload="metadata"
        className="media-el"
        onLoadedData={() => {
          if (isActive && !userPaused && vRef.current && vRef.current.paused) {
            vRef.current.play().catch(() => {});
          }
        }}
      />

      {userPaused && (
        <div
          style={{
            position: "absolute",
            width: 58,
            height: 58,
            borderRadius: "50%",
            background: "rgba(0,0,0,0.6)",
            color: "#fff",
            display: "grid",
            placeItems: "center",
            pointerEvents: "none",
            zIndex: 6,
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="7 4 20 12 7 20 7 4" />
          </svg>
        </div>
      )}

      <button
        type="button"
        className="mute-btn"
        style={{ top: 10, right: 10, width: 32, height: 32 }}
        onClick={(e) => { e.stopPropagation(); onToggleMute(); }}
        aria-label="Toggle video sound"
      >
        <IconVolume muted={muted} />
      </button>
      <VideoScrubber videoRef={vRef} />
    </div>
  );
}

export default function FeedView({
  me,
  posts,
  stories,
  suggestions,
  requireAuth,
  onLike,
  onSave,
  onComment,
  onFollow,
  onOpenProfile,
  onOpenChat,
  onOpenCreateStory,
  onDeletePost,
  onOpenAuth,
}) {
  const [commentInputs, setCommentInputs] = useState({});
  const [activeStory, setActiveStory] = useState(null);
  const [heartAnim, setHeartAnim] = useState(null);
  const [activeVideoPostId, setActiveVideoPostId] = useState(null);
  const [feedMuted, setFeedMuted] = useState(false);
  const postRefs = useRef({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.getAttribute("data-post-id");
          if (!id) return;
          
          if (entry.isIntersecting && entry.intersectionRatio >= 0.45) {
            setActiveVideoPostId(id);
          } else {
            // If the video card scrolled out of view, pause it immediately
            setActiveVideoPostId((current) => (current === id ? null : current));
          }
        });
      },
      { threshold: [0.3, 0.5, 0.7] }
    );

    Object.values(postRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [posts]);

  const handleDoubleTap = (post) => {
    requireAuth(() => {
      setHeartAnim(post.id);
      setTimeout(() => setHeartAnim(null), 700);
      if (!post.liked) onLike(post.id);
    });
  };

  const submitComment = (e, postId) => {
    e.preventDefault();
    const txt = (commentInputs[postId] || "").trim();
    if (!txt) return;
    requireAuth(() => {
      onComment(postId, txt);
      setCommentInputs({ ...commentInputs, [postId]: "" });
    });
  };

  const storyParsed = activeStory ? parseCaptionLink(activeStory.caption) : null;

  return (
    <div className="feed-layout">
      <div className="feed-main">
        {/* STORIES BAR */}
        <div className="stories-bar">
          <div className="story-item" onClick={() => requireAuth(onOpenCreateStory)}>
            <div style={{ position: "relative" }}>
              <Avatar url={me?.avatar_url} name={me?.username || "+"} size={58} />
              <span className="story-plus">+</span>
            </div>
            <span className="story-name">{me ? "Your story" : "Add story"}</span>
          </div>
          {stories.map((st) => (
            <div className="story-item" key={st.id} onClick={() => setActiveStory(st)}>
              <Avatar url={st.avatar_url} name={st.username} size={58} ring />
              <span className="story-name">{st.username}</span>
            </div>
          ))}
        </div>

        {/* POSTS & REELS STREAM */}
        {posts.length === 0 ? (
          <div className="empty-box">
            <h3>Welcome to BLuxury</h3>
            <p style={{ color: "#737373" }}>No posts yet. Click <b>Create</b> to share the first photo or reel!</p>
          </div>
        ) : (
          posts.map((p) => {
            const { text: cleanCaption, link: postLink } = parseCaptionLink(p.caption);
            return (
              <article
                className="post-card"
                key={p.id}
                data-post-id={p.media_type === "video" ? p.id : undefined}
                ref={(el) => {
                  if (p.media_type === "video") postRefs.current[p.id] = el;
                }}
              >
                <header className="post-hd">
                  <div className="post-user" onClick={() => onOpenProfile(p.user_id)}>
                    <Avatar url={p.avatar_url} name={p.username} size={36} ring />
                    <div>
                      <div className="uname">
                        {p.username} {p.verified ? <span className="badge-v">✓</span> : null}
                        <span className="dot"> • {timeAgo(p.created)}</span>
                      </div>
                      {p.location && <div className="loc">{p.location}</div>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {(!me || p.user_id !== me.id) && (
                      <button
                        className={"btn-follow" + (p.following ? " on" : "")}
                        onClick={() => requireAuth(() => onFollow(p.user_id))}
                      >
                        {p.following ? "Following" : "Follow"}
                      </button>
                    )}
                    {me && p.user_id === me.id && (
                      <button className="btn-del" title="Delete permanently from Cloudflare R2 & SQL" onClick={() => onDeletePost(p.id)}>
                        <IconTrash />
                      </button>
                    )}
                  </div>
                </header>

                <div className="post-media" onDoubleClick={() => handleDoubleTap(p)}>
                  {p.media_type === "video" ? (
                    <FeedVideoPlayer
                      src={p.media_url}
                      isActive={activeVideoPostId === p.id}
                      muted={feedMuted}
                      onToggleMute={() => setFeedMuted((m) => !m)}
                    />
                  ) : (
                    <img src={p.media_url} alt={cleanCaption} className="media-el" loading="lazy" />
                  )}
                  {heartAnim === p.id && (
                    <div className="big-heart"><IconHeart filled size={84} /></div>
                  )}
                  {p.type === "reel" && (
                    <span className="reel-pill" style={{ bottom: 16, display: "flex", alignItems: "center", gap: 4 }}>
                      <IconReels /> Reel
                    </span>
                  )}
                </div>

                {/* CLICKABLE LINK BANNER DIRECTLY BELOW MEDIA */}
                {postLink && (
                  <a
                    href={postLink.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      background: "#f0f8ff",
                      borderBottom: "1px solid #dbdbdb",
                      color: "#0077cc",
                      textDecoration: "none",
                      fontSize: 13.5,
                      fontWeight: 600,
                    }}
                  >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      🔗 {postLink.label}
                      <span style={{ fontWeight: 400, color: "#737373", fontSize: 12, marginLeft: 6 }}>
                        ({postLink.url.replace(/^https?:\/\/(www\.)?/i, "").split("/")[0]})
                      </span>
                    </span>
                    <span style={{ flex: "none", marginLeft: 8 }}>↗</span>
                  </a>
                )}

                <div className="post-actions">
                  <div className="act-left">
                    <button className="ic-btn" onClick={() => requireAuth(() => onLike(p.id))}>
                      <IconHeart filled={p.liked} />
                    </button>
                    <button className="ic-btn" onClick={() => requireAuth(() => document.getElementById(`c_${p.id}`)?.focus())}>
                      <IconComment />
                    </button>
                    {(!me || p.user_id !== me.id) && (
                      <button className="ic-btn" title="Send Direct Message" onClick={() => requireAuth(() => onOpenChat(p.user_id))}>
                        <IconShare />
                      </button>
                    )}
                  </div>
                  <button className="ic-btn" onClick={() => requireAuth(() => onSave(p.id))}>
                    <IconBookmark filled={p.saved} />
                  </button>
                </div>

                <div className="post-body">
                  <div className="likes-cnt">{p.like_count} {p.like_count === 1 ? "like" : "likes"}</div>
                  {cleanCaption && (
                    <div className="caption">
                      <b className="uname" onClick={() => onOpenProfile(p.user_id)}>{p.username}</b> {cleanCaption}
                    </div>
                  )}

                  {p.comments.length > 0 && (
                    <div className="comments-list">
                      {p.comments.slice(-3).map((c) => (
                        <div key={c.id} className="comment-row">
                          <b>{c.username}</b> {c.text}
                        </div>
                      ))}
                    </div>
                  )}

                  <form className="comment-form" onSubmit={(e) => submitComment(e, p.id)}>
                    <input
                      id={`c_${p.id}`}
                      placeholder={me ? "Add a comment..." : "Log in to comment..."}
                      value={commentInputs[p.id] || ""}
                      onFocus={() => { if (!me) onOpenAuth(); }}
                      onChange={(e) => setCommentInputs({ ...commentInputs, [p.id]: e.target.value })}
                    />
                    {(commentInputs[p.id] || "").trim() && <button type="submit">Post</button>}
                  </form>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* RIGHT SUGGESTIONS SIDEBAR */}
      <aside className="feed-side">
        {me ? (
          <div className="side-me" onClick={() => onOpenProfile(me.id)}>
            <Avatar url={me.avatar_url} name={me.username} size={46} />
            <div>
              <b>{me.username}</b>
              <div style={{ color: "#737373", fontSize: 13 }}>{me.full_name}</div>
            </div>
          </div>
        ) : (
          <div className="guest-card">
            <b>Welcome to BLuxury</b>
            <p style={{ color: "#737373", fontSize: 13, margin: "6px 0 12px" }}>
              Sign in to post photos, reels, like, comment, and chat in real time.
            </p>
            <button className="btn-primary" onClick={onOpenAuth}>Log in / Sign up</button>
          </div>
        )}

        <div className="sug-hd">
          <span>Suggested creators</span>
        </div>

        {suggestions.filter((u) => !me || u.id !== me.id).slice(0, 5).map((u) => (
          <div className="sug-row" key={u.id}>
            <div className="post-user" onClick={() => onOpenProfile(u.id)}>
              <Avatar url={u.avatar_url} name={u.username} size={36} />
              <div>
                <div className="uname">{u.username} {u.verified ? <span className="badge-v">✓</span> : null}</div>
                <div style={{ color: "#737373", fontSize: 12 }}>{u.full_name}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-link" onClick={() => requireAuth(() => onOpenChat(u.id))}>Chat</button>
              <button className="btn-link" onClick={() => requireAuth(() => onFollow(u.id))}>
                {u.following ? "Following" : "Follow"}
              </button>
            </div>
          </div>
        ))}
      </aside>

      {/* FULLSCREEN STORY VIEWER MODAL */}
      {activeStory && (
        <div className="modal-bg" onClick={() => setActiveStory(null)}>
          <div className="story-viewer" onClick={(e) => e.stopPropagation()}>
            <div className="story-top">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar url={activeStory.avatar_url} name={activeStory.username} size={34} />
                <b>{activeStory.username}</b>
                <span style={{ opacity: 0.7, fontSize: 12 }}>{timeAgo(activeStory.created)}</span>
              </div>
              <button className="close-x" onClick={() => setActiveStory(null)}>✕</button>
            </div>
            {activeStory.media_type === "video" ? (
              <video src={activeStory.media_url} autoPlay loop playsInline controls className="story-media" />
            ) : (
              <img src={activeStory.media_url} alt="" className="story-media" />
            )}
            {(storyParsed?.text || storyParsed?.link) && (
              <div className="story-cap">
                {storyParsed.text && <div>{storyParsed.text}</div>}
                {storyParsed.link && (
                  <a
                    href={storyParsed.link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-block",
                      marginTop: storyParsed.text ? 8 : 0,
                      background: "#fff",
                      color: "#000",
                      padding: "6px 12px",
                      borderRadius: 16,
                      fontWeight: 600,
                      fontSize: 12.5,
                      textDecoration: "none",
                    }}
                  >
                    🔗 {storyParsed.link.label} ↗
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}