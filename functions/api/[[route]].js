
export { PostCoordinator } from "../durable/PostCoordinator.js";
const json = (data, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...extraHeaders },
  });

async function hashPassword(pw) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pw));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const uid = (prefix = "") => prefix + crypto.randomUUID().replace(/-/g, "").slice(0, 16);

const ALLOWED_TYPES = {
  "image/jpeg": ["jpg", "image"],
  "image/png": ["png", "image"],
  "image/webp": ["webp", "image"],
  "image/gif": ["gif", "image"],
  "video/mp4": ["mp4", "video"],
  "video/webm": ["webm", "video"],
  "video/quicktime": ["mov", "video"],
};

const MAX_BYTES = 50 * 1024 * 1024;

async function getCurrentUser(req, env) {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const session = await env.DB.prepare("SELECT user_id FROM sessions WHERE token = ?").bind(token).first();
  if (!session) return null;
  return await env.DB.prepare("SELECT id, username, full_name, email, avatar_key, bio, verified, created FROM users WHERE id = ?")
    .bind(session.user_id)
    .first();
}

async function emitEvent(env, kind, payload) {
  await env.DB.prepare("INSERT INTO events (kind, payload, created) VALUES (?, ?, ?)")
    .bind(kind, JSON.stringify(payload), Date.now())
    .run()
    .catch(() => {});
}

export async function onRequest(context) {
  const { request: req, env } = context;
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/$/, "");
  const mediaUrl = (key) => (key ? (/^https?:\/\//i.test(key) ? key : `/api/media/${key}`) : null);

  try {
    // 1. R2 Media Delivery with HTTP Range Support for Instant Video Scrubbing
    if (req.method === "GET" && path.startsWith("/api/media/")) {
      const key = decodeURIComponent(path.replace("/api/media/", ""));
      const rangeHeader = req.headers.get("Range");

      if (rangeHeader) {
        const objHead = await env.BUCKET.head(key);
        if (!objHead) return new Response("Not found", { status: 404 });

        const size = objHead.size;
        const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
        const start = match ? Number(match[1]) : 0;
        const end = match && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
        const length = end - start + 1;

        const obj = await env.BUCKET.get(key, { range: { offset: start, length } });
        if (!obj) return new Response("Not found", { status: 404 });

        const headers = new Headers();
        obj.writeHttpMetadata(headers);
        headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
        headers.set("Accept-Ranges", "bytes");
        headers.set("Content-Length", String(length));
        headers.set("Cache-Control", "public, max-age=31536000, immutable");
        return new Response(obj.body, { status: 206, headers });
      }

      const obj = await env.BUCKET.get(key);
      if (!obj) return new Response("Not found", { status: 404 });

      const headers = new Headers();
      obj.writeHttpMetadata(headers);
      headers.set("Accept-Ranges", "bytes");
      headers.set("Content-Length", String(obj.size));
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
      return new Response(obj.body, { status: 200, headers });
    }

    // 2. Server-Sent Events (SSE) Real-Time Sync Stream
    if (req.method === "GET" && path === "/api/events") {
      const encoder = new TextEncoder();
      let lastSeqRow = await env.DB.prepare("SELECT MAX(seq) AS s FROM events").first().catch(() => ({ s: 0 }));
      let cursor = lastSeqRow?.s || 0;

      const stream = new ReadableStream({
        async start(controller) {
          const send = (event, data) => {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
          };
          send("connected", { seq: cursor });

          let ticks = 0;
          const interval = setInterval(async () => {
            ticks++;
            try {
              const rows = await env.DB.prepare("SELECT seq, kind, payload FROM events WHERE seq > ? ORDER BY seq ASC LIMIT 25")
                .bind(cursor)
                .all();
              for (const r of rows.results) {
                cursor = r.seq;
                send(r.kind, JSON.parse(r.payload));
              }
              if (ticks % 10 === 0) controller.enqueue(encoder.encode(": ping\n\n"));
              if (ticks >= 55) {
                clearInterval(interval);
                controller.close();
              }
            } catch {
              clearInterval(interval);
              try { controller.close(); } catch {}
            }
          }, 900);

          req.signal?.addEventListener("abort", () => {
            clearInterval(interval);
            try { controller.close(); } catch {}
          });
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // 3. Authentication Endpoints
    if (req.method === "POST" && path === "/api/auth/register") {
      const b = await req.json();
      const username = String(b.username || "").trim().toLowerCase().replace(/[^a-z0-9._]/g, "").slice(0, 30);
      const fullName = String(b.full_name || "").trim().slice(0, 80);
      const email = String(b.email || "").trim().toLowerCase().slice(0, 120);
      const password = String(b.password || "");

      if (username.length < 3) return json({ error: "Username must be at least 3 characters" }, 400);
      if (!fullName) return json({ error: "Full name is required" }, 400);
      if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: "Valid email is required" }, 400);
      if (password.length < 6) return json({ error: "Password must be at least 6 characters" }, 400);

      const exists = await env.DB.prepare("SELECT 1 FROM users WHERE username = ? OR email = ?").bind(username, email).first();
      if (exists) return json({ error: "Username or email already taken" }, 409);

      const userId = uid("u_");
      const hash = await hashPassword(password);
      const now = Date.now();
      await env.DB.prepare(
        "INSERT INTO users (id, username, full_name, email, password_hash, bio, verified, created) VALUES (?, ?, ?, ?, ?, ?, 0, ?)"
      )
        .bind(userId, username, fullName, email, hash, `Hey! I'm ${fullName} on BLuxury.`, now)
        .run();

      const token = uid("tok_") + uid("");
      await env.DB.prepare("INSERT INTO sessions (token, user_id, created) VALUES (?, ?, ?)").bind(token, userId, now).run();
      await emitEvent(env, "sync", { reason: "user_joined", user_id: userId });

      return json({
        token,
        user: { id: userId, username, full_name: fullName, email, avatar_url: null, bio: `Hey! I'm ${fullName} on BLuxury.`, verified: 0 },
      }, 201);
    }

    if (req.method === "POST" && path === "/api/auth/login") {
      const b = await req.json();
      const loginId = String(b.login || "").trim().toLowerCase();
      const password = String(b.password || "");
      const hash = await hashPassword(password);

      const user = await env.DB.prepare(
        "SELECT id, username, full_name, email, avatar_key, bio, verified FROM users WHERE (username = ? OR email = ?) AND password_hash = ?"
      )
        .bind(loginId, loginId, hash)
        .first();

      if (!user) return json({ error: "Invalid username/email or password" }, 401);

      const token = uid("tok_") + uid("");
      await env.DB.prepare("INSERT INTO sessions (token, user_id, created) VALUES (?, ?, ?)").bind(token, user.id, Date.now()).run();

      return json({
        token,
        user: { ...user, avatar_url: mediaUrl(user.avatar_key) },
      });
    }

    const me = await getCurrentUser(req, env);

    if (req.method === "GET" && path === "/api/auth/me") {
      if (!me) return json({ error: "Unauthorized" }, 401);
      return json({ ...me, avatar_url: mediaUrl(me.avatar_key) });
    }

    if (req.method === "POST" && path === "/api/auth/logout") {
      const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
      if (token) await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
      return json({ ok: true });
    }

    // 4. Feed & AI Vectorize Recommendations + Sharded Durable Object Hydration
    if (req.method === "GET" && path === "/api/feed") {
      const typeFilter = url.searchParams.get("type");
      const userFilter = url.searchParams.get("user_id");
      const savedOnly = url.searchParams.get("saved") === "1";
      const aiRecommend = url.searchParams.get("ai_recommend") === "1";

      let postsRes = null;

      if (aiRecommend && env.RECOMMENDER_VECTOR && me && !typeFilter && !userFilter && !savedOnly) {
        try {
          const queryVector = new Array(768).fill(0.015);
          const vecMatches = await env.RECOMMENDER_VECTOR.query(queryVector, { topK: 30 });
          const recIds = (vecMatches.matches || []).map((m) => m.id);
          if (recIds.length > 0) {
            const placeholders = recIds.map(() => "?").join(",");
            postsRes = await env.DB.prepare(`
              SELECT p.*, u.username, u.full_name, u.avatar_key, u.verified
              FROM posts p
              JOIN users u ON p.user_id = u.id
              WHERE p.id IN (${placeholders}) AND p.type IN ('post', 'reel')
            `).bind(...recIds).all();
          }
        } catch {}
      }

      if (!postsRes || !postsRes.results || postsRes.results.length === 0) {
        let query = `
          SELECT p.*, u.username, u.full_name, u.avatar_key, u.verified
          FROM posts p
          JOIN users u ON p.user_id = u.id
        `;
        const conditions = [];
        const params = [];

        if (typeFilter === "story") {
          conditions.push("p.type = 'story'");
        } else if (typeFilter === "reel") {
          conditions.push("p.type = 'reel'");
        } else if (typeFilter === "post") {
          conditions.push("p.type = 'post'");
        } else {
          conditions.push("p.type IN ('post', 'reel')");
        }

        if (userFilter) {
          conditions.push("p.user_id = ?");
          params.push(userFilter);
        }

        if (conditions.length) query += " WHERE " + conditions.join(" AND ");
        query += " ORDER BY p.created DESC LIMIT 100";

        postsRes = await env.DB.prepare(query).bind(...params).all();
      }

      let followingSet = new Set();
      if (me) {
        const myFollows = await env.DB.prepare("SELECT following_id FROM follows WHERE follower_id = ?").bind(me.id).all();
        followingSet = new Set(myFollows.results.map((r) => r.following_id));
      }

      // Hydrate interaction counts, user like/save states, and comments from sharded Durable Objects
      const hydrated = await Promise.all(
        postsRes.results.map(async (p) => {
          let stats = { likesCount: 0, commentsCount: 0, liked: false, saved: false, comments: [] };
          if (env.POST_COORDINATOR) {
            try {
              const stubId = env.POST_COORDINATOR.idFromName(p.id);
              const obj = env.POST_COORDINATOR.get(stubId);
              const statsRes = await obj.fetch(`https://do/stats?postId=${p.id}${me ? `&userId=${me.id}` : ""}`);
              if (statsRes.ok) stats = await statsRes.json();
            } catch {}
          }

          return {
            ...p,
            media_url: mediaUrl(p.media_key),
            avatar_url: mediaUrl(p.avatar_key),
            like_count: stats.likesCount,
            comment_count: stats.commentsCount,
            liked: stats.liked,
            saved: stats.saved,
            following: followingSet.has(p.user_id),
            comments: (stats.comments || []).map((c) => ({
              ...c,
              post_id: c.postId || p.id,
              avatar_url: mediaUrl(c.avatarKey),
            })),
          };
        })
      );

      const items = savedOnly ? hydrated.filter((item) => item.saved) : hydrated;
      return json({ items });
    }

    // 5. Users & Profiles
    if (req.method === "GET" && path === "/api/users") {
      const q = (url.searchParams.get("q") || "").trim().toLowerCase();
      const usersRes = q
        ? await env.DB.prepare("SELECT id, username, full_name, avatar_key, bio, verified FROM users WHERE username LIKE ? OR full_name LIKE ? LIMIT 30")
            .bind(`%${q}%`, `%${q}%`)
            .all()
        : await env.DB.prepare("SELECT id, username, full_name, avatar_key, bio, verified FROM users LIMIT 30").all();

      let followingSet = new Set();
      if (me) {
        const myFollows = await env.DB.prepare("SELECT following_id FROM follows WHERE follower_id = ?").bind(me.id).all();
        followingSet = new Set(myFollows.results.map((r) => r.following_id));
      }

      return json({
        users: usersRes.results.map((u) => ({
          ...u,
          avatar_url: mediaUrl(u.avatar_key),
          following: followingSet.has(u.id),
        })),
      });
    }

    if (req.method === "GET" && path.startsWith("/api/users/")) {
      const targetId = path.split("/")[3];
      const user = await env.DB.prepare("SELECT id, username, full_name, avatar_key, bio, verified FROM users WHERE id = ? OR username = ?")
        .bind(targetId, targetId)
        .first();
      if (!user) return json({ error: "User not found" }, 404);

      const [followers, following, postCount, isFollowing] = await Promise.all([
        env.DB.prepare("SELECT COUNT(*) AS c FROM follows WHERE following_id = ?").bind(user.id).first(),
        env.DB.prepare("SELECT COUNT(*) AS c FROM follows WHERE follower_id = ?").bind(user.id).first(),
        env.DB.prepare("SELECT COUNT(*) AS c FROM posts WHERE user_id = ? AND type IN ('post','reel')").bind(user.id).first(),
        me
          ? env.DB.prepare("SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?").bind(me.id, user.id).first()
          : Promise.resolve(null),
      ]);

      return json({
        ...user,
        avatar_url: mediaUrl(user.avatar_key),
        followers_count: followers.c,
        following_count: following.c,
        posts_count: postCount.c,
        following: !!isFollowing,
      });
    }

    if (!me) return json({ error: "Please sign in first" }, 401);

    // 6. Media Upload to R2 + AI Vectorize Indexing
    if (req.method === "POST" && path === "/api/posts") {
      const form = await req.formData();
      const file = form.get("file");
      if (!file || typeof file === "string") return json({ error: "Please select a photo or video" }, 400);
      const typeInfo = ALLOWED_TYPES[file.type];
      if (!typeInfo) return json({ error: "Unsupported format. Use JPG, PNG, WebP, MP4, or WebM." }, 400);
      if (file.size > MAX_BYTES) return json({ error: "File exceeds 50MB limit" }, 400);

      const [ext, mediaType] = typeInfo;
      let postType = String(form.get("type") || "post");
      if (!["post", "reel", "story"].includes(postType)) postType = "post";
      const caption = String(form.get("caption") || "").trim().slice(0, 2200);
      const location = String(form.get("location") || "").trim().slice(0, 100);

      const postId = uid("p_");
      const key = `media/${me.id}/${postId}.${ext}`;

      await env.BUCKET.put(key, await file.arrayBuffer(), {
        httpMetadata: {
          contentType: file.type,
          cacheControl: "public, max-age=31536000, immutable",
        },
      });

      const created = Date.now();
      await env.DB.prepare(
        "INSERT INTO posts (id, user_id, type, media_key, media_type, caption, location, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      )
        .bind(postId, me.id, postType, key, mediaType, caption, location, created)
        .run();

      if (env.AI && env.RECOMMENDER_VECTOR) {
        try {
          const emb = await env.AI.run("@cf/baai/bge-base-en-v1.5", { text: [caption || `${postType} media`] });
          if (emb?.data?.[0]) {
            await env.RECOMMENDER_VECTOR.upsert([{ id: postId, values: emb.data[0] }]);
          }
        } catch {}
      }

      await emitEvent(env, "sync", { reason: "post_created", post_id: postId, user_id: me.id });

      return json({
        id: postId,
        user_id: me.id,
        type: postType,
        media_key: key,
        media_url: mediaUrl(key),
        media_type: mediaType,
        caption,
        location,
        created,
      }, 201);
    }

    // 7. Hard Delete Post from R2, D1, and Durable Object
    if (req.method === "DELETE" && path.startsWith("/api/posts/")) {
      const postId = path.split("/").pop();
      const post = await env.DB.prepare("SELECT user_id, media_key FROM posts WHERE id = ?").bind(postId).first();
      if (!post) return json({ error: "Post not found" }, 404);
      if (post.user_id !== me.id) return json({ error: "Forbidden" }, 403);

      if (post.media_key) {
        await env.BUCKET.delete(post.media_key).catch(() => {});
      }

      if (env.POST_COORDINATOR) {
        try {
          const stubId = env.POST_COORDINATOR.idFromName(postId);
          await env.POST_COORDINATOR.get(stubId).fetch("https://do/delete", { method: "DELETE" });
        } catch {}
      }

      await env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(postId).run();
      await emitEvent(env, "sync", { reason: "post_deleted", post_id: postId });
      return json({ ok: true, deleted_r2_key: post.media_key });
    }

    // 8. Hard Delete Account
    if (req.method === "DELETE" && path === "/api/account") {
      const userPosts = await env.DB.prepare("SELECT id, media_key FROM posts WHERE user_id = ?").bind(me.id).all();
      const keysToDelete = userPosts.results.map((p) => p.media_key).filter(Boolean);
      if (me.avatar_key) keysToDelete.push(me.avatar_key);

      if (keysToDelete.length > 0) {
        await Promise.all(keysToDelete.map((k) => env.BUCKET.delete(k).catch(() => {})));
      }

      if (env.POST_COORDINATOR) {
        await Promise.all(
          userPosts.results.map((p) =>
            env.POST_COORDINATOR.get(env.POST_COORDINATOR.idFromName(p.id))
              .fetch("https://do/delete", { method: "DELETE" })
              .catch(() => {})
          )
        );
      }

      await Promise.all([
        env.DB.prepare("DELETE FROM posts WHERE user_id = ?").bind(me.id).run(),
        env.DB.prepare("DELETE FROM follows WHERE follower_id = ? OR following_id = ?").bind(me.id, me.id).run(),
        env.DB.prepare("DELETE FROM messages WHERE sender_id = ? OR receiver_id = ?").bind(me.id, me.id).run(),
        env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(me.id).run(),
        env.DB.prepare("DELETE FROM users WHERE id = ?").bind(me.id).run(),
      ]);

      await emitEvent(env, "sync", { reason: "user_deleted", user_id: me.id });
      return json({ ok: true });
    }

    // 9. Lock-Free Sharded Interactions via Durable Objects (Like, Save, Comment)
    if (req.method === "POST" && path.endsWith("/like")) {
      const postId = path.split("/")[3];
      const stubId = env.POST_COORDINATOR.idFromName(postId);
      const res = await env.POST_COORDINATOR.get(stubId).fetch("https://do/like", {
        method: "POST",
        body: JSON.stringify({ userId: me.id, postId }),
      });
      const data = await res.json();
      await emitEvent(env, "like", { post_id: postId, user_id: me.id, liked: data.liked, like_count: data.like_count });
      return json(data);
    }

    if (req.method === "POST" && path.endsWith("/save")) {
      const postId = path.split("/")[3];
      const stubId = env.POST_COORDINATOR.idFromName(postId);
      const res = await env.POST_COORDINATOR.get(stubId).fetch("https://do/save", {
        method: "POST",
        body: JSON.stringify({ userId: me.id, postId }),
      });
      return json(await res.json());
    }

    if (req.method === "POST" && path.endsWith("/comments")) {
      const postId = path.split("/")[3];
      const b = await req.json();
      const text = String(b.text || "").trim().slice(0, 500);
      if (!text) return json({ error: "Comment cannot be empty" }, 400);

      const id = uid("c_");
      const created = Date.now();
      const stubId = env.POST_COORDINATOR.idFromName(postId);
      const res = await env.POST_COORDINATOR.get(stubId).fetch("https://do/comment", {
        method: "POST",
        body: JSON.stringify({
          id,
          postId,
          userId: me.id,
          username: me.username,
          avatarKey: me.avatar_key,
          text,
          created,
        }),
      });
      const commentRaw = await res.json();
      const commentObj = { ...commentRaw, avatar_url: mediaUrl(me.avatar_key) };
      await emitEvent(env, "comment", { post_id: postId, comment: commentObj });
      return json(commentObj, 201);
    }

    // 10. Follow & Profile Updates
    if (req.method === "POST" && path.endsWith("/follow")) {
      const targetId = path.split("/")[3];
      if (targetId === me.id) return json({ error: "Cannot follow yourself" }, 400);
      const exists = await env.DB.prepare("SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?")
        .bind(me.id, targetId)
        .first();
      let following = false;
      if (exists) {
        await env.DB.prepare("DELETE FROM follows WHERE follower_id = ? AND following_id = ?").bind(me.id, targetId).run();
      } else {
        await env.DB.prepare("INSERT INTO follows (follower_id, following_id, created) VALUES (?, ?, ?)")
          .bind(me.id, targetId, Date.now())
          .run();
        following = true;
      }
      await emitEvent(env, "follow", { follower_id: me.id, following_id: targetId, following });
      return json({ following });
    }

    if (req.method === "POST" && path === "/api/profile") {
      const form = await req.formData();
      const fullName = String(form.get("full_name") || me.full_name).trim().slice(0, 80);
      const bio = String(form.get("bio") || "").trim().slice(0, 300);
      const file = form.get("avatar");

      let avatarKey = me.avatar_key;
      if (file && typeof file !== "string" && ALLOWED_TYPES[file.type]) {
        const [ext] = ALLOWED_TYPES[file.type];
        const newKey = `avatars/${me.id}_${Date.now()}.${ext}`;
        await env.BUCKET.put(newKey, await file.arrayBuffer(), {
          httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000" },
        });
        if (avatarKey) await env.BUCKET.delete(avatarKey).catch(() => {});
        avatarKey = newKey;
      }

      await env.DB.prepare("UPDATE users SET full_name = ?, bio = ?, avatar_key = ? WHERE id = ?")
        .bind(fullName, bio, avatarKey, me.id)
        .run();

      await emitEvent(env, "sync", { reason: "profile_updated", user_id: me.id });
      return json({ ...me, full_name: fullName, bio, avatar_key: avatarKey, avatar_url: mediaUrl(avatarKey) });
    }

    // 11. Real-Time Direct Messaging
    if (req.method === "GET" && path === "/api/messages/threads") {
      const usersRes = await env.DB.prepare(
        "SELECT id, username, full_name, avatar_key, verified FROM users WHERE id != ? ORDER BY created DESC"
      )
        .bind(me.id)
        .all();

      const unreadRes = await env.DB.prepare(
        "SELECT sender_id, COUNT(*) AS cnt FROM messages WHERE receiver_id = ? AND seen = 0 GROUP BY sender_id"
      )
        .bind(me.id)
        .all();
      const unreadMap = Object.fromEntries(unreadRes.results.map((r) => [r.sender_id, r.cnt]));

      const lastMsgs = await env.DB.prepare(`
        SELECT sender_id, receiver_id, text, created FROM messages
        WHERE sender_id = ? OR receiver_id = ?
        ORDER BY created DESC
      `)
        .bind(me.id, me.id)
        .all();

      const lastMap = {};
      for (const m of lastMsgs.results) {
        const partner = m.sender_id === me.id ? m.receiver_id : m.sender_id;
        if (!lastMap[partner]) lastMap[partner] = m;
      }

      const threads = usersRes.results
        .map((u) => ({
          ...u,
          avatar_url: mediaUrl(u.avatar_key),
          unread: unreadMap[u.id] || 0,
          last_message: lastMap[u.id] || null,
        }))
        .sort((a, b) => (b.last_message?.created || 0) - (a.last_message?.created || 0));

      return json({ threads });
    }

    if (req.method === "GET" && path.startsWith("/api/messages/")) {
      const partnerId = path.split("/")[3];
      await env.DB.prepare("UPDATE messages SET seen = 1 WHERE sender_id = ? AND receiver_id = ? AND seen = 0")
        .bind(partnerId, me.id)
        .run();

      const msgs = await env.DB.prepare(`
        SELECT * FROM messages
        WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
        ORDER BY created ASC LIMIT 200
      `)
        .bind(me.id, partnerId, partnerId, me.id)
        .all();

      return json({ messages: msgs.results });
    }

    if (req.method === "POST" && path.startsWith("/api/messages/")) {
      const partnerId = path.split("/")[3];
      const b = await req.json();
      const text = String(b.text || "").trim().slice(0, 1000);
      if (!text) return json({ error: "Message cannot be empty" }, 400);

      const id = uid("m_");
      const created = Date.now();
      await env.DB.prepare("INSERT INTO messages (id, sender_id, receiver_id, text, seen, created) VALUES (?, ?, ?, ?, 0, ?)")
        .bind(id, me.id, partnerId, text, created)
        .run();

      const msgObj = { id, sender_id: me.id, receiver_id: partnerId, text, seen: 0, created };
      await emitEvent(env, "message", msgObj);
      return json(msgObj, 201);
    }

    return json({ error: "Not found" }, 404);
  } catch (e) {
    return json({ error: e.message || "Internal server error" }, 500);
  }
}