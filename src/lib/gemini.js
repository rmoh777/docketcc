// Google Gemini AI Integration Module
// Phase 3 Implementation - Updated to match specification

export class GeminiProcessor {
	constructor(env) {
		this.apiKey = env.GEMINI_API_KEY;
		this.apiUrl =
			'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
	}

	async generateSummary(documentUrls, filingTitle) {
		// Try to process the first available document
		const urls = JSON.parse(documentUrls || '[]');

		if (urls.length === 0) {
			return 'No document available for summarization.';
		}

		for (const url of urls.slice(0, 2)) {
			// Try first 2 documents
			try {
				const summary = await this.processDocumentFromUrl(url, filingTitle);
				if (summary && summary !== 'Document processing failed.') {
					return summary;
				}
			} catch (error) {
				console.log(`Failed to process document ${url}:`, error.message);
				continue;
			}
		}

		return 'Summary could not be generated - please check original filing.';
	}

	async processDocumentFromUrl(documentUrl, filingTitle) {
		try {
			const prompt = `
Analyze this FCC filing document and provide a 2-4 sentence summary that:
1. Identifies the key regulatory issue or request
2. States the filer's position or requested action  
3. Notes any deadlines or procedural requirements
4. Avoids technical jargon for general audiences

Filing title: ${filingTitle}
Document URL: ${documentUrl}

Please provide only the summary, no additional commentary.
`;

			const requestBody = {
				contents: [
					{
						parts: [
							{
								fileData: {
									fileUri: documentUrl,
									mimeType: 'application/pdf'
								}
							},
							{
								text: prompt
							}
						]
					}
				]
			};

			const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(requestBody),
				signal: AbortSignal.timeout(30000) // 30 second timeout
			});

			if (!response.ok) {
				console.log('Gemini API failed:', response.status);
				return 'Summary temporarily unavailable - please check original filing.';
			}

			const data = await response.json();

			if (data.candidates && data.candidates[0] && data.candidates[0].content) {
				return data.candidates[0].content.parts[0].text.trim();
			}

			return 'Summary could not be generated - please check original filing.';
		} catch (error) {
			console.log('Gemini processing error:', error.message);
			return 'Summary could not be generated - please check original filing.';
		}
	}
}

// Legacy exports for backward compatibility

/**
 * Initialize Gemini AI client
 */
export function initializeGemini(apiKey) {
	return new GoogleGenerativeAI(apiKey);
}

/**
 * Process documents from URLs and generate summaries
 * Core function for the AI Brain component
 */
export async function processFilingDocuments(filing, geminiApiKey) {
	try {
		const genAI = initializeGemini(geminiApiKey);
		const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

		let summary = '';
		let processedDocuments = 0;

		// Process each document URL
		for (const docUrl of filing.document_urls) {
			try {
				const docSummary = await processDocument(model, docUrl, filing);
				if (docSummary) {
					summary += docSummary + ' ';
					processedDocuments++;
				}
				
				// Process only first 3 documents to control costs
				if (processedDocuments >= 3) break;
				
			} catch (error) {
				console.error(`Error processing document ${docUrl}:`, error);
				// Continue with other documents
			}
		}

		// Fallback to raw text data if no documents were processed
		if (!summary && filing.raw_data?.text_data) {
			summary = await generateSummaryFromText(model, filing.raw_data.text_data, filing);
		}

		// Fallback to brief comment summary
		if (!summary && filing.raw_data?.brief_comment_summary) {
			summary = filing.raw_data.brief_comment_summary.substring(0, 500);
		}

		return {
			summary: summary.trim() || 'Unable to generate summary',
			processing_status: 'processed',
			processed_documents: processedDocuments
		};

	} catch (error) {
		console.error('Error processing filing with Gemini:', error);
		return {
			summary: 'Error processing documents',
			processing_status: 'failed',
			processed_documents: 0
		};
	}
}

/**
 * Process individual document from URL
 */
async function processDocument(model, documentUrl, filing) {
	try {
		// Check if URL is accessible
		const response = await fetch(documentUrl, { method: 'HEAD' });
		if (!response.ok) {
			throw new Error(`Document not accessible: ${response.status}`);
		}

		const contentType = response.headers.get('content-type') || '';
		
		// Only process PDF and Word documents
		if (!contentType.includes('pdf') && !contentType.includes('word') && !contentType.includes('document')) {
			return null;
		}

		// For PDF/Word documents, we need to extract text first
		// This is a simplified approach - in production you'd use proper PDF/Word parsing
		const prompt = `
			Please analyze this FCC regulatory filing document and provide a 2-4 sentence summary focusing on:
			1. The main regulatory issue or petition
			2. Key arguments or positions taken
			3. Any specific actions requested from the FCC
			
			Filing Title: ${filing.title}
			Author: ${filing.author}
			Document URL: ${documentUrl}
			
			Please provide a concise, professional summary suitable for regulatory professionals.
		`;

		const result = await model.generateContent(prompt);
		const response_text = result.response.text();
		
		return response_text.substring(0, 500); // Limit summary length
		
	} catch (error) {
		console.error(`Error processing document ${documentUrl}:`, error);
		return null;
	}
}

/**
 * Generate summary from text content
 */
async function generateSummaryFromText(model, textData, filing) {
	try {
		const prompt = `
			Please provide a 2-4 sentence summary of this FCC regulatory filing:
			
			Filing Title: ${filing.title}
			Author: ${filing.author}
			Content: ${textData}
			
			Focus on:
			1. The main regulatory issue or petition
			2. Key arguments or positions
			3. Requested FCC actions
			
			Provide a concise, professional summary.
		`;

		const result = await model.generateContent(prompt);
		return result.response.text().substring(0, 500);
		
	} catch (error) {
		console.error('Error generating summary from text:', error);
		return null;
	}
}

/**
 * Batch process multiple filings
 * Used by the ingestion engine worker
 */
export async function batchProcessFilings(filings, geminiApiKey, maxConcurrent = 3) {
	const results = [];
	const concurrent = Math.min(maxConcurrent, filings.length);
	
	// Process filings in batches to control API usage
	for (let i = 0; i < filings.length; i += concurrent) {
		const batch = filings.slice(i, i + concurrent);
		
		const batchPromises = batch.map(filing => 
			processFilingDocuments(filing, geminiApiKey)
		);
		
		const batchResults = await Promise.allSettled(batchPromises);
		
		batchResults.forEach((result, index) => {
			const filing = batch[index];
			if (result.status === 'fulfilled') {
				results.push({
					filing_id: filing.fcc_filing_id,
					...result.value
				});
			} else {
				results.push({
					filing_id: filing.fcc_filing_id,
					summary: 'Error processing filing',
					processing_status: 'failed',
					processed_documents: 0,
					error: result.reason?.message
				});
			}
		});
		
		// Add delay between batches
		if (i + concurrent < filings.length) {
			await new Promise(resolve => setTimeout(resolve, 1000));
		}
	}
	
	return results;
}

/**
 * Estimate processing costs
 */
export function estimateProcessingCost(filings) {
	// Rough estimate: $0.075 per 1M input tokens
	// Average filing: ~2000 tokens
	const avgTokensPerFiling = 2000;
	const costPer1MTokens = 0.075;
	
	const totalTokens = filings.length * avgTokensPerFiling;
	const estimatedCost = (totalTokens / 1000000) * costPer1MTokens;
	
	return {
		totalFilings: filings.length,
		estimatedTokens: totalTokens,
		estimatedCostUSD: estimatedCost.toFixed(4)
	};
}

/**
 * Test Gemini connection
 */
export async function testGeminiConnection(apiKey) {
	try {
		const genAI = initializeGemini(apiKey);
		const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
		
		const result = await model.generateContent('Test connection. Please respond with "OK".');
		const response = result.response.text();
		
		return {
			success: true,
			response: response,
			model: 'gemini-1.5-flash'
		};
		
	} catch (error) {
		return {
			success: false,
			error: error.message
		};
	}
} 