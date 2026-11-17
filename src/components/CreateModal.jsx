import React, { useState } from "react";
import { IconCreate, IconReels } from "./Icons";

export default function CreateModal({ api, token, defaultType = "post", onClose, onCreated }) {
  const [type, setType] = useState(defaultType);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("Visit Link");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setPreview({ url: URL.createObjectURL(f), isVideo: f.type.startsWith("video/") });
    if (f.type.startsWith("video/") && type === "post") setType("reel");
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return setErr("Please choose a photo or video file");
    setBusy(true);
    setErr("");
    try {
      const cleanUrl = linkUrl.trim()
        ? /^https?:\/\//i.test(linkUrl.trim())
          ? linkUrl.trim()
          : `https://${linkUrl.trim()}`
        : "";
      const cleanLabel = (linkLabel.trim() || "Visit Link").replace(/\|/g, "-");
      const finalCaption = cleanUrl
        ? `${caption.trim()}\n[[LINK|${cleanLabel}|${cleanUrl}]]`.trim()
        : caption.trim();

      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", type);
      fd.append("caption", finalCaption);
      fd.append("location", location);

      const res = await fetch(`${api}/api/posts`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      onCreated();
      onClose();
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="create-box" onClick={(e) => e.stopPropagation()}>
        <div className="create-hd">
          <b>Create new {type}</b>
          <button style={{ border: 0, background: "none", fontSize: 18, cursor: "pointer" }} onClick={onClose}>✕</button>
        </div>

        <div className="type-tabs">
          <button type="button" className={type === "post" ? "on" : ""} onClick={() => setType("post")}>Post</button>
          <button type="button" className={type === "reel" ? "on" : ""} onClick={() => setType("reel")}>Reel</button>
          <button type="button" className={type === "story" ? "on" : ""} onClick={() => setType("story")}>Story</button>
        </div>

        <form onSubmit={submit} style={{ padding: 20 }}>
          {err && <div className="err-box">{err}</div>}

          {!preview ? (
            <label className="drop-zone">
              <div style={{ marginBottom: 8 }}>{type === "reel" ? <IconReels /> : <IconCreate />}</div>
              <b>Select photo or video from device</b>
              <p style={{ color: "#737373", fontSize: 12 }}>Supports JPG, PNG, WebP, MP4, WebM up to 50MB</p>
              <input type="file" accept="image/*,video/*" hidden onChange={(e) => handleFile(e.target.files[0])} />
            </label>
          ) : (
            <div style={{ position: "relative", marginBottom: 14, background: "#000", borderRadius: 8, overflow: "hidden" }}>
              {preview.isVideo ? (
                <video src={preview.url} controls style={{ width: "100%", maxHeight: 280 }} />
              ) : (
                <img src={preview.url} alt="" style={{ width: "100%", maxHeight: 280, objectFit: "contain" }} />
              )}
              <button
                type="button"
                style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,.7)", color: "#fff", border: 0, borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}
                onClick={() => { setFile(null); setPreview(null); }}
              >
                Change
              </button>
            </div>
          )}

          <textarea
            rows={3}
            placeholder="Write a caption..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="c-input"
          />

          {type !== "story" && (
            <input
              placeholder="Add location (e.g. Hyderabad, India)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="c-input"
            />
          )}

          <div style={{ background: "#fafafa", border: "1px solid #efefef", borderRadius: 8, padding: 10, marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#737373", marginBottom: 6 }}>
              Attach Link (optional)
            </div>
            <input
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="c-input"
              style={{ marginBottom: linkUrl.trim() ? 8 : 0 }}
            />
            {linkUrl.trim() && (
              <input
                placeholder="Button label (e.g. Shop Now, Learn More)"
                value={linkLabel}
                onChange={(e) => setLinkLabel(e.target.value)}
                className="c-input"
                style={{ marginBottom: 0 }}
              />
            )}
          </div>

          <button className="btn-primary" disabled={busy || !file}>
            {busy ? "Uploading to Cloudflare R2..." : `Share ${type.charAt(0).toUpperCase() + type.slice(1)}`}
          </button>
        </form>
      </div>
    </div>
  );
}