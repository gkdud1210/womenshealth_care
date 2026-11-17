-- 루디아피드 글에 장소(루디아제휴 시설 id)를 붙여요 — 시설 화면에서 이 장소 글을 모아 보여줘요
ALTER TABLE posts ADD COLUMN facility_id TEXT;
CREATE INDEX IF NOT EXISTS idx_posts_facility ON posts (facility_id, created_at);
