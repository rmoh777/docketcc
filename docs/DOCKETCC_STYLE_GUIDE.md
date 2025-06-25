# DOCKETCC Style Guide & Coding Standards

## 📋 Table of Contents

- [Overview](#overview)
- [Function Structure Templates](#function-structure-templates)
- [Error Handling Patterns](#error-handling-patterns)
- [Variable Naming Conventions](#variable-naming-conventions)
- [Code Organization Rules](#code-organization-rules)
- [API Integration Standards](#api-integration-standards)
- [Data Processing Patterns](#data-processing-patterns)
- [Configuration Management](#configuration-management)
- [Performance Guidelines](#performance-guidelines)
- [Documentation Standards](#documentation-standards)

## 📖 Overview

This style guide establishes coding standards for the DOCKETCC project based on proven patterns from the existing FCC ECFS API architecture. These standards ensure consistency, maintainability, and reliability across the codebase.

**Core Principles:**
- **Defensive Programming**: Always handle edge cases and missing data
- **Graceful Degradation**: Continue processing despite individual failures
- **Clear Error Context**: Provide meaningful error messages with context
- **Consistent Structure**: Follow established patterns for similar operations
- **Performance Awareness**: Use efficient batch operations and appropriate caching

## 🏗️ Function Structure Templates

### API Integration Functions

```javascript
/**
 * Fetches data from external API with error handling
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Query parameters
 * @param {Object} env - Environment configuration
 * @returns {Promise<Array>} Processed data array
 */
export async function fetchAPIData(endpoint, params, env) {
	try {
		const url = buildApiUrl(endpoint, params, env);
		
		const response = await fetch(url, {
			headers: {
				Accept: 'application/json',
				'User-Agent': 'DOCKETCC/1.0'
			}
		});

		if (!response.ok) {
			throw new Error(`API returned ${response.status}: ${response.statusText}`);
		}

		const data = await response.json();
		
		// Handle API response variations
		const items = data.items || data.results || data.data || [];
		return items.map(item => processItem(item));
		
	} catch (error) {
		logMessage(`Error fetching ${endpoint}: ${error.message}`);
		throw error;
	}
}
```

### Data Processing Functions

```javascript
/**
 * Processes individual data item with fallbacks
 * @param {Object} rawItem - Raw API response item
 * @returns {Object} Normalized item
 */
function processItem(rawItem) {
	// Always provide fallbacks for missing data
	const normalizedItem = {
		id: rawItem.id || rawItem.identifier || generateFallbackId(),
		title: cleanTitle(rawItem.title || rawItem.name || 'Untitled'),
		author: extractAuthor(rawItem),
		date: rawItem.date || rawItem.created_at || new Date().toISOString(),
		processed_at: new Date().toISOString()
	};

	return normalizedItem;
}
```

### Utility Functions

```javascript
/**
 * Utility function with clear purpose and error handling
 * @param {string} input - Input string to clean
 * @returns {string} Cleaned string
 */
function cleanTitle(input) {
	if (!input || typeof input !== 'string') {
		return 'Untitled';
	}

	return input
		.replace(/\.pdf$/i, '')
		.replace(/\([^)]*\)/g, '')
		.replace(/\d{1,2}\.\d{1,2}\.\d{2,4}/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}
```

## 🛡️ Error Handling Patterns

### Standard Error Handling Structure

```javascript
// Pattern 1: Try-catch with context logging
try {
	const result = await riskyOperation();
	return result;
} catch (error) {
	logMessage(`Error in ${operationName}: ${error.message}`);
	throw error; // Re-throw to let caller decide handling
}

// Pattern 2: Graceful degradation
try {
	await primaryOperation();
} catch (error) {
	logMessage(`Primary operation failed: ${error.message}`);
	// Continue with fallback
	await fallbackOperation();
} finally {
	// Always update state/cleanup
	await updateProcessingState();
}
```

### Batch Processing Error Handling

```javascript
// Process items individually to prevent one failure from stopping everything
const results = await Promise.allSettled(
	items.map(item => processItem(item))
);

// Log failures but continue
results.forEach((result, index) => {
	if (result.status === 'rejected') {
		logMessage(`Failed to process item ${items[index].id}: ${result.reason}`);
	}
});

// Return successful results
const successfulResults = results
	.filter(result => result.status === 'fulfilled')
	.map(result => result.value);
```

### API Error Handling

```javascript
// Handle different types of API errors
if (!response.ok) {
	switch (response.status) {
		case 401:
			throw new Error('API authentication failed - check API key');
		case 429:
			throw new Error('API rate limit exceeded - retry later');
		case 500:
			throw new Error('API server error - service unavailable');
		default:
			throw new Error(`API returned ${response.status}: ${response.statusText}`);
	}
}
```

## 📝 Variable Naming Conventions

### General Naming Rules

```javascript
// Use descriptive names
const ecfsApiKey = process.env.ECFS_API_KEY; // ✅ Clear purpose
const key = process.env.KEY; // ❌ Too vague

// Use consistent prefixes for related variables
const filingId = '12345';
const filingType = 'COMMENT';
const filingDate = '2025-01-15';

// Boolean variables should be questions
const isProcessed = true;
const hasAttachments = false;
const shouldNotify = true;
```

### API and Data Variable Patterns

```javascript
// Raw API responses
const rawEcfsResponse = await fetch(url);
const rawFilingData = await response.json();

// Processed data
const normalizedFilings = rawFilingData.map(processEcfsFiling);
const cleanedTitle = cleanTitle(rawTitle);

// Configuration
const apiBaseUrl = env.ECFS_API_BASE_URL;
const monitorFrequency = env.MONITOR_FREQUENCY_MINUTES;
const batchSize = env.MAX_FILINGS_PER_BATCH;
```

### Function Naming Patterns

```javascript
// Action functions: verb + noun
fetchEcfsFilings()
processFilingData()
updateProcessingState()
sendNotification()

// Utility functions: verb + descriptive noun
cleanTitle()
extractAuthor()
buildApiUrl()
formatDate()

// Boolean functions: is/has/should + condition
isProcessed()
hasValidApiKey()
shouldSkipProcessing()
```

## 🗂️ Code Organization Rules

### File Structure Standards

```
src/
├── lib/
│   ├── api/
│   │   ├── ecfs-api.js        # ECFS API integration
│   │   ├── api-utils.js       # Shared API utilities
│   │   └── index.js           # API exports
│   ├── data/
│   │   ├── processors.js      # Data transformation
│   │   ├── validators.js      # Data validation
│   │   └── normalizers.js     # Data normalization
│   ├── utils/
│   │   ├── date-utils.js      # Date manipulation
│   │   ├── string-utils.js    # String cleaning
│   │   └── logging.js         # Logging utilities
│   └── config/
│       ├── environment.js     # Environment variables
│       └── constants.js       # Application constants
```

### Import/Export Organization

```javascript
// Group imports by type
import { subHours, format } from 'date-fns'; // External libraries
import { logMessage, buildApiUrl } from '../utils'; // Internal utilities
import { ECFS_API_ENDPOINTS } from '../config/constants'; // Constants

// Named exports for utilities
export { fetchEcfsFilings, processEcfsResponse };

// Default export for main functionality
export default class EcfsService {
	// Implementation
}
```

### Function Organization Within Files

```javascript
// 1. Imports at top
import { dependencies } from 'libraries';

// 2. Constants
const API_TIMEOUT = 30000;
const MAX_RETRIES = 3;

// 3. Main exported functions
export async function mainFunction() {
	// Implementation
}

// 4. Helper functions (not exported)
function helperFunction() {
	// Implementation
}

// 5. Utility functions at bottom
function utilityFunction() {
	// Implementation
}
```

## 🔌 API Integration Standards

### URL Construction Pattern

```javascript
function buildEcfsApiUrl(docketNumber, params = {}) {
	const baseUrl = env.ECFS_API_BASE_URL;
	const apiKey = env.ECFS_API_KEY;
	
	const queryParams = new URLSearchParams({
		api_key: apiKey,
		'proceedings.name': docketNumber,
		sort: 'date_disseminated,DESC',
		per_page: '20',
		...params
	});
	
	return `${baseUrl}/filings?${queryParams.toString()}`;
}
```

### Request Configuration

```javascript
const defaultRequestConfig = {
	headers: {
		Accept: 'application/json',
		'User-Agent': 'DOCKETCC/1.0',
		'Content-Type': 'application/json'
	},
	timeout: 30000
};
```

### Response Processing Standards

```javascript
// Always handle response variations
const items = data.filing || data.filings || data.results || [];

// Validate response structure
if (!Array.isArray(items)) {
	logMessage('API response is not an array, converting to array');
	items = [items].filter(Boolean);
}

// Process each item defensively
return items.map(item => {
	try {
		return processItem(item);
	} catch (error) {
		logMessage(`Error processing item ${item.id}: ${error.message}`);
		return null;
	}
}).filter(Boolean);
```

## 🔄 Data Processing Patterns

### Data Extraction with Fallbacks

```javascript
// Multiple source extraction pattern
function extractAuthor(filing) {
	return (
		filing.name_of_filer ||
		filing.filers?.[0]?.name ||
		filing.lawfirms?.[0]?.name ||
		'Anonymous'
	);
}

// Company name standardization
function shortenCompanyName(name) {
	if (!name) return 'Unknown';
	
	return name
		.replace(/\b(Inc\.|Incorporated|LLC|Corporation|Corp\.|Company|Co\.)\b/gi, '')
		.replace(/\bd\/b\/a\s+/gi, '/')
		.replace(/\s+/g, ' ')
		.trim();
}
```

### Data Validation Pattern

```javascript
function validateFiling(filing) {
	const errors = [];
	
	if (!filing.id) errors.push('Missing required field: id');
	if (!filing.date_received) errors.push('Missing required field: date_received');
	
	return {
		isValid: errors.length === 0,
		errors
	};
}
```

### Normalization Pattern

```javascript
function normalizeEcfsFiling(rawFiling) {
	const validation = validateFiling(rawFiling);
	if (!validation.isValid) {
		throw new Error(`Invalid filing data: ${validation.errors.join(', ')}`);
	}

	return {
		id: rawFiling.id_submission,
		type: rawFiling.submissiontype?.description || 'FILING',
		title: cleanTitle(rawFiling.documents?.[0]?.filename || 'Untitled'),
		author: shortenCompanyName(extractAuthor(rawFiling)),
		date: rawFiling.date_received,
		url: buildFilingUrl(rawFiling.id_submission),
		summary: extractSummary(rawFiling),
		processed_at: new Date().toISOString()
	};
}
```

## ⚙️ Configuration Management

### Environment Variable Patterns

```javascript
// config/environment.js
export const config = {
	// Required variables (will throw if missing)
	ecfsApiKey: requireEnv('ECFS_API_KEY'),
	
	// Optional variables with defaults
	apiBaseUrl: process.env.ECFS_API_BASE_URL || 'https://publicapi.fcc.gov/ecfs',
	monitorFrequency: parseInt(process.env.MONITOR_FREQUENCY_MINUTES) || 60,
	maxFilingsPerBatch: parseInt(process.env.MAX_FILINGS_PER_BATCH) || 10,
	
	// Boolean variables
	enableNotifications: process.env.ENABLE_NOTIFICATIONS === 'true',
	debugMode: process.env.NODE_ENV === 'development'
};

function requireEnv(key) {
	const value = process.env[key];
	if (!value) {
		throw new Error(`Required environment variable ${key} is not set`);
	}
	return value;
}
```

### Constants Organization

```javascript
// config/constants.js
export const ECFS_API_ENDPOINTS = {
	FILINGS: '/filings',
	PROCEEDINGS: '/proceedings'
};

export const FILING_TYPES = {
	COMMENT: 'COMMENT',
	REPLY: 'REPLY',
	INITIAL: 'INITIAL'
};

export const TIME_CONSTANTS = {
	LOOKBACK_HOURS: 2,
	CACHE_TTL_SECONDS: 3600,
	RETRY_DELAY_MS: 1000
};
```

## 🚀 Performance Guidelines

### Batch Operations

```javascript
// Batch API calls instead of individual calls
const filingIds = ['id1', 'id2', 'id3'];
const processedChecks = await Promise.all(
	filingIds.map(id => checkIfProcessed(id))
);

// Batch database operations
const batchOperations = processedFilings.map(filing => ({
	key: `processed_${filing.id}`,
	value: 'true',
	options: { expirationTtl: 7 * 24 * 60 * 60 }
}));
```

### Caching Patterns

```javascript
// Cache with TTL
async function getCachedData(key, fetchFunction, ttlSeconds = 3600) {
	const cached = await cache.get(key);
	if (cached) {
		return JSON.parse(cached);
	}
	
	const data = await fetchFunction();
	await cache.put(key, JSON.stringify(data), {
		expirationTtl: ttlSeconds
	});
	
	return data;
}
```

### Rate Limiting

```javascript
// Simple rate limiting pattern
class RateLimiter {
	constructor(maxRequests, windowMs) {
		this.maxRequests = maxRequests;
		this.windowMs = windowMs;
		this.requests = [];
	}
	
	async checkRate() {
		const now = Date.now();
		this.requests = this.requests.filter(time => now - time < this.windowMs);
		
		if (this.requests.length >= this.maxRequests) {
			throw new Error('Rate limit exceeded');
		}
		
		this.requests.push(now);
	}
}
```

## 📚 Documentation Standards

### Function Documentation

```javascript
/**
 * Fetches ECFS filings for a specific docket
 * @param {string} docketNumber - FCC docket number (e.g., "11-42")
 * @param {Object} options - Configuration options
 * @param {number} options.lookbackHours - Hours to look back for new filings
 * @param {number} options.maxResults - Maximum number of results to return
 * @param {Object} env - Environment configuration object
 * @returns {Promise<Array<Object>>} Array of normalized filing objects
 * @throws {Error} When API key is missing or API request fails
 * @example
 * const filings = await fetchEcfsFilings('11-42', { lookbackHours: 2 }, env);
 */
```

### Code Comments

```javascript
// Use comments to explain WHY, not WHAT
// ECFS API returns 'filing' not 'filings' - common gotcha
const filings = data.filing || data.filings || [];

// Looking back 2 hours accounts for processing delays in ECFS system
const sinceDate = subHours(new Date(), 2).toISOString().split('T')[0];

// Process individually to prevent one bad filing from stopping everything
const results = await Promise.allSettled(filings.map(processFiling));
```

### README Structure

```markdown
# Component Name

Brief description of what this component does.

## Usage

```javascript
import { functionName } from './component';
const result = await functionName(params);
```

## Configuration

Required environment variables:
- `REQUIRED_VAR`: Description
- `OPTIONAL_VAR`: Description (default: value)

## Error Handling

This component throws errors for:
- Missing required configuration
- API failures
- Data validation failures
```

---

**This style guide should be referenced for all DOCKETCC development to ensure consistency and maintainability across the codebase.** 