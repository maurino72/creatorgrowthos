-- Add tags column to posts table
ALTER TABLE posts ADD COLUMN tags text[] DEFAULT '{}';
