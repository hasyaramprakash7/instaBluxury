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

function FeedVideoPlayer({ src, isActive, muted, onToggleMute }) {
  const vRef = useRef(null);

  useEffect(() => {
    const v = vRef.current;
    if (!v) return;
    if (isActive) {
      v.muted = muted;
      v.play().catch(() => {
        v.muted = true;
        v.play().catch(() => {});
      });
    } else {
      v.pause();
    }
  }, [isActive, muted]);

  return (
    <div style={{ position: "relative", width: "100%", display: "grid", placeItems: "center" }}>
      <video
        ref={vRef}
        src={src}
        playsInline
        loop
        muted={muted}
        className="media-el"
        onClick={onToggleMute}
      />
      <button
        type="button"
        className="mute-btn"
        style={{ top: 10, right: 10, width: 32, height: 32 }}
        onClick={(e) => { e.stopPropagation(); onToggleMute(); }}
        aria-label="Toggle video sound"
      >
        <IconVolume muted={muted} />
      </button>
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
  const [feedMuted, setFeedMuted] = useState(true);
  const postRefs = useRef({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const id = entry.target.getAttribute("data-post-id");
            if (id) setActiveVideoPostId(id);
          }
        }
      },
      { threshold: [0.6] }
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
          posts.map((p) => (
            <article
              className="post-card"
              key={p.id}
              data-post-id={p.id}
              ref={(el) => { postRefs.current[p.id] = el; }}
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
                  <img src={p.media_url} alt={p.caption} className="media-el" loading="lazy" />
                )}
                {heartAnim === p.id && (
                  <div className="big-heart"><IconHeart filled size={84} /></div>
                )}
                {p.type === "reel" && (
                  <span className="reel-pill" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <IconReels /> Reel
                  </span>
                )}
              </div>

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
                {p.caption && (
                  <div className="caption">
                    <b className="uname" onClick={() => onOpenProfile(p.user_id)}>{p.username}</b> {p.caption}
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
          ))
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
            {activeStory.caption && <div className="story-cap">{activeStory.caption}</div>}
          </div>
        </div>
      )}
    </div>
  );
}