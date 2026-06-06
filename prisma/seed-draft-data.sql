-- ============================================================================
-- SIPSTORIES DRAFT DATA SEED
-- 10 users, 20 posts with Unsplash images, 50+ comments, votes
-- ============================================================================

BEGIN;

-- ============================================================================
-- USERS & PROFILES (10 pseudonymous Indian drinking culture users)
-- ============================================================================

INSERT INTO users (id, auth_id, email, dob, is_verified, created_at, updated_at) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'dev_monk_rum',       'monk@sipstories.dev',      '1995-03-12', true, NOW() - INTERVAL '90 days', NOW()),
  ('a1000000-0000-0000-0000-000000000002', 'dev_bira_queen',     'bira@sipstories.dev',      '1997-08-21', true, NOW() - INTERVAL '85 days', NOW()),
  ('a1000000-0000-0000-0000-000000000003', 'dev_whiskey_walker',  'walker@sipstories.dev',    '1993-01-05', true, NOW() - INTERVAL '75 days', NOW()),
  ('a1000000-0000-0000-0000-000000000004', 'dev_gin_goddess',     'gin@sipstories.dev',       '1996-11-18', true, NOW() - INTERVAL '60 days', NOW()),
  ('a1000000-0000-0000-0000-000000000005', 'dev_kaala_peg',       'kaala@sipstories.dev',     '1994-07-30', true, NOW() - INTERVAL '55 days', NOW()),
  ('a1000000-0000-0000-0000-000000000006', 'dev_wine_auntie',     'wine@sipstories.dev',      '1991-04-14', true, NOW() - INTERVAL '50 days', NOW()),
  ('a1000000-0000-0000-0000-000000000007', 'dev_rum_runner',      'runner@sipstories.dev',    '1998-09-25', true, NOW() - INTERVAL '40 days', NOW()),
  ('a1000000-0000-0000-0000-000000000008', 'dev_desi_bartender',  'bartender@sipstories.dev', '1992-12-08', true, NOW() - INTERVAL '35 days', NOW()),
  ('a1000000-0000-0000-0000-000000000009', 'dev_hoppy_singh',     'hoppy@sipstories.dev',     '1999-02-17', true, NOW() - INTERVAL '25 days', NOW()),
  ('a1000000-0000-0000-0000-000000000010', 'dev_neat_nikhil',     'nikhil@sipstories.dev',    '1990-06-03', true, NOW() - INTERVAL '20 days', NOW());

INSERT INTO profiles (id, user_id, username, display_name, bio, avatar_url, karma, drinking_style, state, city, created_at, updated_at) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'monk_rum',        'The Monk',          'Old Monk devotee since college. If you serve it with Thumbs Up, we can''t be friends.',                                NULL, 2340, 'SOCIAL',       'Maharashtra',  'Mumbai',     NOW() - INTERVAL '90 days', NOW()),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'bira_queen',      'Bira Queen',        'Craft beer explorer. Bira 91 White is my love language. Weekend brewery hopper.',                                     NULL, 1870, 'EXPLORER',     'Karnataka',    'Bengaluru',  NOW() - INTERVAL '85 days', NOW()),
  ('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000003', 'whiskey_walker',   'Whiskey Walker',    'Single malt collector. Amrut Fusion changed my life. Always neat, never sorry.',                                       NULL, 3150, 'CONNOISSEUR',  'Tamil Nadu',   'Chennai',    NOW() - INTERVAL '75 days', NOW()),
  ('b1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000004', 'gin_goddess',      'Gin Goddess',       'G&T is my therapy. Hapusa and Greater Than fan. Making Indian gin cool since 2021.',                                   NULL, 1540, 'MIXOLOGIST',   'Delhi',        'New Delhi',  NOW() - INTERVAL '60 days', NOW()),
  ('b1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000005', 'kaala_peg',        'Kaala Peg',         'The darker the drink, the better the night. Neat whiskey, strong opinions, zero mixers.',                              NULL, 2780, 'SOCIAL',       'Punjab',       'Chandigarh', NOW() - INTERVAL '55 days', NOW()),
  ('b1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000006', 'wine_auntie',      'Wine Auntie',       'Sula Shiraz in one hand, gossip in the other. Nasik vineyards are my happy place.',                                    NULL, 1230, 'CONNOISSEUR',  'Maharashtra',  'Pune',       NOW() - INTERVAL '50 days', NOW()),
  ('b1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000007', 'rum_runner',       'Rum Runner',        'Backpacker vibes. Old Monk in Manali hits different. Collecting bar stories across India.',                             NULL, 980,  'PARTY_ANIMAL', 'Goa',          'Panaji',     NOW() - INTERVAL '40 days', NOW()),
  ('b1000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000008', 'desi_bartender',   'Desi Bartender',    'Professional bartender at a Mumbai speakeasy. I make drinks that make you forget your ex.',                            NULL, 4200, 'MIXOLOGIST',   'Maharashtra',  'Mumbai',     NOW() - INTERVAL '35 days', NOW()),
  ('b1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000009', 'hoppy_singh',      'Hoppy Singh',       'IPA or nothing. Simba Wit for the easy days. Always carrying a bottle opener.',                                        NULL, 670,  'EXPLORER',     'Haryana',      'Gurugram',   NOW() - INTERVAL '25 days', NOW()),
  ('b1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000010', 'neat_nikhil',      'Neat Nikhil',       'Scotch snob. JW Black is the daily, Amrut is the special. Every sip tells a story.',                                   NULL, 3500, 'CONNOISSEUR',  'Telangana',    'Hyderabad',  NOW() - INTERVAL '20 days', NOW());

-- ============================================================================
-- POSTS (20 lively posts with Unsplash images)
-- Unsplash images: free to use, hotlink-friendly
-- ============================================================================

INSERT INTO posts (id, author_id, title, body, image_url, post_type, score, created_at, updated_at) VALUES

-- Post 1: STORY — Old Monk nostalgia
('c1000000-0000-0000-0000-000000000001',
 'a1000000-0000-0000-0000-000000000001',
 'The night Old Monk saved my Goa trip',
 'So there we were, 4 AM at Anjuna beach, our hotel bookings had fallen through, and all we had was a bottle of Old Monk, some Limca, and vibes. A random group of strangers invited us to their bonfire. Six hours later, we had new best friends, a sunrise selfie, and the worst hangover of our lives. Old Monk doesn''t just get you drunk — it gets you family. 10/10 would do again.',
 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
 'STORY', 342, NOW() - INTERVAL '2 days', NOW()),

-- Post 2: REVIEW — Amrut Fusion
('c1000000-0000-0000-0000-000000000002',
 'a1000000-0000-0000-0000-000000000003',
 'Amrut Fusion is genuinely world-class — here''s why',
 'Finally got my hands on a bottle after months of hunting. Poured it neat, let it breathe for 10 minutes. The nose is incredible — tropical fruits, dark chocolate, a whisper of peat. On the palate, it''s rich honey transitioning to spiced oak with a finish that lasts forever. Jim Murray gave it 97/100 and honestly? He was being conservative. This is India''s answer to Macallan and it''s half the price. If you haven''t tried it, you''re sleeping on greatness.',
 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=800&q=80',
 'REVIEW', 567, NOW() - INTERVAL '1 day 6 hours', NOW()),

-- Post 3: QUESTION — Budget whiskey
('c1000000-0000-0000-0000-000000000003',
 'a1000000-0000-0000-0000-000000000005',
 'Best whiskey under 1500 that doesn''t taste like regret?',
 'College is over, salary just started, and I''m done pretending Royal Stag is good. Need something that won''t make me question my life choices at 2 AM. Currently eyeing Blenders Pride Reserve or Black Dog. What''s the move? Neat drinker, no mixers.',
 NULL,
 'QUESTION', 189, NOW() - INTERVAL '3 days', NOW()),

-- Post 4: STORY — Brewery crawl Bangalore
('c1000000-0000-0000-0000-000000000004',
 'a1000000-0000-0000-0000-000000000002',
 'Did a 12-brewery crawl in Koramangala and survived (barely)',
 'Saturday 11 AM to Sunday 3 AM. Started at Toit, ended at... I genuinely don''t remember. My Uber rating dropped from 4.9 to 4.3 in one night. Highlights: the hazelnut stout at Windmills, the Belgian wit at Arbor, and the IPA flight at Brew Top that convinced me I''m an IPA person now. Low point: confidently ordering in Hindi at a place where nobody spoke Hindi. Rating: 11/10, would crawl again.',
 'https://images.unsplash.com/photo-1575037614876-c38a4c44f5b8?w=800&q=80',
 'STORY', 423, NOW() - INTERVAL '4 days', NOW()),

-- Post 5: RECOMMENDATION — G&T setup
('c1000000-0000-0000-0000-000000000005',
 'a1000000-0000-0000-0000-000000000004',
 'The perfect Indian G&T setup for under 2000',
 'Forget imported tonics and fancy garnishes. Here''s what actually works: Greater Than Gin (best value Indian gin, fight me), Svami tonic water (Indian, cheaper than Fever-Tree, just as good), fresh lime from your neighbourhood sabziwala, a sprig of curry leaf (trust me), and a big rock ice cube from those silicone molds on Amazon. Total setup cost: under 2000. Tastes like 5000. You''re welcome.',
 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=800&q=80',
 'RECOMMENDATION', 298, NOW() - INTERVAL '5 hours', NOW()),

-- Post 6: MEME — Kingfisher at weddings
('c1000000-0000-0000-0000-000000000006',
 'a1000000-0000-0000-0000-000000000007',
 'Every Indian wedding bar starter pack',
 'Kingfisher Strong that''s been sitting in the sun since morning. One bottle of Johnny Walker Red that uncle ji is guarding with his life. "Premium" counter that''s just Royal Stag in a different glass. That one cousin who brought his own flask. And the legendary uncle who asks for "soda strong" and proceeds to dance like nobody''s watching. This is peak Indian culture and I wouldn''t change a thing.',
 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80',
 'MEME', 891, NOW() - INTERVAL '6 hours', NOW()),

-- Post 7: REVIEW — Stranger & Sons gin
('c1000000-0000-0000-0000-000000000007',
 'a1000000-0000-0000-0000-000000000004',
 'Stranger & Sons might be the best gin I''ve ever had',
 'Picked this up at duty free and WOW. The citrus-forward nose with Indian botanicals — gondhoraj lime, nutmeg, mace — is unlike anything else. It''s complex but approachable. Makes a G&T that tastes like a Goa sunset feels. Won the World Gin Award for a reason. Only complaint: the price. But honestly, for a special occasion, nothing else comes close. Paired it with some fish curry and my life peaked.',
 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&q=80',
 'REVIEW', 234, NOW() - INTERVAL '1 day 3 hours', NOW()),

-- Post 8: STORY — Manali trip
('c1000000-0000-0000-0000-000000000008',
 'a1000000-0000-0000-0000-000000000007',
 'Hot Old Monk in Manali during snowfall — peak existence',
 'January trip to Manali. -8 degrees outside, sitting in a tiny cafe in Old Manali with fogged up windows. The owner hands us hot Old Monk with honey and lemon. First sip and I swear I heard angels singing. The warmth spreading through your body while snow falls outside the window... that''s what life is about. Forget your fancy bars and imported bottles. This is the drink that matters.',
 'https://images.unsplash.com/photo-1477601263568-180e2c6d046e?w=800&q=80',
 'STORY', 512, NOW() - INTERVAL '7 hours', NOW()),

-- Post 9: QUESTION — Wine beginner
('c1000000-0000-0000-0000-000000000009',
 'a1000000-0000-0000-0000-000000000009',
 'I know nothing about wine. Where do I even start?',
 'My entire wine knowledge: red and white exist. That''s it. Girlfriend wants to do wine nights and I''m out here not knowing the difference between Shiraz and Sauvignon. Are Indian wines actually good? Someone said Sula is decent? Help a confused beer guy out. Budget under 1000 per bottle ideally.',
 NULL,
 'QUESTION', 156, NOW() - INTERVAL '2 days 4 hours', NOW()),

-- Post 10: RECOMMENDATION — Home bar essentials
('c1000000-0000-0000-0000-000000000010',
 'a1000000-0000-0000-0000-000000000008',
 '5 bottles to start your Indian home bar (under 10K total)',
 'After 8 years of bartending, here''s the home bar starter kit nobody asked for but everyone needs: 1) Old Monk 750ml — the foundation of everything. 2) Greater Than Gin — versatile, Indian, amazing. 3) Amrut Fusion or Paul John Brilliance — your sipping whiskey. 4) Sula Sauvignon Blanc — covers wine duties. 5) Bira 91 White 6-pack — your casual everyday. Total: under 10K. You can make 30+ cocktails with this lineup. DM for recipes.',
 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800&q=80',
 'RECOMMENDATION', 678, NOW() - INTERVAL '12 hours', NOW()),

-- Post 11: STORY — First drink story
('c1000000-0000-0000-0000-000000000011',
 'a1000000-0000-0000-0000-000000000005',
 'My first legal drink at 21 was the most anticlimactic moment ever',
 'Built it up in my head for years. The day I turned 21, walked into a fancy bar in CP, ordered a whiskey sour feeling like a movie character. The bartender didn''t even ask for my ID. Just... made the drink. No fanfare, no confetti, nothing. And the whiskey sour was mid. Should have just gone to my regular theka and gotten Old Monk like always. Adulthood is a scam.',
 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800&q=80',
 'STORY', 445, NOW() - INTERVAL '3 days 2 hours', NOW()),

-- Post 12: REVIEW — Bira 91 White
('c1000000-0000-0000-0000-000000000012',
 'a1000000-0000-0000-0000-000000000009',
 'Bira 91 White — the beer that made me stop drinking Kingfisher',
 'Look, I grew up on Kingfisher like every Indian dude. Then someone handed me a cold Bira White at a rooftop party and it was like going from black-and-white TV to 4K. The wheat notes, the citrus hint, the smooth finish. It''s not trying to be a craft IPA, it''s just a really good, easy-drinking beer. Perfect for Chennai summer, perfect for chilling with friends, perfect for "one more bro, last one I promise" that becomes five more.',
 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=800&q=80',
 'REVIEW', 312, NOW() - INTERVAL '1 day 8 hours', NOW()),

-- Post 13: MEME — Theka culture
('c1000000-0000-0000-0000-000000000013',
 'a1000000-0000-0000-0000-000000000001',
 'The theka uncle who remembers your order is the real MVP',
 'You walk in. He doesn''t even look up. Just reaches behind, grabs your usual, puts it on the counter, tells you the total. No words exchanged. This man has served your family for three generations. He''s seen you go from hiding bottles in your backpack to buying cases for your own house party. He is the silent guardian of Indian drinking culture. Respect the theka uncle.',
 'https://images.unsplash.com/photo-1574006852538-0e285e5c53d8?w=800&q=80',
 'MEME', 723, NOW() - INTERVAL '4 days 1 hour', NOW()),

-- Post 14: RECOMMENDATION — Nashik vineyard visit
('c1000000-0000-0000-0000-000000000014',
 'a1000000-0000-0000-0000-000000000006',
 'Skip Goa, do a Nashik wine weekend instead',
 'Just got back from 3 days in Nashik and honestly? Best trip of the year. Started at Sula Vineyards for the tasting and sunset. Then York Winery for their surprisingly good Arros. Soma Vine Village for the boutique experience. Grover Zampa for the serious wines. The whole Nashik vibe is just... peaceful. No crowds, no tourist traps, just rolling vineyards and great wine. Plus accommodation is 1/3 of Goa prices. This is India''s Napa Valley and we''re sleeping on it.',
 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800&q=80',
 'RECOMMENDATION', 389, NOW() - INTERVAL '2 days 5 hours', NOW()),

-- Post 15: STORY — Speakeasy discovery
('c1000000-0000-0000-0000-000000000015',
 'a1000000-0000-0000-0000-000000000008',
 'Found a hidden speakeasy behind a barbershop in Bandra',
 'You know how people say Mumbai always surprises you? Walked into what I thought was just a regular barbershop near Hill Road. Guy at the counter asked if I had a "haircut appointment." Gave the code my friend texted me. Door behind the mirror opens. ACTUAL SPEAKEASY inside. Dark wood, jazz playing, cocktails with Indian ingredients I didn''t know existed. Had something called "Monsoon Negroni" with kokum and it rewired my brain. Not sharing the exact location because that defeats the purpose, but DM if you''re in Mumbai.',
 'https://images.unsplash.com/photo-1525268323446-0505b6fe7778?w=800&q=80',
 'STORY', 834, NOW() - INTERVAL '8 hours', NOW()),

-- Post 16: QUESTION — Hosting tips
('c1000000-0000-0000-0000-000000000016',
 'a1000000-0000-0000-0000-000000000002',
 'How much alcohol do I actually need for a 30-person house party?',
 'Throwing my first proper house party next weekend (finally got my own place in Indiranagar). 30 people confirmed (so probably 45 will show up, classic). Mix of beer drinkers, whiskey uncles, and wine girls. Budget is around 15K for drinks. How do I not run out but also not have leftover bottles haunting me for months? Currently thinking Kingfisher cases + a couple of whiskey bottles + wine. Am I missing anything?',
 NULL,
 'QUESTION', 178, NOW() - INTERVAL '5 days', NOW()),

-- Post 17: REVIEW — Paul John Brilliance
('c1000000-0000-0000-0000-000000000017',
 'a1000000-0000-0000-0000-000000000010',
 'Paul John Brilliance — Goa''s gift to the whiskey world',
 'I''ve been through the entire Paul John lineup now and Brilliance remains the sweet spot of the range. Non-peated, single malt, matured in ex-bourbon barrels. The tropical climate of Goa accelerates the maturation, so this tastes older than its age suggests. Notes of vanilla, tropical fruits, and a creamy butterscotch finish. At its price point, it''s criminal how good this is. India is making world-class whiskey and the world is just starting to notice.',
 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=800&q=80',
 'REVIEW', 445, NOW() - INTERVAL '1 day', NOW()),

-- Post 18: MEME — Post-breakup drinking
('c1000000-0000-0000-0000-000000000018',
 'a1000000-0000-0000-0000-000000000005',
 'Stages of drinking after a breakup, Indian edition',
 'Week 1: Old Monk and sad Arijit Singh playlist. Week 2: "I''m upgrading to JW Black because I deserve better." Week 3: Cocktails at expensive bar because "this is the new me." Week 4: Back to Old Monk because the new me is broke. Week 5: Two beers with friends, finally laughing about it. Week 6: "Bro, this new girl at office..." and the cycle begins. We''ve all been there. No judgment.',
 'https://images.unsplash.com/photo-1556710808-a2bc27a448f2?w=800&q=80',
 'MEME', 934, NOW() - INTERVAL '3 hours', NOW()),

-- Post 19: RECOMMENDATION — Cocktail at home
('c1000000-0000-0000-0000-000000000019',
 'a1000000-0000-0000-0000-000000000008',
 'Desi Old Fashioned recipe that will blow your mind',
 'As a bartender, this is my signature desi twist on the classic: 60ml Amrut Fusion (or Paul John if you prefer lighter), 10ml jaggery syrup (just dissolve gud in warm water), 2 dashes Angostura, 1 dash cardamom tincture (soak elaichi in vodka for a week). Stir with ice for 30 seconds, strain over a big rock. Garnish with an orange peel and a star anise. The jaggery adds this caramel-molasses depth that regular sugar can''t touch. This is the drink that converted whiskey-soda uncles into cocktail enthusiasts.',
 'https://images.unsplash.com/photo-1470338745628-171cf53de3a8?w=800&q=80',
 'RECOMMENDATION', 567, NOW() - INTERVAL '16 hours', NOW()),

-- Post 20: STORY — New Year Delhi
('c1000000-0000-0000-0000-000000000020',
 'a1000000-0000-0000-0000-000000000010',
 'NYE in Delhi: Why we pregame at home and never learn',
 'Every year, same script. "Let''s go to a NYE party!" Pay 5K entry. Get a drink coupon for one watered-down whiskey. Spend 2 hours in queue for the bar. Music so loud you can''t talk. Countdown happens while you''re in the bathroom. Meanwhile, last year we just did NYE at home — fairy lights on the terrace, a good playlist, Amrut and Old Monk bottles, butter chicken from the place downstairs, and our closest friends. Best NYE ever. This year we''re doing the same. Stop overpaying for mid experiences.',
 'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=800&q=80',
 'STORY', 723, NOW() - INTERVAL '1 day 12 hours', NOW());

-- ============================================================================
-- POST-DRINK LINKS
-- ============================================================================

INSERT INTO post_drinks (post_id, drink_id) VALUES
  -- Post 1: Old Monk Goa trip
  ('c1000000-0000-0000-0000-000000000001', '41fd3bdf-0a86-445a-9987-3d27e2dba41d'),
  -- Post 2: Amrut Fusion review
  ('c1000000-0000-0000-0000-000000000002', 'c8d11b66-d480-40f3-81b4-a2965d7d75dd'),
  -- Post 3: Budget whiskey Q (multiple)
  ('c1000000-0000-0000-0000-000000000003', '6d68ee2b-f625-4502-910a-6cbaab23dba7'),
  ('c1000000-0000-0000-0000-000000000003', '8a584be0-2708-472c-909a-4590298b9a2d'),
  ('c1000000-0000-0000-0000-000000000003', 'c5b86ec6-6cd3-428e-a9a7-f7ac9291042f'),
  -- Post 5: G&T with Greater Than
  ('c1000000-0000-0000-0000-000000000005', '77a72ebd-89b2-4020-91e6-81df2ed13be0'),
  -- Post 6: Wedding Kingfisher
  ('c1000000-0000-0000-0000-000000000006', '4e1ff6e2-896b-44f9-a006-433225265f43'),
  ('c1000000-0000-0000-0000-000000000006', 'bd2f6257-8a5d-44fa-9075-8e56bb455e28'),
  -- Post 7: Stranger & Sons review
  ('c1000000-0000-0000-0000-000000000007', 'eaac0172-1e18-45e0-9899-08439e5be363'),
  -- Post 8: Hot Old Monk Manali
  ('c1000000-0000-0000-0000-000000000008', '41fd3bdf-0a86-445a-9987-3d27e2dba41d'),
  -- Post 9: Wine beginner
  ('c1000000-0000-0000-0000-000000000009', 'f4773b73-d06e-4b3c-a5d0-f52487937f8f'),
  ('c1000000-0000-0000-0000-000000000009', '03534e7f-cd92-4f4b-9cd2-7e4bf9ffa27a'),
  -- Post 10: Home bar (multiple)
  ('c1000000-0000-0000-0000-000000000010', '41fd3bdf-0a86-445a-9987-3d27e2dba41d'),
  ('c1000000-0000-0000-0000-000000000010', '77a72ebd-89b2-4020-91e6-81df2ed13be0'),
  ('c1000000-0000-0000-0000-000000000010', 'c8d11b66-d480-40f3-81b4-a2965d7d75dd'),
  ('c1000000-0000-0000-0000-000000000010', '03534e7f-cd92-4f4b-9cd2-7e4bf9ffa27a'),
  ('c1000000-0000-0000-0000-000000000010', 'd53efe12-7dbf-46ec-8358-ca60e4b7a390'),
  -- Post 12: Bira 91 White review
  ('c1000000-0000-0000-0000-000000000012', 'd53efe12-7dbf-46ec-8358-ca60e4b7a390'),
  ('c1000000-0000-0000-0000-000000000012', '4e1ff6e2-896b-44f9-a006-433225265f43'),
  -- Post 14: Nashik wine
  ('c1000000-0000-0000-0000-000000000014', 'f4773b73-d06e-4b3c-a5d0-f52487937f8f'),
  ('c1000000-0000-0000-0000-000000000014', '03534e7f-cd92-4f4b-9cd2-7e4bf9ffa27a'),
  ('c1000000-0000-0000-0000-000000000014', '09965759-767a-4d4f-84d6-12df3e4f70a9'),
  -- Post 16: House party
  ('c1000000-0000-0000-0000-000000000016', '4e1ff6e2-896b-44f9-a006-433225265f43'),
  ('c1000000-0000-0000-0000-000000000016', 'bc4747a3-3885-4c1e-9088-aa2b6680471f'),
  -- Post 17: Paul John
  ('c1000000-0000-0000-0000-000000000017', '316da99f-eaad-4af9-a340-ce2f531430a8'),
  -- Post 18: Breakup
  ('c1000000-0000-0000-0000-000000000018', '41fd3bdf-0a86-445a-9987-3d27e2dba41d'),
  ('c1000000-0000-0000-0000-000000000018', 'f18a9346-18e6-4296-8645-831b66169517'),
  -- Post 19: Desi Old Fashioned
  ('c1000000-0000-0000-0000-000000000019', 'c8d11b66-d480-40f3-81b4-a2965d7d75dd'),
  ('c1000000-0000-0000-0000-000000000019', '316da99f-eaad-4af9-a340-ce2f531430a8'),
  -- Post 20: NYE Delhi
  ('c1000000-0000-0000-0000-000000000020', 'c8d11b66-d480-40f3-81b4-a2965d7d75dd'),
  ('c1000000-0000-0000-0000-000000000020', '41fd3bdf-0a86-445a-9987-3d27e2dba41d');

-- ============================================================================
-- POST-TAG LINKS
-- ============================================================================

INSERT INTO post_tags (post_id, tag_id) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'c723ed8e-dd63-451d-ae3c-fba2d726fa5d'),  -- drunk story
  ('c1000000-0000-0000-0000-000000000001', '6d816c15-51d3-4d60-967f-49240f690f41'),  -- chill vibes
  ('c1000000-0000-0000-0000-000000000002', '371737ca-4142-4db1-a37a-e34be2c14056'),  -- premium
  ('c1000000-0000-0000-0000-000000000003', '8f192536-9b52-42ae-b8bc-b5a1b73cd82b'),  -- budget friendly
  ('c1000000-0000-0000-0000-000000000004', 'e6ec09a7-c006-4d32-9b06-8fd86ec9ab03'),  -- party mode
  ('c1000000-0000-0000-0000-000000000004', 'c723ed8e-dd63-451d-ae3c-fba2d726fa5d'),  -- drunk story
  ('c1000000-0000-0000-0000-000000000005', '6521b617-6a66-4211-b33f-1094ba1b188d'),  -- cocktail recipe
  ('c1000000-0000-0000-0000-000000000005', '8f192536-9b52-42ae-b8bc-b5a1b73cd82b'),  -- budget friendly
  ('c1000000-0000-0000-0000-000000000006', '150c7771-8f07-4000-ac91-c7198011f7fe'),  -- house party
  ('c1000000-0000-0000-0000-000000000006', '91935624-0e14-4a23-a462-b41b4dcc3784'),  -- celebration
  ('c1000000-0000-0000-0000-000000000007', '371737ca-4142-4db1-a37a-e34be2c14056'),  -- premium
  ('c1000000-0000-0000-0000-000000000008', '6d816c15-51d3-4d60-967f-49240f690f41'),  -- chill vibes
  ('c1000000-0000-0000-0000-000000000008', 'fefc3d4b-0b44-4d2d-b2d7-927ff801ad9d'),  -- adventurous
  ('c1000000-0000-0000-0000-000000000009', '16dce208-00a6-40d0-b667-e693ae63ec0f'),  -- first time
  ('c1000000-0000-0000-0000-000000000009', '09b5f8f8-0b14-47bf-ae70-62575b45617f'),  -- date night
  ('c1000000-0000-0000-0000-000000000010', '6521b617-6a66-4211-b33f-1094ba1b188d'),  -- cocktail recipe
  ('c1000000-0000-0000-0000-000000000011', '16dce208-00a6-40d0-b667-e693ae63ec0f'),  -- first time
  ('c1000000-0000-0000-0000-000000000011', 'c723ed8e-dd63-451d-ae3c-fba2d726fa5d'),  -- drunk story
  ('c1000000-0000-0000-0000-000000000012', '6d816c15-51d3-4d60-967f-49240f690f41'),  -- chill vibes
  ('c1000000-0000-0000-0000-000000000013', 'c723ed8e-dd63-451d-ae3c-fba2d726fa5d'),  -- drunk story
  ('c1000000-0000-0000-0000-000000000014', '55eb6c76-5d58-4735-a3bd-339dcaff444e'),  -- bar recommendation
  ('c1000000-0000-0000-0000-000000000014', 'c3a80ccb-aa95-49d3-9907-d4e3229a6007'),  -- romantic
  ('c1000000-0000-0000-0000-000000000015', '55eb6c76-5d58-4735-a3bd-339dcaff444e'),  -- bar recommendation
  ('c1000000-0000-0000-0000-000000000015', 'fefc3d4b-0b44-4d2d-b2d7-927ff801ad9d'),  -- adventurous
  ('c1000000-0000-0000-0000-000000000016', '150c7771-8f07-4000-ac91-c7198011f7fe'),  -- house party
  ('c1000000-0000-0000-0000-000000000017', '371737ca-4142-4db1-a37a-e34be2c14056'),  -- premium
  ('c1000000-0000-0000-0000-000000000018', 'c723ed8e-dd63-451d-ae3c-fba2d726fa5d'),  -- drunk story
  ('c1000000-0000-0000-0000-000000000019', '6521b617-6a66-4211-b33f-1094ba1b188d'),  -- cocktail recipe
  ('c1000000-0000-0000-0000-000000000019', '371737ca-4142-4db1-a37a-e34be2c14056'),  -- premium
  ('c1000000-0000-0000-0000-000000000020', '150c7771-8f07-4000-ac91-c7198011f7fe'),  -- house party
  ('c1000000-0000-0000-0000-000000000020', '91935624-0e14-4a23-a462-b41b4dcc3784');  -- celebration

-- ============================================================================
-- COMMENTS (50+ engaging comments for liveliness)
-- ============================================================================

INSERT INTO comments (id, post_id, author_id, parent_id, body, score, created_at, updated_at) VALUES

-- Comments on Post 1 (Old Monk Goa)
('d1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000005', NULL,
 'Old Monk + strangers on a beach = the most Indian thing ever. This is exactly how half my friendships started lol', 45, NOW() - INTERVAL '1 day 20 hours', NOW()),
('d1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000007', NULL,
 'Anjuna at 4 AM hits different. The Goa magic is real.', 23, NOW() - INTERVAL '1 day 18 hours', NOW()),
('d1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000001',
 'Bro same! Met my best friend at a Goa bonfire over shared Old Monk 6 years ago. He was my best man at the wedding.', 67, NOW() - INTERVAL '1 day 15 hours', NOW()),

-- Comments on Post 2 (Amrut Fusion review)
('d1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000010', NULL,
 'Been drinking Amrut Fusion for 3 years now. It genuinely competes with scotches twice its price. The tropical barrel aging in Bangalore makes all the difference.', 89, NOW() - INTERVAL '1 day 2 hours', NOW()),
('d1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000005', NULL,
 'Where did you find it? It''s been out of stock everywhere in Chandigarh for months!', 12, NOW() - INTERVAL '1 day', NOW()),
('d1000000-0000-0000-0000-000000000006', 'c1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000005',
 'Got mine from a store in Bangalore MG Road. They had limited stock. Try online if your state allows it.', 8, NOW() - INTERVAL '23 hours', NOW()),
('d1000000-0000-0000-0000-000000000007', 'c1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000008', NULL,
 'We stock this at our bar and it''s the one Indian whiskey that consistently impresses even the snobbiest scotch drinkers.', 34, NOW() - INTERVAL '20 hours', NOW()),

-- Comments on Post 3 (Budget whiskey)
('d1000000-0000-0000-0000-000000000008', 'c1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000010', NULL,
 'Blenders Pride Reserve, no contest. It punches way above its price. Smooth enough neat, versatile enough for cocktails.', 78, NOW() - INTERVAL '2 days 20 hours', NOW()),
('d1000000-0000-0000-0000-000000000009', 'c1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', NULL,
 'Controversial take: Signature Rare is actually decent in that range. The Rare version, not the regular green one.', 34, NOW() - INTERVAL '2 days 18 hours', NOW()),
('d1000000-0000-0000-0000-000000000010', 'c1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000008', NULL,
 'Pro tip: Black Dog Triple Gold if you can stretch to 1600. Trust me on this one.', 56, NOW() - INTERVAL '2 days 12 hours', NOW()),
('d1000000-0000-0000-0000-000000000011', 'c1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000010',
 'Seconding Black Dog Triple Gold. Best value-for-money whiskey in India right now.', 23, NOW() - INTERVAL '2 days 10 hours', NOW()),

-- Comments on Post 5 (G&T setup)
('d1000000-0000-0000-0000-000000000012', 'c1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000008', NULL,
 'The curry leaf garnish is a game changer. We do this at the bar and people lose their minds every single time.', 45, NOW() - INTERVAL '4 hours', NOW()),
('d1000000-0000-0000-0000-000000000013', 'c1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000002', NULL,
 'Greater Than is SO underrated. Indian gin scene has come so far in just 3-4 years.', 34, NOW() - INTERVAL '3 hours', NOW()),

-- Comments on Post 6 (Wedding bar)
('d1000000-0000-0000-0000-000000000014', 'c1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000005', NULL,
 'You forgot the aunty who asks for "sweet wine" and gets served whatever red they have with ice cubes in it', 123, NOW() - INTERVAL '5 hours 30 minutes', NOW()),
('d1000000-0000-0000-0000-000000000015', 'c1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000010', NULL,
 'The "soda strong" uncle is always the best dancer at the wedding. Always.', 89, NOW() - INTERVAL '5 hours', NOW()),
('d1000000-0000-0000-0000-000000000016', 'c1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000014',
 'The ice cubes in red wine... the horror... the absolute horror', 56, NOW() - INTERVAL '4 hours 30 minutes', NOW()),
('d1000000-0000-0000-0000-000000000017', 'c1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000006', NULL,
 'I''m in this post and I don''t like it. Also the "premium" counter scam is TOO real.', 78, NOW() - INTERVAL '4 hours', NOW()),

-- Comments on Post 8 (Manali Old Monk)
('d1000000-0000-0000-0000-000000000018', 'c1000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000001', NULL,
 'Hot Old Monk is the ultimate mountain drink. Did this in Kasol last winter and it literally saved my life.', 67, NOW() - INTERVAL '6 hours', NOW()),
('d1000000-0000-0000-0000-000000000019', 'c1000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000004', NULL,
 'Wait — honey and lemon with Old Monk? That''s basically a hot toddy! Need to try this.', 23, NOW() - INTERVAL '5 hours', NOW()),

-- Comments on Post 9 (Wine beginner)
('d1000000-0000-0000-0000-000000000020', 'c1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000006', NULL,
 'Start with Sula Sauvignon Blanc — it''s light, refreshing, and under 800. Then try their Shiraz if you want to explore red. Indian wines have improved massively in the last 5 years.', 45, NOW() - INTERVAL '2 days', NOW()),
('d1000000-0000-0000-0000-000000000021', 'c1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000008', NULL,
 'Pro tip: serve whites cold (not room temp). That alone will make the experience 10x better.', 34, NOW() - INTERVAL '1 day 22 hours', NOW()),
('d1000000-0000-0000-0000-000000000022', 'c1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000006', 'd1000000-0000-0000-0000-000000000021',
 'Also get proper wine glasses. Drinking wine from a regular glass is like eating biryani from a paper plate — technically works but why would you.', 56, NOW() - INTERVAL '1 day 20 hours', NOW()),

-- Comments on Post 10 (Home bar)
('d1000000-0000-0000-0000-000000000023', 'c1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000004', NULL,
 'This is the most practical home bar guide I''ve seen. Saving this. Also Greater Than is an insane value pick.', 56, NOW() - INTERVAL '11 hours', NOW()),
('d1000000-0000-0000-0000-000000000024', 'c1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000001', NULL,
 'Old Monk as the foundation. This person gets it. Respect.', 78, NOW() - INTERVAL '10 hours', NOW()),

-- Comments on Post 13 (Theka uncle)
('d1000000-0000-0000-0000-000000000025', 'c1000000-0000-0000-0000-000000000013', 'a1000000-0000-0000-0000-000000000007', NULL,
 'My theka uncle once gave me free chakna because he saw I was having a bad day. Kings don''t always wear crowns.', 89, NOW() - INTERVAL '3 days 20 hours', NOW()),
('d1000000-0000-0000-0000-000000000026', 'c1000000-0000-0000-0000-000000000013', 'a1000000-0000-0000-0000-000000000005', NULL,
 'The fact that he''s seen your entire family drinking for generations though. That man has STORIES.', 67, NOW() - INTERVAL '3 days 18 hours', NOW()),

-- Comments on Post 15 (Speakeasy)
('d1000000-0000-0000-0000-000000000027', 'c1000000-0000-0000-0000-000000000015', 'a1000000-0000-0000-0000-000000000004', NULL,
 'DM sent!! I NEED to go to this place. Monsoon Negroni with kokum sounds insane.', 34, NOW() - INTERVAL '7 hours', NOW()),
('d1000000-0000-0000-0000-000000000028', 'c1000000-0000-0000-0000-000000000015', 'a1000000-0000-0000-0000-000000000001', NULL,
 'Mumbai''s hidden bar scene is on another level. There''s one in Colaba too behind a laundry shop.', 45, NOW() - INTERVAL '6 hours 30 minutes', NOW()),
('d1000000-0000-0000-0000-000000000029', 'c1000000-0000-0000-0000-000000000015', 'a1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000028',
 'Wait WHAT? Behind a laundry shop? Bro you can''t just drop that and not share details.', 56, NOW() - INTERVAL '6 hours', NOW()),

-- Comments on Post 16 (Party planning)
('d1000000-0000-0000-0000-000000000030', 'c1000000-0000-0000-0000-000000000016', 'a1000000-0000-0000-0000-000000000008', NULL,
 'Rule of thumb for house parties: 1 case beer per 5 people, 1 bottle whiskey per 8 people, 2 bottles wine for every 5 women. Add 20% buffer because "plus ones" always happen.', 89, NOW() - INTERVAL '4 days 20 hours', NOW()),
('d1000000-0000-0000-0000-000000000031', 'c1000000-0000-0000-0000-000000000016', 'a1000000-0000-0000-0000-000000000005', NULL,
 'Get more mixers than you think you need. Soda, tonic, cola. People always underestimate mixers.', 45, NOW() - INTERVAL '4 days 18 hours', NOW()),
('d1000000-0000-0000-0000-000000000032', 'c1000000-0000-0000-0000-000000000016', 'a1000000-0000-0000-0000-000000000007', 'd1000000-0000-0000-0000-000000000030',
 'This formula is GOLDEN. Saving this for every party I ever throw.', 23, NOW() - INTERVAL '4 days 16 hours', NOW()),

-- Comments on Post 18 (Breakup stages)
('d1000000-0000-0000-0000-000000000033', 'c1000000-0000-0000-0000-000000000018', 'a1000000-0000-0000-0000-000000000001', NULL,
 'I''m at week 4 right now. Back to Old Monk. This post is a personal attack.', 123, NOW() - INTERVAL '2 hours 30 minutes', NOW()),
('d1000000-0000-0000-0000-000000000034', 'c1000000-0000-0000-0000-000000000018', 'a1000000-0000-0000-0000-000000000004', NULL,
 'The accuracy of this hurts. Also "the new me is broke" is the most relatable thing I''ve ever read.', 89, NOW() - INTERVAL '2 hours', NOW()),
('d1000000-0000-0000-0000-000000000035', 'c1000000-0000-0000-0000-000000000018', 'a1000000-0000-0000-0000-000000000007', NULL,
 'Week 5 is where the real healing starts. The "finally laughing about it" beer with friends is underrated therapy.', 56, NOW() - INTERVAL '1 hour 30 minutes', NOW()),
('d1000000-0000-0000-0000-000000000036', 'c1000000-0000-0000-0000-000000000018', 'a1000000-0000-0000-0000-000000000006', 'd1000000-0000-0000-0000-000000000033',
 'Sending you virtual Old Monk and moral support. It gets better king.', 45, NOW() - INTERVAL '1 hour', NOW()),

-- Comments on Post 19 (Desi Old Fashioned)
('d1000000-0000-0000-0000-000000000037', 'c1000000-0000-0000-0000-000000000019', 'a1000000-0000-0000-0000-000000000003', NULL,
 'Made this last night. The jaggery syrup is GENIUS. It adds this smoky-caramel thing that regular sugar just can''t do. New go-to drink.', 67, NOW() - INTERVAL '15 hours', NOW()),
('d1000000-0000-0000-0000-000000000038', 'c1000000-0000-0000-0000-000000000019', 'a1000000-0000-0000-0000-000000000010', NULL,
 'How do you make the cardamom tincture? Just green elaichi pods in vodka? What ratio?', 34, NOW() - INTERVAL '14 hours', NOW()),
('d1000000-0000-0000-0000-000000000039', 'c1000000-0000-0000-0000-000000000019', 'a1000000-0000-0000-0000-000000000008', 'd1000000-0000-0000-0000-000000000038',
 'About 8-10 crushed green elaichi pods in 100ml cheap vodka. Let it sit for 5-7 days, strain. Lasts months.', 45, NOW() - INTERVAL '13 hours', NOW()),
('d1000000-0000-0000-0000-000000000040', 'c1000000-0000-0000-0000-000000000019', 'a1000000-0000-0000-0000-000000000001', NULL,
 'I tried this with Old Monk instead of Amrut and it WORKS. Slightly different vibe but equally good.', 23, NOW() - INTERVAL '12 hours', NOW()),

-- Comments on Post 20 (NYE)
('d1000000-0000-0000-0000-000000000041', 'c1000000-0000-0000-0000-000000000020', 'a1000000-0000-0000-0000-000000000005', NULL,
 'The "countdown happens while you''re in the bathroom" is the most Delhi NYE thing ever. SO accurate.', 78, NOW() - INTERVAL '1 day 8 hours', NOW()),
('d1000000-0000-0000-0000-000000000042', 'c1000000-0000-0000-0000-000000000020', 'a1000000-0000-0000-0000-000000000002', NULL,
 'Terrace + fairy lights + good friends > any 5K entry club. We did this in Indiranagar last year. Best decision ever.', 67, NOW() - INTERVAL '1 day 6 hours', NOW()),
('d1000000-0000-0000-0000-000000000043', 'c1000000-0000-0000-0000-000000000020', 'a1000000-0000-0000-0000-000000000008', NULL,
 'Butter chicken from "the place downstairs" — every Indian neighbourhood has one of these and it''s always the best food.', 45, NOW() - INTERVAL '1 day 4 hours', NOW()),

-- A few more scattered comments for lesser-commented posts
('d1000000-0000-0000-0000-000000000044', 'c1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000009', NULL,
 '12 breweries?! My max was 6 and I was done. Bangalore brewery scene is unreal though.', 34, NOW() - INTERVAL '3 days 20 hours', NOW()),
('d1000000-0000-0000-0000-000000000045', 'c1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000008', NULL,
 'The hazelnut stout at Windmills is LEGENDARY. Order that and the truffle fries, thank me later.', 56, NOW() - INTERVAL '3 days 18 hours', NOW()),

('d1000000-0000-0000-0000-000000000046', 'c1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000008', NULL,
 'Stranger & Sons is what put Indian gin on the global map. The gondhoraj lime botanical is so clever.', 45, NOW() - INTERVAL '1 day', NOW()),

('d1000000-0000-0000-0000-000000000047', 'c1000000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000007', NULL,
 'LOL "adulthood is a scam" — the most 21-year-old realization ever. Welcome to the club.', 45, NOW() - INTERVAL '3 days', NOW()),

('d1000000-0000-0000-0000-000000000048', 'c1000000-0000-0000-0000-000000000014', 'a1000000-0000-0000-0000-000000000003', NULL,
 'Nashik is incredible. Did a wine tour last monsoon — vineyards in the rain is next level beautiful.', 34, NOW() - INTERVAL '2 days', NOW()),

('d1000000-0000-0000-0000-000000000049', 'c1000000-0000-0000-0000-000000000012', 'a1000000-0000-0000-0000-000000000001', NULL,
 'Bira White was the gateway drug that got me into craft beer. Now I''m a full beer snob and I blame them.', 23, NOW() - INTERVAL '1 day 4 hours', NOW()),

('d1000000-0000-0000-0000-000000000050', 'c1000000-0000-0000-0000-000000000017', 'a1000000-0000-0000-0000-000000000003', NULL,
 'Goan climate aging is such an underappreciated factor. Paul John whiskies taste 5 years older than they are because of the tropical heat.', 56, NOW() - INTERVAL '20 hours', NOW());


-- ============================================================================
-- UPDATE DRINK IMAGE URLS (Unsplash images for drink cards)
-- ============================================================================

UPDATE drinks SET image_url = 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=600&q=80' WHERE slug = 'amrut-fusion';
UPDATE drinks SET image_url = 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=600&q=80' WHERE slug = 'paul-john-brilliance';
UPDATE drinks SET image_url = 'https://images.unsplash.com/photo-1602858776116-2814a7367626?w=600&q=80' WHERE slug = 'old-monk';
UPDATE drinks SET image_url = 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=600&q=80' WHERE slug = 'greater-than-gin';
UPDATE drinks SET image_url = 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600&q=80' WHERE slug = 'stranger-and-sons';
UPDATE drinks SET image_url = 'https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=600&q=80' WHERE slug = 'hapusa-gin';
UPDATE drinks SET image_url = 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&q=80' WHERE slug = 'bira-91-white';
UPDATE drinks SET image_url = 'https://images.unsplash.com/photo-1618183479302-1e0aa382c36b?w=600&q=80' WHERE slug = 'bira-91-blonde';
UPDATE drinks SET image_url = 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=600&q=80' WHERE slug = 'kingfisher-premium';
UPDATE drinks SET image_url = 'https://images.unsplash.com/photo-1600788886242-5c96aabe3757?w=600&q=80' WHERE slug = 'kingfisher-strong';
UPDATE drinks SET image_url = 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=600&q=80' WHERE slug = 'johnnie-walker-black';
UPDATE drinks SET image_url = 'https://images.unsplash.com/photo-1602858776116-2814a7367626?w=600&q=80' WHERE slug = 'johnnie-walker-red';
UPDATE drinks SET image_url = 'https://images.unsplash.com/photo-1557878437-880f684e2509?w=600&q=80' WHERE slug = 'sula-shiraz';
UPDATE drinks SET image_url = 'https://images.unsplash.com/photo-1566995541428-f2246c17cda1?w=600&q=80' WHERE slug = 'sula-sauvignon-blanc';
UPDATE drinks SET image_url = 'https://images.unsplash.com/photo-1570598912132-0ba1dc952b7d?w=600&q=80' WHERE slug = 'absolut-vodka';
UPDATE drinks SET image_url = 'https://images.unsplash.com/photo-1607622750671-6cd9a99eabd1?w=600&q=80' WHERE slug = 'grey-goose';
UPDATE drinks SET image_url = 'https://images.unsplash.com/photo-1598018553943-93a291e3f07a?w=600&q=80' WHERE slug = 'bombay-sapphire';
UPDATE drinks SET image_url = 'https://images.unsplash.com/photo-1609951651556-5334e2706168?w=600&q=80' WHERE slug = 'bacardi-white';
UPDATE drinks SET image_url = 'https://images.unsplash.com/photo-1602858776116-2814a7367626?w=600&q=80' WHERE slug = 'captain-morgan-spiced';
UPDATE drinks SET image_url = 'https://images.unsplash.com/photo-1574006852538-0e285e5c53d8?w=600&q=80' WHERE slug = 'royal-stag';
UPDATE drinks SET image_url = 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=600&q=80' WHERE slug = 'blenders-pride';
UPDATE drinks SET image_url = 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=600&q=80' WHERE slug = 'blenders-pride-reserve';
UPDATE drinks SET image_url = 'https://images.unsplash.com/photo-1574006852538-0e285e5c53d8?w=600&q=80' WHERE slug = 'imperial-blue';
UPDATE drinks SET image_url = 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=600&q=80' WHERE slug = 'black-dog-triple-gold';
UPDATE drinks SET image_url = 'https://images.unsplash.com/photo-1557878437-880f684e2509?w=600&q=80' WHERE slug = 'black-and-white';
UPDATE drinks SET image_url = 'https://images.unsplash.com/photo-1574006852538-0e285e5c53d8?w=600&q=80' WHERE slug = 'mcdowells-no-1';
UPDATE drinks SET image_url = 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=600&q=80' WHERE slug = 'antiquity-blue';
UPDATE drinks SET image_url = 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=600&q=80' WHERE slug = 'signature-whisky';
UPDATE drinks SET image_url = 'https://images.unsplash.com/photo-1570598912132-0ba1dc952b7d?w=600&q=80' WHERE slug = 'smirnoff-21';
UPDATE drinks SET image_url = 'https://images.unsplash.com/photo-1570598912132-0ba1dc952b7d?w=600&q=80' WHERE slug = 'magic-moments';
UPDATE drinks SET image_url = 'https://images.unsplash.com/photo-1598018553943-93a291e3f07a?w=600&q=80' WHERE slug = 'tanqueray';
UPDATE drinks SET image_url = 'https://images.unsplash.com/photo-1609951651556-5334e2706168?w=600&q=80' WHERE slug = 'maka-zai';
UPDATE drinks SET image_url = 'https://images.unsplash.com/photo-1609951651556-5334e2706168?w=600&q=80' WHERE slug = 'havana-club-3';
UPDATE drinks SET image_url = 'https://images.unsplash.com/photo-1618183479302-1e0aa382c36b?w=600&q=80' WHERE slug = 'carlsberg-elephant';
UPDATE drinks SET image_url = 'https://images.unsplash.com/photo-1600788886242-5c96aabe3757?w=600&q=80' WHERE slug = 'heineken';
UPDATE drinks SET image_url = 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&q=80' WHERE slug = 'simba-wit';
UPDATE drinks SET image_url = 'https://images.unsplash.com/photo-1618183479302-1e0aa382c36b?w=600&q=80' WHERE slug = 'tuborg-strong';
UPDATE drinks SET image_url = 'https://images.unsplash.com/photo-1557878437-880f684e2509?w=600&q=80' WHERE slug = 'fratelli-sette';
UPDATE drinks SET image_url = 'https://images.unsplash.com/photo-1566995541428-f2246c17cda1?w=600&q=80' WHERE slug = 'york-arros';
UPDATE drinks SET image_url = 'https://images.unsplash.com/photo-1602858776116-2814a7367626?w=600&q=80' WHERE slug = 'morpheus-xo';
UPDATE drinks SET image_url = 'https://images.unsplash.com/photo-1602858776116-2814a7367626?w=600&q=80' WHERE slug = 'honey-bee-brandy';
UPDATE drinks SET image_url = 'https://images.unsplash.com/photo-1609951651556-5334e2706168?w=600&q=80' WHERE slug = 'jose-cuervo-silver';
UPDATE drinks SET image_url = 'https://images.unsplash.com/photo-1609951651556-5334e2706168?w=600&q=80' WHERE slug = 'patron-silver';
UPDATE drinks SET image_url = 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600&q=80' WHERE slug = 'jagermeister';
UPDATE drinks SET image_url = 'https://images.unsplash.com/photo-1557878437-880f684e2509?w=600&q=80' WHERE slug = 'baileys';
UPDATE drinks SET image_url = 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600&q=80' WHERE slug = 'kahlua';

COMMIT;
