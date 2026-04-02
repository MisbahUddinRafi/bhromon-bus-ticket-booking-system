-- booking related functions

-- ============================================================
-- 1. CONFIRM BOOKING (Main function)
-- ============================================================
-- Marks seats as booked, records passenger details and payment
-- Backend handles transaction control (BEGIN/COMMIT)

CREATE OR REPLACE FUNCTION confirm_booking(
    p_booking_id INT,
    p_user_id INT,
    p_schedule_id INT,
    p_seat_numbers VARCHAR[],
    p_passenger_names TEXT[],
    p_passenger_genders TEXT[],
    p_payment_amount NUMERIC, 
    p_payment_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_seat_count INT;
    v_total_seats INT;
    i INT;
BEGIN
    v_total_seats := array_length(p_seat_numbers, 1);

    -- Lock selected seats
    PERFORM 1 FROM SCHEDULE_SEAT
    WHERE schedule_id = p_schedule_id
    AND seat_number = ANY(p_seat_numbers)
    FOR UPDATE;

    -- Verify all seats available
    SELECT COUNT(*) INTO v_seat_count
    FROM SCHEDULE_SEAT
    WHERE schedule_id = p_schedule_id
    AND seat_number = ANY(p_seat_numbers)
    AND schedule_seat_status = 'available';

    IF v_seat_count <> v_total_seats THEN
        RAISE EXCEPTION 'Some seats are no longer available';
    END IF;

    -- Mark seats as booked
    UPDATE SCHEDULE_SEAT
    SET schedule_seat_status = 'booked'
    WHERE schedule_id = p_schedule_id
    AND seat_number = ANY(p_seat_numbers);

    -- Insert passenger details using FOR loop
    FOR i IN 1..v_total_seats LOOP
        INSERT INTO BOOKED_SEAT (
            booking_id,
            schedule_id,
            seat_number,
            passenger_name,
            passenger_gender
        )
        VALUES (
            p_booking_id,
            p_schedule_id,
            p_seat_numbers[i],
            p_passenger_names[i],
            p_passenger_genders[i]
        );
    END LOOP;

    -- Record payment
    INSERT INTO PAYMENT (
        booking_id,
        payment_amount,
        payment_type,
        payment_reason
    )
    VALUES (
        p_booking_id,
        p_payment_amount,
        p_payment_type,
        'ticket_purchase'
    );

    -- Update booking status
    UPDATE BOOKING
    SET booking_status = 'confirmed'
    WHERE booking_id = p_booking_id
    AND user_id = p_user_id;

    RETURN TRUE;

EXCEPTION WHEN OTHERS THEN
    RAISE;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- 2. CANCEL BOOKING 
-- ============================================================

CREATE OR REPLACE FUNCTION cancel_booking(p_booking_id INT)
RETURNS BOOLEAN AS $$
BEGIN
    -- check the departure time of the schedule associated with the booking
    if (NOW() + INTERVAL '6 hours') > (SELECT departure_time FROM SCHEDULE WHERE schedule_id = (SELECT schedule_id FROM BOOKING WHERE booking_id = p_booking_id)) THEN
        RAISE EXCEPTION 'Cannot cancel booking less than 6 hours before departure';
    END IF;

    -- update booking status to cancelled
    UPDATE BOOKING
    SET booking_status = 'cancelled'
    WHERE booking_id = p_booking_id 
    AND booking_status = 'confirmed';                

    RETURN TRUE;

EXCEPTION WHEN OTHERS THEN
    RAISE;
END;
$$ LANGUAGE plpgsql;




-- ============================================================
-- 3. CHECK EXISTING BOOKING FOR SCHEDULE
-- ============================================================

CREATE OR REPLACE FUNCTION count_existing_booked_seat(
    p_user_id INT, p_schedule_id INT
) 
RETURNS INTEGER AS $$

DECLARE
    v_booked_seat_count INT := 0; 
BEGIN 
    SELECT COUNT(*) INTO v_booked_seat_count
    FROM booked_seat bs
    WHERE bs.schedule_id = p_schedule_id
    AND EXISTS 
        (SELECT 1 FROM booking b
         WHERE b.booking_id = bs.booking_id 
         AND b.booking_status = 'confirmed'
         AND b.user_id = p_user_id);

    RETURN v_booked_seat_count; 
EXCEPTION WHEN OTHERS THEN
    RAISE;
END;
$$ LANGUAGE plpgsql;
