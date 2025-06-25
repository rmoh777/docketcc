// Database operations for Cloudflare D1
// Implements the complete database schema from architecture document

/**
 * Database helper functions for DocketCC
 * Uses Cloudflare D1 SQL database
 */

/**
 * Database utility class for DocketCC
 * Handles user management, dockets, and migrations
 */
export class Database {
	constructor(env) {
		// Handle development vs production database
		if (env && env.DB) {
			// Production: Cloudflare D1 database
			this.db = env.DB;
			this.isDevelopment = false;
		} else {
			// Development: Mock database or local SQLite
			console.warn('Development mode: Database operations will be mocked');
			this.db = new MockDatabase();
			this.isDevelopment = true;
		}
	}

	// User Management Methods
	async createUser(userData) {
		const { id, email, google_id, name, avatar_url } = userData;
		const stmt = this.db.prepare(`
			INSERT INTO Users (id, email, google_id, name, avatar_url, created_at, last_login_at)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`);
		return await stmt.bind(id, email, google_id, name, avatar_url, Date.now(), Date.now()).run();
	}

	async getUserById(id) {
		const stmt = this.db.prepare('SELECT * FROM Users WHERE id = ?');
		return await stmt.bind(id).first();
	}

	async getUserByGoogleId(google_id) {
		const stmt = this.db.prepare('SELECT * FROM Users WHERE google_id = ?');
		return await stmt.bind(google_id).first();
	}

	async getUserByEmail(email) {
		const stmt = this.db.prepare('SELECT * FROM Users WHERE email = ?');
		return await stmt.bind(email).first();
	}

	async updateUserLogin(id) {
		const stmt = this.db.prepare('UPDATE Users SET last_login_at = ? WHERE id = ?');
		return await stmt.bind(Date.now(), id).run();
	}

	async updateUserSubscription(userId, updates) {
		// Handle both old and new API formats
		if (typeof updates === 'string') {
			// Old format: updateUserSubscription(userId, tier, stripeCustomerId)
			const tier = updates;
			const stripeCustomerId = arguments[2] || null;
			const stmt = this.db.prepare(`
				UPDATE Users 
				SET subscription_tier = ?, stripe_customer_id = ? 
				WHERE id = ?
			`);
			return await stmt.bind(tier, stripeCustomerId, userId).run();
		} else {
			// New format: updateUserSubscription(userId, { subscription_tier, stripe_customer_id, stripe_subscription_id })
			const fields = [];
			const values = [];
			
			if (updates.subscription_tier) {
				fields.push('subscription_tier = ?');
				values.push(updates.subscription_tier);
			}
			
			if (updates.stripe_customer_id) {
				fields.push('stripe_customer_id = ?');
				values.push(updates.stripe_customer_id);
			}
			
			if (updates.stripe_subscription_id) {
				fields.push('stripe_subscription_id = ?');
				values.push(updates.stripe_subscription_id);
			}
			
			if (fields.length === 0) {
				throw new Error('No fields to update');
			}
			
			values.push(userId);
			const stmt = this.db.prepare(`UPDATE Users SET ${fields.join(', ')} WHERE id = ?`);
			return await stmt.bind(...values).run();
		}
	}

	async getUserByStripeCustomerId(stripeCustomerId) {
		const stmt = this.db.prepare('SELECT * FROM Users WHERE stripe_customer_id = ?');
		return await stmt.bind(stripeCustomerId).first();
	}

	// Docket Management Methods
	async createDocket(docketData) {
		const { docket_number, title, bureau, description, status } = docketData;
		const stmt = this.db.prepare(`
			INSERT OR REPLACE INTO Dockets (docket_number, title, bureau, description, status, created_at)
			VALUES (?, ?, ?, ?, ?, ?)
		`);
		return await stmt.bind(docket_number, title, bureau, description, status, Date.now()).run();
	}

	async getDocketByNumber(docketNumber) {
		const stmt = this.db.prepare('SELECT * FROM Dockets WHERE docket_number = ?');
		return await stmt.bind(docketNumber).first();
	}

	async searchDockets(query) {
		const stmt = this.db.prepare(`
			SELECT * FROM Dockets 
			WHERE title LIKE ? OR description LIKE ? OR docket_number LIKE ?
			ORDER BY created_at DESC LIMIT 10
		`);
		const searchPattern = `%${query}%`;
		const result = await stmt.bind(searchPattern, searchPattern, searchPattern).all();
		return result.results || [];
	}

	// Subscription Management
	async addDocketSubscription(userId, docketNumber, frequency = 'daily') {
		// First get or create the docket
		let docket = await this.getDocketByNumber(docketNumber);
		if (!docket) {
			// Create a placeholder docket - it will be populated by the FCC API later
			await this.createDocket({
				docket_number: docketNumber,
				title: 'Pending - Will be updated from FCC API',
				bureau: 'Unknown',
				description: 'Docket information will be fetched from FCC API',
				status: 'unknown'
			});
			docket = await this.getDocketByNumber(docketNumber);
		}

		const stmt = this.db.prepare(`
			INSERT OR REPLACE INTO UserDocketSubscriptions 
			(user_id, docket_id, notification_frequency, created_at)
			VALUES (?, ?, ?, ?)
		`);
		return await stmt.bind(userId, docket.id, frequency, Date.now()).run();
	}

	async getUserSubscriptions(userId) {
		const stmt = this.db.prepare(`
			SELECT uds.*, d.docket_number, d.title, d.bureau, d.status
			FROM UserDocketSubscriptions uds
			JOIN Dockets d ON uds.docket_id = d.id
			WHERE uds.user_id = ? AND uds.is_active = 1
			ORDER BY uds.created_at DESC
		`);
		const result = await stmt.bind(userId).all();
		return result.results || [];
	}

	async removeDocketSubscription(userId, docketId) {
		const stmt = this.db.prepare(`
			UPDATE UserDocketSubscriptions 
			SET is_active = 0 
			WHERE user_id = ? AND docket_id = ?
		`);
		return await stmt.bind(userId, docketId).run();
	}

	// Migration System
	async runMigrations() {
		try {
			// Check if migrations table exists first
			const checkTable = this.db.prepare(`
				SELECT name FROM sqlite_master WHERE type='table' AND name='_migrations'
			`);
			const tableExists = await checkTable.first();
			
			if (!tableExists) {
				// Create migrations table if it doesn't exist
				const createMigrationsTable = this.db.prepare(`
					CREATE TABLE _migrations (
						id INTEGER PRIMARY KEY AUTOINCREMENT,
						migration_name TEXT NOT NULL UNIQUE,
						applied_at INTEGER NOT NULL
					)
				`);
				await createMigrationsTable.run();
			}

			// Check if initial migration has been applied
			const stmt = this.db.prepare('SELECT * FROM _migrations WHERE migration_name = ?');
			const existingMigration = await stmt.bind('001_initial').first();

			if (!existingMigration) {
				console.log('Running initial migration...');
				
				// Execute initial migration statements one by one
				const migrationStatements = [
					`CREATE TABLE IF NOT EXISTS Users (
						id TEXT PRIMARY KEY,
						email TEXT NOT NULL UNIQUE,
						google_id TEXT UNIQUE,
						name TEXT,
						avatar_url TEXT,
						subscription_tier TEXT DEFAULT 'free' CHECK(subscription_tier IN ('free', 'pro')),
						stripe_customer_id TEXT,
						stripe_subscription_id TEXT,
						created_at INTEGER NOT NULL,
						last_login_at INTEGER
					)`,
					`CREATE TABLE IF NOT EXISTS Dockets (
						id INTEGER PRIMARY KEY AUTOINCREMENT,
						docket_number TEXT NOT NULL UNIQUE,
						title TEXT,
						bureau TEXT,
						description TEXT,
						status TEXT,
						created_at INTEGER NOT NULL
					)`,
					`CREATE TABLE IF NOT EXISTS UserDocketSubscriptions (
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
					)`,
					`CREATE TABLE IF NOT EXISTS Filings (
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
					)`,
					`CREATE TABLE IF NOT EXISTS AdminUsers (
						id INTEGER PRIMARY KEY AUTOINCREMENT,
						user_id TEXT NOT NULL UNIQUE,
						role TEXT DEFAULT 'admin',
						created_at INTEGER NOT NULL,
						FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
					)`,
					`CREATE TABLE IF NOT EXISTS DocketKeywords (
						id INTEGER PRIMARY KEY AUTOINCREMENT,
						docket_id INTEGER NOT NULL,
						keyword TEXT NOT NULL,
						relevance_score INTEGER DEFAULT 1,
						FOREIGN KEY (docket_id) REFERENCES Dockets(id),
						UNIQUE(docket_id, keyword)
					)`,
					`CREATE INDEX IF NOT EXISTS idx_filings_docket_filed ON Filings(docket_id, filed_at DESC)`,
					`CREATE INDEX IF NOT EXISTS idx_subscriptions_user_active ON UserDocketSubscriptions(user_id, is_active)`,
					`CREATE INDEX IF NOT EXISTS idx_filings_processing_status ON Filings(processing_status, fetched_at)`,
					`CREATE INDEX IF NOT EXISTS idx_users_google_id ON Users(google_id)`,
					`CREATE INDEX IF NOT EXISTS idx_users_email ON Users(email)`,
					`CREATE INDEX IF NOT EXISTS idx_docket_keywords_keyword ON DocketKeywords(keyword)`
				];

				// Execute each statement individually
				for (const sql of migrationStatements) {
					const stmt = this.db.prepare(sql);
					await stmt.run();
				}

				// Record the migration
				const recordStmt = this.db.prepare(`
					INSERT INTO _migrations (migration_name, applied_at)
					VALUES (?, ?)
				`);
				await recordStmt.bind('001_initial', Date.now()).run();

				console.log('Initial migration completed successfully');
			}

			return true;
		} catch (error) {
			console.error('Migration failed:', error);
			return false;
		}
	}

	// Utility Methods
	async healthCheck() {
		try {
			const result = await this.db.prepare('SELECT 1 as health').first();
			return result?.health === 1;
		} catch (error) {
			console.error('Database health check failed:', error);
			return false;
		}
	}

	async getUserDocketSubscription(userId, docketNumber) {
		const stmt = this.db.prepare(`
			SELECT uds.* FROM UserDocketSubscriptions uds
			JOIN Dockets d ON uds.docket_id = d.id
			WHERE uds.user_id = ? AND d.docket_number = ?
		`);
		return await stmt.bind(userId, docketNumber).first();
	}

	async getSubscriptionById(subscriptionId) {
		const stmt = this.db.prepare('SELECT * FROM UserDocketSubscriptions WHERE id = ?');
		return await stmt.bind(subscriptionId).first();
	}

	async removeSubscription(subscriptionId) {
		const stmt = this.db.prepare('DELETE FROM UserDocketSubscriptions WHERE id = ?');
		return await stmt.bind(subscriptionId).run();
	}

	// Additional methods for ingestion worker (for future use)
	async getActiveDockets() {
		const stmt = this.db.prepare(`
			SELECT DISTINCT d.* FROM Dockets d
			JOIN UserDocketSubscriptions uds ON d.id = uds.docket_id
			WHERE uds.is_active = 1
		`);
		const result = await stmt.all();
		return result.results || [];
	}

	async getLatestFilingDate(docketNumber) {
		const stmt = this.db.prepare(`
			SELECT MAX(filed_at) as latest FROM Filings f
			JOIN Dockets d ON f.docket_id = d.id
			WHERE d.docket_number = ?
		`);
		const result = await stmt.bind(docketNumber).first();
		return result?.latest;
	}

	async getFilingById(fccFilingId) {
		const stmt = this.db.prepare('SELECT * FROM Filings WHERE fcc_filing_id = ?');
		return await stmt.bind(fccFilingId).first();
	}

	async createFiling(filingData) {
		const stmt = this.db.prepare(`
			INSERT INTO Filings (
				fcc_filing_id, docket_id, title, author, author_organization,
				filing_url, document_urls, filed_at, fetched_at, summary,
				summary_generated_at, processing_status
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`);

		return await stmt.bind(
			filingData.fcc_filing_id,
			filingData.docket_id,
			filingData.title,
			filingData.author,
			filingData.author_organization,
			filingData.filing_url,
			filingData.document_urls,
			filingData.filed_at,
			filingData.fetched_at,
			filingData.summary,
			filingData.summary_generated_at,
			filingData.processing_status
		).run();
	}
}

// User management
export async function createUser(db, userData) {
	const { id, email, google_id, name, avatar_url } = userData;
	
	const stmt = db.prepare(`
		INSERT INTO Users (id, email, google_id, name, avatar_url, created_at, last_login_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(email) DO UPDATE SET
			last_login_at = ?,
			name = COALESCE(?, name),
			avatar_url = COALESCE(?, avatar_url)
	`);
	
	const now = Date.now();
	return await stmt.bind(id, email, google_id, name, avatar_url, now, now, now, name, avatar_url).run();
}

export async function getUserById(db, userId) {
	const stmt = db.prepare('SELECT * FROM Users WHERE id = ?');
	return await stmt.bind(userId).first();
}

export async function getUserByEmail(db, email) {
	const stmt = db.prepare('SELECT * FROM Users WHERE email = ?');
	return await stmt.bind(email).first();
}

// Docket management
export async function createDocket(db, docketData) {
	const { docket_number, title, bureau, description, status } = docketData;
	
	const stmt = db.prepare(`
		INSERT INTO Dockets (docket_number, title, bureau, description, status, created_at)
		VALUES (?, ?, ?, ?, ?, ?)
		ON CONFLICT(docket_number) DO UPDATE SET
			title = COALESCE(?, title),
			bureau = COALESCE(?, bureau),
			description = COALESCE(?, description),
			status = COALESCE(?, status)
	`);
	
	const now = Date.now();
	return await stmt.bind(
		docket_number, title, bureau, description, status, now,
		title, bureau, description, status
	).run();
}

export async function getDocketByNumber(db, docketNumber) {
	const stmt = db.prepare('SELECT * FROM Dockets WHERE docket_number = ?');
	return await stmt.bind(docketNumber).first();
}

export async function searchDockets(db, query) {
	const stmt = db.prepare(`
		SELECT d.*, dk.keyword
		FROM Dockets d
		LEFT JOIN DocketKeywords dk ON d.id = dk.docket_id
		WHERE d.docket_number LIKE ? 
		   OR d.title LIKE ? 
		   OR d.description LIKE ?
		   OR dk.keyword LIKE ?
		GROUP BY d.id
		ORDER BY d.created_at DESC
		LIMIT 20
	`);
	
	const searchTerm = `%${query}%`;
	return await stmt.bind(searchTerm, searchTerm, searchTerm, searchTerm).all();
}

// User subscriptions
export async function subscribeUserToDocket(db, userId, docketId, frequency = 'daily') {
	const stmt = db.prepare(`
		INSERT INTO UserDocketSubscriptions (user_id, docket_id, notification_frequency, created_at)
		VALUES (?, ?, ?, ?)
		ON CONFLICT(user_id, docket_id) DO UPDATE SET
			is_active = TRUE,
			notification_frequency = ?
	`);
	
	const now = Date.now();
	return await stmt.bind(userId, docketId, frequency, now, frequency).run();
}

export async function getUserSubscriptions(db, userId) {
	const stmt = db.prepare(`
		SELECT uds.*, d.docket_number, d.title, d.bureau
		FROM UserDocketSubscriptions uds
		JOIN Dockets d ON uds.docket_id = d.id
		WHERE uds.user_id = ? AND uds.is_active = TRUE
		ORDER BY uds.created_at DESC
	`);
	
	return await stmt.bind(userId).all();
}

export async function unsubscribeUserFromDocket(db, userId, docketId) {
	const stmt = db.prepare(`
		UPDATE UserDocketSubscriptions 
		SET is_active = FALSE 
		WHERE user_id = ? AND docket_id = ?
	`);
	
	return await stmt.bind(userId, docketId).run();
}

// Filing management
export async function createFiling(db, filingData) {
	const { 
		fcc_filing_id, docket_id, title, author, author_organization,
		filing_url, document_urls, filed_at, summary, processing_status 
	} = filingData;
	
	const stmt = db.prepare(`
		INSERT INTO Filings (
			fcc_filing_id, docket_id, title, author, author_organization,
			filing_url, document_urls, filed_at, fetched_at, summary,
			processing_status
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(fcc_filing_id) DO UPDATE SET
			summary = COALESCE(?, summary),
			processing_status = ?
	`);
	
	const now = Date.now();
	const documentUrlsJson = JSON.stringify(document_urls || []);
	
	return await stmt.bind(
		fcc_filing_id, docket_id, title, author, author_organization,
		filing_url, documentUrlsJson, filed_at, now, summary, processing_status,
		summary, processing_status
	).run();
}

export async function getFilingsByDocket(db, docketId, limit = 50) {
	const stmt = db.prepare(`
		SELECT * FROM Filings 
		WHERE docket_id = ? 
		ORDER BY filed_at DESC 
		LIMIT ?
	`);
	
	return await stmt.bind(docketId, limit).all();
}

export async function getPendingFilingsForProcessing(db, limit = 100) {
	const stmt = db.prepare(`
		SELECT * FROM Filings 
		WHERE processing_status = 'pending' 
		ORDER BY fetched_at ASC 
		LIMIT ?
	`);
	
	return await stmt.bind(limit).all();
}

// Admin functions
export async function isUserAdmin(db, userId) {
	const stmt = db.prepare('SELECT 1 FROM AdminUsers WHERE user_id = ?');
	const result = await stmt.bind(userId).first();
	return !!result;
}

export async function getSystemStats(db) {
	const userCount = await db.prepare('SELECT COUNT(*) as count FROM Users').first();
	const docketCount = await db.prepare('SELECT COUNT(*) as count FROM Dockets').first();
	const subscriptionCount = await db.prepare('SELECT COUNT(*) as count FROM UserDocketSubscriptions WHERE is_active = TRUE').first();
	const filingCount = await db.prepare('SELECT COUNT(*) as count FROM Filings').first();
	
	return {
		users: userCount.count,
		dockets: docketCount.count,
		subscriptions: subscriptionCount.count,
		filings: filingCount.count
	};
}

// Mock database for development
class MockDatabase {
	prepare(query) {
		console.log('Mock DB Query:', query);
		return new MockStatement(query);
	}
}

class MockStatement {
	constructor(query) {
		this.query = query;
		this.params = [];
	}

	bind(...params) {
		console.log('Mock DB Bind:', params);
		this.params = params;
		return this;
	}

	async run() {
		console.log('Mock DB Run');
		return { 
			success: true, 
			meta: { last_row_id: Math.floor(Math.random() * 1000) } 
		};
	}

	async first() {
		console.log('Mock DB First');
		
		// Mock user data for development
		if (this.query.includes('SELECT * FROM Users WHERE id = ?')) {
			return {
				id: this.params[0],
				email: 'dev@example.com',
				google_id: 'mock_google_id',
				name: 'Development User',
				avatar_url: 'https://example.com/avatar.jpg',
				subscription_tier: 'free', // This is the key field that was missing!
				stripe_customer_id: null,
				created_at: Date.now(),
				last_login_at: Date.now()
			};
		}
		
		// Mock docket data
		if (this.query.includes('SELECT * FROM Dockets WHERE docket_number = ?')) {
			return {
				id: Math.floor(Math.random() * 1000),
				docket_number: this.params[0],
				title: `Mock Docket ${this.params[0]}`,
				bureau: 'Mock Bureau',
				description: 'Mock docket for development',
				status: 'active',
				created_at: Date.now()
			};
		}
		
		return null;
	}

	async all() {
		console.log('Mock DB All');
		return { results: [] };
	}
} 