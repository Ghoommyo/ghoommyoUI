import type { Booking, DateKey } from '@/types/domain';

/** Line the server puts between a booking's description and each message the customer adds. */
export const MESSAGE_SEPARATOR = '=====';

/** The original description and the messages added later, in order. */
export function descriptionParts(description: string): string[] {
  return description
    .split(`\n${MESSAGE_SEPARATOR}\n`)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Customers can change pending/accepted bookings for today or later. */
export function canEditBooking(booking: Booking, today: DateKey): boolean {
  return (booking.status === 'pending' || booking.status === 'accepted') && booking.slotStart.slice(0, 10) >= today;
}

/** Customers can rate any accepted booking, past or upcoming. */
export function canRateBooking(booking: Booking): boolean {
  return booking.status === 'accepted';
}
