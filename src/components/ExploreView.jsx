import React, { useState } from "react";
import { Avatar } from "./FeedView";
import { IconSearch, IconHeart, IconComment, IconReels } from "./Icons";

export default function ExploreView({ posts, users, requireAuth, onOpenProfile, onLike }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);

  const q = query.trim().toLowerCase();
  const filteredUsers = q ? users.filter((u) => u.username.includes(q) || u.full_name.toLowerCase().includes(q)) : [];
  const filteredPosts = q
    ? posts.filter((p) => p.caption.toLowerCase().includes(q) || p.location.toLowerCase().includes(q) || p.username.includes(q))
    : posts;

  const currentSelected = selected ? posts.find((p) => p.id === selected.id) || selected : null;

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
          <div key={p.id} className="exp-tile" onClick={() => setSelected(p)}>
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

      {currentSelected && (
        <div className="modal-bg" onClick={() => setSelected(null)}>
          <div className="exp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="exp-m-media">
              {currentSelected.media_type === "video" ? (
                <video src={currentSelected.media_url} controls autoPlay loop />
              ) : (
                <img src={currentSelected.media_url} alt="" />
              )}
            </div>
            <div className="exp-m-side">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, borderBottom: "1px solid #efefef" }}>
                <div className="post-user" onClick={() => { setSelected(null); onOpenProfile(currentSelected.user_id); }}>
                  <Avatar url={currentSelected.avatar_url} name={currentSelected.username} size={34} />
                  <b>{currentSelected.username}</b>
                </div>
                <button style={{ border: 0, background: "none", fontSize: 18, cursor: "pointer" }} onClick={() => setSelected(null)}>✕</button>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}>
                <p><b>{currentSelected.username}</b> {currentSelected.caption}</p>
                {currentSelected.comments.map((c) => (
                  <p key={c.id} style={{ fontSize: 13 }}><b>{c.username}</b> {c.text}</p>
                ))}
              </div>
              <div style={{ borderTop: "1px solid #efefef", paddingTop: 10 }}>
                <button
                  className="ic-btn"
                  style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600 }}
                  onClick={() => requireAuth(() => onLike(currentSelected.id))}
                >
                  <IconHeart filled={currentSelected.liked} size={22} /> {currentSelected.like_count} likes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}