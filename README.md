# Condition Filter & Enhanced Filtering Feature (`src/features/condition-filter`)

This module implements **Condition Filtering & Enhanced Category Search** for the Campus Marketplace project.

## Feature Overview

- **Condition Filter Bar**: Enables users to filter listings by item condition: `All conditions`, `Brand new`, `Like new`, `Good condition`, and `Fair condition`.
- **Condition Tags**: Color-coded condition pill badges rendered across `ListingCard` and `ListingModal`.
- **Multi-Facet Search**: Simultaneously filters by Category + Condition + Search Query.

## File Structure

- `types.ts`: TypeScript contracts for `ItemCondition` and `FilterState`.
- `constants.ts`: Available conditions and condition color palette.
- `components/ConditionTag.tsx`: Styled condition badge.
- `components/ConditionFilterBar.tsx`: Scrollable chip filter bar for selecting condition.
- `services/filterService.ts`: Filter engine combining search text, category, and condition.
- `index.ts`: Barrel export.
