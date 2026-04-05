/**
 * ============================================================
 * PASSENGER INFO MODULE
 * ============================================================
 * Handles passenger details collection and validation
 */

const BASE_URL = `${window.location.protocol}//${window.location.hostname}:3000`;
const BOOKING_API = `${BASE_URL}/api/customer`;
const user = JSON.parse(localStorage.getItem('user'));

if (!user || user.role !== 'customer') {
    localStorage.clear();
    window.location.href = '../login.html';
}


// ================= HEADER =================
function goDashboard() {
    if (user.role === 'customer') {
        window.location.href = './customerDashboard.html';
    } else if (user.role === 'admin') {
        window.location.href = './adminDashboard.html';
    } else {
        localStorage.clear();
        window.location.href = '../index.html';
    }
}

function toggleProfile() {
    const menu = document.getElementById('profileMenu');
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}
function goToProfile() { window.location.href = '../pages/profile.html'; }
function logout() { localStorage.clear(); window.location.href = '../index.html'; }



// Passenger Info State
let passengerState = {
    scheduleId: null,
    selectedSeats: [],
    scheduleDetails: null,
    passengers: {},  // { 'S1': { name: '', gender: '' }, ... }
    contactInfo: {
        phone: '',
        email: ''
    }
};

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Get data from sessionStorage (passed from booking modal)
        const bookingData = sessionStorage.getItem('bookingData');

        if (!bookingData) {
            showError('Invalid Session', 'Booking data not found. Redirecting to schedules...');
            setTimeout(() => {
                window.location.href = `schedules.html?from=${passengerState.scheduleDetails.from_city_id}&to=${passengerState.scheduleDetails.to_city_id}&date=${passengerState.scheduleDetails.journey_date}`;
            }, 2000);
            return;
        }

        const data = JSON.parse(bookingData);
        passengerState.scheduleId = data.scheduleId;
        passengerState.selectedSeats = data.selectedSeats;
        passengerState.scheduleDetails = data.scheduleDetails;

        // Setup profile info
        if (user) {
            passengerState.contactInfo.phone = user.phone_number || '';
            passengerState.contactInfo.email = user.email || '';
        }

        // Validate seat availability before proceeding
        await validateSeatsBeforePage();

        // Populate contact info
        document.getElementById('contactPhone').value = passengerState.contactInfo.phone;
        document.getElementById('contactEmail').value = passengerState.contactInfo.email;

        // Populate schedule details
        populateScheduleDetails();

        // Create passenger forms
        createPassengerForms();

    } catch (err) {
        console.error('Error initializing passenger info:', err);
        showError('Error', 'Failed to load passenger information. Please try again.');
    }
});

/**
 * Validate seat availability before showing the page
 * This is the FIRST validation as per requirements
 */
async function validateSeatsBeforePage() {
    const user = JSON.parse(localStorage.getItem('user'));

    try {
        // Fetch current seat status
        const seatsRes = await fetch(`${BOOKING_API}/schedule-seats/${passengerState.scheduleId}`, {
            headers: { 'x-user': JSON.stringify(user) }
        });

        if (!seatsRes.ok) {
            throw new Error('Failed to validate seats');
        }

        const seatsData = await seatsRes.json();
        const seatStatusMap = {};
        seatsData.seats.forEach(seat => {
            seatStatusMap[seat.seat_number] = seat.schedule_seat_status;
        });

        // Check if any selected seat is no longer available
        const unavailableSeats = [];
        passengerState.selectedSeats.forEach(seatNum => {
            if (seatStatusMap[seatNum] !== 'available') {
                unavailableSeats.push(seatNum);
            }
        });

        if (unavailableSeats.length > 0) {
            const message = `The following seat(s) are no longer available: ${unavailableSeats.join(', ')}\n\nPlease select different seats.`;
            showError('Seats Unavailable', message);

            // Clear session and redirect
            sessionStorage.removeItem('bookingData');
            setTimeout(() => {
                window.location.href = `schedules.html?from=${passengerState.scheduleDetails.from_city_id}&to=${passengerState.scheduleDetails.to_city_id}&date=${passengerState.scheduleDetails.journey_date}`;
            }, 3000);

            throw new Error('Unavailable seats detected');
        }

    } catch (err) {
        throw err;
    }
}

/**
 * Populate schedule details on right side
 */
function populateScheduleDetails() {
    const details = passengerState.scheduleDetails;
    const price = parseFloat(details.price);
    const totalFare = price * passengerState.selectedSeats.length;

    document.getElementById('detailOperator').textContent = details.operator_name || '—';
    document.getElementById('detailRoute').textContent =
        `${details.from_city} → ${details.to_city}`;
    document.getElementById('detailDate').textContent = details.journey_date || '—';
    document.getElementById('detailTime').textContent = details.departure_time || '—';
    document.getElementById('detailSeats').textContent = passengerState.selectedSeats.join(', ');
    document.getElementById('detailPrice').textContent = `৳${price.toFixed(2)}`;
    document.getElementById('detailTotalFare').textContent = `৳${totalFare.toFixed(2)}`;
}

/**
 * Create passenger detail forms for each selected seat
 */
function createPassengerForms() {
    const container = document.getElementById('passengersContainer');
    container.innerHTML = '';

    passengerState.selectedSeats.forEach(seatNum => {
        if (!passengerState.passengers[seatNum]) {
            passengerState.passengers[seatNum] = { name: '', gender: '' };
        }

        const item = document.createElement('div');
        item.className = 'passenger-item';
        item.innerHTML = `
            <div class="passenger-seat-number">Seat ${seatNum}</div>
            
            <div class="passenger-form-group">
                <label for="passenger-name-${seatNum}">Passenger Name</label>
                <input 
                    type="text" 
                    id="passenger-name-${seatNum}"
                    class="passenger-name-input"
                    placeholder="Full name (letters and spaces only, 3-50 chars)"
                    data-seat="${seatNum}"
                />
                <div class="error-message"></div>
            </div>

            <div class="passenger-form-group">
                <label>Gender</label>
                <div class="gender-options">
                    <div class="gender-option">
                        <input 
                            type="radio" 
                            name="gender-${seatNum}" 
                            id="gender-male-${seatNum}"
                            value="male"
                            data-seat="${seatNum}"
                            class="passenger-gender-input"
                        />
                        <label for="gender-male-${seatNum}">Male</label>
                    </div>
                    <div class="gender-option">
                        <input 
                            type="radio" 
                            name="gender-${seatNum}" 
                            id="gender-female-${seatNum}"
                            value="female"
                            data-seat="${seatNum}"
                            class="passenger-gender-input"
                        />
                        <label for="gender-female-${seatNum}">Female</label>
                    </div>
                </div>
                <div class="error-message"></div>
            </div>
        `;

        // Add change listeners
        const nameInput = item.querySelector(`#passenger-name-${seatNum}`);
        nameInput.addEventListener('change', (e) => {
            passengerState.passengers[seatNum].name = e.target.value;
        });

        const genderInputs = item.querySelectorAll(`.passenger-gender-input[data-seat="${seatNum}"]`);
        genderInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                passengerState.passengers[seatNum].gender = e.target.value;
            });
        });

        container.appendChild(item);
    });
}

// ============================================================
// VALIDATION FUNCTIONS
// ============================================================

/**
 * Validate name (letters and spaces only, 3-50 characters)
 */
function isValidName(name) {
    return /^[A-Za-z ]{3,50}$/.test(name);
}

/**
 * Validate email format
 */
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Normalize Bangladesh phone number
 * Handles +880 prefix conversion to 0
 */
function normalizeBDPhone(phone) {
    phone = phone.replace(/\s+/g, "");

    if (phone.startsWith("+880")) {
        phone = phone.replace("+880", "0");
    }

    return phone;
}

/**
 * Validate Bangladesh phone number
 * Valid prefixes: 012, 013, 014, 015, 016, 017, 018, 019
 */
function isValidBDPhone(phone) {
    return /^(012|013|014|015|016|017|018|019)\d{8}$/.test(phone);
}

/**
 * Clear all error messages
 */
function clearErrors() {
    document.querySelectorAll('.error-message').forEach(msg => {
        msg.classList.remove('show');
        msg.textContent = '';
    });
    document.querySelectorAll('input').forEach(input => {
        input.classList.remove('error');
    });
}

/**
 * Show error for a specific field
 */
function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.classList.add('error');
        const errorMsg = field.parentElement.querySelector('.error-message');
        if (errorMsg) {
            errorMsg.textContent = message;
            errorMsg.classList.add('show');
        }
    }
}

/**
 * Validate all passenger inputs (BEFORE payment validation)
 */
function validatePassengerInputs() {
    clearErrors();
    let isValid = true;

    // Validate each passenger
    passengerState.selectedSeats.forEach(seatNum => {
        const nameInput = document.getElementById(`passenger-name-${seatNum}`);
        const nameValue = nameInput.value.trim();

        // Validate name (letters and spaces, 3-50 chars)
        if (!nameValue) {
            showFieldError(`passenger-name-${seatNum}`, 'Passenger name is required');
            isValid = false;
        } else if (!isValidName(nameValue)) {
            showFieldError(`passenger-name-${seatNum}`, 'Name must contain only letters and spaces (3-50 characters)');
            isValid = false;
        }

        // Validate gender
        const genderSelected = document.querySelector(`input[name="gender-${seatNum}"]:checked`);
        if (!genderSelected) {
            const genderOptions = document.querySelector(`.passenger-item .gender-options`);
            const errorMsg = genderOptions.parentElement.querySelector('.error-message');
            if (errorMsg) {
                errorMsg.textContent = 'Please select a gender';
                errorMsg.classList.add('show');
            }
            isValid = false;
        }
    });

    return isValid;
}

/**
 * Validate contact info (phone & email)
 */
function validateContactInfo() {
    clearErrors();
    let isValid = true;

    let phone = document.getElementById('contactPhone').value.trim();
    const email = document.getElementById('contactEmail').value.trim();

    // Normalize and validate phone
    if (!phone) {
        showFieldError('contactPhone', 'Phone number is required');
        isValid = false;
    } else {
        const normalizedPhone = normalizeBDPhone(phone);
        if (!isValidBDPhone(normalizedPhone)) {
            showFieldError('contactPhone', 'Please enter a valid Bangladesh phone number (e.g., 01700000000 or +8801700000000)');
            isValid = false;
        }
    }

    // Validate email
    if (!email) {
        showFieldError('contactEmail', 'Email is required');
        isValid = false;
    } else if (!isValidEmail(email)) {
        showFieldError('contactEmail', 'Please enter a valid email address');
        isValid = false;
    }

    return isValid;
}

// ============================================================
// PAYMENT FLOW
// ============================================================

/**
 * Proceed to payment
 * This is the SECOND validation as per requirements
 */
async function proceedToPayment() {
    // First validate all passenger inputs
    if (!validatePassengerInputs()) {
        showError('Validation Error', 'Please fill in all passenger details correctly.');
        return;
    }

    // Then validate contact info
    if (!validateContactInfo()) {
        showError('Validation Error', 'Please provide valid phone number and email.');
        return;
    }

    const user = JSON.parse(localStorage.getItem('user'));
    const btn = document.getElementById('proceedPaymentBtn');
    const btnText = btn.textContent;

    try {
        btn.disabled = true;
        btn.textContent = 'Validating seats...';

        // SECOND VALIDATION: Validate seat availability again
        await validateSeatsBeforePayment();

        // Normalize phone number before storing
        const normalizedPhone = normalizeBDPhone(document.getElementById('contactPhone').value.trim());

        // Collect passenger data from form inputs
        passengerState.selectedSeats.forEach(seatNum => {
            const nameInput = document.getElementById(`passenger-name-${seatNum}`);
            const genderInput = document.querySelector(`input[name="gender-${seatNum}"]:checked`);
            passengerState.passengers[seatNum] = {
                name: nameInput.value.trim(),
                gender: genderInput ? genderInput.value : ''
            };
        });

        btn.textContent = 'Creating booking...';

        // Create pending booking via API
        const bookingRes = await fetch(`${BOOKING_API}/create-booking`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user': JSON.stringify(user)
            },
            body: JSON.stringify({
                scheduleId: passengerState.scheduleId,
                seats: passengerState.selectedSeats
            })
        });

        const bookingData = await bookingRes.json();

        if (!bookingRes.ok || !bookingData.success) {
            throw new Error(bookingData.message || 'Failed to create booking');
        }

        // Store all data in sessionStorage for payment page
        sessionStorage.setItem('paymentData', JSON.stringify({
            bookingId: bookingData.bookingId,
            scheduleId: passengerState.scheduleId,
            selectedSeats: passengerState.selectedSeats,
            passengers: passengerState.passengers,
            contactPhone: normalizedPhone,
            contactEmail: document.getElementById('contactEmail').value.trim(),
            scheduleDetails: passengerState.scheduleDetails
        }));

        // Redirect to payment page
        showSuccess('Ready for Payment', 'Redirecting to payment...');
        setTimeout(() => {
            window.location.href = './payment.html';
        }, 1000);

    } catch (err) {
        console.error('Error in proceeding to payment:', err);
        btn.disabled = false;
        btn.textContent = btnText;

        if (!err.message.includes('Unavailable seats')) {
            showError('Error', err.message || 'Failed to proceed to payment. Please try again.');
        }
    }
}

/**
 * Validate seat availability BEFORE payment
 * This is the SECOND validation (right before payment processing)
 */
async function validateSeatsBeforePayment() {
    const user = JSON.parse(localStorage.getItem('user'));

    try {
        // Fetch current seat status
        const seatsRes = await fetch(`${BOOKING_API}/schedule-seats/${passengerState.scheduleId}`, {
            headers: { 'x-user': JSON.stringify(user) }
        });

        if (!seatsRes.ok) {
            throw new Error('Failed to validate seats');
        }

        const seatsData = await seatsRes.json();
        const seatStatusMap = {};
        seatsData.seats.forEach(seat => {
            seatStatusMap[seat.seat_number] = seat.schedule_seat_status;
        });

        // Check if any selected seat is no longer available
        const unavailableSeats = [];
        passengerState.selectedSeats.forEach(seatNum => {
            if (seatStatusMap[seatNum] !== 'available') {
                unavailableSeats.push(seatNum);
            }
        });

        if (unavailableSeats.length > 0) {
            const message = `The following seat(s) were booked by another user: ${unavailableSeats.join(', ')}\n\nPlease select different seats.`;
            showError('Seats No Longer Available', message);

            // Clear session and redirect
            sessionStorage.removeItem('bookingData');
            sessionStorage.removeItem('passengerData');

            setTimeout(() => {
                window.location.href = `schedules.html?from=${passengerState.scheduleDetails.from_city_id}&to=${passengerState.scheduleDetails.to_city_id}&date=${passengerState.scheduleDetails.journey_date}`;
            }, 3000);

            throw new Error('Unavailable seats detected before payment');
        }

    } catch (err) {
        throw err;
    }
}

/**
 * Go back to schedules page
 */
function goBackToSchedules() {
    sessionStorage.removeItem('bookingData');
    sessionStorage.removeItem('passengerData');
    window.location.href = `schedules.html?from=${passengerState.scheduleDetails.from_city_id}&to=${passengerState.scheduleDetails.to_city_id}&date=${passengerState.scheduleDetails.journey_date}`;
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================


