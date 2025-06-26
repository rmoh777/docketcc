// Mock database for development mode testing
class MockDatabase {
  constructor() {
    this.subscriptions = new Map();
    this.dockets = new Map();
    this.initializeMockData();
  }
  
  initializeMockData() {
    // Add some test dockets
    this.dockets.set('17-108', {
      id: 1,
      docket_number: '17-108',
      title: 'Restoring Internet Freedom',
      bureau: 'Wireline Competition Bureau'
    });
    this.dockets.set('11-42', {
      id: 2,
      docket_number: '11-42',
      title: 'Lifeline and Link Up Reform and Modernization',
      bureau: 'Wireline Competition Bureau'
    });
  }
  
  async getUserSubscriptions(userId) {
    const userSubs = Array.from(this.subscriptions.values())
      .filter(sub => sub.user_id === userId && sub.is_active);
    
    console.log(`🚧 MOCK DB: Found ${userSubs.length} subscriptions for user ${userId}`);
    return userSubs;
  }
  
  async addDocketSubscription(userId, docketNumber, frequency) {
    // Check for existing subscription
    const existing = Array.from(this.subscriptions.values())
      .find(sub => sub.user_id === userId && sub.docket_number === docketNumber && sub.is_active);
    
    if (existing) {
      throw new Error('Already subscribed to this docket');
    }
    
    // Check subscription limits
    const userSubs = await this.getUserSubscriptions(userId);
    if (userSubs.length >= 1) {
      const error = new Error('Free tier limited to 1 docket');
      error.requiresUpgrade = true;
      throw error;
    }
    
    const subscription = {
      id: Date.now().toString(),
      user_id: userId,
      docket_number: docketNumber,
      title: this.dockets.get(docketNumber)?.title || 'Unknown Docket',
      bureau: this.dockets.get(docketNumber)?.bureau || 'Unknown Bureau',
      notification_frequency: frequency,
      created_at: Date.now(),
      is_active: true
    };
    
    this.subscriptions.set(subscription.id, subscription);
    console.log(`🚧 MOCK DB: Created subscription ${subscription.id}`);
    return { success: true };
  }
  
  async removeDocketSubscription(userId, subscriptionId) {
    const sub = this.subscriptions.get(subscriptionId);
    if (sub && sub.user_id === userId) {
      sub.is_active = false;
      console.log(`🚧 MOCK DB: Removed subscription ${subscriptionId}`);
      return { success: true };
    }
    throw new Error('Subscription not found');
  }
  
  logCurrentState() {
    console.log('🚧 MOCK DB STATE:', {
      subscriptions: Array.from(this.subscriptions.values()),
      dockets: Array.from(this.dockets.values())
    });
  }
}

export const mockDb = new MockDatabase(); 