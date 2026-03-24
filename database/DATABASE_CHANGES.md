# DATABASE CHANGES SUMMARY
## Bhromon Bus Ticket Booking System - Seat Booking Feature Implementation

**Date:** March 18, 2026  
**Purpose:** Enable safe, concurrent seat booking with transaction control and data integrity

---

## 1️⃣ TABLE ADDITIONS

### New Table: BOOKING_HOLD
**Location:** `database/schema/create_tables.sql` (added at end)

**Purpose:** Temporary hold on seats while users complete the booking process. Auto-expires after 15 minutes to prevent seat starvation.

**Schema:**
```sql
CREATE TABLE BOOKING_HOLD (
    hold_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    schedule_id INT NOT NULL,
    seat_number VARCHAR(10) NOT NULL,
    booking_id INT,
    hold_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP + INTERVAL '15 minutes',

    CONSTRAINT fk_hold_user
        FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_hold_schedule
        FOREIGN KEY (schedule_id) REFERENCES SCHEDULE(schedule_id) ON DELETE CASCADE,
    CONSTRAINT fk_hold_booking
        FOREIGN KEY (booking_id) REFERENCES BOOKING(booking_id) ON DELETE CASCADE
);
```

**Key Features:**
- `hold_id`: Unique identifier for each seat hold
- `user_id`: Customer holding the seat
- `schedule_id`: Which schedule the seat belongs to
- `seat_number`: Which seat (S1, S2, ... S32)
- `booking_id`: Link to BOOKING table (nullable until booking created)
- `expires_at`: Auto-expiry time (15 minutes to prevent starvation)

---

## 2️⃣ PROCEDURES & FUNCTIONS

### File: `database/procedures/booking_procedures.sql`

#### Function 1: `validate_and_reserve_seats()`
**Parameters:**
- `p_user_id INT` - Customer ID
- `p_schedule_id INT` - Schedule ID
- `p_seat_numbers VARCHAR[]` - Array of seat numbers to book

**Return:** JSON object
```json
{
  "success": true/false,
  "booking_id": 123,
  "message": "..."
}
```

**Logic Flow:**
1. Validates input parameters
2. Checks seat count ≤ 4
3. Verifies schedule exists and is active
4. Checks all seats are 'available' in SCHEDULE_SEAT
5. Checks no active holds exist on selected seats
6. Creates BOOKING record with status 'pending'
7. Creates BOOKING_HOLD records for each seat (15-min expiry)
8. Returns booking_id if successful

**Transaction Safety:** SERIALIZABLE isolation level (implicit in PostgreSQL)

**Used By:** Backend endpoint `/api/customer/validate-seats`

---

#### Function 2: `complete_booking()`
**Parameters:**
- `p_booking_id INT` - The booking to complete

**Return:** JSON object with success/failure

**Logic Flow:**
1. Validates booking exists and status is 'pending'
2. Retrieves all seats from active BOOKING_HOLD records
3. Final validation: Re-checks all seats are still 'available' (race condition check)
4. Updates BOOKING status to 'confirmed'
5. Updates all SCHEDULE_SEAT records to 'booked' (triggers are activated here)
6. Returns success/failure message

**Purpose:** Atomically transitioning from 'pending' to 'confirmed' state

**Used By:** Backend endpoint POST `/api/customer/complete-booking`

---

#### Function 3: `cancel_booking()`
**Parameters:**
- `p_booking_id INT` - The booking to cancel

**Return:** JSON object with success/failure

**Logic Flow:**
1. Validates booking exists
2. Checks booking status is 'pending' (only pending bookings can be cancelled)
3. Updates BOOKING status to 'cancelled'
4. Deletes all BOOKING_HOLD records (trigger cleanup_holds_on_booking_cancelled activates)
5. Returns success/failure message

**Used By:** Backend endpoint POST `/api/customer/cancel-booking/:bookingId`

---

#### Function 4: `cleanup_expired_holds()`
**Parameters:** None

**Return:** TABLE with (deleted_holds INT, cancelled_bookings INT)

**Logic Flow:**
1. Identifies all bookings with expired holds
2. Deletes all BOOKING_HOLD records where expires_at <= CURRENT_TIMESTAMP
3. Cancels any pending BOOKING records that have no active holds left
4. Returns count of affected records

**Execution:** Via scheduled job (cron) or backend scheduler (every 5-10 minutes recommended)

---

#### Function 5: `get_schedule_seats()`
**Parameters:**
- `p_schedule_id INT` - Schedule to fetch seats for

**Return:** TABLE with (seat_number VARCHAR, seat_status schedule_seat_status_enum, bus_id INT)

**Logic Flow:**
1. Queries SCHEDULE_SEAT for all seats in this schedule
2. Returns seat number, current status (available/booked/cancelled), and bus_id
3. Ordered by seat_number for consistent UI display

**Used By:** Frontend to render seat grid UI in real-time

---

## 3️⃣ TRIGGERS

### File: `database/triggers/booking_triggers.sql`

#### Trigger 1: `validate_booking_status_transition`
**Event:** BEFORE INSERT OR UPDATE on BOOKING

**Logic:**
- Enforces state machine for booking status:
  - New bookings must start as 'pending'
  - 'pending' → 'confirmed' or 'cancelled' (only)
  - 'confirmed' → 'cancelled' (only)
  - 'cancelled' → (no further transitions)

**Purpose:** Data integrity - prevents invalid state transitions

---

#### Trigger 2: `cleanup_holds_on_booking_cancelled`
**Event:** AFTER UPDATE on BOOKING (when status changes from pending → cancelled)

**Logic:**
1. When booking is cancelled, automatically delete all associated BOOKING_HOLD records
2. This releases the seats for other users

**Purpose:** Automatic cleanup of holds when user cancels pending booking

---

#### Trigger 3: `prevent_direct_schedule_seat_updates`
**Event:** BEFORE UPDATE on SCHEDULE_SEAT

**Logic:**
1. Validates that SCHEDULE_SEAT status changes only happen through booking functions
2. Prevents accidental or malicious direct updates to seat status
3. Allows updates from within booking transaction

**Purpose:** Data consistency - enforces that seats only change status through controlled booking workflow

---

#### Trigger 4: `validate_booked_seat_insertion`
**Event:** BEFORE INSERT on BOOKED_SEAT

**Logic:**
1. Verifies booking is in 'confirmed' status
2. Verifies corresponding SCHEDULE_SEAT is marked as 'booked'
3. Rejects insertion if conditions not met

**Purpose:** Data integrity - ensures BOOKED_SEAT records are only created for valid bookings

---

#### Trigger 5: `prevent_booked_seat_deletion_for_confirmed`
**Event:** BEFORE DELETE on BOOKED_SEAT

**Logic:**
1. Checks if associated booking is 'confirmed'
2. Rejects deletion if confirmed
3. Allows deletion only for cancelled bookings

**Purpose:** Prevent accidental deletion of paid seat records

---

#### Trigger 6: `restore_seats_on_confirmed_booking_cancel`
**Event:** AFTER UPDATE on BOOKING (when status changes from confirmed → cancelled)

**Logic:**
1. Finds all BOOKED_SEAT records for this booking
2. Updates their SCHEDULE_SEAT status back to 'available'
3. Deletes BOOKED_SEAT records
4. Enables re-booking of those seats by other users

**Purpose:** Automatic seat restoration when confirmed booking is cancelled

---

## 4️⃣ BOOKING WORKFLOW SUMMARY

### Sequence of Operations:

```
1. USER SELECTS SEATS (Frontend only)
   └─ Seats highlighted in browser, no DB changes

2. USER CLICKS "Next: Enter Passenger Details"
   ├─ Call: validate_and_reserve_seats(user_id, schedule_id, seat_numbers[])
   ├─ Database: Create BOOKING (pending) + BOOKING_HOLD (15 min expiry)
   ├─ If Success: Show confirmation dialog, proceed to passenger details
   └─ If Fail: Show error message (seats already booked/held)

3. USER ENTERS PASSENGER DETAILS & CONFIRMS
   ├─ Call: complete_booking(booking_id)
   ├─ Database: Validate seats still available
   ├─ Database: Update BOOKING status → 'confirmed'
   ├─ Database: Update SCHEDULE_SEAT status → 'booked' (triggers activate)
   ├─ Backend: Create BOOKED_SEAT records with passenger info
   └─ If Success: Proceed to payment

4. PAYMENT COMPLETE
   └─ Create PAYMENT record, booking is complete

5. USER CANCELS BEFORE COMPLETION
   ├─ If still pending (< 15 min): Call cancel_booking(booking_id)
   ├─ Database: BOOKING → 'cancelled', delete BOOKING_HOLD
   └─ Seats immediately released

6. USER CANCELS AFTER CONFIRMATION
   ├─ Call cancel_booking(booking_id) for confirmed booking
   ├─ Trigger: release_seats_on_booking_cancel activates
   ├─ Database: SCHEDULE_SEAT → 'available', delete BOOKED_SEAT
   └─ Refund process initiated via PAYMENT table
```

---

## 5️⃣ TRANSACTION SAFETY MECHANISMS

### Race Condition Prevention:

1. **Seat Availability Check with Lock**
   - `validate_and_reserve_seats()` checks seat status before creating holds
   - Concurrent users will get "seat already held" error if another user is mid-booking

2. **15-Minute Hold Window**
   - Prevents starvation - seats auto-released if user abandons booking
   - `cleanup_expired_holds()` removes stale holds periodically

3. **Final Validation Before Booking**
   - `complete_booking()` re-checks all seats are still available
   - If another user booked while passengers details were being entered, error is shown

4. **Atomic State Transitions**
   - BOOKING status changes and SCHEDULE_SEAT updates happen in same transaction
   - Triggers ensure related records stay consistent

5. **PostgreSQL SERIALIZABLE Isolation**
   - All booking functions execute with implicit SERIALIZABLE isolation
   - Prevents phantom reads and ensures consistency

---

## 6️⃣ INSTALLATION INSTRUCTIONS FOR NAVICAT PREMIUM

### Step 1: Add BOOKING_HOLD Table
1. Open your database in Navicat
2. Open the `create_tables.sql` file (already updated)
3. Copy the BOOKING_HOLD table definition (last table in the file)
4. Execute the SQL

### Step 2: Create Procedures & Functions
1. In Navicat, go to your database
2. Right-click on "Functions" → New Function (or use SQL editor)
3. Copy entire content of `database/procedures/booking_procedures.sql`
4. Execute each function (you can separate them if needed)
5. Verify functions appear: `validate_and_reserve_seats`, `complete_booking`, `cancel_booking`, `cleanup_expired_holds`, `get_schedule_seats`

### Step 3: Create Triggers
1. Right-click on "Triggers" → New Trigger (or use SQL editor)
2. Copy entire content of `database/triggers/booking_triggers.sql`
3. Execute all triggers
4. Verify triggers appear on respective tables (BOOKING, BOOKING_SEAT, SCHEDULE_SEAT)

### Complete SQL Scripts:

**File 1:** `database/schema/create_tables.sql` - Last section (BOOKING_HOLD table)
**File 2:** `database/procedures/booking_procedures.sql` - All functions
**File 3:** `database/triggers/booking_triggers.sql` - All triggers

---

## 7️⃣ BACKEND ENDPOINTS TO IMPLEMENT (Next Phase)

These will use the functions created above:

```
GET /api/customer/schedule-seats/:scheduleId
├─ Calls: SELECT * FROM get_schedule_seats(scheduleId)
└─ Returns: { seats: [{seat_number, status, bus_id}] }

POST /api/customer/validate-seats
├─ Input: { scheduleId, seatNumbers[] }
├─ Calls: SELECT validate_and_reserve_seats($1, $2, $3)
└─ Returns: JSON response with booking_id

POST /api/customer/complete-booking
├─ Input: { bookingId }
├─ Calls: SELECT complete_booking($1)
├─ Then: INSERT into BOOKED_SEAT (passenger details)
└─ Returns: JSON response

POST /api/customer/cancel-booking/:bookingId
├─ Calls: SELECT cancel_booking($1)
└─ Returns: JSON response

POST /api/maintenance/cleanup-expired-holds
├─ Calls: SELECT cleanup_expired_holds()
└─ Returns: count of cleaned records
```

---

## 8️⃣ TESTING CHECKLIST

- [ ] Table BOOKING_HOLD creates successfully
- [ ] All 5 functions are executable
- [ ] All 6 triggers are active on correct tables
- [ ] Test concurrent seat selections (2 users, same seats)
- [ ] Test hold expiry (wait 15 min or manipulate timestamps)
- [ ] Test booking state transitions (pending → confirmed → cancelled)
- [ ] Test automatic seat restoration on cancellation
- [ ] Test maximum 4 seats per booking constraint

---

## 📝 NOTES

- The system is designed for high concurrency - multiple users can browse/book simultaneously
- Hold expiry (15 minutes) is configurable by changing INTERVAL in create_tables.sql
- The `cleanup_expired_holds()` function should run as a background job every 5-10 minutes
- All functions return JSON for easy API integration
- Triggers provide automatic data consistency without application logic

**System is now ready for frontend implementation!**
