import { json } from '@sveltejs/kit'

export async function GET({ platform, locals }) {
  console.log('Fetching user subscriptions...')
  
  try {
    const db = platform.env.DB
    
    // For now, use our test user (we'll integrate real auth later)
    const testUserId = 'test-user-123'
    
    // Fetch user's active subscriptions with docket details
    const subscriptions = await db.prepare(`
      SELECT 
        uds.id,
        d.docket_number,
        d.title as docket_title,
        d.description,
        uds.notification_frequency,
        uds.created_at,
        uds.last_notified_at,
        uds.is_active
      FROM UserDocketSubscriptions uds
      JOIN Dockets d ON uds.docket_id = d.id
      WHERE uds.user_id = ? AND uds.is_active = true
      ORDER BY uds.created_at DESC
    `).bind(testUserId).all()
    
    console.log('Found subscriptions:', subscriptions.results?.length || 0)
    
    return json({
      status: 'success',
      subscriptions: subscriptions.results || [],
      count: subscriptions.results?.length || 0,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Failed to fetch subscriptions:', error)
    return json({
      status: 'error',
      error: error.message,
      subscriptions: [],
      count: 0
    }, { status: 500 })
  }
} 