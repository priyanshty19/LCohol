-- Replace the vague legacy "Three Premium Gins" recipe line with the three
-- actual gins supplied by the editorial source. The block is deliberately
-- idempotent: after the umbrella row is replaced, a second run is a no-op.
DO $$
DECLARE
  target_cocktail_id uuid;
  umbrella_row_id uuid;
  umbrella_sort_order integer;
  stranger_id uuid;
  hapusa_id uuid;
  greater_than_id uuid;
BEGIN
  SELECT cc.id, ci.id, ci.sort_order
  INTO target_cocktail_id, umbrella_row_id, umbrella_sort_order
  FROM cocktail_creations cc
  JOIN cocktail_ingredients ci ON ci.cocktail_id = cc.id
  JOIN ingredients i ON i.id = ci.ingredient_id
  WHERE cc.slug = '3-gin-vesper-martini'
    AND i.slug = 'three-premium-gins'
  LIMIT 1;

  IF umbrella_row_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO ingredients (id, name, slug, category)
  VALUES
    (gen_random_uuid(), 'Stranger & Sons Gin', 'stranger-and-sons-gin', 'SPIRIT'),
    (gen_random_uuid(), 'Hapusa Himalayan Dry Gin', 'hapusa-himalayan-dry-gin', 'SPIRIT'),
    (gen_random_uuid(), 'Greater Than London Dry Gin', 'greater-than-london-dry-gin', 'SPIRIT')
  ON CONFLICT DO NOTHING;

  SELECT id INTO stranger_id FROM ingredients WHERE slug = 'stranger-and-sons-gin';
  SELECT id INTO hapusa_id FROM ingredients WHERE slug = 'hapusa-himalayan-dry-gin';
  SELECT id INTO greater_than_id FROM ingredients WHERE slug = 'greater-than-london-dry-gin';

  -- Make room directly after the original umbrella line for the two additional
  -- named gins, preserving Lillet and saline in their original relative order.
  UPDATE cocktail_ingredients
  SET sort_order = sort_order + 2
  WHERE cocktail_id = target_cocktail_id
    AND sort_order > umbrella_sort_order;

  UPDATE cocktail_ingredients
  SET ingredient_id = stranger_id
  WHERE id = umbrella_row_id;

  INSERT INTO cocktail_ingredients (id, cocktail_id, ingredient_id, sort_order)
  VALUES
    (gen_random_uuid(), target_cocktail_id, hapusa_id, umbrella_sort_order + 1),
    (gen_random_uuid(), target_cocktail_id, greater_than_id, umbrella_sort_order + 2);
END
$$;
