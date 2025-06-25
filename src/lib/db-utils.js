// Additional Database Utilities
// Common operations and helpers for DocketCC database

/**
 * Seed initial data for development/testing
 */
export async function seedDatabase(db) {
    console.log('Seeding database with initial data...');
    
    try {
        // Insert sample dockets for testing
        const sampleDockets = [
            {
                docket_number: '11-42',
                title: 'Lifeline and Link Up Reform and Modernization',
                bureau: 'Wireline Competition Bureau',
                description: 'Federal universal service support for communications services',
                status: 'active'
            },
            {
                docket_number: '17-108', 
                title: 'Restoring Internet Freedom',
                bureau: 'Wireline Competition Bureau',
                description: 'Net neutrality rules and broadband regulation',
                status: 'closed'
            },
            {
                docket_number: '21-450',
                title: 'Affordable Connectivity Program',
                bureau: 'Wireline Competition Bureau', 
                description: 'Emergency broadband benefit transition',
                status: 'active'
            }
        ];
        
        for (const docket of sampleDockets) {
            await db.prepare(`
                INSERT OR IGNORE INTO Dockets (docket_number, title, bureau, description, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `).bind(
                docket.docket_number,
                docket.title,
                docket.bureau,
                docket.description,
                docket.status,
                Date.now()
            ).run();
        }
        
        // Insert sample keywords
        const keywords = [
            { docket_number: '11-42', keywords: ['lifeline', 'universal service', 'low income', 'broadband access'] },
            { docket_number: '17-108', keywords: ['net neutrality', 'broadband', 'internet freedom', 'open internet'] },
            { docket_number: '21-450', keywords: ['affordable connectivity', 'emergency broadband', 'covid', 'digital divide'] }
        ];
        
        for (const item of keywords) {
            const docket = await db.prepare('SELECT id FROM Dockets WHERE docket_number = ?').bind(item.docket_number).first();
            if (docket) {
                for (const keyword of item.keywords) {
                    await db.prepare(`
                        INSERT OR IGNORE INTO DocketKeywords (docket_id, keyword, relevance_score)
                        VALUES (?, ?, ?)
                    `).bind(docket.id, keyword.toLowerCase(), 10).run();
                }
            }
        }
        
        console.log('Database seeded successfully');
        return { success: true };
        
    } catch (error) {
        console.error('Error seeding database:', error);
        throw error;
    }
}

/**
 * Clean up old data for maintenance
 */
export async function cleanupOldData(db, options = {}) {
    const {
        filingsDaysToKeep = 90,
        userInactiveDaysToKeep = 365,
        deleteInactiveUsers = false
    } = options;
    
    console.log('Starting database cleanup...');
    
    try {
        const results = {};
        
        // Clean old processed filings
        const filingsCutoff = Date.now() - (filingsDaysToKeep * 24 * 60 * 60 * 1000);
        const oldFilings = await db.prepare(`
            DELETE FROM Filings 
            WHERE fetched_at < ? AND processing_status = 'processed'
        `).bind(filingsCutoff).run();
        
        results.deletedFilings = oldFilings.changes;
        
        // Optionally clean inactive users
        if (deleteInactiveUsers) {
            const usersCutoff = Date.now() - (userInactiveDaysToKeep * 24 * 60 * 60 * 1000);
            const inactiveUsers = await db.prepare(`
                DELETE FROM Users 
                WHERE last_login_at < ? AND subscription_tier = 'free'
            `).bind(usersCutoff).run();
            
            results.deletedUsers = inactiveUsers.changes;
        }
        
        console.log(`Cleanup completed: ${results.deletedFilings} filings deleted${results.deletedUsers ? `, ${results.deletedUsers} users deleted` : ''}`);
        return { success: true, results };
        
    } catch (error) {
        console.error('Error during cleanup:', error);
        throw error;
    }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(db) {
    try {
        const stats = {};
        
        // Table row counts
        const tables = ['Users', 'Dockets', 'UserDocketSubscriptions', 'Filings', 'DocketKeywords', 'AdminUsers'];
        
        for (const table of tables) {
            const result = await db.prepare(`SELECT COUNT(*) as count FROM ${table}`).first();
            stats[table.toLowerCase()] = result.count;
        }
        
        // Subscription tier breakdown
        const tiers = await db.prepare(`
            SELECT subscription_tier, COUNT(*) as count 
            FROM Users 
            GROUP BY subscription_tier
        `).all();
        
        stats.subscriptionTiers = {};
        tiers.forEach(tier => {
            stats.subscriptionTiers[tier.subscription_tier] = tier.count;
        });
        
        // Filing status breakdown
        const filingStatus = await db.prepare(`
            SELECT processing_status, COUNT(*) as count 
            FROM Filings 
            GROUP BY processing_status
        `).all();
        
        stats.filingStatus = {};
        filingStatus.forEach(status => {
            stats.filingStatus[status.processing_status] = status.count;
        });
        
        // Most subscribed dockets
        const topDockets = await db.prepare(`
            SELECT d.docket_number, d.title, COUNT(uds.id) as subscriber_count
            FROM Dockets d
            LEFT JOIN UserDocketSubscriptions uds ON d.id = uds.docket_id AND uds.is_active = TRUE
            GROUP BY d.id
            ORDER BY subscriber_count DESC
            LIMIT 10
        `).all();
        
        stats.topDockets = topDockets;
        
        // Recent activity
        const recentFilings = await db.prepare(`
            SELECT COUNT(*) as count
            FROM Filings 
            WHERE fetched_at > ?
        `).bind(Date.now() - 24 * 60 * 60 * 1000).first(); // Last 24 hours
        
        stats.recentFilingsCount = recentFilings.count;
        
        return stats;
        
    } catch (error) {
        console.error('Error getting database stats:', error);
        throw error;
    }
}

/**
 * Backup database data to JSON
 */
export async function exportDatabaseToJSON(db, tables = null) {
    const defaultTables = ['Users', 'Dockets', 'UserDocketSubscriptions', 'Filings', 'DocketKeywords', 'AdminUsers'];
    const tablesToExport = tables || defaultTables;
    
    try {
        const backup = {
            timestamp: Date.now(),
            version: '1.0',
            data: {}
        };
        
        for (const table of tablesToExport) {
            const rows = await db.prepare(`SELECT * FROM ${table}`).all();
            backup.data[table] = rows;
        }
        
        return backup;
        
    } catch (error) {
        console.error('Error exporting database:', error);
        throw error;
    }
}

/**
 * Validate database integrity
 */
export async function validateDatabaseIntegrity(db) {
    try {
        const issues = [];
        
        // Check for orphaned subscriptions
        const orphanedSubs = await db.prepare(`
            SELECT uds.id, uds.user_id, uds.docket_id
            FROM UserDocketSubscriptions uds
            LEFT JOIN Users u ON uds.user_id = u.id
            LEFT JOIN Dockets d ON uds.docket_id = d.id
            WHERE u.id IS NULL OR d.id IS NULL
        `).all();
        
        if (orphanedSubs.length > 0) {
            issues.push({
                type: 'orphaned_subscriptions',
                count: orphanedSubs.length,
                description: 'Subscriptions referencing non-existent users or dockets'
            });
        }
        
        // Check for orphaned filings
        const orphanedFilings = await db.prepare(`
            SELECT f.id, f.docket_id
            FROM Filings f
            LEFT JOIN Dockets d ON f.docket_id = d.id
            WHERE d.id IS NULL
        `).all();
        
        if (orphanedFilings.length > 0) {
            issues.push({
                type: 'orphaned_filings',
                count: orphanedFilings.length,
                description: 'Filings referencing non-existent dockets'
            });
        }
        
        // Check for orphaned keywords
        const orphanedKeywords = await db.prepare(`
            SELECT dk.id, dk.docket_id
            FROM DocketKeywords dk
            LEFT JOIN Dockets d ON dk.docket_id = d.id
            WHERE d.id IS NULL
        `).all();
        
        if (orphanedKeywords.length > 0) {
            issues.push({
                type: 'orphaned_keywords',
                count: orphanedKeywords.length,
                description: 'Keywords referencing non-existent dockets'
            });
        }
        
        return {
            valid: issues.length === 0,
            issues: issues,
            checkedAt: Date.now()
        };
        
    } catch (error) {
        console.error('Error validating database integrity:', error);
        throw error;
    }
} 