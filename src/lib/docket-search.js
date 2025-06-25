// Hybrid docket search strategy
// Combines keyword mapping with database search since FCC API doesn't support keyword search

import { Database } from './database.js';

// ✅ GOOD - Simple keyword mapping (exact matches only)
const DOCKET_KEYWORDS = {
	'lifeline': ['11-42', '17-287'],
	'broadband': ['17-108', '18-143', '14-58'],
	'net neutrality': ['17-108'],
	'robocalls': ['17-59', '02-278'],
	'rural': ['10-90', '17-287'],
	'accessibility': ['10-213', '13-46'],
	'spectrum': ['12-268', '18-295'],
	'emergency alert': ['15-91', '04-296']
};

// Minimal fallback data for development only (when FCC API completely unavailable)
const FALLBACK_DOCKETS = {
	'17-108': {
		docket_number: '17-108',
		title: 'Restoring Internet Freedom',
		description: 'Net neutrality rules and broadband internet access service',
		bureau: 'Wireline Competition Bureau',
		status: 'active'
	},
	'11-42': {
		docket_number: '11-42',
		title: 'Lifeline and Link Up Reform and Modernization',
		description: 'Universal service program for low-income consumers',
		bureau: 'Wireline Competition Bureau',
		status: 'active'
	},
	'17-287': {
		docket_number: '17-287',
		title: 'Lifeline and Link Up Reform and Modernization',
		description: 'Lifeline program modernization and broadband adoption',
		bureau: 'Wireline Competition Bureau',
		status: 'active'
	}
};

export class DocketSearch {
	constructor(env) {
		this.db = new Database(env);
		
		// Handle environment variables for both development and production
		if (env?.FCC_API_KEY) {
			// Production: Cloudflare Workers environment
			this.fccApiKey = env.FCC_API_KEY;
		} else if (typeof process !== 'undefined' && process.env?.FCC_API_KEY) {
			// Development: Node.js environment
			this.fccApiKey = process.env.FCC_API_KEY;
		} else {
			// Temporary: Use the provided API key for testing
			this.fccApiKey = '7DMIhVNAxnGY64lDwhNxpFVrgFLfc4pUUWXn5lzW';
			console.log('Using provided FCC API key for testing');
		}
	}

	async searchDockets(query) {
		const results = [];
		const seen = new Set();

		// 1. Check if it's a docket number format (XX-XXX)
		if (/^\d{2}-\d+$/.test(query.trim())) {
			const docket = await this.fetchDocketInfo(query.trim());
			if (docket) {
				results.push(docket);
				seen.add(docket.docket_number);
			}
		}

		// 2. Simple exact keyword lookup
		const searchTerm = query.toLowerCase().trim();
		if (DOCKET_KEYWORDS[searchTerm]) {
			for (const docketNum of DOCKET_KEYWORDS[searchTerm]) {
				if (!seen.has(docketNum)) {
					const docket = await this.fetchDocketInfo(docketNum);
					if (docket) {
						results.push(docket);
						seen.add(docketNum);
					}
				}
			}
		}

		return results.slice(0, 10); // Limit results
	}

	async fetchDocketInfo(docketNumber) {
		// Always try FCC API first - this is the real search functionality
		if (this.fccApiKey) {
			try {
				// Use the correct ECFS API endpoint for filings
				const url = `https://publicapi.fcc.gov/ecfs/filings?proceedings.name=${docketNumber}&api_key=${this.fccApiKey}&sort=date_disseminated,DESC&per_page=1`;
				console.log(`Fetching docket ${docketNumber} from FCC ECFS API...`);
				
				const response = await fetch(url, {
					headers: {
						'Accept': 'application/json',
						'User-Agent': 'DocketCC/1.0'
					}
				});

				if (response.ok) {
					const data = await response.json();
					// ECFS API returns 'filing' not 'filings' - handle both cases
					const filings = data.filing || data.filings || [];
					
					if (filings && filings.length > 0) {
						// Use the first filing to extract docket information
						const filing = filings[0];
						console.log(`Successfully fetched docket ${docketNumber} from FCC ECFS API`);
						
						// Extract docket info from the filing
						return {
							docket_number: docketNumber,
							title: this.extractDocketTitle(filing, docketNumber),
							bureau: this.extractBureau(filing),
							description: this.extractDescription(filing),
							status: 'active' // If there are recent filings, assume active
						};
					} else {
						console.log(`No filings found for docket ${docketNumber}`);
					}
				} else if (response.status === 429) {
					console.log(`Rate limited for docket ${docketNumber}`);
					return null;
				} else {
					console.log(`FCC ECFS API error for docket ${docketNumber}: ${response.status}`);
				}
			} catch (error) {
				console.error(`Network error fetching docket ${docketNumber}:`, error.message);
			}
		} else {
			console.log('No FCC API key available - using fallback data for development');
		}

		// Only use fallback data when no API key is available (development mode)
		if (!this.fccApiKey && FALLBACK_DOCKETS[docketNumber]) {
			console.log(`Using fallback data for docket ${docketNumber} (development mode)`);
			return FALLBACK_DOCKETS[docketNumber];
		}

		return null;
	}

	// Helper method to extract a meaningful title for the docket
	extractDocketTitle(filing, docketNumber) {
		// Try to get a clean title from the filing
		if (filing.submissiontype?.description) {
			return `${docketNumber} - ${filing.submissiontype.description}`;
		}
		
		// Fallback to a generic title
		return `FCC Docket ${docketNumber}`;
	}

	// Helper method to extract bureau information
	extractBureau(filing) {
		// ECFS filings don't always have bureau info, but we can try
		return filing.bureau?.name || 'Federal Communications Commission';
	}

	// Helper method to extract description
	extractDescription(filing) {
		// Use brief comment summary or text data as description
		if (filing.brief_comment_summary) {
			return filing.brief_comment_summary.substring(0, 200) + '...';
		}
		if (filing.text_data) {
			return filing.text_data.substring(0, 200) + '...';
		}
		return 'FCC proceeding with recent filing activity';
	}

	async addDocketToDatabase(docketInfo) {
		const stmt = this.db.db.prepare(`
			INSERT OR REPLACE INTO Dockets (docket_number, title, bureau, description, status, created_at)
			VALUES (?, ?, ?, ?, ?, ?)
		`);
		return await stmt
			.bind(
				docketInfo.docket_number,
				docketInfo.title,
				docketInfo.bureau,
				docketInfo.description,
				docketInfo.status,
				Date.now()
			)
			.run();
	}
} 