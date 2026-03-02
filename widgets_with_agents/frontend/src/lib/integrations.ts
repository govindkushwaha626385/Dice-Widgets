/**
 * Integration config for Gmail, Google Calendar, Google Tasks.
 * Use govindkushwaham6263@gmail.com as primary; user can provide API keys / OAuth later.
 */

const STORAGE_KEY = "widgets_integrations";

export const DEFAULT_EMAIL = "govindkushwaham6263@gmail.com";

export interface IntegrationsConfig {
  gmail?: { email: string; apiKey?: string };
  calendar?: { email: string; apiKey?: string };
  tasks?: { email: string; apiKey?: string };
}

export function getIntegrations(): IntegrationsConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as IntegrationsConfig;
  } catch {
    /* ignore */
  }
  return {
    gmail: { email: DEFAULT_EMAIL },
    calendar: { email: DEFAULT_EMAIL },
    tasks: { email: DEFAULT_EMAIL },
  };
}

export function setIntegrations(config: IntegrationsConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function getDisplayEmail(userEmail?: string | null): string {
  const cfg = getIntegrations();
  return userEmail || cfg.gmail?.email || cfg.calendar?.email || DEFAULT_EMAIL;
}
