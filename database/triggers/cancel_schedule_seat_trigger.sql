-- function
CREATE OR REPLACE FUNCTION cancel_schedule_seats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.schedule_status = 'cancelled' THEN
        UPDATE SCHEDULE_SEAT
        SET schedule_seat_status = 'cancelled'
        WHERE schedule_id = NEW.schedule_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;



-- trigger
CREATE TRIGGER trigger_cancel_schedule_seats
AFTER UPDATE ON SCHEDULE
FOR EACH ROW
WHEN (OLD.schedule_status IS DISTINCT FROM NEW.schedule_status)
EXECUTE FUNCTION cancel_schedule_seats();
