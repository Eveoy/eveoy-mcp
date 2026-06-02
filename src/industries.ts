/**
 * Public industry sectors served by Eveoy.
 * Source: eveoy.com "23+ sectors" list (§2 of the about-eveoy KB, public-reconciled).
 * Used both as a closed enum on input schemas and as a public resource.
 */
export const INDUSTRIES_PUBLIC = [
  'Specialty Retail',
  'Apparel',
  'Footwear',
  'Health and Beauty',
  'Food and Beverage',
  'Health and Wellness',
  'Pet Care',
  'Personal Care',
  'Baby Care',
  'Department Stores',
  'Discount Stores',
  'Grocery and Food',
  'Home Goods',
  'Quick-Service Restaurants',
  'Hospitality',
  'Other B2C',
] as const;

export type IndustryPublic = (typeof INDUSTRIES_PUBLIC)[number];
