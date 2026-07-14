CREATE EXTENSION IF NOT EXISTS pg_trgm;

INSERT INTO drink_categories (id, name, slug, description, sort_order)
VALUES (gen_random_uuid(), 'Soft Drinks', 'soft-drinks', 'Alcohol-free drinks and mixers', 10)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO drink_subcategories (id, category_id, name, slug, sort_order)
SELECT gen_random_uuid(), id, 'Cola', 'cola-soft-drinks', 1
FROM drink_categories
WHERE slug = 'soft-drinks'
ON CONFLICT (slug) DO UPDATE SET category_id = EXCLUDED.category_id, name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

INSERT INTO drinks (id, category_id, subcategory_id, name, slug, brand, variant, description, country, abv, price_range, is_verified)
SELECT gen_random_uuid(), category.id, subcategory.id, item.name, item.slug, 'Coca-Cola', item.variant, item.description, 'India', 0, 'BUDGET'::price_range, true
FROM (
  VALUES
    ('Coke', 'coke', 'Original Taste', 'Classic cola, served chilled.'),
    ('Diet Coke', 'diet-coke', 'Diet', 'A lighter cola option, served chilled.')
) AS item(name, slug, variant, description)
CROSS JOIN (SELECT id FROM drink_categories WHERE slug = 'soft-drinks') AS category
CROSS JOIN (SELECT id FROM drink_subcategories WHERE slug = 'cola-soft-drinks') AS subcategory
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  subcategory_id = EXCLUDED.subcategory_id,
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  variant = EXCLUDED.variant,
  description = EXCLUDED.description,
  country = EXCLUDED.country,
  abv = EXCLUDED.abv,
  price_range = EXCLUDED.price_range,
  is_verified = EXCLUDED.is_verified;
