import React, { useState, useEffect, useRef } from "react";
import { Avatar, timeAgo } from "./FeedView";
import { IconShare } from "./Icons";

export default function ChatView({ api, token, me, initialPartnerId = null, liveMessage = null }) {
  const [threads, setThreads] = useState([]);
  const [activePartner, setActivePartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const endRef = useRef(null);

  const loadThreads = async () => {
    const res = await fetch(`${api}/api/messages/threads`, { headers: { Authorization: `Bearer ${token}` } }); if (res.ok) { const data = await res.json(); setThreads(data.threads); if (initialPartnerId && !activePartner) { const found = data.threads.find((t) => t.id === initialPartnerId); if (found) setActivePartner(found); } } };  const loadMessages = async (partnerId) => { if (!partnerId) return; const res = await fetch(`${api}/api/messages/${partnerId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages);
    }
  };

  useEffect(() => {
    loadThreads();
  }, []);

  useEffect(() => {
    if (activePartner) loadMessages(activePartner.id);
  }, [activePartner?.id]);

  useEffect(() => {
    if (!liveMessage) return;
    loadThreads();
    if (
      activePartner &&
      ((liveMessage.sender_id === activePartner.id && liveMessage.receiver_id === me.id) ||
        (liveMessage.sender_id === me.id && liveMessage.receiver_id === activePartner.id))
    ) {
      loadMessages(activePartner.id);
    }
  }, [liveMessage]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() || !activePartner) return;
    const body = text.trim();
    setText("");
    setMessages((prev) => [...prev, { id: "tmp_" + Date.now(), sender_id: me.id, text: body, created: Date.now() }]);
    await fetch(`${api}/api/messages/${activePartner.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ text: body }), }); loadMessages(activePartner.id); loadThreads(); };  return ( <div className={"chat-shell" + (activePartner ? " in-chat" : "")}> <div className="chat-list"> <div className="chat-list-hd"> <b>{me.username}</b> <span style={{ fontSize: 12, color: "#0095f6", fontWeight: 600 }}>● Direct</span> </div> {threads.map((t) => ( <div key={t.id} className={"thread-item" + (activePartner?.id === t.id ? " on" : "")} onClick={() => setActivePartner(t)} > <Avatar url={t.avatar_url} name={t.username} size={46} /> <div style={{ flex: 1, minWidth: 0 }}> <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}> <b>{t.full_name}</b> {t.unread > 0 && <span className="unread-dot">{t.unread}</span>} </div> <div className="last-msg"> {t.last_message ? `${t.last_message.text} · ${timeAgo(t.last_message.created)}` : `@${t.username}`}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="chat-box">
        {!activePartner ? (
          <div className="chat-empty">
            <div style={{ marginBottom: 10 }}><IconShare size={44} /></div>
            <h3>Your Messages</h3>
            <p style={{ color: "#737373" }}>Select a creator on the left to chat in real time.</p>
          </div>
        ) : (
          <>
            <div className="chat-hd">
              <button
                type="button"
                className="chat-back-btn"
                onClick={() => setActivePartner(null)}
                aria-label="Back to inbox"
              >
                ←
              </button>
              <Avatar url={activePartner.avatar_url} name={activePartner.username} size={36} />
              <div>
                <b>{activePartner.full_name}</b>
                <div style={{ fontSize: 12, color: "#737373" }}>@{activePartner.username}</div>
              </div>
            </div>

            <div className="chat-stream">
              {messages.map((m) => (
                <div key={m.id} className={"bubble" + (m.sender_id === me.id ? " me" : "")}>
                  <div>{m.text}</div>
                  <small>{timeAgo(m.created)}</small>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            <form className="chat-input-bar" onSubmit={sendMessage}>
              <input placeholder="Message..." value={text} onChange={(e) => setText(e.target.value)} />
              <button type="submit" disabled={!text.trim()}>Send</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}