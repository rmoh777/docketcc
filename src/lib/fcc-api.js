// FCC ECFS API Integration Module
// Phase 3 Implementation - Updated to match specification

/**
 * Main FCC ECFS API integration
 * Fetches new filings for monitored dockets
 */

const FCC_BASE_URL = 'https://publicapi.fcc.gov/ecfs/v1';

export class FCCAPIClient {
	constructor(env) {
		this.apiKey = env.FCC_API_KEY;
		this.baseUrl = 'https://publicapi.fcc.gov/ecfs';
	}

	async fetchDocketFilings(docketNumber, sinceDate = null) {
		try {
			const params = new URLSearchParams({
				'proceedings.name': docketNumber,
				limit: '250',
				sort: 'date_disseminated,DESC',
				api_key: this.apiKey
			});

			if (sinceDate) {
				params.append('date_disseminated', `>=${sinceDate}`);
			}

			const response = await fetch(`${this.baseUrl}/filings?${params}`);

			if (response.status === 429) {
				// Rate limited - wait and return empty
				console.log(`Rate limited for docket ${docketNumber}`);
				return [];
			}

			if (!response.ok) {
				console.log(`FCC API error for docket ${docketNumber}: ${response.status}`);
				return [];
			}

			const data = await response.json();
			return data.filings || [];
		} catch (error) {
			console.log(`Network error for docket ${docketNumber}:`, error.message);
			return [];
		}
	}

	parseFilingData(filing) {
		// Extract document URLs from filing
		const documentUrls = [];

		if (filing.attachments && filing.attachments.length > 0) {
			for (const attachment of filing.attachments) {
				if (attachment.clean_file_name) {
					documentUrls.push(
						`https://ecfs.fcc.gov/api/filing/${filing.id_submission}/download/${attachment.clean_file_name}`
					);
				}
			}
		}

		return {
			fcc_filing_id: filing.id_submission,
			title: filing.brief_comment_text || 'Filing',
			author: filing.contact_email || 'Unknown',
			author_organization: filing.lawfirm_name || filing.organization_name || null,
			filing_url: `https://www.fcc.gov/ecfs/filing/${filing.id_submission}`,
			document_urls: JSON.stringify(documentUrls),
			filed_at: new Date(filing.date_disseminated).getTime()
		};
	}
}

// Legacy exports for backward compatibility
export async function fetchECFSFilings(docketNumber, apiKey, sinceDate = null) {
	const client = new FCCAPIClient({ FCC_API_KEY: apiKey });
	return await client.fetchDocketFilings(docketNumber, sinceDate);
}

/**
 * Get docket information from ECFS API
 * Used for docket discovery and validation
 */
export async function getDocketInfo(docketNumber, apiKey) {
	try {
		const url = `https://publicapi.fcc.gov/ecfs/proceedings?proceedings.name=${docketNumber}&api_key=${apiKey}`;
		const response = await fetch(url);

		if (!response.ok) return null;

		const data = await response.json();
		if (data.proceedings && data.proceedings.length > 0) {
			const proc = data.proceedings[0];
			return {
				docket_number: proc.name,
				title: proc.subject || 'No title available',
				bureau: proc.bureau_name,
				description: proc.subject,
				status: proc.status || 'unknown'
			};
		}
	} catch (error) {
		console.error(`Error fetching docket ${docketNumber}:`, error);
	}
	return null;
}

/**
 * Validate docket number format
 */
export function isValidDocketNumber(docketNumber) {
	// FCC docket format: XX-XXX or XX-XXXX
	const pattern = /^\d{2}-\d{3,4}$/;
	return pattern.test(docketNumber);
}

/**
 * Batch fetch multiple dockets
 * Used by the ingestion engine
 */
export async function fetchMultipleDockets(docketNumbers, apiKey, sinceDate = null) {
	const results = [];
	
	// Process dockets in batches to avoid rate limiting
	for (const docketNumber of docketNumbers) {
		try {
			const filings = await fetchECFSFilings(docketNumber, apiKey, sinceDate);
			results.push({
				docket_number: docketNumber,
				filings: filings,
				success: true
			});
			
			// Add delay to respect rate limits
			await new Promise(resolve => setTimeout(resolve, 200));
			
		} catch (error) {
			results.push({
				docket_number: docketNumber,
				filings: [],
				success: false,
				error: error.message
			});
		}
	}
	
	return results;
} 