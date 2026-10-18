export type ItemCondition =
  | "All conditions"
  | "Brand new"
  | "Like new"
  | "Good condition"
  | "Fair condition";

export interface FilterState {
  category: string;
  condition: ItemCondition;
  query: string;
}
