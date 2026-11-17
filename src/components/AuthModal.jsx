import React, { useState } from "react";

export default function AuthModal({ api, onAuth, onClose }) {
  const [isSignup, setIsSignup] = useState(false);
  const [form, setForm] = useState({ login: "", username: "", full_name: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const endpoint = isSignup ? "/api/auth/register" : "/api/auth/login";
      const res = await fetch(`${api}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Authentication failed");
      onAuth(data.token, data.user);
      if (onClose) onClose();
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  };

  const quickDemoLogin = async (username) => {
    setErr("");
    setBusy(true);
    try {
      const res = await fetch(`${api}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: username, password: "password123" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Demo login failed");
      onAuth(data.token, data.user);
      if (onClose) onClose();
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="auth-modal-box" onClick={(e) => e.stopPropagation()}>
        {onClose && (
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">✕</button>
        )}
        <div className="ig-logo" style={{ fontSize: 32, marginBottom: 6, padding: 0 }}>Bluxury</div>
        <p style={{ color: "#737373", marginBottom: 18, fontSize: 13.5 }}>
          {isSignup
            ? "Create an account to share posts, reels, stories & chat live."
            : "Log in to like, comment, upload media & message friends."}
        </p>

        {err && <div className="err-box">{err}</div>}

        <form onSubmit={submit} className="auth-form">
          {isSignup ? (
            <>
              <input placeholder="Email address" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <input placeholder="Full Name" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              <input placeholder="Username (e.g. rahul.design)" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
              <input placeholder="Password (min 6 chars)" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </>
          ) : (
            <>
              <input placeholder="Username or email" required value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} />
              <input placeholder="Password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </>
          )}
          <button className="btn-primary" disabled={busy}>
            {busy ? "Please wait..." : isSignup ? "Sign up" : "Log in"}
          </button>
        </form>

        {/* <div className="divider"><span>INSTANT 1-CLICK DEMO LOGIN</span></div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          <button type="button" className="btn-demo" disabled={busy} onClick={() => quickDemoLogin("rk_interiors")}>@rk_interiors</button>
          <button type="button" className="btn-demo" disabled={busy} onClick={() => quickDemoLogin("arjun.creates")}>@arjun.creates</button>
          <button type="button" className="btn-demo" disabled={busy} onClick={() => quickDemoLogin("ananya.travels")}>@ananya.travels</button>
        </div> */}

        <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid #efefef", fontSize: 13.5 }}>
          {isSignup ? (
            <span>Have an account? <b className="link" onClick={() => { setIsSignup(false); setErr(""); }}>Log in</b></span>
          ) : (
            <span>Don&apos;t have an account? <b className="link" onClick={() => { setIsSignup(true); setErr(""); }}>Sign up</b></span>
          )}
        </div>
      </div>
    </div>
  );
}