export interface ConsentState {
  analytics: boolean;
  ads: boolean;
}

export const STORAGE_KEY = 'kloopik.consent.v1';

export const DEFAULT_DENIED: ConsentState = { analytics: false, ads: false };
export const ACCEPT_ALL: ConsentState = { analytics: true, ads: true };
export const REJECT_ALL: ConsentState = { analytics: false, ads: false };

function isConsentState(value: unknown): value is ConsentState {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ConsentState).analytics === 'boolean' &&
    typeof (value as ConsentState).ads === 'boolean'
  );
}

export function loadConsent(): ConsentState | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isConsentState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveConsent(state: ConsentState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

type GrantValue = 'granted' | 'denied';
export interface GtagConsentUpdate {
  analytics_storage: GrantValue;
  ad_storage: GrantValue;
  ad_user_data: GrantValue;
  ad_personalization: GrantValue;
}

export function toGtagConsentUpdate(state: ConsentState): GtagConsentUpdate {
  const a: GrantValue = state.analytics ? 'granted' : 'denied';
  const b: GrantValue = state.ads ? 'granted' : 'denied';
  return {
    analytics_storage: a,
    ad_storage: b,
    ad_user_data: b,
    ad_personalization: b,
  };
}
