import type { BookedService, ServicePicks, StoreService } from '@/types/domain';

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** `200` → `₹200`, `99.5` → `₹99.5`. */
export const formatPrice = (price: number) => INR.format(price);

/** Picks ↔ the `services` route param, `id:qty,id:qty`. */
export function encodeServices(picks: ServicePicks): string {
  return Object.entries(picks)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => `${id}:${qty}`)
    .join(',');
}

export function parseServices(value: string | null | undefined): ServicePicks {
  const picks: ServicePicks = {};
  for (const part of (value ?? '').split(',')) {
    const [id, qty] = part.split(':');
    const n = Number(qty);
    if (id && Number.isInteger(n) && n > 0) picks[id] = n;
  }
  return picks;
}

export const countServices = (picks: ServicePicks) => Object.values(picks).reduce((sum, qty) => sum + qty, 0);

/** The picked services that still exist, in the store's order, with quantities clamped to their limits. */
export function resolvePicks(
  services: StoreService[],
  picks: ServicePicks,
): (BookedService & { number: number })[] {
  return services.flatMap((service, i) => {
    const qty = Math.min(picks[service.id] ?? 0, service.maxQty);
    return qty > 0 ? [{ number: i + 1, serviceId: service.id, name: service.name, price: service.price, qty }] : [];
  });
}

/**
 * Booking description listing the items by number, e.g. `1. Haircut × 2 — ₹400`, under
 * `Products:` or `Services:` (the store's word for its items).
 */
export function servicesDescription(picked: ReturnType<typeof resolvePicks>, header = 'Products'): string {
  if (picked.length === 0) return '';
  const lines = picked.map(
    (s) => `${s.number}. ${s.name}${s.qty > 1 ? ` × ${s.qty}` : ''} — ${formatPrice(s.price * s.qty)}`,
  );
  const total = picked.reduce((sum, s) => sum + s.price * s.qty, 0);
  return [`${header}:`, ...lines, `Total: ${formatPrice(total)}`].join('\n');
}

/**
 * Swaps the old items block in a description for the new one, keeping what the user typed
 * around it. If they edited the block itself, the new block goes on top instead.
 */
export function replaceServicesBlock(description: string, oldBlock: string, newBlock: string): string {
  if (oldBlock && description.includes(oldBlock)) {
    return description
      .replace(oldBlock, newBlock)
      .replace(/^\s*\n/, '')
      .replace(/\n{3,}/g, '\n\n');
  }
  if (!newBlock) return description;
  return description.trim() ? `${newBlock}\n${description}` : newBlock;
}

const SERVICE_IMAGE_PATTERN = /^https?:\/\/\S+$/;

/** Field errors for a service form; the server applies the same rules. */
export function validateService(input: { name: string; price: string; imageUrl: string; maxQty: string }) {
  const price = Number(input.price);
  return {
    name: input.name.trim() ? undefined : 'Name is required.',
    price:
      input.price.trim() && Number.isFinite(price) && price >= 0 ? undefined : 'Enter a price of 0 or more.',
    imageUrl:
      !input.imageUrl.trim() || SERVICE_IMAGE_PATTERN.test(input.imageUrl.trim())
        ? undefined
        : 'Enter a link starting with https://',
    maxQty:
      !input.maxQty.trim() || (/^\d+$/.test(input.maxQty.trim()) && Number(input.maxQty) >= 1)
        ? undefined
        : 'Leave empty, or enter a whole number of at least 1.',
  };
}
