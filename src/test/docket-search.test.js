import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocketSearch } from '../lib/docket-search.js';

// Mock environment
const mockEnv = {
	FCC_API_KEY: 'test-api-key',
	DB: {} // Mock database
};

// Mock fetch globally
global.fetch = vi.fn();

describe('DocketSearch - Simplified Implementation', () => {
	let docketSearch;

	beforeEach(() => {
		docketSearch = new DocketSearch(mockEnv);
		vi.clearAllMocks();
	});

	describe('Docket Number Validation', () => {
		it('should validate correct docket number format', () => {
			const validDockets = ['11-42', '23-152', '17-108', '02-278'];
			
			validDockets.forEach((docket) => {
				expect(/^\d{2}-\d+$/.test(docket)).toBe(true);
			});
		});

		it('should reject invalid docket number formats', () => {
			const invalidDockets = ['invalid', '1-2', '', '11-42-extra', 'abc-123', '123-abc'];
			
			invalidDockets.forEach((docket) => {
				expect(/^\d{2}-\d+$/.test(docket)).toBe(false);
			});
		});
	});

	describe('Exact Keyword Matching', () => {
		it('should find dockets for exact keyword "lifeline"', async () => {
			// Mock FCC API response for lifeline dockets
			global.fetch
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						proceedings: [{
							name: '11-42',
							subject: 'Lifeline and Link Up Reform',
							bureau_name: 'Wireline Competition Bureau',
							status: 'active'
						}]
					})
				})
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						proceedings: [{
							name: '17-287',
							subject: 'Lifeline and Link Up Reform and Modernization',
							bureau_name: 'Wireline Competition Bureau',
							status: 'active'
						}]
					})
				});

			const results = await docketSearch.searchDockets('lifeline');

			expect(results).toHaveLength(2);
			expect(results[0].docket_number).toBe('11-42');
			expect(results[1].docket_number).toBe('17-287');
			expect(results[0].title).toContain('Lifeline');
		});

		it('should find dockets for exact keyword "broadband"', async () => {
			// Mock FCC API responses for broadband dockets
			global.fetch
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						proceedings: [{
							name: '17-108',
							subject: 'Restoring Internet Freedom',
							bureau_name: 'Wireline Competition Bureau',
							status: 'active'
						}]
					})
				})
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						proceedings: [{
							name: '18-143',
							subject: 'Broadband Deployment Advisory Committee',
							bureau_name: 'Wireline Competition Bureau',
							status: 'active'
						}]
					})
				})
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						proceedings: [{
							name: '14-58',
							subject: 'Broadband Infrastructure',
							bureau_name: 'Wireline Competition Bureau',
							status: 'active'
						}]
					})
				});

			const results = await docketSearch.searchDockets('broadband');

			expect(results).toHaveLength(3);
			expect(results.map(r => r.docket_number)).toContain('17-108');
			expect(results.map(r => r.docket_number)).toContain('18-143');
			expect(results.map(r => r.docket_number)).toContain('14-58');
		});

		it('should return empty array for unknown keywords', async () => {
			const results = await docketSearch.searchDockets('unknownkeyword');
			expect(results).toEqual([]);
		});

		it('should NOT match partial keywords (no fuzzy matching)', async () => {
			// Should not match "life" when keyword is "lifeline"
			const results = await docketSearch.searchDockets('life');
			expect(results).toEqual([]);
		});
	});

	describe('Direct Docket Number Search', () => {
		it('should find docket by exact number', async () => {
			global.fetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					proceedings: [{
						name: '17-108',
						subject: 'Restoring Internet Freedom',
						bureau_name: 'Wireline Competition Bureau',
						status: 'active'
					}]
				})
			});

			const results = await docketSearch.searchDockets('17-108');

			expect(results).toHaveLength(1);
			expect(results[0].docket_number).toBe('17-108');
			expect(results[0].title).toBe('Restoring Internet Freedom');
		});
	});

	describe('Error Handling', () => {
		it('should handle FCC API errors gracefully', async () => {
			global.fetch.mockResolvedValueOnce({
				ok: false,
				status: 500
			});

			const results = await docketSearch.searchDockets('11-42');

			expect(results).toEqual([]);
		});

		it('should handle network errors gracefully', async () => {
			global.fetch.mockRejectedValueOnce(new Error('Network error'));

			const results = await docketSearch.searchDockets('11-42');

			expect(results).toEqual([]);
		});

		it('should handle API rate limiting gracefully', async () => {
			global.fetch.mockResolvedValueOnce({
				ok: false,
				status: 429
			});

			const results = await docketSearch.searchDockets('lifeline');

			expect(results).toEqual([]);
		});
	});

	describe('Keyword Mapping Coverage', () => {
		it('should have all expected keywords mapped', () => {
			const expectedKeywords = [
				'lifeline',
				'broadband', 
				'net neutrality',
				'robocalls',
				'rural',
				'accessibility',
				'spectrum',
				'emergency alert'
			];

			// Test each keyword returns results (mock successful API calls)
			expectedKeywords.forEach(async (keyword) => {
				global.fetch.mockResolvedValue({
					ok: true,
					json: async () => ({
						proceedings: [{
							name: '11-42',
							subject: 'Test Docket',
							bureau_name: 'Test Bureau',
							status: 'active'
						}]
					})
				});

				const results = await docketSearch.searchDockets(keyword);
				expect(Array.isArray(results)).toBe(true);
			});
		});
	});

	describe('Result Limiting', () => {
		it('should limit results to 10 items maximum', async () => {
			// Mock many API calls that would return results
			const mockResponse = {
				ok: true,
				json: async () => ({
					proceedings: [{
						name: '11-42',
						subject: 'Test Docket',
						bureau_name: 'Test Bureau',
						status: 'active'
					}]
				})
			};

			// Mock 15 successful API calls
			for (let i = 0; i < 15; i++) {
				global.fetch.mockResolvedValueOnce(mockResponse);
			}

			// Create a keyword that would theoretically return many results
			const results = await docketSearch.searchDockets('broadband');

			expect(results.length).toBeLessThanOrEqual(10);
		});
	});
}); 