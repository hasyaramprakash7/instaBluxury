import React, { useState, useEffect, useCallback } from "react";
import { Avatar } from "./FeedView";
import { IconHeart, IconComment, IconReels, IconBookmark, IconGrid } from "./Icons";

export default function ProfileView({
  api,
  token,
  me,
  profileId,
  refreshTrigger,
  requireAuth,
  onLike,
  onFollow,
  onOpenChat,
  onMeUpdated,
}) {
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [saved, setSaved] = useState([]);
  const [tab, setTab] = useState("all"); // 'all', 'posts', 'reels', 'saved'
  const [selectedItem, setSelectedItem] = useState(null);
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState("");
  const [fullName, setFullName] = useState("");
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
      setBio(u.bio || "");
      setFullName(u.full_name || "");
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

  const saveProfile = async (e) => {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData();
    fd.append("full_name", fullName);
    fd.append("bio", bio);
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
      load();
    }
    setBusy(false);
  };

  if (!profile) return <div style={{ padding: 40, textAlign: "center" }}>Loading profile...</div>;

  const shown =
    tab === "all"
      ? posts
      : tab === "posts"
      ? posts.filter((p) => p.type === "post")
      : tab === "reels"
      ? posts.filter((p) => p.type === "reel")
      : saved;

  const activeModalItem = selectedItem ? posts.find((p) => p.id === selectedItem.id) || saved.find((p) => p.id === selectedItem.id) || selectedItem : null;

  return (
    <div style={{ maxWidth: 920, margin: "0 auto", padding: "28px 16px" }}>
      <div className="prof-hd">
        <Avatar url={profile.avatar_url} name={profile.username} size={110} ring />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontWeight: 400 }}>
              {profile.username} {profile.verified ? <span className="badge-v">✓</span> : null}
            </h2>
            {isMe ? (
              <button className="btn-sec" onClick={() => setEditing(!editing)}>Edit profile</button>
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

          <div style={{ display: "flex", gap: 28, marginBottom: 12, fontSize: 15 }}>
            <span><b>{posts.length}</b> posts &amp; reels</span>
            <span><b>{profile.followers_count}</b> followers</span>
            <span><b>{profile.following_count}</b> following</span>
          </div>

          <b>{profile.full_name}</b>
          <p style={{ margin: "4px 0 0", whiteSpace: "pre-line", fontSize: 14 }}>{profile.bio}</p>
        </div>
      </div>

      {editing && (
        <form onSubmit={saveProfile} className="edit-prof-box">
          <h4 style={{ margin: "0 0 10px" }}>Edit Profile</h4>
          <input className="c-input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" />
          <textarea className="c-input" rows={2} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Bio" />
          <div style={{ marginBottom: 10, fontSize: 13 }}>
            Profile Photo: <input type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files[0])} />
          </div>
          <button className="btn-primary" style={{ width: "auto" }} disabled={busy}>{busy ? "Saving..." : "Save Changes"}</button>
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
                <button style={{ border: 0, background: "none", fontSize: 18, cursor: "pointer" }} onClick={() => setSelectedItem(null)}>✕</button>
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