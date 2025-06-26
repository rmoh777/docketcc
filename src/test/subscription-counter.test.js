import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import DashboardPage from '../routes/dashboard/+page.svelte';

describe('Subscription Counter Display', () => {
  const mockUserData = {
    user: {
      id: 'test-user',
      name: 'Test User',
      email: 'test@example.com',
      subscription_tier: 'free'
    }
  };

  it('should display clean subscription count without fraction for free tier', () => {
    const { getByText } = render(DashboardPage, {
      props: { data: mockUserData }
    });
    
    // Test main stats counter - should show "0 (Free)" not "0 / 1 (Free)"
    const activeSubscriptionsText = getByText(/Active Subscriptions/);
    expect(activeSubscriptionsText).toBeTruthy();
    
    // Should not contain fraction display
    const pageText = document.body.textContent;
    expect(pageText).not.toMatch(/0\s*\/\s*1/);
    expect(pageText).not.toMatch(/\d+\s*\/\s*\d+/);
  });

  it('should display clean subscription count in header section', () => {
    const { container } = render(DashboardPage, {
      props: { data: mockUserData }
    });
    
    // Test "Your Subscriptions" header - should show "(0) (Free Tier)" not "(0) / 1 (Free Tier)"
    const subscriptionsHeader = container.querySelector('h3');
    if (subscriptionsHeader && subscriptionsHeader.textContent.includes('Your Subscriptions')) {
      expect(subscriptionsHeader.textContent).not.toMatch(/\/\s*\d+/);
      expect(subscriptionsHeader.textContent).toMatch(/\(\d+\)/); // Should have count in parentheses
    }
  });

  it('should handle pro tier subscription display correctly', () => {
    const proUserData = {
      ...mockUserData,
      user: {
        ...mockUserData.user,
        subscription_tier: 'pro'
      }
    };

    const { container } = render(DashboardPage, {
      props: { data: proUserData }
    });
    
    const pageText = document.body.textContent;
    
    // Pro users should not see fraction display either
    expect(pageText).not.toMatch(/\/\s*999/);
    expect(pageText).not.toMatch(/\/\s*∞/);
    
    // Should show PRO badge
    expect(pageText).toMatch(/PRO/i);
  });

  it('should not render maxSubscriptions in template', () => {
    const { container } = render(DashboardPage, {
      props: { data: mockUserData }
    });
    
    // Check that no elements contain maxSubscriptions variable rendering
    const allElements = container.querySelectorAll('*');
    for (const element of allElements) {
      if (element.textContent) {
        expect(element.textContent).not.toMatch(/stats\.maxSubscriptions/);
        expect(element.textContent).not.toMatch(/maxSubscriptions/);
      }
    }
  });

  it('should maintain proper accessibility for screen readers', () => {
    const { container } = render(DashboardPage, {
      props: { data: mockUserData }
    });
    
    // Check that subscription counter maintains semantic meaning
    const dtElements = container.querySelectorAll('dt');
    const subscriptionLabel = Array.from(dtElements).find(
      dt => dt.textContent?.includes('Active Subscriptions')
    );
    
    expect(subscriptionLabel).toBeTruthy();
    
    if (subscriptionLabel) {
      const ddElement = subscriptionLabel.nextElementSibling;
      expect(ddElement?.tagName).toBe('DD');
      expect(ddElement?.textContent).not.toMatch(/\/\s*\d+/);
    }
  });
}); 