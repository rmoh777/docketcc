-- Migration 004: Add stripe_subscription_id to Users table
-- This tracks the Stripe subscription ID for pro users

ALTER TABLE Users ADD COLUMN stripe_subscription_id TEXT; 