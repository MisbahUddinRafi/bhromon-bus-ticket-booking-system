-- Function
CREATE OR REPLACE FUNCTION create_seats_for_bus()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO BUS_SEAT (bus_id, seat_number)
    SELECT NEW.bus_id, 'S' || i
    FROM generate_series(1, 32) AS i;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER trg_create_seats
AFTER INSERT ON BUS
FOR EACH ROW
EXECUTE FUNCTION create_seats_for_bus();
