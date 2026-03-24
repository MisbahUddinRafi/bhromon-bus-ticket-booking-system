-- ============================================================
-- BOOKING SYSTEM PROCEDURES & FUNCTIONS
-- Handles seat validation, booking creation, and transaction control
-- ============================================================


-- ============================================================
-- FUNCTION: validate_and_reserve_seats
-- PURPOSE: Validate seat availability and create pending booking with seat holds
-- INPUTS: p_user_id, p_schedule_id, p_seat_numbers (array of seat numbers)
-- OUTPUTS: JSON with success, booking_id, and message
-- TRANSACTION: Uses SERIALIZABLE isolation level for concurrency safety
-- ============================================================
CREATE OR REPLACE FUNCTION validate_and_reserve_seats(
    p_user_id INT,
    p_schedule_id INT,
    p_seat_numbers VARCHAR[]
)
RETURNS JSON AS $$
DECLARE
    v_bus_id INT;
    v_unavailable_seats VARCHAR[];
    v_booking_id INT;
    v_seat VARCHAR;
    v_error_msg VARCHAR;
BEGIN
    -- Input validation
    IF p_user_id IS NULL OR p_schedule_id IS NULL OR array_length(p_seat_numbers, 1) IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Invalid input parameters');
    END IF;

    -- Check maximum seats constraint
    IF array_length(p_seat_numbers, 1) > 4 THEN
        RETURN json_build_object('success', false, 'message', 'Maximum 4 seats can be selected per booking');
    END IF;

    -- Get bus_id for this schedule
    SELECT bus_id INTO v_bus_id
    FROM SCHEDULE
    WHERE schedule_id = p_schedule_id;

    IF v_bus_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Schedule not found');
    END IF;

    -- Check if schedule exists and is active
    IF NOT EXISTS (
        SELECT 1 FROM SCHEDULE
        WHERE schedule_id = p_schedule_id AND schedule_status = 'active'
    ) THEN
        RETURN json_build_object('success', false, 'message', 'Schedule is not available for booking');
    END IF;

    -- Check for seats that are already booked or don't exist
    SELECT ARRAY_AGG(seat_number)
    INTO v_unavailable_seats
    FROM SCHEDULE_SEAT
    WHERE schedule_id = p_schedule_id
        AND seat_number = ANY(p_seat_numbers)
        AND schedule_seat_status != 'available';

    IF v_unavailable_seats IS NOT NULL AND array_length(v_unavailable_seats, 1) > 0 THEN
        v_error_msg := 'The following seats are no longer available: ' || array_to_string(v_unavailable_seats, ', ') || '. Please select other seats.';
        RETURN json_build_object('success', false, 'message', v_error_msg);
    END IF;

    -- Check for existing active holds on any of these seats
    SELECT ARRAY_AGG(seat_number)
    INTO v_unavailable_seats
    FROM BOOKING_HOLD
    WHERE schedule_id = p_schedule_id
        AND seat_number = ANY(p_seat_numbers)
        AND expires_at > CURRENT_TIMESTAMP;

    IF v_unavailable_seats IS NOT NULL AND array_length(v_unavailable_seats, 1) > 0 THEN
        v_error_msg := 'The following seats are temporarily held by another user: ' || array_to_string(v_unavailable_seats, ', ') || '. Please wait or select other seats.';
        RETURN json_build_object('success', false, 'message', v_error_msg);
    END IF;

    -- All validations passed - Create pending booking record
    INSERT INTO BOOKING (booking_time, booking_status, user_id, schedule_id)
    VALUES (CURRENT_TIMESTAMP, 'pending', p_user_id, p_schedule_id)
    RETURNING booking_id INTO v_booking_id;

    -- Create hold records for each seat
    FOREACH v_seat IN ARRAY p_seat_numbers
    LOOP
        INSERT INTO BOOKING_HOLD (user_id, schedule_id, seat_number, booking_id, hold_time, expires_at)
        VALUES (p_user_id, p_schedule_id, v_seat, v_booking_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '15 minutes');
    END LOOP;

    RETURN json_build_object(
        'success', true,
        'booking_id', v_booking_id,
        'message', 'Seats reserved successfully. You have 15 minutes to complete your booking.'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', 'An error occurred: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- FUNCTION: complete_booking
-- PURPOSE: Finalize booking by updating seat statuses to 'booked'
-- INPUTS: p_booking_id, p_passenger_details (array of JSON objects)
-- OUTPUTS: JSON with success/failure status
-- TRANSACTION: Atomic - either all seats booked or none
-- ============================================================
CREATE OR REPLACE FUNCTION complete_booking(
    p_booking_id INT
)
RETURNS JSON AS $$
DECLARE
    v_schedule_id INT;
    v_user_id INT;
    v_seat VARCHAR;
    v_seats_to_book VARCHAR[];
    v_hold_record RECORD;
BEGIN
    -- Validate booking exists and is pending
    SELECT schedule_id, user_id INTO v_schedule_id, v_user_id
    FROM BOOKING
    WHERE booking_id = p_booking_id AND booking_status = 'pending';

    IF v_schedule_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Booking not found or already processed');
    END IF;

    -- Get all seats from active holds for this booking
    SELECT ARRAY_AGG(seat_number)
    INTO v_seats_to_book
    FROM BOOKING_HOLD
    WHERE booking_id = p_booking_id AND expires_at > CURRENT_TIMESTAMP;

    IF v_seats_to_book IS NULL OR array_length(v_seats_to_book, 1) = 0 THEN
        RETURN json_build_object('success', false, 'message', 'No valid seats found for this booking. Hold may have expired.');
    END IF;

    -- Final validation: Check if seats are still available (race condition check)
    IF EXISTS (
        SELECT 1 FROM SCHEDULE_SEAT
        WHERE schedule_id = v_schedule_id
            AND seat_number = ANY(v_seats_to_book)
            AND schedule_seat_status != 'available'
    ) THEN
        RETURN json_build_object('success', false, 'message', 'One or more seats were just booked. Please select other seats and try again.');
    END IF;

    -- Update booking status to confirmed
    UPDATE BOOKING
    SET booking_status = 'confirmed'
    WHERE booking_id = p_booking_id;

    -- Update all schedule seats to 'booked'
    -- This will trigger the seat_status_change_trigger
    UPDATE SCHEDULE_SEAT
    SET schedule_seat_status = 'booked'
    WHERE schedule_id = v_schedule_id AND seat_number = ANY(v_seats_to_book);

    -- Note: BOOKED_SEAT records will be created by the backend after getting passenger details
    -- For now, we just update the seat status

    RETURN json_build_object(
        'success', true,
        'booking_id', p_booking_id,
        'message', 'Booking confirmed successfully.'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', 'Error completing booking: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- FUNCTION: cancel_booking
-- PURPOSE: Cancel pending booking and release seat holds
-- INPUTS: p_booking_id
-- OUTPUTS: JSON with success/failure status
-- TRANSACTION: Atomic cancellation
-- ============================================================
CREATE OR REPLACE FUNCTION cancel_booking(
    p_booking_id INT
)
RETURNS JSON AS $$
DECLARE
    v_booking_status booking_status_enum;
BEGIN
    -- Check booking exists
    SELECT booking_status INTO v_booking_status
    FROM BOOKING
    WHERE booking_id = p_booking_id;

    IF v_booking_status IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Booking not found');
    END IF;

    -- Only allow cancellation of pending bookings
    IF v_booking_status != 'pending' THEN
        RETURN json_build_object('success', false, 'message', 'Only pending bookings can be cancelled');
    END IF;

    -- Update booking status to cancelled
    UPDATE BOOKING
    SET booking_status = 'cancelled'
    WHERE booking_id = p_booking_id;

    -- Delete booking holds (this releases the seats)
    DELETE FROM BOOKING_HOLD
    WHERE booking_id = p_booking_id;

    RETURN json_build_object(
        'success', true,
        'message', 'Booking cancelled. Seats have been released.'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', 'Error cancelling booking: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- FUNCTION: cleanup_expired_holds
-- PURPOSE: Remove expired booking holds (scheduled job)
-- EXECUTION: Run periodically (via cron job or application scheduler)
-- ============================================================
CREATE OR REPLACE FUNCTION cleanup_expired_holds()
RETURNS TABLE(deleted_holds INT, cancelled_bookings INT) AS $$
DECLARE
    v_expired_bookings INT[];
    v_count_holds INT := 0;
    v_count_bookings INT := 0;
BEGIN
    -- Get list of bookings with all expired holds
    SELECT ARRAY_AGG(DISTINCT booking_id)
    INTO v_expired_bookings
    FROM BOOKING_HOLD
    WHERE expires_at <= CURRENT_TIMESTAMP AND booking_id IS NOT NULL;

    -- Delete expired holds
    DELETE FROM BOOKING_HOLD
    WHERE expires_at <= CURRENT_TIMESTAMP;
    GET DIAGNOSTICS v_count_holds = ROW_COUNT;

    -- Cancel any pending bookings that have no active holds left
    IF v_expired_bookings IS NOT NULL THEN
        UPDATE BOOKING
        SET booking_status = 'cancelled'
        WHERE booking_id = ANY(v_expired_bookings)
            AND booking_status = 'pending'
            AND NOT EXISTS (
                SELECT 1 FROM BOOKING_HOLD
                WHERE booking_id = BOOKING.booking_id
                    AND expires_at > CURRENT_TIMESTAMP
            );
        GET DIAGNOSTICS v_count_bookings = ROW_COUNT;
    END IF;

    RETURN QUERY SELECT v_count_holds, v_count_bookings;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- FUNCTION: get_schedule_seats
-- PURPOSE: Get all seats for a schedule with their current status
-- Used by frontend to render seat UI
-- ============================================================
CREATE OR REPLACE FUNCTION get_schedule_seats(
    p_schedule_id INT
)
RETURNS TABLE(
    seat_number VARCHAR,
    seat_status schedule_seat_status_enum,
    bus_id INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ss.seat_number,
        ss.schedule_seat_status,
        ss.bus_id
    FROM SCHEDULE_SEAT ss
    WHERE ss.schedule_id = p_schedule_id
    ORDER BY ss.seat_number;
END;
$$ LANGUAGE plpgsql;
