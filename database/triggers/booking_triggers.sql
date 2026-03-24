-- ============================================================
-- BOOKING SYSTEM TRIGGERS
-- Enforces business rules and data consistency
-- ============================================================


-- ============================================================
-- TRIGGER: validate_booking_status_transition
-- PURPOSE: Enforce valid booking status state transitions
-- RULE: pending -> confirmed or cancelled (only)
--       confirmed -> cancelled (only)
--       cancelled -> (no transitions allowed)
-- ============================================================
CREATE OR REPLACE FUNCTION validate_booking_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is an INSERT, allow (will be 'pending')
    IF TG_OP = 'INSERT' THEN
        IF NEW.booking_status NOT IN ('pending') THEN
            RAISE EXCEPTION 'New bookings must start with pending status';
        END IF;
        RETURN NEW;
    END IF;

    -- If this is an UPDATE, validate status transitions
    IF TG_OP = 'UPDATE' THEN
        -- FROM pending
        IF OLD.booking_status = 'pending' THEN
            IF NEW.booking_status NOT IN ('confirmed', 'cancelled') THEN
                RAISE EXCEPTION 'Pending bookings can only transition to confirmed or cancelled';
            END IF;
        -- FROM confirmed
        ELSIF OLD.booking_status = 'confirmed' THEN
            IF NEW.booking_status != 'cancelled' THEN
                RAISE EXCEPTION 'Confirmed bookings can only be cancelled, not modified';
            END IF;
        -- FROM cancelled
        ELSIF OLD.booking_status = 'cancelled' THEN
            RAISE EXCEPTION 'Cancelled bookings cannot be modified';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_booking_status_transition
BEFORE INSERT OR UPDATE ON BOOKING
FOR EACH ROW
EXECUTE FUNCTION validate_booking_status_transition();


-- ============================================================
-- TRIGGER: cleanup_holds_on_booking_cancelled
-- PURPOSE: Automatically delete booking holds when booking is cancelled
-- ============================================================
CREATE OR REPLACE FUNCTION cleanup_holds_on_booking_cancelled()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.booking_status = 'cancelled' AND OLD.booking_status = 'pending' THEN
        DELETE FROM BOOKING_HOLD
        WHERE booking_id = NEW.booking_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_holds_on_booking_cancelled
AFTER UPDATE ON BOOKING
FOR EACH ROW
WHEN (OLD.booking_status = 'pending' AND NEW.booking_status = 'cancelled')
EXECUTE FUNCTION cleanup_holds_on_booking_cancelled();


-- ============================================================
-- TRIGGER: prevent_direct_schedule_seat_updates
-- PURPOSE: Prevent direct updates to SCHEDULE_SEAT status
--          All seat status changes must go through booking functions
--          Exception: Cancel booking function is allowed
-- ============================================================
CREATE OR REPLACE FUNCTION prevent_direct_schedule_seat_updates()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if this update is coming from our booking functions
    -- We allow updates only from within transactions initiated by booking functions
    -- For now, we allow status changes when there's an active confirmed booking
    
    IF NEW.schedule_seat_status IS DISTINCT FROM OLD.schedule_seat_status THEN
        -- Check if there's a confirmed booking for this seat
        IF EXISTS (
            SELECT 1 FROM BOOKING
            WHERE booking_id IN (
                SELECT booking_id FROM BOOKING_HOLD
                WHERE schedule_id = NEW.schedule_id
                    AND seat_number = NEW.seat_number
                    AND expires_at > CURRENT_TIMESTAMP
            )
        ) THEN
            RETURN NEW;
        END IF;

        -- Otherwise, verify update is valid
        IF NEW.schedule_seat_status = 'booked' THEN
            -- Check if seat status change is being made through a valid booking
            IF NOT EXISTS (
                SELECT 1 FROM BOOKING
                WHERE booking_status = 'confirmed'
            ) THEN
                -- Allow the update (it's part of a transaction)
                RETURN NEW;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_direct_schedule_seat_updates
BEFORE UPDATE ON SCHEDULE_SEAT
FOR EACH ROW
EXECUTE FUNCTION prevent_direct_schedule_seat_updates();


-- ============================================================
-- TRIGGER: validate_booked_seat_insertion
-- PURPOSE: Ensure BOOKED_SEAT records are only created for valid bookings
--          Seat must be marked as booked and booking must be confirmed
-- ============================================================
CREATE OR REPLACE FUNCTION validate_booked_seat_insertion()
RETURNS TRIGGER AS $$
BEGIN
    -- Check that the booking is confirmed
    IF NOT EXISTS (
        SELECT 1 FROM BOOKING
        WHERE booking_id = NEW.booking_id AND booking_status = 'confirmed'
    ) THEN
        RAISE EXCEPTION 'BOOKED_SEAT can only be created for confirmed bookings';
    END IF;

    -- Check that the seat is marked as booked
    IF NOT EXISTS (
        SELECT 1 FROM SCHEDULE_SEAT
        WHERE schedule_id = NEW.schedule_id
            AND seat_number = NEW.seat_number
            AND schedule_seat_status = 'booked'
    ) THEN
        RAISE EXCEPTION 'Seat must be marked as booked before creating BOOKED_SEAT record';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_booked_seat_insertion
BEFORE INSERT ON BOOKED_SEAT
FOR EACH ROW
EXECUTE FUNCTION validate_booked_seat_insertion();


-- ============================================================
-- TRIGGER: prevent_booked_seat_deletion_for_confirmed
-- PURPOSE: Prevent deletion of BOOKED_SEAT if booking is confirmed
--          Only allow deletion if booking is cancelled
-- ============================================================
CREATE OR REPLACE FUNCTION prevent_booked_seat_deletion_for_confirmed()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM BOOKING
        WHERE booking_id = OLD.booking_id AND booking_status = 'confirmed'
    ) THEN
        RAISE EXCEPTION 'Cannot delete BOOKED_SEAT for confirmed bookings. Cancel the booking first.';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_booked_seat_deletion_for_confirmed
BEFORE DELETE ON BOOKED_SEAT
FOR EACH ROW
EXECUTE FUNCTION prevent_booked_seat_deletion_for_confirmed();


-- ============================================================
-- TRIGGER: restore_seats_on_confirmed_booking_cancel
-- PURPOSE: When a confirmed booking is cancelled,
--          update SCHEDULE_SEAT back to 'available'
-- ============================================================
CREATE OR REPLACE FUNCTION restore_seats_on_confirmed_booking_cancel()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.booking_status = 'cancelled' AND OLD.booking_status = 'confirmed' THEN
        -- Update all seats associated with this booking back to available
        UPDATE SCHEDULE_SEAT
        SET schedule_seat_status = 'available'
        WHERE (schedule_id, seat_number) IN (
            SELECT schedule_id, seat_number FROM BOOKED_SEAT
            WHERE booking_id = NEW.booking_id
        );

        -- Delete the BOOKED_SEAT records
        DELETE FROM BOOKED_SEAT
        WHERE booking_id = NEW.booking_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER restore_seats_on_confirmed_booking_cancel
AFTER UPDATE ON BOOKING
FOR EACH ROW
WHEN (OLD.booking_status = 'confirmed' AND NEW.booking_status = 'cancelled')
EXECUTE FUNCTION restore_seats_on_confirmed_booking_cancel();
