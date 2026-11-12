export interface InventoryMenuDish {
  id: string;
  name: string;
  price: number;
  category_id?: string;
  is_available: boolean;
}

interface RawMenuItem {
  id?: unknown;
  name?: unknown;
  price?: unknown;
  category_id?: unknown;
  is_available?: unknown;
}

interface RawCategory {
  menu_items?: unknown;
}

interface RawMenuResponse {
  items?: unknown;
  categories?: unknown;
}

function normalizeMenuItem(raw: RawMenuItem): InventoryMenuDish | null {
  if (!raw || typeof raw.id !== "string" || !raw.id.trim() || typeof raw.name !== "string") {
    return null;
  }

  const parsedPrice = Number(raw.price);

  return {
    id: raw.id,
    name: raw.name,
    price: Number.isFinite(parsedPrice) ? parsedPrice : 0,
    ...(typeof raw.category_id === "string" ? { category_id: raw.category_id } : {}),
    is_available: typeof raw.is_available === "boolean" ? raw.is_available : true,
  };
}

/**
 * Extracts and deduplicates menu dishes from `/api/client/restaurant/menu` responses.
 * Supports both the flat `{ items: [...] }` shape and nested `{ categories: [{ menu_items: [...] }] }`.
 */
export function extractMenuItemsFromResponse(menuData: unknown): InventoryMenuDish[] {
  if (!menuData || typeof menuData !== "object") {
    return [];
  }

  const payload = menuData as RawMenuResponse;
  const seenIds = new Set<string>();
  const result: InventoryMenuDish[] = [];

  const appendRawItems = (rawList: unknown) => {
    if (!Array.isArray(rawList)) return;
    for (const entry of rawList) {
      const normalized = normalizeMenuItem(entry as RawMenuItem);
      if (normalized && !seenIds.has(normalized.id)) {
        seenIds.add(normalized.id);
        result.push(normalized);
      }
    }
  };

  appendRawItems(payload.items);

  if (Array.isArray(payload.categories)) {
    for (const cat of payload.categories) {
      if (cat && typeof cat === "object") {
        appendRawItems((cat as RawCategory).menu_items);
      }
    }
  }

  return result;
}
