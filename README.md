```markdown
# Campus Marketplace — Condition & Category Filter Feature

> **Branch:** `feature/condition-filter`  
> **Team:** Group 5  
> **Framework:** Expo SDK 57 (React Native / TypeScript / Firebase)

An interactive campus marketplace application featuring **Condition Filtering and Multi-Facet Search** to help students quickly locate items by quality and category.

---

## 🌟 Feature Spotlight: Condition & Multi-Facet Filtering

Students looking for items often have specific condition criteria (e.g. looking only for cheap *Used / Good condition* items, or wanting pristine *Brand new* textbooks). This feature introduces dedicated condition filtering alongside category and text search.

### Key Capabilities

- **🏷️ Horizontal Condition Filter Bar:**
  - One-tap pill selection:
    - `All conditions`
    - `Brand new`
    - `Like new`
    - `Good condition`
    - `Fair condition`
- **🎨 Visual Condition Tags:** Color-coded condition badges displayed on listings and detail views.
- **⚡ Real-Time Multi-Facet Search Engine:**
  - Seamlessly combines:
    - **Category Selection** (*Textbooks, Tech, Furniture, Fashion*)
    - **Condition Selection** (*Brand new, Like new, etc.*)
    - **Search Text Query** (title & description matching)
  - Results update instantly without reloading the page.

---

## 🏗 Modular Architecture

```text
src/
├── features/
│   └── condition-filter/
│       ├── components/
│       │   ├── ConditionFilterBar.tsx  # Horizontal scrollable condition pill bar
│       │   └── ConditionTag.tsx        # Color-coded condition pill tag
│       ├── services/
│       │   └── filterService.ts        # Multi-facet filtering engine (category + condition + query)
│       ├── constants.ts                # Available conditions & color theme configurations
│       ├── types.ts                    # TypeScript types (ItemCondition, FilterState)
│       ├── index.ts                    # Barrel export
│       └── README.md                   # Feature documentation
├── pages/
│   └── ExplorePage.tsx                 # ConditionFilterBar rendering & filter state handling
└── App.tsx                             # Multi-filter pipeline binding
