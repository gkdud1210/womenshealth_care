-- 루디아피드 — 여러 사람이 같은 피드를 보도록 글·댓글·좋아요·전문가 계정을 저장해요.
-- 적용: npx wrangler d1 migrations apply ludia-feed --remote   (로컬 테스트는 --local)

-- 글쓴이 — 기기마다 만든 비밀 키(해시만 저장)로 본인 확인을 해요
CREATE TABLE IF NOT EXISTS authors (
  id           TEXT PRIMARY KEY,
  key_hash     TEXT NOT NULL,
  name         TEXT NOT NULL,
  emoji        TEXT NOT NULL DEFAULT '🌸',
  expert       INTEGER NOT NULL DEFAULT 0,
  expert_title TEXT,
  banned       INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id             TEXT PRIMARY KEY,
  author_id      TEXT NOT NULL REFERENCES authors(id),
  type           TEXT NOT NULL,
  title          TEXT NOT NULL,
  content        TEXT NOT NULL,
  images         TEXT NOT NULL DEFAULT '[]',   -- 이미지 id 배열 (FEED_IMAGES KV)
  cover_emoji    TEXT,
  cover_gradient TEXT,
  tags           TEXT NOT NULL DEFAULT '[]',
  video          TEXT,
  sport          TEXT,
  review         TEXT,                          -- 후기 자랑 JSON
  nutrition      TEXT,                          -- 칼로리·영양 분석 JSON
  created_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS posts_created ON posts(created_at DESC);

-- post_id 는 서버 글 id 이거나 앱에 들어 있는 기본 글(루디아 공식 글) id 예요
CREATE TABLE IF NOT EXISTS comments (
  id         TEXT PRIMARY KEY,
  post_id    TEXT NOT NULL,
  parent_id  TEXT,
  author_id  TEXT NOT NULL REFERENCES authors(id),
  text       TEXT NOT NULL,
  question   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS comments_post ON comments(post_id, created_at);

CREATE TABLE IF NOT EXISTS likes (
  post_id   TEXT NOT NULL,
  author_id TEXT NOT NULL,
  PRIMARY KEY (post_id, author_id)
);

-- 전문가 인증 코드 — 운영자가 한 명에게 하나씩 발급해요 (한 번 쓰면 끝)
CREATE TABLE IF NOT EXISTS expert_codes (
  code       TEXT PRIMARY KEY,
  title      TEXT NOT NULL,      -- 예: '가정의학과 전문의', '임상영양사'
  used_by    TEXT,
  created_at TEXT NOT NULL
);
