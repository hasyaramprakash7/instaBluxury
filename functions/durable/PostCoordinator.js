export class PostCoordinator {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const sql = this.state.storage.sql;

    sql.exec(`
      CREATE TABLE IF NOT EXISTS post_state (
        postId TEXT PRIMARY KEY,
        likesCount INTEGER DEFAULT 0,
        commentsCount INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS post_likes (
        userId TEXT,
        postId TEXT,
        created INTEGER,
        PRIMARY KEY (userId, postId)
      );
      CREATE TABLE IF NOT EXISTS post_saves (
        userId TEXT,
        postId TEXT,
        created INTEGER,
        PRIMARY KEY (userId, postId)
      );
      CREATE TABLE IF NOT EXISTS post_comments (
        id TEXT PRIMARY KEY,
        postId TEXT,
        userId TEXT,
        username TEXT,
        avatarKey TEXT,
        text TEXT,
        created INTEGER
      );
    `);

    if (request.method === "POST" && url.pathname.endsWith("/like")) {
      const { userId, postId } = await request.json();
      const existing = sql.exec("SELECT 1 FROM post_likes WHERE userId = ? AND postId = ?", userId, postId).toArray();
      let liked = false;

      if (existing.length > 0) {
        sql.exec("DELETE FROM post_likes WHERE userId = ? AND postId = ?", userId, postId);
        sql.exec("UPDATE post_state SET likesCount = MAX(0, likesCount - 1) WHERE postId = ?", postId);
      } else {
        sql.exec("INSERT OR IGNORE INTO post_likes (userId, postId, created) VALUES (?, ?, ?)", userId, postId, Date.now());
        sql.exec(
          "INSERT INTO post_state (postId, likesCount, commentsCount) VALUES (?, 1, 0) ON CONFLICT(postId) DO UPDATE SET likesCount = likesCount + 1",
          postId
        );
        liked = true;
      }

      const countRow = sql.exec("SELECT likesCount FROM post_state WHERE postId = ?", postId).toArray();
      return new Response(JSON.stringify({ liked, like_count: countRow[0]?.likesCount || 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "POST" && url.pathname.endsWith("/save")) {
      const { userId, postId } = await request.json();
      const existing = sql.exec("SELECT 1 FROM post_saves WHERE userId = ? AND postId = ?", userId, postId).toArray();
      let saved = false;

      if (existing.length > 0) {
        sql.exec("DELETE FROM post_saves WHERE userId = ? AND postId = ?", userId, postId);
      } else {
        sql.exec("INSERT OR IGNORE INTO post_saves (userId, postId, created) VALUES (?, ?, ?)", userId, postId, Date.now());
        saved = true;
      }

      return new Response(JSON.stringify({ saved }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "POST" && url.pathname.endsWith("/comment")) {
      const { id, postId, userId, username, avatarKey, text, created } = await request.json();
      sql.exec(
        "INSERT INTO post_comments (id, postId, userId, username, avatarKey, text, created) VALUES (?, ?, ?, ?, ?, ?, ?)",
        id,
        postId,
        userId,
        username,
        avatarKey || null,
        text,
        created
      );
      sql.exec(
        "INSERT INTO post_state (postId, likesCount, commentsCount) VALUES (?, 0, 1) ON CONFLICT(postId) DO UPDATE SET commentsCount = commentsCount + 1",
        postId
      );

      const commentObj = { id, post_id: postId, text, created, username, avatar_key: avatarKey || null };
      return new Response(JSON.stringify(commentObj), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "GET" && url.pathname.endsWith("/stats")) {
      const postId = url.searchParams.get("postId");
      const userId = url.searchParams.get("userId");

      const stateRow = sql.exec("SELECT likesCount, commentsCount FROM post_state WHERE postId = ?", postId).toArray();
      const comments = sql.exec("SELECT * FROM post_comments WHERE postId = ? ORDER BY created ASC", postId).toArray();

      let liked = false;
      let saved = false;
      if (userId) {
        liked = sql.exec("SELECT 1 FROM post_likes WHERE userId = ? AND postId = ?", userId, postId).toArray().length > 0;
        saved = sql.exec("SELECT 1 FROM post_saves WHERE userId = ? AND postId = ?", userId, postId).toArray().length > 0;
      }

      return new Response(
        JSON.stringify({
          likesCount: stateRow[0]?.likesCount || 0,
          commentsCount: stateRow[0]?.commentsCount || 0,
          liked,
          saved,
          comments,
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    if (request.method === "DELETE") {
      await this.state.storage.deleteAll();
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not found", { status: 404 });
  }
}