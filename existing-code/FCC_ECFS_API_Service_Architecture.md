# FCC ECFS API Integration - Core Architecture & Patterns

## 📋 Table of Contents

- [Overview](#overview)
- [Core Architecture](#core-architecture)
- [ECFS API Integration](#ecfs-api-integration)
- [Data Processing Pipeline](#data-processing-pipeline)
- [Scheduling & Monitoring](#scheduling--monitoring)
- [Configuration Management](#configuration-management)
- [Error Handling & Reliability](#error-handling--reliability)
- [Optional Components](#optional-components)
- [Deployment & Infrastructure](#deployment--infrastructure)
- [Key Integration Patterns](#key-integration-patterns)

## 📖 Overview

This service demonstrates **proven patterns for integrating with the FCC ECFS API** in a production environment. The core functionality focuses on:

- **ECFS API Integration**: Reliable fetching and parsing of FCC filing data
- **Data Processing**: Transforming raw API responses into usable formats
- **Scheduling**: Automated monitoring with configurable frequency
- **State Management**: Tracking processed filings to avoid duplicates
- **Error Handling**: Robust error recovery and retry mechanisms

**Primary Focus**: Real-time monitoring of FCC ECFS filings with reliable data extraction and processing patterns that can be adapted for various ECFS API use cases.

## 🏗️ Core Architecture

### System Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Cron Trigger  │───▶│  Core Worker     │───▶│   FCC ECFS API  │
│   (configurable │    │                  │    │  (publicapi.    │
│    frequency)   │    │  - API Handler   │    │   fcc.gov)      │
└─────────────────┘    │  - Data Parser   │    └─────────────────┘
                       │  - State Manager │
┌─────────────────┐    │  - Config System │    ┌─────────────────┐
│  Configuration  │◄──▶│                  │───▶│   Your Output   │
│   Interface     │    │                  │    │   Destination   │
└─────────────────┘    └──────────────────┘    │  (Slack, etc.)  │
                                               └─────────────────┘
┌─────────────────┐           ▲
│  Cloudflare KV  │───────────┘
│   (State &      │
│  Configuration) │
└─────────────────┘
```

### Technology Stack

- **Runtime**: Cloudflare Workers (Edge Computing)
- **Storage**: Cloudflare KV (Distributed Key-Value)
- **Scheduling**: Cloudflare Cron Triggers
- **Primary API**: FCC ECFS Public API
- **Dependencies**: `date-fns` for date manipulation

### Project Structure (Core Components)

```
fcc-monitor/
├── src/
│   ├── index.js           # Main entry point & scheduling
│   ├── ecfs-api.js        # ⭐ ECFS API integration (CORE)
│   ├── utils.js           # Shared utilities
│   ├── slack.js           # 📌 Optional: Notification example
│   └── dashboard.js       # 📌 Optional: Web interface example
├── package.json
├── wrangler.toml          # Cloudflare Workers config
└── README.md
```

## 🔌 ECFS API Integration

### Core Integration Module (`src/ecfs-api.js`)

This is the **heart of the system** - demonstrates production-tested patterns for ECFS API integration.

**Key Functions**:

```javascript
// Main API interface
export async function fetchECFSFilings(docketNumber, env)

// Data transformation
function parseECFSFiling(filing)
```

### API Integration Pattern

**Endpoint Structure**:

```javascript
const url = `${baseUrl}/filings?api_key=${apiKey}&proceedings.name=${docketNumber}&sort=date_disseminated,DESC&per_page=20&received_from=${sinceDate}`;
```

**Critical Query Parameters**:

- `api_key`: Your ECFS API key (required)
- `proceedings.name`: Docket number filter (e.g., "11-42")
- `sort`: `date_disseminated,DESC` for newest first
- `per_page`: Limit results (20 is a good balance)
- `received_from`: Date filter (ISO format: YYYY-MM-DD)

### Request Implementation

```javascript
const response = await fetch(url, {
	headers: {
		Accept: 'application/json',
		'User-Agent': 'YourApp/1.0' // Recommended for API identification
	}
});

if (!response.ok) {
	throw new Error(`ECFS API returned ${response.status}: ${response.statusText}`);
}

const data = await response.json();
```

### Response Handling Patterns

**Critical: Defensive API Response Parsing**

```javascript
// ECFS API returns 'filing' not 'filings' - common gotcha
const filings = data.filing || data.filings || [];

if (!filings || filings.length === 0) {
	// Handle empty responses gracefully
	return [];
}
```

**Why This Matters**: ECFS API response structure can be inconsistent. Always check for both possible field names.

## 🔄 Data Processing Pipeline

### Raw ECFS Data Structure

ECFS API returns complex nested objects. Here's what you'll typically encounter:

```javascript
// Raw filing object (simplified)
{
  id_submission: "12345",
  date_received: "2025-01-15T10:30:00Z",
  submissiontype: { description: "COMMENT" },
  name_of_filer: "Organization Name",
  filers: [{ name: "Alternative Filer Name" }],
  lawfirms: [{ name: "Law Firm Name" }],
  documents: [{ filename: "document.pdf" }],
  brief_comment_summary: "Summary text...",
  text_data: "Full comment text..."
}
```

### Data Transformation Process

**1. Author Extraction** (Complex - Multiple Sources):

```javascript
let author = 'Anonymous';
if (filing.name_of_filer) {
	author = filing.name_of_filer;
} else if (filing.filers && Array.isArray(filing.filers) && filing.filers.length > 0) {
	author = filing.filers[0].name || 'Anonymous';
} else if (filing.lawfirms && Array.isArray(filing.lawfirms) && filing.lawfirms.length > 0) {
	author = filing.lawfirms[0].name || 'Anonymous';
}
```

**2. Title Cleaning** (PDF filenames are messy):

```javascript
let cleanTitle = filing.submissiontype?.description || 'Filing';
if (filing.documents && filing.documents.length > 0 && filing.documents[0].filename) {
	let filename = filing.documents[0].filename;
	cleanTitle = filename
		.replace(/\.pdf$/i, '') // Remove .pdf
		.replace(/\([^)]*\)/g, '') // Remove parentheses
		.replace(/\d{1,2}\.\d{1,2}\.\d{2,4}/g, '') // Remove dates
		.replace(/\s+/g, ' ') // Normalize spaces
		.trim();
}
```

**3. Company Name Standardization**:

```javascript
const shortenCompanyName = (name) => {
	return name
		.replace(/\b(Inc\.|Incorporated|LLC|Corporation|Corp\.|Company|Co\.)\b/gi, '')
		.replace(/\bd\/b\/a\s+/gi, '/')
		.replace(/\s+/g, ' ')
		.trim();
};
```

### Normalized Output Format

**Consistent data structure for downstream processing**:

```javascript
{
  id: filing.id_submission,
  docket_number: '11-42',
  filing_type: filing.submissiontype?.description || 'FILING',
  title: cleanTitle,
  author: shortenCompanyName(author),
  date_received: filing.date_received,
  filing_url: `https://www.fcc.gov/ecfs/search/search-filings/filing/${filing.id_submission}`,
  summary: filing.brief_comment_summary || filing.text_data?.substring(0, 200) || '',
  processed_at: new Date().toISOString()
}
```

## ⏰ Scheduling & Monitoring

### Cron-Based Monitoring

**Configuration** (`wrangler.toml`):

```toml
[triggers]
crons = ["*/5 * * * *"]  # Every 5 minutes (base frequency)
```

**Smart Frequency Control**:

```javascript
// Configurable monitoring frequency (not every cron execution)
const frequencyMinutes = 60; // Check every hour, not every 5 minutes
const lastRunStr = await env.FCC_MONITOR_KV.get('last_run_ts');
const now = Date.now();

if (lastRunStr && now - parseInt(lastRunStr, 10) < frequencyMinutes * 60 * 1000) {
	// Skip this run - not time yet
	return { skipped: true, nextCheckIn: calculatedMinutes };
}
```

### Time Window Strategy

**Looking Back 2 Hours**:

```javascript
import { subHours } from 'date-fns';

const sinceDate = subHours(new Date(), 2).toISOString().split('T')[0];
```

**Why 2 Hours?**: Accounts for processing delays in ECFS system and ensures you don't miss filings due to timing issues.

### Duplicate Prevention

**Processing State Tracking**:

```javascript
// Check if already processed (batch operation for efficiency)
const filingIds = newFilings.map((f) => f.id);
const processedChecks = await Promise.all(
	filingIds.map((id) => env.FCC_MONITOR_KV.get(`processed_${id}`))
);

const unprocessedFilings = newFilings.filter((filing, index) => !processedChecks[index]);
```

**Mark as Processed** (with auto-cleanup):

```javascript
await Promise.all(
	processedFilings.map((filing) =>
		env.FCC_MONITOR_KV.put(`processed_${filing.id}`, 'true', {
			expirationTtl: 7 * 24 * 60 * 60 // 7 days auto-cleanup
		})
	)
);
```

## ⚙️ Configuration Management

### Environment Variables

**Required for ECFS API**:

```bash
# Set via: wrangler secret put ECFS_API_KEY
ECFS_API_KEY=your_fcc_api_key
```

**Public Configuration** (`wrangler.toml`):

```toml
[vars]
ECFS_API_BASE_URL = "https://publicapi.fcc.gov/ecfs"
```

### Dynamic Configuration (KV Storage)

**Runtime Settings**:

```javascript
// Monitoring frequency
'monitor_frequency_minutes': '60'

// Processing limits
'max_filings_per_batch': '10'

// Docket tracking
'target_docket': '11-42'

// State tracking
'last_run_ts': 'timestamp'
'processed_{filing_id}': 'true'  // TTL: 7 days
```

## 🛡️ Error Handling & Reliability

### API Error Patterns

**Network/HTTP Errors**:

```javascript
try {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`ECFS API returned ${response.status}: ${response.statusText}`);
	}
} catch (error) {
	logMessage(`Error fetching ECFS filings: ${error.message}`);
	throw error; // Let calling code decide how to handle
}
```

**Data Parsing Errors**:

```javascript
// Always provide fallbacks for missing data
const author =
	filing.name_of_filer || filing.filers?.[0]?.name || filing.lawfirms?.[0]?.name || 'Anonymous';
```

### Resilience Patterns

**Continue Processing on Individual Failures**:

```javascript
// Process filings individually to prevent one bad filing from stopping everything
const results = await Promise.allSettled(filings.map((filing) => processSingleFiling(filing)));

// Log failures but continue
results.forEach((result, index) => {
	if (result.status === 'rejected') {
		logMessage(`Failed to process filing ${filings[index].id}: ${result.reason}`);
	}
});
```

**Graceful Degradation**:

```javascript
// Always update last run timestamp, even if some operations fail
try {
	await processNewFilings(filings);
} catch (error) {
	logMessage(`Processing error: ${error.message}`);
} finally {
	await env.FCC_MONITOR_KV.put('last_run_ts', Date.now().toString());
}
```

## 📌 Optional Components

_These components are included in the current system but are not essential for ECFS API integration:_

### Slack Integration (`src/slack.js`)

- **Purpose**: Example notification system
- **Key Pattern**: Template-based message formatting
- **Usage**: Can be replaced with any notification system
- **Template Variables**: `{filing_type}`, `{title}`, `{author}`, `{date}`, `{url}`

### Web Dashboard (`src/dashboard.js`)

- **Purpose**: Configuration interface
- **Features**: Template editing, frequency settings, testing
- **Usage**: Optional - configuration can be done via environment variables
- **Size**: ~1000 lines of HTML/CSS/JavaScript

_Both components can be removed if you only need the core ECFS API integration patterns._

## 🚀 Deployment & Infrastructure

### Cloudflare Workers Setup

**Minimal Configuration** (`wrangler.toml`):

```toml
name = "your-ecfs-monitor"
main = "src/index.js"
compatibility_date = "2024-01-01"

[vars]
ECFS_API_BASE_URL = "https://publicapi.fcc.gov/ecfs"

[[kv_namespaces]]
binding = "YOUR_KV_NAMESPACE"
id = "your_kv_namespace_id"
preview_id = "your_preview_kv_id"

[triggers]
crons = ["*/5 * * * *"]
```

**Deployment**:

```bash
npm install
wrangler secret put ECFS_API_KEY
wrangler deploy
```

### KV Storage Patterns

**Efficient Data Access**:

```javascript
// Batch operations for better performance
const checks = await Promise.all([
	env.KV.get('setting1'),
	env.KV.get('setting2'),
	env.KV.get('setting3')
]);

// Auto-expiring entries for cleanup
await env.KV.put('temp_data', value, {
	expirationTtl: 3600 // 1 hour
});
```

## 💡 Key Integration Patterns

### Essential ECFS API Patterns

1. **Always Handle Response Variations**

   ```javascript
   const filings = data.filing || data.filings || [];
   ```

2. **Use Conservative Time Windows**

   ```javascript
   const sinceDate = subHours(new Date(), 2); // 2-hour lookback
   ```

3. **Extract Authors from Multiple Sources**

   ```javascript
   const author = filing.name_of_filer || filers?.[0]?.name || lawfirms?.[0]?.name;
   ```

4. **Clean Document Titles Aggressively**

   ```javascript
   title = filename
   	.replace(/\.pdf$/i, '')
   	.replace(/\([^)]*\)/g, '')
   	.trim();
   ```

5. **Implement Duplicate Detection**
   ```javascript
   await env.KV.put(`processed_${filing.id}`, 'true', { expirationTtl: 604800 });
   ```

### Performance Patterns

1. **Batch KV Operations**

   ```javascript
   const results = await Promise.all(ids.map((id) => env.KV.get(id)));
   ```

2. **Limit API Result Sets**

   ```javascript
   const processableFilings = allFilings.slice(0, 15); // Prevent overload
   ```

3. **Use Appropriate TTLs**
   ```javascript
   {
   	expirationTtl: 7 * 24 * 60 * 60;
   } // 7 days for processed filings
   ```

### Error Handling Patterns

1. **Log with Context**

   ```javascript
   logMessage(`Error processing filing ${filing.id}: ${error.message}`);
   ```

2. **Provide Fallbacks**

   ```javascript
   const value = primary || secondary || 'default';
   ```

3. **Continue on Individual Failures**
   ```javascript
   results.forEach((result) => {
   	if (result.status === 'rejected') {
   		/* log but continue */
   	}
   });
   ```

---

_This document focuses on the core ECFS API integration patterns that have been proven in production. The optional notification and dashboard components can be adapted or replaced based on your specific needs._
