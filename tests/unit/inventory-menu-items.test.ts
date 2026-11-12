import test from "node:test";
import assert from "node:assert/strict";
import { extractMenuItemsFromResponse } from "../../src/components/restaurant-os/inventory/menu-item-parser";

test("extractMenuItemsFromResponse extracts flat items returned by /api/client/restaurant/menu", () => {
  const apiPayload = {
    categories: [
      { id: "cat-1", name: "Starters", display_order: 1, is_active: true },
      { id: "cat-2", name: "Mains", display_order: 2, is_active: true },
    ],
    items: [
      {
        id: "dish-1",
        category_id: "cat-1",
        name: "Paneer Tikka",
        price: 280,
        is_available: true,
      },
      {
        id: "dish-2",
        category_id: "cat-2",
        name: "Dal Makhani",
        price: "320",
        is_available: false,
      },
    ],
  };

  const result = extractMenuItemsFromResponse(apiPayload);
  assert.equal(result.length, 2);
  assert.deepEqual(result[0], {
    id: "dish-1",
    category_id: "cat-1",
    name: "Paneer Tikka",
    price: 280,
    is_available: true,
  });
  assert.deepEqual(result[1], {
    id: "dish-2",
    category_id: "cat-2",
    name: "Dal Makhani",
    price: 320,
    is_available: false,
  });
});

test("extractMenuItemsFromResponse falls back to nested category.menu_items and deduplicates", () => {
  const nestedPayload = {
    categories: [
      {
        id: "cat-1",
        menu_items: [
          { id: "dish-1", name: "Masala Dosa", price: 150, is_available: true },
        ],
      },
    ],
    items: [
      { id: "dish-1", name: "Masala Dosa", price: 150, is_available: true },
    ],
  };

  const result = extractMenuItemsFromResponse(nestedPayload);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "dish-1");
});

test("extractMenuItemsFromResponse handles null, undefined, or malformed payloads safely", () => {
  assert.deepEqual(extractMenuItemsFromResponse(null), []);
  assert.deepEqual(extractMenuItemsFromResponse(undefined), []);
  assert.deepEqual(extractMenuItemsFromResponse({}), []);
});
