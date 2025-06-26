import { json } from '@sveltejs/kit'

export async function GET({ platform, locals }) {
  console.log('Testing database connection...')
  
  try {
    // Test 1: Basic database connection
    const dbTest = await platform.env.DB.prepare('SELECT 1 as test').first()
    console.log('Database connection test:', dbTest)
    
    // Test 2: Check if Users table exists
    const userCount = await platform.env.DB.prepare('SELECT COUNT(*) as count FROM Users').first()
    console.log('Users table test:', userCount)
    
    // Test 3: Get current session user (if authenticated)
    const session = await locals.getSession()
    console.log('Session test:', session?.user?.email || 'No session')
    
    return json({
      status: 'success',
      database: dbTest ? 'connected' : 'failed',
      userTable: userCount ? `${userCount.count} users` : 'table missing',
      currentUser: session?.user?.email || 'not authenticated',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Database test failed:', error)
    return json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 