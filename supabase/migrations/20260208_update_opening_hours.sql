-- Update opening hours in Supabase
-- Run this in Supabase SQL Editor

-- First, delete existing entries
DELETE FROM opening_hours;

-- Insert correct opening hours (11h-15h / 17h30-00h00, Sunday closed)
INSERT INTO opening_hours (day_of_week, is_open, open_time, close_time, open_time_evening, close_time_evening) VALUES
(0, false, '11:00', '15:00', '17:30', '00:00'), -- Dimanche fermé
(1, true, '11:00', '15:00', '17:30', '00:00'),  -- Lundi
(2, true, '11:00', '15:00', '17:30', '00:00'),  -- Mardi
(3, true, '11:00', '15:00', '17:30', '00:00'),  -- Mercredi
(4, true, '11:00', '15:00', '17:30', '00:00'),  -- Jeudi
(5, true, '11:00', '15:00', '17:30', '00:00'),  -- Vendredi
(6, true, '11:00', '15:00', '17:30', '00:00');  -- Samedi
