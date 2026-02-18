-- Insert 2 buses (AC + Non-AC) for each operator

INSERT INTO BUS (bus_number, bus_type, operator_id) VALUES

-- Green Line
('GL-AC-01',
 'ac',
 (SELECT operator_id FROM BUS_OPERATOR WHERE operator_name = 'Green Line Paribahan')),
('GL-NAC-01',
 'non-ac',
 (SELECT operator_id FROM BUS_OPERATOR WHERE operator_name = 'Green Line Paribahan')),

-- Shohag
('SH-AC-01',
 'ac',
 (SELECT operator_id FROM BUS_OPERATOR WHERE operator_name = 'Shohag Paribahan')),
('SH-NAC-01',
 'non-ac',
 (SELECT operator_id FROM BUS_OPERATOR WHERE operator_name = 'Shohag Paribahan')),

-- Hanif
('HN-AC-01',
 'ac',
 (SELECT operator_id FROM BUS_OPERATOR WHERE operator_name = 'Hanif Enterprise')),
('HN-NAC-01',
 'non-ac',
 (SELECT operator_id FROM BUS_OPERATOR WHERE operator_name = 'Hanif Enterprise')),

-- Unique
('UN-AC-01',
 'ac',
 (SELECT operator_id FROM BUS_OPERATOR WHERE operator_name = 'Unique Paribahan')),
('UN-NAC-01',
 'non-ac',
 (SELECT operator_id FROM BUS_OPERATOR WHERE operator_name = 'Unique Paribahan')),

-- Soudia
('SD-AC-01',
 'ac',
 (SELECT operator_id FROM BUS_OPERATOR WHERE operator_name = 'Soudia Coach Service')),
('SD-NAC-01',
 'non-ac',
 (SELECT operator_id FROM BUS_OPERATOR WHERE operator_name = 'Soudia Coach Service')),

-- Saint Martin
('SM-AC-01',
 'ac',
 (SELECT operator_id FROM BUS_OPERATOR WHERE operator_name = 'Saint Martin Travels')),
('SM-NAC-01',
 'non-ac',
 (SELECT operator_id FROM BUS_OPERATOR WHERE operator_name = 'Saint Martin Travels')),

-- ENA
('ENA-AC-01',
 'ac',
 (SELECT operator_id FROM BUS_OPERATOR WHERE operator_name = 'ENA Transport')),
('ENA-NAC-01',
 'non-ac',
 (SELECT operator_id FROM BUS_OPERATOR WHERE operator_name = 'ENA Transport')),

-- Desh Travels
('DT-AC-01',
 'ac',
 (SELECT operator_id FROM BUS_OPERATOR WHERE operator_name = 'Desh Travels')),
('DT-NAC-01',
 'non-ac',
 (SELECT operator_id FROM BUS_OPERATOR WHERE operator_name = 'Desh Travels')),

-- Shyamoli
('SY-AC-01',
 'ac',
 (SELECT operator_id FROM BUS_OPERATOR WHERE operator_name = 'Shyamoli Paribahan')),
('SY-NAC-01',
 'non-ac',
 (SELECT operator_id FROM BUS_OPERATOR WHERE operator_name = 'Shyamoli Paribahan')),

-- S Alam
('SAL-AC-01',
 'ac',
 (SELECT operator_id FROM BUS_OPERATOR WHERE operator_name = 'S Alam Service')),
('SAL-NAC-01',
 'non-ac',
 (SELECT operator_id FROM BUS_OPERATOR WHERE operator_name = 'S Alam Service'));




 -- search all buses information with operator name: 
SELECT 
  b.bus_id, b.bus_number, b.bus_type, bo.operator_name, bo.contact_number
FROM bus b
JOIN bus_operator bo on b.operator_id = bo.operator_id; 
