-- Migration 001: Initial Schema
-- Core tables for DocketCC Phase 1

-- Core user management
CREATE TABLE Users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    google_id TEXT UNIQUE,
    name TEXT,
    avatar_url TEXT,
    subscription_tier TEXT DEFAULT 'free' CHECK(subscription_tier IN ('free', 'pro')),
    stripe_customer_id TEXT,
    created_at INTEGER NOT NULL,
    last_login_at INTEGER
);

-- Docket registry
CREATE TABLE Dockets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    docket_number TEXT NOT NULL UNIQUE,
    title TEXT,
    bureau TEXT,
    description TEXT,
    status TEXT,
    created_at INTEGER NOT NULL
);

-- User subscriptions
CREATE TABLE UserDocketSubscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    docket_id INTEGER NOT NULL,
    notification_frequency TEXT NOT NULL CHECK(notification_frequency IN ('daily', 'weekly', 'hourly')),
    last_notified_at INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (docket_id) REFERENCES Dockets(id) ON DELETE CASCADE,
    UNIQUE(user_id, docket_id)
);

-- Filing storage
CREATE TABLE Filings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fcc_filing_id TEXT NOT NULL UNIQUE,
    docket_id INTEGER NOT NULL,
    title TEXT,
    author TEXT,
    author_organization TEXT,
    filing_url TEXT,
    document_urls TEXT,
    filed_at INTEGER,
    fetched_at INTEGER NOT NULL,
    summary TEXT,
    summary_generated_at INTEGER,
    processing_status TEXT DEFAULT 'pending' CHECK(processing_status IN ('pending', 'processed', 'failed')),
    FOREIGN KEY (docket_id) REFERENCES Dockets(id)
);

-- Performance indexes
CREATE INDEX idx_filings_docket_filed ON Filings(docket_id, filed_at DESC);
CREATE INDEX idx_subscriptions_user_active ON UserDocketSubscriptions(user_id, is_active);
CREATE INDEX idx_filings_processing_status ON Filings(processing_status, fetched_at);
CREATE INDEX idx_users_google_id ON Users(google_id);
CREATE INDEX idx_users_email ON Users(email); 