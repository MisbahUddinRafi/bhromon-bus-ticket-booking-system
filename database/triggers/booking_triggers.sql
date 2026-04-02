-- ============================================================
-- 1. TRIGGER - Free seats when booking cancelled
-- ============================================================

CREATE OR REPLACE FUNCTION trg_free_seats_on_cancel()
RETURNS TRIGGER AS $$
DECLARE
    v_row RECORD;
BEGIN
    IF OLD.booking_status = 'confirmed' 
       AND NEW.booking_status = 'cancelled' THEN
       
        FOR v_row IN 
            (SELECT schedule_id, seat_number
            FROM BOOKED_SEAT
            WHERE booking_id = NEW.booking_id)
        LOOP
            UPDATE SCHEDULE_SEAT
            SET schedule_seat_status = 'available'
            WHERE schedule_id = v_row.schedule_id
            AND seat_number = v_row.seat_number;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_booking_cancel ON BOOKING;
CREATE TRIGGER trg_booking_cancel
AFTER UPDATE ON BOOKING
FOR EACH ROW
EXECUTE FUNCTION trg_free_seats_on_cancel();


-- ============================================================
-- 2. TRIGGER - Cancel all bookings when schedule cancelled
-- ============================================================

CREATE OR REPLACE FUNCTION trg_cancel_schedule_bookings()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.schedule_status = 'active' 
       AND NEW.schedule_status = 'cancelled' THEN
       
        UPDATE BOOKING
        SET booking_status = 'cancelled'
        WHERE schedule_id = NEW.schedule_id
        AND booking_status = 'confirmed';

        UPDATE SCHEDULE_SEAT
        SET schedule_seat_status = 'cancelled'
        WHERE schedule_id = NEW.schedule_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_schedule_cancel ON SCHEDULE;
CREATE TRIGGER trg_schedule_cancel
AFTER UPDATE ON SCHEDULE
FOR EACH ROW
EXECUTE FUNCTION trg_cancel_schedule_bookings();
