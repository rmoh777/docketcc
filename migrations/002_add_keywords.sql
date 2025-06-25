-- Migration 002: Add docket keywords for search enhancement
-- Enables hybrid search functionality

-- Docket search enhancement (keyword mapping)
CREATE TABLE DocketKeywords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    docket_id INTEGER NOT NULL,
    keyword TEXT NOT NULL,
    relevance_score INTEGER DEFAULT 1,
    FOREIGN KEY (docket_id) REFERENCES Dockets(id),
    UNIQUE(docket_id, keyword)
);

-- Index for keyword search
CREATE INDEX idx_docket_keywords_keyword ON DocketKeywords(keyword); 