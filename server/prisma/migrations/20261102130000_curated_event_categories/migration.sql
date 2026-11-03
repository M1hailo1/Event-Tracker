-- Keep legacy category records for reference, but retire them from selection.
UPDATE "Category" SET "isCustom" = true;
INSERT INTO "Category" ("id", "name", "isCustom") VALUES
('00000000-0000-4000-8000-000000000001', 'Music', false),
('00000000-0000-4000-8000-000000000002', 'Arts & Culture', false),
('00000000-0000-4000-8000-000000000003', 'Film', false),
('00000000-0000-4000-8000-000000000004', 'Gaming', false),
('00000000-0000-4000-8000-000000000005', 'Nightlife', false),
('00000000-0000-4000-8000-000000000006', 'Sports', false),
('00000000-0000-4000-8000-000000000007', 'Fitness & Wellness', false),
('00000000-0000-4000-8000-000000000008', 'Outdoors & Adventure', false),
('00000000-0000-4000-8000-000000000009', 'Education', false),
('00000000-0000-4000-8000-000000000010', 'Workshops & DIY', false),
('00000000-0000-4000-8000-000000000011', 'Technology', false),
('00000000-0000-4000-8000-000000000012', 'Business & Networking', false),
('00000000-0000-4000-8000-000000000013', 'Social & Meetups', false),
('00000000-0000-4000-8000-000000000014', 'Food & Drink', false),
('00000000-0000-4000-8000-000000000015', 'Community & Volunteering', false),
('00000000-0000-4000-8000-000000000016', 'Birthdays & Celebrations', false),
('00000000-0000-4000-8000-000000000017', 'Family & Kids', false),
('00000000-0000-4000-8000-000000000018', 'Other', false);

-- Preserve each event's meaning while consolidating the old taxonomy.
UPDATE "Event" e SET "categoryId" = curated."id"
FROM "Category" old, "Category" curated
WHERE e."categoryId" = old."id" AND curated."isCustom" = false
AND curated."name" = CASE lower(trim(old."name"))
WHEN 'music' THEN 'Music'
WHEN 'arts & culture' THEN 'Arts & Culture'
WHEN 'film' THEN 'Film'
WHEN 'gaming' THEN 'Gaming'
WHEN 'nightlife' THEN 'Nightlife'
WHEN 'sports' THEN 'Sports'
WHEN 'fitness & wellness' THEN 'Fitness & Wellness'
WHEN 'outdoors & adventure' THEN 'Outdoors & Adventure'
WHEN 'education' THEN 'Education'
WHEN 'workshops & diy' THEN 'Workshops & DIY'
WHEN 'technology' THEN 'Technology'
WHEN 'business & networking' THEN 'Business & Networking'
WHEN 'social & meetups' THEN 'Social & Meetups'
WHEN 'food & drink' THEN 'Food & Drink'
WHEN 'community & volunteering' THEN 'Community & Volunteering'
WHEN 'birthdays & celebrations' THEN 'Birthdays & Celebrations'
WHEN 'family & kids' THEN 'Family & Kids'
WHEN 'other' THEN 'Other'
WHEN 'sport' THEN 'Sports'
WHEN 'fun' THEN 'Social & Meetups'
WHEN 'birthday' THEN 'Birthdays & Celebrations'
WHEN 'new years' THEN 'Birthdays & Celebrations'
WHEN 'new year' THEN 'Birthdays & Celebrations'
WHEN 'conference' THEN 'Business & Networking'
WHEN 'charity' THEN 'Community & Volunteering'
ELSE 'Other' END;

CREATE TABLE "_EventCategories" (
 "A" TEXT NOT NULL,
 "B" TEXT NOT NULL,
 CONSTRAINT "_EventCategories_AB_pkey" PRIMARY KEY ("A", "B")
);
CREATE INDEX "_EventCategories_B_index" ON "_EventCategories"("B");
ALTER TABLE "_EventCategories" ADD CONSTRAINT "_EventCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_EventCategories" ADD CONSTRAINT "_EventCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
INSERT INTO "_EventCategories" ("A", "B") SELECT "categoryId", "id" FROM "Event";
