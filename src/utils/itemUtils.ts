/**
 * Safe Array and Entity normalizer utilities
 * Protects the entire application from "filter is not a function",
 * "map is not a function", or "forEach is not a function" when
 * entity.items or entity.permissions are stored as JSON strings or non-arrays.
 */

export function ensureArray<T = any>(val: any): T[] {
  if (val === null || val === undefined) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return [];
    if (
      (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
      (trimmed.startsWith('{') && trimmed.endsWith('}'))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === 'object') return [parsed];
      } catch {
        return [];
      }
    }
    return [];
  }
  return [];
}

/**
 * Normalizes an entity that contains an `items` field (Order, Invoice, DeliveryNote, ReturnNote)
 */
export function normalizeEntityWithItems<T extends { items?: any }>(entity: T): T {
  if (!entity || typeof entity !== 'object') return entity;
  return {
    ...entity,
    items: ensureArray(entity.items),
  };
}
