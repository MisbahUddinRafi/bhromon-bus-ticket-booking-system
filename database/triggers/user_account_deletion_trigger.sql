-- function to check if an user has any upcoming trips or not
CREATE OR REPLACE FUNCTION has_upcoming_trip(p_user_id INT)
RETURNS BOOLEAN AS $$
DECLARE
    trip_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM BOOKING b
        JOIN SCHEDULE s ON b.schedule_id = s.schedule_id
        WHERE b.user_id = p_user_id
          AND b.booking_status = 'confirmed'
          AND s.journey_date >= CURRENT_DATE
          AND s.schedule_status = 'active'
    )
    INTO trip_exists;

    RETURN trip_exists;
END;
$$ LANGUAGE plpgsql;


-- prevent account deletion if the user has upcoming trips
CREATE OR REPLACE FUNCTION prevent_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Only check when changing status to deleted
    IF NEW.user_status = 'deleted' 
       AND OLD.user_status = 'active' THEN

        IF has_upcoming_trip(OLD.user_id) THEN
            RAISE EXCEPTION 
            'Cannot delete account. You have an upcoming confirmed trip.';
        END IF;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;




-- trigger
DROP TRIGGER IF EXISTS trg_prevent_soft_delete ON USERS;

CREATE TRIGGER trg_prevent_soft_delete
BEFORE UPDATE ON USERS
FOR EACH ROW
EXECUTE FUNCTION prevent_soft_delete();

