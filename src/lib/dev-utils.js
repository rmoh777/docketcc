// Development mode utilities - bypasses OAuth for local testing
export function isDevelopmentMode() {
  return import.meta.env.DEV || process.env.NODE_ENV === 'development';
}

export function getDevUser() {
  if (!isDevelopmentMode()) {
    throw new Error('Dev user only available in development');
  }
  
  return {
    id: 'dev-user-12345',
    email: 'dev@example.com',
    name: 'Dev User',
    google_id: 'dev-user-12345',
    subscription_tier: 'free',
    avatar_url: 'https://via.placeholder.com/150'
  };
}

// Check if request is in dev mode
export function isDevModeRequest(url) {
  return isDevelopmentMode() && url.searchParams.get('dev') === 'true';
}

// Get user for API calls - dev mode or real auth
export async function getUserForAPI(locals, platform, url) {
  // Development mode bypass
  if (isDevModeRequest(url)) {
    console.log('🚧 DEV MODE: Using dev user');
    return getDevUser();
  }
  
  // Production mode - require real auth
  const session = await locals.auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }
  
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    google_id: session.user.google_id || session.user.id,
    subscription_tier: 'free', // Default for now
    avatar_url: session.user.image
  };
} 