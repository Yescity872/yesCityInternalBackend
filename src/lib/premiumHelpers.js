/**
 * Premium helper functions for checking status and managing premium users
 */

/**
 * Check if user has active premium
 * @param {Object} user - User object from database
 * @returns {Boolean} - True if premium is active
 */
export function isPremiumActive(user) {
  if (!user || !user.isPremium || user.isPremium === 'FREE') {
    return false;
  }

  if (!user.premiumExpiryDate) {
    return false;
  }

  return new Date() < new Date(user.premiumExpiryDate);
}

/**
 * Get premium status for user
 * @param {Object} user - User object from database
 * @returns {Object} - Premium status object
 */
export function getPremiumStatus(user) {
  if (!user || !user.isPremium || user.isPremium === 'FREE') {
    return { 
      active: false, 
      type: 'FREE',
      daysRemaining: 0
    };
  }

  const now = new Date();
  const expiryDate = new Date(user.premiumExpiryDate);
  const isActive = expiryDate > now;
  
  // Calculate days remaining
  const daysRemaining = Math.max(0, Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24)));
  
  return {
    active: isActive,
    type: user.isPremium,
    startDate: user.premiumStartDate,
    expiryDate: user.premiumExpiryDate,
    daysRemaining
  };
}

/**
 * Premium pricing constants
 */
export const PREMIUM_PRICING = {
  A: 499,   // Gold - 3 Months - ₹499
  B: 999    // Diamond - 6 Months - ₹999
};

/**
 * Premium duration in months
 */
export const PREMIUM_DURATION = {
  A: 3,     // 3 months
  B: 6      // 6 months
};

/**
 * Premium type names
 */
export const PREMIUM_NAMES = {
  FREE: 'Free',
  A: 'Gold (3 Months)',
  B: 'Diamond (6 Months)'
};

