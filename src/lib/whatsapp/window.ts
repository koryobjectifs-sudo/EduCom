/**
 * Logic for managing the WhatsApp 24-hour service window.
 * 
 * According to Meta's policies, a business can only send free-form messages 
 * within 24 hours of the last message received from the user.
 * Outside this window, only approved templates can be sent.
 */

export const SERVICE_WINDOW_HOURS = 24;

/**
 * Calculates the expiration date of the service window.
 * Should be called whenever an INBOUND message is received.
 */
export function calculateWindowExpiration(lastMessageAt: Date = new Date()): Date {
  const expiresAt = new Date(lastMessageAt);
  expiresAt.setHours(expiresAt.getHours() + SERVICE_WINDOW_HOURS);
  return expiresAt;
}

/**
 * Checks if the current time is within the 24h service window.
 * @param windowExpiresAt The expiration date stored on the conversation.
 */
export function isWithinServiceWindow(windowExpiresAt: Date | null): boolean {
  if (!windowExpiresAt) return false;
  return new Date() < windowExpiresAt;
}
