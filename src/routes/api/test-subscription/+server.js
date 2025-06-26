import { json } from '@sveltejs/kit'

export async function GET({ platform }) {
  console.log('Testing subscription save...')
  
  try {
    const db = platform.env.DB
    
    // Step 1: Create test user (since we have 0 users)
    const testUserId = 'test-user-123'
    const testEmail = 'test@docketcc.com'
    
    await db.prepare(`
      INSERT OR REPLACE INTO Users (id, email, google_id, name, created_at, last_login_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(testUserId, testEmail, 'google-test-123', 'Test User', Date.now(), Date.now()).run()
    
    console.log('Test user created')
    
    // Step 2: Create test docket
    const testDocketNumber = '17-108'
    const testDocketTitle = 'Net Neutrality Test Docket'
    
    await db.prepare(`
      INSERT OR REPLACE INTO Dockets (docket_number, title, bureau, description, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(testDocketNumber, testDocketTitle, 'Test Bureau', 'Test docket for subscription', Date.now()).run()
    
    console.log('Test docket created')
    
    // Step 3: Create subscription
    await db.prepare(`
      INSERT OR REPLACE INTO UserDocketSubscriptions 
      (user_id, docket_id, notification_frequency, is_active, created_at)
      SELECT ?, d.id, 'daily', true, ?
      FROM Dockets d WHERE d.docket_number = ?
    `).bind(testUserId, Date.now(), testDocketNumber).run()
    
    console.log('Test subscription created')
    
    // Step 4: Verify subscription exists
    const subscription = await db.prepare(`
      SELECT u.email, d.docket_number, d.title, uds.notification_frequency
      FROM UserDocketSubscriptions uds
      JOIN Users u ON uds.user_id = u.id  
      JOIN Dockets d ON uds.docket_id = d.id
      WHERE u.id = ?
    `).bind(testUserId).first()
    
    console.log('Subscription verification:', subscription)
    
    return json({
      status: 'success',
      message: 'Subscription created and verified',
      subscription: subscription,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Subscription test failed:', error)
    return json({
      status: 'error', 
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 