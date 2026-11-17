CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_key TEXT,
  bio TEXT DEFAULT 'Welcome to my BLuxury profile!',
  verified INTEGER DEFAULT 0,
  created INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'post',
  media_key TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image',
  caption TEXT DEFAULT '',
  location TEXT DEFAULT '',
  created INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS follows (
  follower_id TEXT NOT NULL,
  following_id TEXT NOT NULL,
  created INTEGER NOT NULL,
  PRIMARY KEY (follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  text TEXT NOT NULL,
  seen INTEGER DEFAULT 0,
  created INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL,
  created INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_posts_type_created ON posts(type, created DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id, created DESC);
CREATE INDEX IF NOT EXISTS idx_messages_pair ON messages(sender_id, receiver_id, created ASC);

INSERT OR IGNORE INTO users (id, username, full_name, email, password_hash, bio, verified, created) VALUES
  ('u_bluxury', 'bluxury.official', 'BLuxury Studio', 'hello@bluxury.in', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'Luxury Architecture, Lifestyle & Curated Spaces | Hyderabad & Bangalore', 1, 1735689600000),
  ('u_arjun', 'arjun.creates', 'Arjun Verma', 'arjun@bluxury.in', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'Filmmaker & Visual Storyteller | Shot on 35mm', 1, 1735689700000),
  ('u_ananya', 'ananya.travels', 'Ananya Rao', 'ananya@bluxury.in', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'Chasing sunsets, coffee & coastal roads', 0, 1735689800000);