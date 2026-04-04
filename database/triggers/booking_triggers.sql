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






-- ======================================================
--      2. REFUND function for user booking cancellation 
-- ======================================================

CREATE OR REPLACE FUNCTION refund_booking_cancellation(
    p_booking_id INT,
    p_payment_type payment_type_enum
)
RETURNS BOOLEAN AS $$

DECLARE
    v_departure_timestamp TIMESTAMP;
    v_remaining_hours INT;
    v_booked_seats INT;

    v_payment_amount NUMERIC(10,2);
    v_service_charge NUMERIC(10,2) := 20;

    v_amount_without_service_charge NUMERIC(10,2);
    v_refund_percentage INT := 0;
    v_refund_amount NUMERIC(10,2) := 0;

BEGIN

    -- check if already refunded
    IF EXISTS (
        SELECT 1 FROM payment
        WHERE booking_id = p_booking_id
        AND payment_reason = 'refund'
    ) THEN
        RETURN FALSE;
    END IF;


    -- 1. Get departure timestamp
    SELECT (s.journey_date + s.departure_time)
    INTO v_departure_timestamp
    FROM booking b
    JOIN schedule s ON s.schedule_id = b.schedule_id
    WHERE b.booking_id = p_booking_id;

    IF v_departure_timestamp IS NULL THEN
        RETURN FALSE;
    END IF;


    -- 2. Count booked seats
    SELECT COUNT(*) INTO v_booked_seats
    FROM booked_seat
    WHERE booking_id = p_booking_id;


    -- 3. Get total paid amount (IMPORTANT: sum)
    SELECT COALESCE(SUM(payment_amount), 0)
    INTO v_payment_amount
    FROM payment
    WHERE booking_id = p_booking_id
      AND payment_reason = 'ticket_purchase';


    -- 4. Remove service charge
    v_amount_without_service_charge :=
        v_payment_amount - (v_booked_seats * v_service_charge);

    IF v_amount_without_service_charge < 0 THEN
        RETURN FALSE; 
    END IF;


    -- 5. Calculate remaining hours (CORRECTED)
    v_remaining_hours :=
        FLOOR(EXTRACT(EPOCH FROM (v_departure_timestamp - NOW())) / 3600);


    -- 6. Refund logic (your policy FIXED)
    IF v_remaining_hours >= 72 THEN
        v_refund_percentage := 95;
    ELSIF v_remaining_hours >= 48 THEN
        v_refund_percentage := 90;
    ELSIF v_remaining_hours >= 36 THEN
        v_refund_percentage := 75;
    ELSIF v_remaining_hours >= 24 THEN
        v_refund_percentage := 70;
    ELSIF v_remaining_hours >= 18 THEN
        v_refund_percentage := 65;
    ELSIF v_remaining_hours >= 12 THEN
        v_refund_percentage := 60;
    ELSIF v_remaining_hours >= 6 THEN
        v_refund_percentage := 50;
    ELSIF v_remaining_hours >= 2 THEN
        v_refund_percentage := 10; 
    ELSIF v_remaining_hours > 0 THEN
        v_refund_percentage := 0;
    ELSE 
        RETURN FALSE;     -- tried to refund after expiration of trip
    END IF;


    -- 7. Calculate refund amount (FIXED division)
    v_refund_amount :=
        v_amount_without_service_charge * (v_refund_percentage / 100.0);


    -- 8. Insert refund record
    INSERT INTO payment (
        booking_id,
        payment_amount,
        payment_type,
        payment_reason
    )
    VALUES (
        p_booking_id,
        v_refund_amount,
        p_payment_type,
        'refund'
    );

    RETURN TRUE;

EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;

$$ LANGUAGE plpgsql;



-- ============================================================
-- 3. TRIGGER - Cancel all bookings when schedule cancelled
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


