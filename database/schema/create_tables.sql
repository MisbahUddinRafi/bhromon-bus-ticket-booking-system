-- create all necessary tables for the application


--- necessary enum types
CREATE TYPE user_role_enum AS ENUM ('admin', 'customer');
CREATE TYPE user_status_enum AS ENUM ('active', 'deleted');
CREATE TYPE bus_type_enum AS ENUM ('ac', 'non-ac');
CREATE TYPE schedule_status_enum AS ENUM ('active', 'cancelled', 'completed');
CREATE TYPE schedule_seat_status_enum AS ENUM ('available', 'booked', 'cancelled');
CREATE TYPE booking_status_enum AS ENUM ('pending', 'confirmed', 'cancelled');
CREATE TYPE payment_type_enum AS ENUM ('cash', 'card', 'bkash', 'nagad');
CREATE TYPE payment_reason_enum AS ENUM ('ticket_purchase', 'refund');
CREATE TYPE gender_enum AS ENUM ('male', 'female');


--- Table: USERS
CREATE TABLE USERS (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role user_role_enum NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_status user_status_enum NOT NULL DEFAULT 'active',

    CONSTRAINT user_phone_number_check 
    CHECK (phone_number ~ '^[0-9]{11}$')
);



-- Table: BUS_OPERATOR
CREATE TABLE BUS_OPERATOR (
    operator_id SERIAL PRIMARY KEY,
    operator_name VARCHAR(100) NOT NULL,
    contact_number VARCHAR(20) NOT NULL
);


-- Table: CITY
CREATE TABLE CITY (
    city_id SERIAL PRIMARY KEY,
    city_name VARCHAR(100) UNIQUE NOT NULL
);



-- Table: BUS
CREATE TABLE BUS (
    bus_id SERIAL PRIMARY KEY,
    bus_number VARCHAR(50) UNIQUE NOT NULL,
    bus_type bus_type_enum NOT NULL,
    operator_id INT NOT NULL,

    CONSTRAINT fk_bus_operator
        FOREIGN KEY (operator_id)
        REFERENCES BUS_OPERATOR(operator_id)
        -- ON DELETE RESTRICT           -- default behavior in postgresql
);


-- Table: BUS_SEAT
CREATE TABLE BUS_SEAT (
    bus_id INT NOT NULL,
    seat_number VARCHAR(10) NOT NULL,

    PRIMARY KEY (bus_id, seat_number),

    CONSTRAINT fk_seat_bus
        FOREIGN KEY (bus_id)
        REFERENCES BUS(bus_id)
        ON DELETE CASCADE
);



-- Table: ROUTE
CREATE TABLE ROUTE (
    route_id SERIAL PRIMARY KEY,
    source_city_id INT NOT NULL,
    destination_city_id INT NOT NULL,

    CONSTRAINT fk_route_source
        FOREIGN KEY (source_city_id)
        REFERENCES CITY(city_id),

    CONSTRAINT fk_route_destination
        FOREIGN KEY (destination_city_id)
        REFERENCES CITY(city_id),

    CONSTRAINT unique_route
        UNIQUE (source_city_id, destination_city_id),

    CHECK (source_city_id <> destination_city_id)
);



-- Table: SCHEDULE
CREATE TABLE SCHEDULE (
    schedule_id SERIAL PRIMARY KEY,
    journey_date DATE NOT NULL,
    departure_time TIME NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    schedule_status schedule_status_enum NOT NULL,
    bus_id INT NOT NULL,
    route_id INT NOT NULL,

    CONSTRAINT fk_schedule_bus
        FOREIGN KEY (bus_id)
        REFERENCES BUS(bus_id),

    CONSTRAINT fk_schedule_route
        FOREIGN KEY (route_id)
        REFERENCES ROUTE(route_id),

    CHECK (price >= 0)
);



-- Table: SCHEDULE_SEAT
CREATE TABLE SCHEDULE_SEAT (
    schedule_id INT NOT NULL,
    bus_id INT NOT NULL,
    seat_number VARCHAR(10) NOT NULL,
    schedule_seat_status schedule_seat_status_enum NOT NULL,

    PRIMARY KEY (schedule_id, seat_number),

    CONSTRAINT fk_schedule_seat_schedule
        FOREIGN KEY (schedule_id)
        REFERENCES SCHEDULE(schedule_id)
        ON DELETE CASCADE, 
    
    CONSTRAINT fk_schedule_seat_bus_seat
        FOREIGN KEY (bus_id, seat_number)
        REFERENCES BUS_SEAT(bus_id, seat_number)
);



--- Table: BOOKING
CREATE TABLE BOOKING (
    booking_id SERIAL PRIMARY KEY,
    booking_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    booking_status booking_status_enum NOT NULL,
    user_id INT NOT NULL,
    schedule_id INT NOT NULL,

    CONSTRAINT fk_booking_user
        FOREIGN KEY (user_id)
        REFERENCES USERS(user_id),

    CONSTRAINT fk_booking_schedule
        FOREIGN KEY (schedule_id)
        REFERENCES SCHEDULE(schedule_id)
);



--- Table: BOOKED_SEAT
CREATE TABLE BOOKED_SEAT (
    booking_id INT NOT NULL,
    schedule_id INT NOT NULL,
    seat_number VARCHAR(10) NOT NULL,
    passenger_name VARCHAR(100) NOT NULL,
    passenger_gender gender_enum NOT NULL,

    PRIMARY KEY (booking_id, seat_number),

    FOREIGN KEY (booking_id)
        REFERENCES booking(booking_id)
        ON DELETE CASCADE,

    FOREIGN KEY (schedule_id, seat_number)
        REFERENCES schedule_seat(schedule_id, seat_number)
);



--- Table: PAYMENT
CREATE TABLE PAYMENT (
    payment_id SERIAL PRIMARY KEY,
    payment_amount NUMERIC(10,2) NOT NULL,
    payment_type payment_type_enum NOT NULL,
    payment_reason payment_reason_enum,
    payment_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    booking_id INT UNIQUE NOT NULL,

    CONSTRAINT fk_payment_booking
        FOREIGN KEY (booking_id)
        REFERENCES BOOKING(booking_id)
        ON DELETE CASCADE,

    CHECK (payment_amount >= 0)
);




-- Table: RECENT_SEARCHES
CREATE TABLE RECENT_SEARCHES (
    user_id INT NOT NULL,
    route_id INT NOT NULL,
    search_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (user_id, search_time),

    CONSTRAINT fk_search_user
        FOREIGN KEY (user_id)
        REFERENCES USERS(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_search_route
        FOREIGN KEY (route_id)
        REFERENCES ROUTE(route_id)
);
