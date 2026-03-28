-- ============================================================
-- Restore client assignments from Firebase → Supabase clients
-- Run in Supabase SQL Editor
-- ============================================================

UPDATE clients SET assigned_manager = 'daniella@luxury-listings.com', updated_at = now() WHERE client_name ILIKE 'Tye Stockton';
UPDATE clients SET assigned_manager = 'tara@luxury-listings.com', updated_at = now() WHERE client_name ILIKE 'Ann Newton Cane';
UPDATE clients SET assigned_manager = 'michelle@luxury-listings.com', updated_at = now() WHERE client_name ILIKE 'Stefan Cohen';
UPDATE clients SET assigned_manager = 'dylan@luxury-listings.com', updated_at = now() WHERE client_name ILIKE '(Corp) The Agency New York';
UPDATE clients SET assigned_manager = 'luca@luxury-listings.com', updated_at = now() WHERE client_name ILIKE 'McClean Designs';
UPDATE clients SET assigned_manager = 'dylan@luxury-listings.com', updated_at = now() WHERE client_name ILIKE 'The Agency RE';
UPDATE clients SET assigned_manager = 'mikayla@luxury-listings.com', updated_at = now() WHERE client_name ILIKE 'The Agency San Antonio';
UPDATE clients SET assigned_manager = 'mikayla@luxury-listings.com', updated_at = now() WHERE client_name ILIKE 'Heather Domi';
UPDATE clients SET assigned_manager = 'matthew@luxury-listings.com', updated_at = now() WHERE client_name ILIKE 'HQ Residences Miami';
UPDATE clients SET assigned_manager = 'mikayla@luxury-listings.com', updated_at = now() WHERE client_name ILIKE 'Blair Chang';
UPDATE clients SET assigned_manager = 'michelle@luxury-listings.com', updated_at = now() WHERE client_name ILIKE 'Heather Sinclair';
UPDATE clients SET assigned_manager = 'dylan@luxury-listings.com', updated_at = now() WHERE client_name ILIKE 'The Agency Naples';
UPDATE clients SET assigned_manager = 'daniella@luxury-listings.com', updated_at = now() WHERE client_name ILIKE 'Meg Garrido';
UPDATE clients SET assigned_manager = 'mikayla@luxury-listings.com', updated_at = now() WHERE client_name ILIKE 'Whitney McLaughlin';
UPDATE clients SET assigned_manager = 'daniella@luxury-listings.com', updated_at = now() WHERE client_name ILIKE 'The Agency Santa Fe';
UPDATE clients SET assigned_manager = 'daniella@luxury-listings.com', updated_at = now() WHERE client_name ILIKE 'The Agency Martha''s Vineyard';
UPDATE clients SET assigned_manager = 'daniella@luxury-listings.com', updated_at = now() WHERE client_name ILIKE 'The Agency NWFL';
UPDATE clients SET assigned_manager = 'daniella@luxury-listings.com', updated_at = now() WHERE client_name ILIKE 'The Stockton Group';
UPDATE clients SET assigned_manager = 'michelle@luxury-listings.com', updated_at = now() WHERE client_name ILIKE 'The Kodiak Club';
UPDATE clients SET assigned_manager = 'mikayla@luxury-listings.com', updated_at = now() WHERE client_name ILIKE 'The Agency Austin';
UPDATE clients SET assigned_manager = 'dylan@luxury-listings.com', updated_at = now() WHERE client_name ILIKE '(Corp) The Agency So Cal';
UPDATE clients SET assigned_manager = 'tara@luxury-listings.com', updated_at = now() WHERE client_name ILIKE 'Resnick & Nash';
UPDATE clients SET assigned_manager = 'tara@luxury-listings.com', updated_at = now() WHERE client_name ILIKE 'Jill Fusari';
UPDATE clients SET assigned_manager = 'tara@luxury-listings.com', updated_at = now() WHERE client_name ILIKE 'Emil Hartoonian';
UPDATE clients SET assigned_manager = 'alberta@luxury-listings.com', updated_at = now() WHERE client_name ILIKE 'IG Mansions';
UPDATE clients SET assigned_manager = 'michelle@luxury-listings.com', updated_at = now() WHERE client_name ILIKE 'The Agency Cayman';
UPDATE clients SET assigned_manager = 'tara@luxury-listings.com', updated_at = now() WHERE client_name ILIKE 'The Agency Aspen';
UPDATE clients SET assigned_manager = 'mikayla@luxury-listings.com', updated_at = now() WHERE client_name ILIKE 'The Resop Team';
UPDATE clients SET assigned_manager = 'tara@luxury-listings.com', updated_at = now() WHERE client_name ILIKE 'The Agency Nashville';
UPDATE clients SET assigned_manager = 'mikayla@luxury-listings.com', updated_at = now() WHERE client_name ILIKE 'The Agency Florida Keys';
UPDATE clients SET assigned_manager = 'daniella@luxury-listings.com', updated_at = now() WHERE client_name ILIKE 'Kristin Stroh (Naples)';
UPDATE clients SET assigned_manager = 'mikayla@luxury-listings.com', updated_at = now() WHERE client_name ILIKE 'Compass Sports and Entertainment';
UPDATE clients SET assigned_manager = 'alberta@luxury-listings.com', updated_at = now() WHERE client_name ILIKE 'IG Interiors';
UPDATE clients SET assigned_manager = 'dylan@luxury-listings.com', updated_at = now() WHERE client_name ILIKE '(Corp) The Agency North Cal';
UPDATE clients SET assigned_manager = 'alberta@luxury-listings.com', updated_at = now() WHERE client_name ILIKE 'Luxury Listings';

-- Verify
SELECT client_name, assigned_manager FROM clients ORDER BY client_name;