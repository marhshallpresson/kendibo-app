/**
 * KENDIBO Date & Time Utilities
 * Timezone Policy:
 * - Data persisted in UTC ISO 8601 strings.
 * - Display formatted in West Africa Time (WAT, UTC+1).
 */

const WAT_TIMEZONE = 'Africa/Lagos';

/**
 * Parses date input into a valid Date object
 */
function parseDate(input: string | Date): Date {
  return typeof input === 'string' ? new Date(input) : input;
}

/**
 * Formats a date string or object to WAT date display (e.g., "12 Oct 2026")
 */
export function formatDateWAT(input: string | Date): string {
  try {
    const d = parseDate(input);
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: WAT_TIMEZONE,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return '';
  }
}

/**
 * Formats a date to full readable WAT format (e.g., "Monday, 12 October 2026")
 */
export function formatFullDateWAT(input: string | Date): string {
  try {
    const d = parseDate(input);
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: WAT_TIMEZONE,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
  } catch {
    return '';
  }
}

/**
 * Formats a date string or object to WAT time display (e.g., "10:30 AM")
 */
export function formatTimeWAT(input: string | Date): string {
  try {
    const d = parseDate(input);
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-US', {
      timeZone: WAT_TIMEZONE,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return '';
  }
}

/**
 * Formats a date to combined WAT date and time (e.g., "12 Oct 2026, 10:30 AM")
 */
export function formatDateTimeWAT(input: string | Date): string {
  try {
    const d = parseDate(input);
    if (isNaN(d.getTime())) return '';
    return `${formatDateWAT(d)}, ${formatTimeWAT(d)}`;
  } catch {
    return '';
  }
}

/**
 * Formats a relative timestamp (e.g. "Just now", "5 mins ago", "Yesterday")
 */
export function formatRelativeWAT(input: string | Date): string {
  try {
    const d = parseDate(input);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return formatDateWAT(d);
  } catch {
    return '';
  }
}

/**
 * Checks if a date falls on today in WAT timezone
 */
export function isTodayWAT(input: string | Date): boolean {
  try {
    const d = parseDate(input);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    return formatDateWAT(d) === formatDateWAT(now);
  } catch {
    return false;
  }
}
