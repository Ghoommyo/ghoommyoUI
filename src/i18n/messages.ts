import { app } from './messages/app';
import { auth } from './messages/auth';
import { booking } from './messages/booking';
import { common } from './messages/common';
import { dashboard } from './messages/dashboard';
import { menu } from './messages/menu';
import { panels } from './messages/panels';
import { profile } from './messages/profile';
import { screens } from './messages/screens';
import { settings } from './messages/settings';
import { shared } from './messages/shared';

/**
 * Every message, by key. The files in messages/ are the website's (ghoomo repo, app/i18n/messages),
 * copied so both say the same thing; app.ts holds the app's own. Change a shared one in both repos.
 */
export const MESSAGES = {
  ...shared,
  ...common,
  ...menu,
  ...booking,
  ...panels,
  ...auth,
  ...dashboard,
  ...settings,
  ...profile,
  ...screens,
  ...app,
};

export type MessageKey = keyof typeof MESSAGES;
