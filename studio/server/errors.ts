import type { MessageParams } from '../shared/i18n.js';
export class StudioError extends Error {
  constructor(public status: number, message: string, public params?: MessageParams) { super(message); }
}
