// src/_data/env.js
module.exports = {
  clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY || '',
  siteUrl: (process.env.SITE_URL || 'https://www.kloopik.com').replace(/\/$/, ''),
};
