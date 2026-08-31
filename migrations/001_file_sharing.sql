-- Feature 1: File sharing (photos / videos / audio)
-- Adds media metadata columns to the private + group message tables.
-- Run once against your chat_app database:
--   mysql -u root -p chat_app < migrations/001_file_sharing.sql

ALTER TABLE messages
  ADD COLUMN type      VARCHAR(20)  NOT NULL DEFAULT 'text',
  ADD COLUMN file_url  VARCHAR(500) NULL,
  ADD COLUMN file_name VARCHAR(255) NULL;

ALTER TABLE group_messages
  ADD COLUMN type      VARCHAR(20)  NOT NULL DEFAULT 'text',
  ADD COLUMN file_url  VARCHAR(500) NULL,
  ADD COLUMN file_name VARCHAR(255) NULL;
