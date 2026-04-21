import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_DENIED,
  ACCEPT_ALL,
  REJECT_ALL,
  loadConsent,
  saveConsent,
  toGtagConsentUpdate,
  STORAGE_KEY,
} from '../../src/lib/consent';

describe('consent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('DEFAULT_DENIED', () => {
    it('denies both analytics and ads', () => {
      expect(DEFAULT_DENIED).toEqual({ analytics: false, ads: false });
    });
  });

  describe('ACCEPT_ALL / REJECT_ALL', () => {
    it('ACCEPT_ALL grants both', () => {
      expect(ACCEPT_ALL).toEqual({ analytics: true, ads: true });
    });

    it('REJECT_ALL denies both', () => {
      expect(REJECT_ALL).toEqual({ analytics: false, ads: false });
    });
  });

  describe('loadConsent', () => {
    it('returns null when nothing is stored', () => {
      expect(loadConsent()).toBeNull();
    });

    it('returns the stored state', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ analytics: true, ads: true }));
      expect(loadConsent()).toEqual({ analytics: true, ads: true });
    });

    it('returns null when stored value is malformed JSON', () => {
      localStorage.setItem(STORAGE_KEY, '{not-json');
      expect(loadConsent()).toBeNull();
    });

    it('returns null when stored shape is invalid', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: 'bar' }));
      expect(loadConsent()).toBeNull();
    });
  });

  describe('saveConsent', () => {
    it('persists the state as JSON', () => {
      saveConsent(ACCEPT_ALL);
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(ACCEPT_ALL);
    });

    it('round-trips via loadConsent', () => {
      saveConsent(REJECT_ALL);
      expect(loadConsent()).toEqual(REJECT_ALL);
    });
  });

  describe('toGtagConsentUpdate', () => {
    it('maps accept state to granted GA + Ads storage', () => {
      expect(toGtagConsentUpdate(ACCEPT_ALL)).toEqual({
        analytics_storage: 'granted',
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted',
      });
    });

    it('maps reject state to denied', () => {
      expect(toGtagConsentUpdate(REJECT_ALL)).toEqual({
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      });
    });

    it('maps mixed state correctly', () => {
      expect(toGtagConsentUpdate({ analytics: true, ads: false })).toEqual({
        analytics_storage: 'granted',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      });
    });
  });
});
