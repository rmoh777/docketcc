-- Migration 003: Add admin users and analytics support
-- Enables admin dashboard functionality

-- Admin and analytics
CREATE TABLE AdminUsers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    role TEXT DEFAULT 'admin' CHECK(role IN ('admin', 'super_admin')),
    granted_at INTEGER NOT NULL,
    granted_by TEXT,
    FOREIGN KEY (user_id) REFERENCES Users(id)
);

-- Index for admin lookups
CREATE INDEX idx_admin_users_user_id ON AdminUsers(user_id);

-- Insert initial admin user (will be updated with actual admin email)
-- INSERT INTO AdminUsers (user_id, role, granted_at, granted_by) VALUES
-- ('your-admin-user-id', 'super_admin', strftime('%s', 'now') * 1000, 'system');

-- Optional: Create view for admin dashboard analytics
CREATE VIEW AdminDashboardStats AS
SELECT 
    (SELECT COUNT(*) FROM Users) as total_users,
    (SELECT COUNT(*) FROM Users WHERE subscription_tier = 'pro') as pro_users,
    (SELECT COUNT(*) FROM Dockets) as total_dockets,
    (SELECT COUNT(*) FROM UserDocketSubscriptions WHERE is_active = TRUE) as active_subscriptions,
    (SELECT COUNT(*) FROM Filings) as total_filings,
    (SELECT COUNT(*) FROM Filings WHERE processing_status = 'pending') as pending_filings,
    (SELECT COUNT(*) FROM Filings WHERE processing_status = 'processed') as processed_filings,
    (SELECT COUNT(*) FROM Filings WHERE processing_status = 'failed') as failed_filings;

-- Add admin role support to Users table
ALTER TABLE Users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;

-- Make Ryan Moxom the admin user
UPDATE Users SET is_admin = TRUE WHERE email = 'rmoxom@gmail.com'; 