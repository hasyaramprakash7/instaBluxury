import React, { useState, useEffect, useCallback, useRef } from "react";
import AuthModal from "./components/AuthModal";
import FeedView, { Avatar } from "./components/FeedView";
import ReelsView from "./components/ReelsView";
import ExploreView from "./components/ExploreView";
import CreateModal from "./components/CreateModal";
import ChatView from "./components/ChatView";
import ProfileView from "./components/ProfileView";
import { IconHome, IconExplore, IconReels, IconChat, IconCreate, IconLogout, IconBack } from "./components/Icons";

const ENV = (typeof import.meta !== "undefined" && import.meta.env) || {};
const API = (ENV.VITE_API_URL || "").replace(/\/$/, "");

const CSS = `
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;background:#fafafa;color:#000;margin:0;padding:0;overflow-x:hidden;width:100%}
.app-shell{display:flex;min-height:100dvh;width:100%}
.sidebar{width:235px;background:#fff;border-right:1px solid #dbdbdb;padding:24px 14px;display:flex;flex-direction:column;position:fixed;top:0;bottom:0;left:0;z-index:30}
.ig-logo{font-family:Georgia,serif;font-style:italic;font-weight:700;font-size:24px;padding:8px 12px 24px;cursor:pointer;letter-spacing:-.5px}
.nav-btn{display:flex;align-items:center;gap:14px;padding:12px;border-radius:8px;border:0;background:transparent;font-size:15px;cursor:pointer;text-align:left;margin-bottom:4px;color:#000}
.nav-btn:hover{background:#f2f2f2}
.nav-btn.on{font-weight:700}
.nav-ic{width:26px;height:26px;display:grid;place-items:center;flex:none;position:relative}
.main-area{margin-left:235px;flex:1;padding-bottom:64px;min-width:0}
.mobile-top{display:none}
.mob-icon-btn{background:none;border:0;padding:6px;cursor:pointer;color:#000;display:grid;place-items:center;position:relative}

/* Auth Modal */
.auth-modal-box{position:relative;background:#fff;border:1px solid #dbdbdb;border-radius:12px;width:100%;max-width:380px;padding:28px 22px;text-align:center}
.modal-close-btn{position:absolute;top:12px;right:12px;background:#f2f2f2;border:0;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:14px}
.auth-form{display:flex;flex-direction:column;gap:8px}
.auth-form input{padding:11px 12px;border:1px solid #dbdbdb;border-radius:6px;background:#fafafa;font-size:14px}
.btn-primary{background:#0095f6;color:#fff;border:0;border-radius:8px;padding:10px 16px;font-weight:600;font-size:14px;cursor:pointer;width:100%;margin-top:6px}
.btn-primary:disabled{opacity:.5;cursor:not-allowed}
.btn-sec{background:#efefef;color:#000;border:0;border-radius:8px;padding:7px 14px;font-weight:600;font-size:13px;cursor:pointer}
.btn-demo{background:#f0f8ff;border:1px solid #b3dcff;color:#0077cc;border-radius:20px;padding:6px 12px;font-size:12px;cursor:pointer;font-weight:600}
.divider{display:flex;align-items:center;margin:16px 0;color:#8e8e8e;font-size:11px;font-weight:600}
.divider:before,.divider:after{content:"";flex:1;height:1px;background:#dbdbdb}
.divider span{padding:0 12px}
.link{color:#0095f6;cursor:pointer}
.err-box{background:#ffebe8;color:#c0392b;padding:9px;border-radius:6px;font-size:13px;margin-bottom:10px}

/* Avatars */
.av-wrap{border-radius:50%;overflow:hidden;flex:none;display:grid;place-items:center;background:#efefef}
.av-wrap.ring{padding:2px;background:linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)}
.av-img{width:100%;height:100%;object-fit:cover;border-radius:50%;border:2px solid #fff}
.av-fallback{width:100%;height:100%;border-radius:50%;background:#262626;color:#fff;display:grid;place-items:center;font-weight:600;border:2px solid #fff}

/* Feed */
.feed-layout{max-width:850px;margin:0 auto;padding:24px 16px;display:grid;grid-template-columns:470px 300px;gap:48px;justify-content:center}
.feed-main{min-width:0;width:100%}
.stories-bar{display:flex;gap:14px;overflow-x:auto;padding:12px 8px 14px;border-bottom:1px solid #efefef;margin-bottom:14px;scrollbar-width:none}
.stories-bar::-webkit-scrollbar{display:none}
.story-item{display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer;width:66px;flex:none}
.story-name{font-size:11px;max-width:64px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.story-plus{position:absolute;bottom:0;right:0;width:20px;height:20px;border-radius:50%;background:#0095f6;color:#fff;border:2px solid #fff;display:grid;place-items:center;font-weight:700;font-size:14px}

.post-card{background:#fff;border:1px solid #dbdbdb;border-radius:8px;margin-bottom:20px;overflow:hidden}
.post-hd{display:flex;align-items:center;justify-content:space-between;padding:10px 12px}
.post-user{display:flex;align-items:center;gap:10px;cursor:pointer;min-width:0}
.uname{font-weight:600;font-size:13.5px}
.badge-v{display:inline-grid;place-items:center;width:14px;height:14px;border-radius:50%;background:#0095f6;color:#fff;font-size:9px;margin-left:3px}
.dot{font-weight:400;color:#737373;font-size:13px}
.loc{font-size:12px;color:#737373}
.btn-follow{background:none;border:0;color:#0095f6;font-weight:600;font-size:13px;cursor:pointer}
.btn-follow.on{color:#737373}
.btn-del{background:none;border:0;cursor:pointer;color:#737373;display:grid;place-items:center}
.post-media{position:relative;background:#000;display:grid;place-items:center;max-height:580px;overflow:hidden}
.media-el{width:100%;max-height:580px;object-fit:contain;display:block}
.big-heart{position:absolute;animation:pop .6s ease}
@keyframes pop{0%{transform:scale(.3);opacity:0}50%{transform:scale(1.2);opacity:1}100%{transform:scale(1);opacity:0}}
.reel-pill{position:absolute;bottom:10px;right:10px;background:rgba(0,0,0,.65);color:#fff;font-size:11px;padding:4px 9px;border-radius:12px}
.post-actions{display:flex;justify-content:space-between;padding:8px 12px 4px}
.act-left{display:flex;gap:14px}
.ic-btn{background:none;border:0;cursor:pointer;padding:2px;display:grid;place-items:center;color:#000}
.post-body{padding:0 14px 12px}
.likes-cnt{font-weight:600;font-size:13.5px;margin-bottom:5px}
.caption{font-size:13.5px;line-height:1.4;margin-bottom:6px;word-break:break-word}
.comments-list{margin-bottom:6px}
.comment-row{font-size:13px;margin-bottom:3px;word-break:break-word}
.comment-form{display:flex;border-top:1px solid #efefef;padding-top:8px;margin-top:6px}
.comment-form input{flex:1;border:0;outline:0;font-size:14px;background:transparent}
.comment-form button{background:none;border:0;color:#0095f6;font-weight:600;cursor:pointer}

/* Sidebar suggestions */
.feed-side{padding-top:16px}
.side-me{display:flex;align-items:center;gap:12px;cursor:pointer;margin-bottom:22px}
.guest-card{background:#fff;border:1px solid #dbdbdb;border-radius:10px;padding:16px;margin-bottom:20px}
.sug-hd{font-size:13px;font-weight:600;color:#737373;margin-bottom:14px}
.sug-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.btn-link{background:none;border:0;color:#0095f6;font-weight:600;font-size:12px;cursor:pointer}

/* Reels - Strictly One Full-Screen Card Per Screen */
.reels-container{max-width:440px;margin:0 auto;padding:0;gap:0;height:100dvh;overflow-y:scroll;scroll-snap-type:y mandatory;scrollbar-width:none;background:#000}
.reels-container::-webkit-scrollbar{display:none}
.reel-card{position:relative;width:100%;height:100dvh;min-height:100dvh;max-height:100dvh;flex:0 0 100dvh;scroll-snap-align:start;scroll-snap-stop:always;background:#000;border-radius:0;overflow:hidden;color:#fff;display:flex;align-items:center;justify-content:center}
.reel-media{width:100%;height:100%;object-fit:contain;cursor:pointer;display:block;background:#000}
.mute-btn{position:absolute;top:14px;right:14px;background:rgba(0,0,0,.55);color:#fff;border:0;border-radius:50%;width:36px;height:36px;cursor:pointer;display:grid;place-items:center;z-index:5}
.reel-info{position:absolute;left:14px;bottom:22px;right:68px;text-shadow:0 1px 4px rgba(0,0,0,.85)}
.reel-follow{background:transparent;border:1px solid #fff;color:#fff;border-radius:6px;padding:3px 10px;font-size:12px;cursor:pointer}
.reel-cap{margin:0 0 4px;font-size:13.5px}
.reel-rail{position:absolute;right:12px;bottom:26px;display:flex;flex-direction:column;gap:18px}
.reel-rail button{background:none;border:0;color:#fff;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;text-shadow:0 1px 4px rgba(0,0,0,.7)}
.reel-drawer{position:absolute;left:0;right:0;bottom:0;height:58%;background:#fff;color:#000;border-radius:14px 14px 0 0;padding:14px;display:flex;flex-direction:column;z-index:10}

/* Explore */
.search-box{display:flex;align-items:center;gap:10px;background:#efefef;padding:10px 14px;border-radius:10px;margin-bottom:14px}
.search-box input{flex:1;border:0;background:transparent;outline:0;font-size:14px}
.search-box button{border:0;background:none;cursor:pointer}
.user-results{display:flex;gap:10px;overflow-x:auto;margin-bottom:14px;padding-bottom:4px}
.user-pill{display:flex;align-items:center;gap:10px;background:#fff;border:1px solid #dbdbdb;padding:8px 12px;border-radius:10px;cursor:pointer;flex:none}
.explore-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2px}
.exp-tile{position:relative;aspect-ratio:1/1;background:#000;overflow:hidden;cursor:pointer}
.exp-tile img,.exp-tile video{width:100%;height:100%;object-fit:cover}
.exp-ov{position:absolute;inset:0;background:rgba(0,0,0,.35);color:#fff;display:flex;align-items:center;justify-content:center;gap:14px;font-weight:700;opacity:0;transition:.2s;font-size:13px}
.exp-tile:hover .exp-ov{opacity:1}
.tile-badge{position:absolute;top:6px;right:6px;color:#fff;filter:drop-shadow(0 1px 3px rgba(0,0,0,.8))}
.exp-modal{background:#fff;max-width:860px;width:95%;height:76dvh;display:grid;grid-template-columns:1.3fr 1fr;border-radius:10px;overflow:hidden}
.exp-m-media{background:#000;display:grid;place-items:center;overflow:hidden}
.exp-m-media img,.exp-m-media video{width:100%;max-height:76dvh;object-fit:contain}
.exp-m-side{padding:16px;display:flex;flex-direction:column;min-height:0}

/* Modals & Create */
.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:100;display:grid;place-items:center;padding:12px}
.create-box{background:#fff;border-radius:12px;max-width:460px;width:100%;max-height:92dvh;overflow-y:auto}
.create-hd{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid #dbdbdb}
.type-tabs{display:flex;border-bottom:1px solid #dbdbdb}
.type-tabs button{flex:1;padding:10px;border:0;background:#fafafa;cursor:pointer;font-weight:600;color:#737373}
.type-tabs button.on{background:#fff;color:#0095f6;border-bottom:2px solid #0095f6}
.drop-zone{display:flex;flex-direction:column;align-items:center;border:2px dashed #dbdbdb;border-radius:10px;padding:30px 16px;text-align:center;cursor:pointer;margin-bottom:14px}
.c-input{width:100%;padding:10px;border:1px solid #dbdbdb;border-radius:6px;margin-bottom:10px;font:inherit;font-size:14px}
.story-viewer{position:relative;width:360px;max-width:95vw;height:620px;max-height:86dvh;background:#000;border-radius:12px;overflow:hidden;color:#fff}
.story-top{position:absolute;top:0;left:0;right:0;padding:14px;display:flex;justify-content:space-between;align-items:center;background:linear-gradient(rgba(0,0,0,.65),transparent);z-index:2}
.close-x{background:none;border:0;color:#fff;font-size:20px;cursor:pointer}
.story-media{width:100%;height:100%;object-fit:cover}
.story-cap{position:absolute;bottom:20px;left:16px;right:16px;background:rgba(0,0,0,.55);padding:10px 14px;border-radius:8px;font-size:14px}

/* Chat */
.chat-shell{max-width:920px;height:calc(100dvh - 48px);margin:24px auto;background:#fff;border:1px solid #dbdbdb;border-radius:8px;display:grid;grid-template-columns:310px 1fr;overflow:hidden}
.chat-list{border-right:1px solid #dbdbdb;overflow-y:auto}
.chat-list-hd{padding:16px;border-bottom:1px solid #dbdbdb;display:flex;justify-content:space-between;align-items:center}
.thread-item{display:flex;align-items:center;gap:12px;padding:12px 16px;cursor:pointer}
.thread-item:hover,.thread-item.on{background:#f5f5f5}
.last-msg{font-size:12.5px;color:#737373;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.unread-dot{background:#0095f6;color:#fff;font-size:11px;padding:1px 7px;border-radius:10px;font-weight:700}
.chat-box{display:flex;flex-direction:column;height:100%;min-height:0}
.chat-empty{margin:auto;text-align:center;padding:20px}
.chat-hd{padding:12px 16px;border-bottom:1px solid #dbdbdb;display:flex;align-items:center;gap:12px}
.chat-back-btn{display:none;background:none;border:0;cursor:pointer;padding:2px;color:#000}
.chat-stream{flex:1;padding:16px;overflow-y:auto;display:flex;flex-direction:column;gap:8px}
.bubble{max-width:75%;background:#efefef;padding:10px 14px;border-radius:18px;font-size:14px;align-self:flex-start;word-break:break-word}
.bubble.me{background:#0095f6;color:#fff;align-self:flex-end}
.bubble small{display:block;font-size:10px;opacity:.7;margin-top:3px}
.chat-input-bar{display:flex;gap:10px;padding:10px 14px;border-top:1px solid #dbdbdb;background:#fff}
.chat-input-bar input{flex:1;border:1px solid #dbdbdb;border-radius:22px;padding:10px 16px;outline:0;font-size:14px}
.chat-input-bar button{background:none;border:0;color:#0095f6;font-weight:700;cursor:pointer}

/* Profile */
.prof-hd{display:flex;gap:36px;align-items:center;padding-bottom:24px;border-bottom:1px solid #dbdbdb}
.edit-prof-box{background:#fff;border:1px solid #dbdbdb;padding:16px;border-radius:8px;margin-top:16px}
.prof-tabs{display:flex;justify-content:center;gap:24px;margin-bottom:12px}
.prof-tabs button{display:flex;align-items:center;gap:6px;background:none;border:0;border-top:2px solid transparent;padding:12px 4px;font-size:11.5px;font-weight:600;letter-spacing:.5px;color:#737373;cursor:pointer}
.prof-tabs button.on{border-color:#000;color:#000}
.empty-box{background:#fff;border:1px solid #dbdbdb;border-radius:8px;padding:40px 16px;text-align:center}

/* Tablet */
@media(max-width:960px){
  .feed-layout{grid-template-columns:1fr;max-width:520px}
  .feed-side{display:none}
}

/* Mobile Instagram Experience */
@media(max-width:720px){
  .app-shell{flex-direction:column;width:100%}
  .mobile-top{display:flex;justify-content:space-between;align-items:center;padding:8px 14px;background:#fff;border-bottom:1px solid #dbdbdb;position:sticky;top:0;z-index:35;height:48px;width:100%}
  .sidebar{top:auto;right:0;left:0;height:calc(52px + env(safe-area-inset-bottom));padding-bottom:env(safe-area-inset-bottom);width:100%;flex-direction:row;justify-content:space-around;align-items:center;padding-top:4px;border-right:0;border-top:1px solid #dbdbdb}
  .sidebar .ig-logo,.nav-lbl,.logout-btn,.nav-chat-desktop{display:none}
  .nav-btn{padding:8px;margin:0;justify-content:center}
  .main-area{margin-left:0;width:100%;padding-bottom:calc(60px + env(safe-area-inset-bottom))}

  /* Edge-to-edge mobile feed */
  .feed-layout{padding:0;max-width:100%;width:100%}
  .stories-bar{background:#fff;margin-bottom:0;padding:10px 12px;width:100%}
  .post-card{border-left:0;border-right:0;border-radius:0;margin-bottom:8px;width:100%}

  /* Full-screen single-block snap reels on mobile */
  .reels-container{max-width:100%;width:100%;margin:0;padding:0;gap:0;height:calc(100dvh - 100px);overflow-y:scroll;scroll-snap-type:y mandatory}
  .reel-card{height:calc(100dvh - 100px);min-height:calc(100dvh - 100px);max-height:calc(100dvh - 100px);flex:0 0 calc(100dvh - 100px);border-radius:0;scroll-snap-align:start;scroll-snap-stop:always;width:100%}

  /* Mobile two-screen DM inbox vs chat */
  .chat-shell{grid-template-columns:1fr;height:calc(100dvh - 100px);margin:0;border:0;border-radius:0;width:100%}
  .chat-shell:not(.in-chat) .chat-box{display:none}
  .chat-shell.in-chat .chat-list{display:none}
  .chat-back-btn{display:grid;place-items:center}

  /* Mobile profile & modals */
  .prof-hd{flex-direction:column;text-align:center;gap:14px;padding-bottom:18px}
  .prof-tabs{gap:14px}
  .exp-modal{grid-template-columns:1fr;height:auto;max-height:90dvh;overflow-y:auto}
  .exp-m-media img,.exp-m-media video{max-height:46dvh}
}
`;

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("bluxury_tok") || "");
  const [me, setMe] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const pendingActionRef = useRef(null);

  // Navigation state synchronized with Browser History Stack (Back / Forward buttons)
  const [nav, setNav] = useState(() => {
    const s = window.history.state;
    return s && s.tab ? s : { tab: "home", profileId: null, chatPartnerId: null };
  });
  const [canGoBack, setCanGoBack] = useState(false);
  const depthRef = useRef(0);

  const [createType, setCreateType] = useState(null);
  const [posts, setPosts] = useState([]);
  const [reels, setReels] = useState([]);
  const [stories, setStories] = useState([]);
  const [users, setUsers] = useState([]);
  const [syncTick, setSyncTick] = useState(0);
  const [liveMessage, setLiveMessage] = useState(null);

  const navigate = useCallback((next) => {
    setNav((prev) => {
      const merged = {
        tab: next.tab ?? prev.tab,
        profileId: next.profileId !== undefined ? next.profileId : prev.profileId,
        chatPartnerId: next.chatPartnerId !== undefined ? next.chatPartnerId : prev.chatPartnerId,
      };
      if (
        merged.tab === prev.tab &&
        merged.profileId === prev.profileId &&
        merged.chatPartnerId === prev.chatPartnerId
      ) {
        return prev;
      }
      window.history.pushState(merged, "", `#${merged.tab}`);
      depthRef.current += 1;
      setCanGoBack(depthRef.current > 0);
      window.scrollTo({ top: 0 });
      return merged;
    });
  }, []);

  const goBack = useCallback(() => {
    if (depthRef.current > 0) {
      window.history.back();
    } else {
      setNav({ tab: "home", profileId: null, chatPartnerId: null });
      setCanGoBack(false);
    }
  }, []);

  useEffect(() => {
    if (!window.history.state) {
      window.history.replaceState({ tab: "home", profileId: null, chatPartnerId: null }, "", "#home");
    }
    const onPopState = (e) => {
      depthRef.current = Math.max(0, depthRef.current - 1);
      setCanGoBack(depthRef.current > 0);
      if (e.state && e.state.tab) {
        setNav(e.state);
      } else {
        setNav({ tab: "home", profileId: null, chatPartnerId: null });
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const requireAuth = useCallback(
    (action) => {
      if (me && token) {
        action();
      } else {
        pendingActionRef.current = action;
        setAuthOpen(true);
      }
    },
    [me, token]
  );

  const loadAll = useCallback(async () => {
    const [feedRes, reelsRes, storyRes, usersRes] = await Promise.all([
      fetch(`${API}/api/feed`, { headers: authHeaders }),
      fetch(`${API}/api/feed?type=reel`, { headers: authHeaders }),
      fetch(`${API}/api/feed?type=story`, { headers: authHeaders }),
      fetch(`${API}/api/users`, { headers: authHeaders }),
    ]);

    if (feedRes.ok) setPosts((await feedRes.json()).items || []);
    if (reelsRes.ok) setReels((await reelsRes.json()).items || []);
    if (storyRes.ok) setStories((await storyRes.json()).items || []);
    if (usersRes.ok) setUsers((await usersRes.json()).users || []);

    if (token) {
      const meRes = await fetch(`${API}/api/auth/me`, { headers: authHeaders });
      if (meRes.ok) {
        setMe(await meRes.json());
      } else {
        localStorage.removeItem("bluxury_tok");
        setToken("");
        setMe(null);
      }
    }
  }, [token]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    let bc = null;
    try {
      bc = new BroadcastChannel("bluxury_live");
      bc.onmessage = (ev) => {
        if (ev.data?.type === "sync") {
          loadAll();
          setSyncTick((t) => t + 1);
        }
        if (ev.data?.type === "message") {
          setLiveMessage(ev.data.payload);
        }
      };
    } catch {}

    const es = new EventSource(`${API}/api/events`);
    const handleSync = () => {
      loadAll();
      setSyncTick((t) => t + 1);
    };

    es.addEventListener("sync", handleSync);
    es.addEventListener("follow", handleSync);
    es.addEventListener("like", (ev) => {
      try {
        const d = JSON.parse(ev.data);
        const patch = (list) => list.map((p) => (p.id === d.post_id ? { ...p, like_count: d.like_count } : p));
        setPosts(patch);
        setReels(patch);
      } catch {}
    });
    es.addEventListener("comment", (ev) => {
      try {
        const d = JSON.parse(ev.data);
        const patch = (list) =>
          list.map((p) =>
            p.id === d.post_id && !p.comments.some((c) => c.id === d.comment.id)
              ? { ...p, comment_count: p.comment_count + 1, comments: [...p.comments, d.comment] }
              : p
          );
        setPosts(patch);
        setReels(patch);
      } catch {}
    });
    es.addEventListener("message", (ev) => {
      try {
        setLiveMessage(JSON.parse(ev.data));
      } catch {}
    });

    return () => {
      es.close();
      if (bc) bc.close();
    };
  }, [loadAll]);

  const broadcastLocal = (type, payload = {}) => {
    try {
      const bc = new BroadcastChannel("bluxury_live");
      bc.postMessage({ type, payload });
      bc.close();
    } catch {}
  };

  const handleAuth = (tok, user) => {
    localStorage.setItem("bluxury_tok", tok);
    setToken(tok);
    setMe(user);
    setAuthOpen(false);
    if (pendingActionRef.current) {
      const fn = pendingActionRef.current;
      pendingActionRef.current = null;
      setTimeout(fn, 50);
    }
  };

  const logout = async () => {
    await fetch(`${API}/api/auth/logout`, { method: "POST", headers: authHeaders }).catch(() => {});
    localStorage.removeItem("bluxury_tok");
    setToken("");
    setMe(null);
    navigate({ tab: "home", profileId: null, chatPartnerId: null });
  };

  const toggleLike = async (postId) => {
    const update = (list) =>
      list.map((p) =>
        p.id === postId ? { ...p, liked: !p.liked, like_count: p.like_count + (p.liked ? -1 : 1) } : p
      );
    setPosts(update);
    setReels(update);
    await fetch(`${API}/api/posts/${postId}/like`, { method: "POST", headers: authHeaders });
    broadcastLocal("sync");
  };

  const toggleSave = async (postId) => {
    const update = (list) => list.map((p) => (p.id === postId ? { ...p, saved: !p.saved } : p));
    setPosts(update);
    setReels(update);
    await fetch(`${API}/api/posts/${postId}/save`, { method: "POST", headers: authHeaders });
    setSyncTick((t) => t + 1);
  };

  const addComment = async (postId, text) => {
    const res = await fetch(`${API}/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ text }),
    });
    if (res.ok) {
      const c = await res.json();
      const update = (list) =>
        list.map((p) =>
          p.id === postId && !p.comments.some((x) => x.id === c.id)
            ? { ...p, comment_count: p.comment_count + 1, comments: [...p.comments, c] }
            : p
        );
      setPosts(update);
      setReels(update);
      broadcastLocal("sync");
    }
  };

  const toggleFollow = async (targetUserId) => {
    const res = await fetch(`${API}/api/users/${targetUserId}/follow`, { method: "POST", headers: authHeaders });
    if (res.ok) {
      const { following } = await res.json();
      setUsers((u) => u.map((x) => (x.id === targetUserId ? { ...x, following } : x)));
      setPosts((p) => p.map((x) => (x.user_id === targetUserId ? { ...x, following } : x)));
      setReels((r) => r.map((x) => (x.user_id === targetUserId ? { ...x, following } : x)));
      broadcastLocal("sync");
    }
  };

  const deletePost = async (postId) => {
    if (!confirm("Permanently delete this post from Cloudflare R2 & SQL?")) return;
    const res = await fetch(`${API}/api/posts/${postId}`, { method: "DELETE", headers: authHeaders });
    if (res.ok) {
      setPosts((p) => p.filter((x) => x.id !== postId));
      setReels((r) => r.filter((x) => x.id !== postId));
      setStories((s) => s.filter((x) => x.id !== postId));
      setSyncTick((t) => t + 1);
      broadcastLocal("sync");
    }
  };

  const deleteAccount = async () => {
    if (!confirm("Are you sure? This will permanently delete your BLuxury account and all your photos/videos from Cloudflare R2 & SQL.")) return;
    const res = await fetch(`${API}/api/account`, { method: "DELETE", headers: authHeaders });
    if (res.ok) {
      localStorage.removeItem("bluxury_tok");
      setToken("");
      setMe(null);
      setNav({ tab: "home", profileId: null, chatPartnerId: null });
      loadAll();
      broadcastLocal("sync");
    }
  };

  const { tab, profileId, chatPartnerId } = nav;

  return (
    <div className="app-shell">
      <style>{CSS}</style>

      {/* NATIVE MOBILE TOP HEADER WITH HISTORY BACK BUTTON */}
      <header className="mobile-top">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {(canGoBack || tab !== "home") && (
            <button className="mob-icon-btn" onClick={goBack} aria-label="Go back">
              <IconBack />
            </button>
          )}
          <div className="ig-logo" style={{ padding: 0, fontSize: 22 }} onClick={() => navigate({ tab: "home", profileId: null, chatPartnerId: null })}>
            BLuxury
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            className="mob-icon-btn"
            aria-label="Direct Messages"
            onClick={() => requireAuth(() => navigate({ tab: "chat", chatPartnerId: null }))}
          >
            <IconChat active={tab === "chat"} />
          </button>
          {me ? (
            <button className="mob-icon-btn" aria-label="Log out" onClick={logout}>
              <IconLogout />
            </button>
          ) : (
            <button
              className="btn-primary"
              style={{ width: "auto", margin: 0, padding: "5px 12px", fontSize: 13 }}
              onClick={() => setAuthOpen(true)}
            >
              Log in
            </button>
          )}
        </div>
      </header>

      {/* DESKTOP SIDEBAR / MOBILE BOTTOM TAB BAR */}
      <aside className="sidebar">
        <div className="ig-logo" onClick={() => navigate({ tab: "home", profileId: null, chatPartnerId: null })}>
          BLuxury
        </div>

        <button className={"nav-btn" + (tab === "home" ? " on" : "")} onClick={() => navigate({ tab: "home", profileId: null, chatPartnerId: null })} aria-label="Home">
          <span className="nav-ic"><IconHome active={tab === "home"} /></span>
          <span className="nav-lbl">Home</span>
        </button>

        <button className={"nav-btn" + (tab === "explore" ? " on" : "")} onClick={() => navigate({ tab: "explore" })} aria-label="Explore">
          <span className="nav-ic"><IconExplore active={tab === "explore"} /></span>
          <span className="nav-lbl">Explore</span>
        </button>

        <button className={"nav-btn" + (tab === "reels" ? " on" : "")} onClick={() => navigate({ tab: "reels" })} aria-label="Reels">
          <span className="nav-ic"><IconReels active={tab === "reels"} /></span>
          <span className="nav-lbl">Reels</span>
        </button>

        <button
          className={"nav-btn nav-chat-desktop" + (tab === "chat" ? " on" : "")}
          onClick={() => requireAuth(() => navigate({ tab: "chat", chatPartnerId: null }))}
          aria-label="Messages"
        >
          <span className="nav-ic"><IconChat active={tab === "chat"} /></span>
          <span className="nav-lbl">Messages</span>
        </button>

        <button className="nav-btn" onClick={() => requireAuth(() => setCreateType("post"))} aria-label="Create">
          <span className="nav-ic"><IconCreate /></span>
          <span className="nav-lbl">Create</span>
        </button>

        <button
          className={"nav-btn" + (tab === "profile" ? " on" : "")}
          onClick={() =>
            requireAuth(() => navigate({ tab: "profile", profileId: me.id }))
          }
          aria-label="Profile"
        >
          <span className="nav-ic">
            <Avatar url={me?.avatar_url} name={me?.username || "U"} size={24} />
          </span>
          <span className="nav-lbl">Profile</span>
        </button>

        <div className="logout-btn" style={{ flex: 1 }} />
        {me ? (
          <button className="nav-btn logout-btn" onClick={logout}>
            <span className="nav-ic"><IconLogout /></span>
            <span className="nav-lbl">Log out</span>
          </button>
        ) : (
          <button className="btn-primary logout-btn" onClick={() => setAuthOpen(true)}>
            Log in / Sign up
          </button>
        )}
      </aside>

      {/* MAIN VIEWPORT */}
      <main className="main-area">
        {tab === "home" && (
          <FeedView
            me={me}
            posts={posts}
            stories={stories}
            suggestions={users}
            requireAuth={requireAuth}
            onLike={toggleLike}
            onSave={toggleSave}
            onComment={addComment}
            onFollow={toggleFollow}
            onOpenProfile={(uid) => navigate({ tab: "profile", profileId: uid })}
            onOpenChat={(uid) => navigate({ tab: "chat", chatPartnerId: uid })}
            onOpenCreateStory={() => setCreateType("story")}
            onDeletePost={deletePost}
            onOpenAuth={() => setAuthOpen(true)}
          />
        )}

        {tab === "reels" && (
          <ReelsView
            me={me}
            reels={reels}
            requireAuth={requireAuth}
            onLike={toggleLike}
            onSave={toggleSave}
            onComment={addComment}
            onFollow={toggleFollow}
            onOpenProfile={(uid) => navigate({ tab: "profile", profileId: uid })}
            onOpenCreateReel={() => setCreateType("reel")}
          />
        )}

        {tab === "explore" && (
          <ExploreView
            posts={posts}
            users={users}
            requireAuth={requireAuth}
            onOpenProfile={(uid) => navigate({ tab: "profile", profileId: uid })}
            onLike={toggleLike}
          />
        )}

        {tab === "chat" && me && (
          <ChatView
            api={API}
            token={token}
            me={me}
            activePartnerId={chatPartnerId}
            onSelectPartner={(uid) => navigate({ tab: "chat", chatPartnerId: uid })}
            onBackFromChat={goBack}
            liveMessage={liveMessage}
          />
        )}

        {tab === "profile" && (
          <ProfileView
            api={API}
            token={token}
            me={me}
            profileId={profileId || me?.id}
            refreshTrigger={syncTick}
            requireAuth={requireAuth}
            onLike={toggleLike}
            onDeletePost={deletePost}
            onDeleteAccount={deleteAccount}
            onFollow={toggleFollow}
            onOpenChat={(uid) => navigate({ tab: "chat", chatPartnerId: uid })}
            onMeUpdated={setMe}
          />
        )}
      </main>

      {authOpen && (
        <AuthModal
          api={API}
          onAuth={handleAuth}
          onClose={() => {
            setAuthOpen(false);
            pendingActionRef.current = null;
          }}
        />
      )}

      {createType && me && (
        <CreateModal
          api={API}
          token={token}
          defaultType={createType}
          onClose={() => setCreateType(null)}
          onCreated={() => {
            loadAll();
            setSyncTick((t) => t + 1);
            broadcastLocal("sync");
          }}
        />
      )}
    </div>
  );
}