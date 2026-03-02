-- function
CREATE OR REPLACE FUNCTION create_schedule_seats()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO SCHEDULE_SEAT (schedule_id, bus_id, seat_number, schedule_seat_status)
    SELECT 
        NEW.schedule_id,
        NEW.bus_id,
        seat_number,
        'available'
    FROM BUS_SEAT
    WHERE bus_id = NEW.bus_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;



-- trigger
CREATE TRIGGER trigger_create_schedule_seats
AFTER INSERT ON SCHEDULE
FOR EACH ROW
EXECUTE FUNCTION create_schedule_seats();
