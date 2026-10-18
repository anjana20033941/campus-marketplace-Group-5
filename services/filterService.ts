import { Listing } from "../../../types";
import { ItemCondition } from "../types";

export function filterMarketplaceItems(params: {
  items: Listing[];
  category: string;
  condition: ItemCondition;
  query: string;
}): Listing[] {
  const { items, category, condition, query } = params;
  const cleanQuery = query.toLowerCase().trim();

  return items.filter((item) => {
    // 1. Availability filter (rented items hidden)
    if ((item as any).isAvailable === false) {
      return false;
    }

    // 2. Category filter
    const matchesCategory =
      category === "All items" || item.category.toLowerCase() === category.toLowerCase();

    // 3. Condition filter
    const matchesCondition =
      condition === "All conditions" ||
      item.condition.toLowerCase() === condition.toLowerCase();

    // 4. Text Search query filter (matches title, description, category, or seller)
    const matchesQuery =
      !cleanQuery ||
      item.title.toLowerCase().includes(cleanQuery) ||
      (item.description && item.description.toLowerCase().includes(cleanQuery)) ||
      item.category.toLowerCase().includes(cleanQuery) ||
      item.seller.toLowerCase().includes(cleanQuery);

    return matchesCategory && matchesCondition && matchesQuery;
  });
}
