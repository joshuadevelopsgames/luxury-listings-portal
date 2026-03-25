-- ============================================================
-- Restore client profile photos from Firebase → Supabase clients
-- Run in Supabase SQL Editor
-- ============================================================

UPDATE clients SET logo_url = 'https://storage.googleapis.com/luxury-listings-portal-e56de.firebasestorage.app/profile-photos/clients/ann-newton-cane.png', updated_at = now() WHERE client_name ILIKE 'Ann Newton Cane';
UPDATE clients SET logo_url = '/agency-logo.png', updated_at = now() WHERE client_name ILIKE '(Corp) The Agency New York';
UPDATE clients SET logo_url = '/mcclean-design-logo.png', updated_at = now() WHERE client_name ILIKE 'McClean Designs';
UPDATE clients SET logo_url = '/agency-logo.png', updated_at = now() WHERE client_name ILIKE 'The Agency RE';
UPDATE clients SET logo_url = '/agency-logo.png', updated_at = now() WHERE client_name ILIKE 'The Agency San Antonio';
UPDATE clients SET logo_url = 'https://storage.googleapis.com/luxury-listings-portal-e56de.firebasestorage.app/profile-photos/clients/heather-domi.png', updated_at = now() WHERE client_name ILIKE 'Heather Domi';
UPDATE clients SET logo_url = 'https://storage.googleapis.com/luxury-listings-portal-e56de.firebasestorage.app/profile-photos/clients/blair-chang.png', updated_at = now() WHERE client_name ILIKE 'Blair Chang';
UPDATE clients SET logo_url = 'https://storage.googleapis.com/luxury-listings-portal-e56de.firebasestorage.app/profile-photos/clients/heather-sinclair.png', updated_at = now() WHERE client_name ILIKE 'Heather Sinclair';
UPDATE clients SET logo_url = '/agency-logo.png', updated_at = now() WHERE client_name ILIKE 'The Agency Naples';
UPDATE clients SET logo_url = '/agency-logo.png', updated_at = now() WHERE client_name ILIKE 'The Agency Santa Fe';
UPDATE clients SET logo_url = '/agency-logo.png', updated_at = now() WHERE client_name ILIKE 'The Agency Martha''s Vineyard';
UPDATE clients SET logo_url = '/agency-logo.png', updated_at = now() WHERE client_name ILIKE 'The Agency NWFL';
UPDATE clients SET logo_url = '/kodiak-club-logo.png', updated_at = now() WHERE client_name ILIKE 'The Kodiak Club';
UPDATE clients SET logo_url = '/agency-logo.png', updated_at = now() WHERE client_name ILIKE 'The Agency Austin';
UPDATE clients SET logo_url = '/agency-logo.png', updated_at = now() WHERE client_name ILIKE '(Corp) The Agency So Cal';
UPDATE clients SET logo_url = 'https://storage.googleapis.com/luxury-listings-portal-e56de.firebasestorage.app/profile-photos/clients/emil-hartoonian.png', updated_at = now() WHERE client_name ILIKE 'Emil Hartoonian';
UPDATE clients SET logo_url = 'https://firebasestorage.googleapis.com/v0/b/luxury-listings-portal-e56de.firebasestorage.app/o/client-photos%2FdQc07dL1HxpZu5pVL773%2Fprofile_1770841233527.jpg?alt=media&token=184d7f6f-d5f5-4f21-ac09-f262c5c309dc', updated_at = now() WHERE client_name ILIKE 'IG Mansions';
UPDATE clients SET logo_url = '/agency-logo.png', updated_at = now() WHERE client_name ILIKE 'The Agency Cayman';
UPDATE clients SET logo_url = '/agency-logo.png', updated_at = now() WHERE client_name ILIKE 'The Agency Aspen';
UPDATE clients SET logo_url = '/resop-team-photo.png', updated_at = now() WHERE client_name ILIKE 'The Resop Team';
UPDATE clients SET logo_url = '/agency-logo.png', updated_at = now() WHERE client_name ILIKE 'The Agency Nashville';
UPDATE clients SET logo_url = '/agency-logo.png', updated_at = now() WHERE client_name ILIKE 'The Agency Florida Keys';
UPDATE clients SET logo_url = 'https://storage.googleapis.com/luxury-listings-portal-e56de.firebasestorage.app/profile-photos/clients/compass-sports-and-entertainment.png', updated_at = now() WHERE client_name ILIKE 'Compass Sports and Entertainment';
UPDATE clients SET logo_url = 'https://firebasestorage.googleapis.com/v0/b/luxury-listings-portal-e56de.firebasestorage.app/o/client-photos%2Fsv7QFkswhNQqUIliE7Ou%2Fprofile_1770841442412.jpg?alt=media&token=9976e2fe-ec32-4b58-afd7-35a4960b180b', updated_at = now() WHERE client_name ILIKE 'IG Interiors';
UPDATE clients SET logo_url = '/agency-logo.png', updated_at = now() WHERE client_name ILIKE '(Corp) The Agency North Cal';
UPDATE clients SET logo_url = 'https://firebasestorage.googleapis.com/v0/b/luxury-listings-portal-e56de.firebasestorage.app/o/client-photos%2FyyKRkUP9OFTZiHsKSD7S%2Fprofile_1770841329929.png?alt=media&token=52055c7b-3a51-4975-af66-b5c4ee0f5a7e', updated_at = now() WHERE client_name ILIKE 'Luxury Listings';

-- Verify
SELECT client_name, logo_url FROM clients WHERE logo_url IS NOT NULL ORDER BY client_name;