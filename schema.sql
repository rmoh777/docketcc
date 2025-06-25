-- DocketCC Database Schema
-- Cloudflare D1 SQLite Database
-- Complete schema for all four core systems

-- Core user management
CREATE TABLE Users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    google_id TEXT UNIQUE,  -- OAuth integration
    name TEXT,
    avatar_url TEXT,
    subscription_tier TEXT DEFAULT 'free' CHECK(subscription_tier IN ('free', 'pro')),
    stripe_customer_id TEXT,
    created_at INTEGER NOT NULL,
    last_login_at INTEGER
);

-- Docket registry with search optimization
CREATE TABLE Dockets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    docket_number TEXT NOT NULL UNIQUE,
    title TEXT,
    bureau TEXT,
    description TEXT,
    status TEXT,
    created_at INTEGER NOT NULL
);

-- User subscriptions with frequency preferences
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

-- Filing storage with AI summaries
CREATE TABLE Filings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fcc_filing_id TEXT NOT NULL UNIQUE,
    docket_id INTEGER NOT NULL,
    title TEXT,
    author TEXT,
    author_organization TEXT,
    filing_url TEXT,
    document_urls TEXT, -- JSON array of document URLs
    filed_at INTEGER,
    fetched_at INTEGER NOT NULL,
    summary TEXT,
    summary_generated_at INTEGER,
    processing_status TEXT DEFAULT 'pending' CHECK(processing_status IN ('pending', 'processed', 'failed')),
    FOREIGN KEY (docket_id) REFERENCES Dockets(id)
);

-- Docket search enhancement (keyword mapping)
CREATE TABLE DocketKeywords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    docket_id INTEGER NOT NULL,
    keyword TEXT NOT NULL,
    relevance_score INTEGER DEFAULT 1,
    FOREIGN KEY (docket_id) REFERENCES Dockets(id),
    UNIQUE(docket_id, keyword)
);

-- Admin and analytics
CREATE TABLE AdminUsers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    role TEXT DEFAULT 'admin' CHECK(role IN ('admin', 'super_admin')),
    granted_at INTEGER NOT NULL,
    granted_by TEXT,
    FOREIGN KEY (user_id) REFERENCES Users(id)
);

-- Performance indexes
CREATE INDEX idx_filings_docket_filed ON Filings(docket_id, filed_at DESC);
CREATE INDEX idx_subscriptions_user_active ON UserDocketSubscriptions(user_id, is_active);
CREATE INDEX idx_filings_processing_status ON Filings(processing_status, fetched_at);
CREATE INDEX idx_docket_keywords_keyword ON DocketKeywords(keyword);
CREATE INDEX idx_users_email ON Users(email);
CREATE INDEX idx_users_google_id ON Users(google_id);
CREATE INDEX idx_dockets_number ON Dockets(docket_number);

-- Insert some common docket keywords for search
INSERT INTO DocketKeywords (docket_id, keyword) VALUES 
  ((SELECT id FROM Dockets WHERE docket_number = '11-42'), 'lifeline'),
  ((SELECT id FROM Dockets WHERE docket_number = '17-287'), 'lifeline'),
  ((SELECT id FROM Dockets WHERE docket_number = '17-108'), 'broadband'),
  ((SELECT id FROM Dockets WHERE docket_number = '18-143'), 'broadband'),
  ((SELECT id FROM Dockets WHERE docket_number = '17-108'), 'net neutrality'),
  ((SELECT id FROM Dockets WHERE docket_number = '10-90'), 'rural');

-- Insert some sample dockets (these will be populated from FCC API)
INSERT INTO Dockets (docket_number, title, bureau, description, status, created_at) VALUES
  ('11-42', 'Lifeline and Link Up Reform and Modernization', 'WCB', 'Lifeline program reform and modernization proceedings', 'ACTIVE', strftime('%s', 'now') * 1000),
  ('17-287', 'Bridging the Digital Divide for Low-Income Consumers', 'WCB', 'Digital divide and low-income consumer access', 'ACTIVE', strftime('%s', 'now') * 1000),
  ('17-108', 'Restoring Internet Freedom', 'WCB', 'Net neutrality and internet freedom rules', 'ACTIVE', strftime('%s', 'now') * 1000),
  ('18-143', 'Promoting Broadband Internet Access Service', 'WCB', 'Broadband internet access service promotion', 'ACTIVE', strftime('%s', 'now') * 1000),
  ('10-90', 'Rural Call Completion', 'WCB', 'Rural call completion issues and solutions', 'ACTIVE', strftime('%s', 'now') * 1000)
ON CONFLICT(docket_number) DO NOTHING; 