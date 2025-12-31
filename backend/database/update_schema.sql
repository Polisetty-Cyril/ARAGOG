-- Fix schema: rename 'name' column to 'full_name' and add 'last_login' column
USE aragog_db;

-- Rename name to full_name
ALTER TABLE users CHANGE COLUMN name full_name VARCHAR(255) NOT NULL;

-- Add last_login column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP NULL;
