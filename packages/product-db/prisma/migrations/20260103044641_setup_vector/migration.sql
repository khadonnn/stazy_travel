
CREATE EXTENSION IF NOT EXISTS "vector";

ALTER TABLE "hotels" ADD COLUMN "imageVector" vector(512);
CREATE INDEX IF NOT EXISTS "hotels_imageVector_idx" 
ON "hotels" 
USING hnsw ("imageVector" vector_cosine_ops);