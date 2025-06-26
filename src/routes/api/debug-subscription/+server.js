import { json } from '@sveltejs/kit'

export async function GET({ platform, locals }) {
  try {
    const debugInfo = {
      hasDB: !!platform?.env?.DB,
      hasPlatform: !!platform,
      hasEnv: !!platform?.env,
      envVars: platform?.env ? Object.keys(platform.env) : [],
      timestamp: new Date().toISOString(),
      deployment: 'production'
    }
    
    // Test database connection
    if (platform?.env?.DB) {
      try {
        const dbTest = await platform.env.DB.prepare('SELECT 1 as test').first()
        debugInfo.dbConnection = dbTest ? 'working' : 'failed'
        
        // Test if tables exist
        try {
          const userCount = await platform.env.DB.prepare('SELECT COUNT(*) as count FROM Users').first()
          debugInfo.usersTable = `${userCount.count} users`
        } catch (e) {
          debugInfo.usersTable = `error: ${e.message}`
        }
        
        try {
          const docketCount = await platform.env.DB.prepare('SELECT COUNT(*) as count FROM Dockets').first()
          debugInfo.docketsTable = `${docketCount.count} dockets`
        } catch (e) {
          debugInfo.docketsTable = `error: ${e.message}`
        }
        
        try {
          const subCount = await platform.env.DB.prepare('SELECT COUNT(*) as count FROM UserDocketSubscriptions').first()
          debugInfo.subscriptionsTable = `${subCount.count} subscriptions`
        } catch (e) {
          debugInfo.subscriptionsTable = `error: ${e.message}`
        }
        
      } catch (dbError) {
        debugInfo.dbConnection = `error: ${dbError.message}`
      }
    } else {
      debugInfo.dbConnection = 'no database available'
    }
    
    // Test authentication
    try {
      const session = await locals.auth?.()
      debugInfo.authSession = session ? 'has session' : 'no session'
      debugInfo.authUser = session?.user ? `user: ${session.user.email}` : 'no user'
    } catch (authError) {
      debugInfo.authSession = `error: ${authError.message}`
    }
    
    return json(debugInfo)
  } catch (error) {
    return json({ 
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString() 
    }, { status: 500 })
  }
} 