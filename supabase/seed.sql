-- ==========================================
-- CargoNode Seed Data
-- ==========================================

-- Seed 3 Prime Movers
INSERT INTO public.prime_movers (id, status, current_location) VALUES
('PM-102', 'In Transit', 'NLEX Southbound'),
('PM-088', 'Pier Standby', 'Manila Port Area'),
('PM-215', 'Maintenance', 'Laguna Fleet Yard');

-- Seed 3 Waybills
INSERT INTO public.waybills (tracking_number, client_name, origin, destination, container_type, status, prime_mover_id) VALUES
('WAYBILL123', 'NexaCorp Logistics Inc.', 'Manila Port Area', 'Laguna Warehouse', '40-footer', 'In Transit', 'PM-102'),
('WAYBILL456', 'Global Foods Ltd.', 'Cavite Port', 'Pier 1', '20-footer', 'Loading', 'PM-088'),
('WAYBILL789', 'TechSolutions Corp', 'Batangas', 'QC Whse', '40-footer', 'Delayed', 'PM-215');

-- Seed Tracking Milestones for WAYBILL123
INSERT INTO public.tracking_milestones (waybill_id, title, location, timestamp, status, order_index) VALUES
('WAYBILL123', 'Manifest Generated', 'Manila Port Area', NOW() - INTERVAL '3 hours', 'completed', 1),
('WAYBILL123', 'Departed Pier', 'Pier 4 Gate', NOW() - INTERVAL '1 hour 30 minutes', 'completed', 2),
('WAYBILL123', 'In Transit (NLEX)', 'NLEX Southbound', NOW(), 'current', 3),
('WAYBILL123', 'Arrived at Drop-off', 'Laguna Warehouse', NULL, 'pending', 4);

-- Seed Maintenance Alert for PM-215
INSERT INTO public.maintenance_alerts (prime_mover_id, alert_type, triggered_at_mileage, status) VALUES
('PM-215', 'Engine Oil Change', 15500.5, 'Pending'),
('PM-215', 'Brake Pad Replacement', 32000.0, 'Resolved');

-- Seed GPS Logs for PM-102 (Recent pings)
INSERT INTO public.gps_logs (prime_mover_id, latitude, longitude, timestamp) VALUES
('PM-102', 14.5995, 120.9842, NOW() - INTERVAL '1 minute'),
('PM-102', 14.6002, 120.9855, NOW() - INTERVAL '30 seconds'),
('PM-102', 14.6015, 120.9870, NOW());
