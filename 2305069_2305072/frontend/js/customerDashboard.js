const BASE_URL = `${window.location.protocol}//${window.location.hostname}:3000`;
const API = `${BASE_URL}/api/customer`;
const user = JSON.parse(localStorage.getItem('user'));


if (!user || user.role !== 'customer') {
    window.location.href = 'login.html';
} else {
    /* Init */
    loadDashboard();
    loadCities();
    loadRecentSearches();
    loadUpcomingTrips();
    loadPastTrips();
    setupEventListeners();
}

// Prevent back button from bypassing login
window.addEventListener('pageshow', () => {
    if (!user || user.role !== 'customer') {
        window.location.href = 'login.html';
    }
    loadDashboard();
    loadUpcomingTrips();
    loadPastTrips();
});

// Handle back/forward browser buttons
window.addEventListener('popstate', (event) => {
    event.preventDefault();
    // Push state again to prevent going back
    window.history.pushState(null, null, window.location.href);
});

function setupEventListeners() {
    // Close profile menu when clicking outside
    document.addEventListener('click', function (e) {
        const profileBtn = document.querySelector('.profile-btn');
        const profileMenu = document.getElementById('profileMenu');

        if (profileBtn && profileMenu && !profileBtn.contains(e.target) && !profileMenu.contains(e.target)) {
            profileMenu.style.display = 'none';
        }
    });

    // Prevent going back using keyboard shortcut
    document.addEventListener('keydown', function (e) {
        if (e.altKey && e.key === 'ArrowLeft') {
            e.preventDefault();
        }
    });
}

function toggleProfile() {
    const menu = document.getElementById('profileMenu');
    // Ensure menu is visible and properly positioned
    if (menu.style.display === 'none' || menu.style.display === '') {
        menu.style.display = 'block';
    } else {
        menu.style.display = 'none';
    }
}


function goToProfile() {
    window.location.href = '../pages/profile.html';
}


function logout() {
    localStorage.clear();
    window.location.href = '../index.html';
}





/* Header */
async function loadDashboard() {
    const res = await fetch(`${API}/dashboard`, {
        headers: { 'x-user': JSON.stringify(user) }
    });
    const data = await res.json();
    // Dashboard loaded successfully
}

/* Cities */
async function loadCities() {
    const res = await fetch(`${API}/cities`, {
        headers: { 'x-user': JSON.stringify(user) }
    });
    const cities = await res.json();

    const from = document.getElementById('fromCity');
    const to = document.getElementById('toCity');

    // Clear existing options
    from.innerHTML = '';
    to.innerHTML = '';

    // Add placeholder options
    from.innerHTML = `<option value="" disabled selected>Select starting city</option>`;
    to.innerHTML = `<option value="" disabled selected>Select destination city</option>`;

    // Add city options
    cities.forEach(c => {
        from.innerHTML += `<option value="${c.city_id}">${c.city_name}</option>`;
        to.innerHTML += `<option value="${c.city_id}">${c.city_name}</option>`;
    });
}


/* Search */
async function searchTicket() {
    const fromCityId = document.getElementById('fromCity').value;
    const toCityId = document.getElementById('toCity').value;
    const journeyDate = document.getElementById('journeyDate').value;

    if (!fromCityId || !toCityId || !journeyDate) {
        showError('Incomplete Search!', 'Please select both starting and destination cities, and a journey date.');
        return;
    }

    if (fromCityId === toCityId) {
        showError('Invalid Route!', 'Starting city and destination city cannot be the same.');
        return;
    }

    const res = await fetch(`${API}/search`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-user': JSON.stringify(user)
        },
        body: JSON.stringify({ fromCityId, toCityId, journeyDate })
    });

    if (!res.ok) {
        const errorData = await res.json();
        showError('Search Failed!', errorData.message || 'Could not search schedules. Please try again.');
        return;
    }

    // Save search to recent searches
    loadRecentSearches();

    // redirect to schedules page with query params
    window.location.href = `schedules.html?from=${fromCityId}&to=${toCityId}&date=${journeyDate}`;
}


/* Recent searches */
async function loadRecentSearches() {
    try {
        const res = await fetch(`${API}/recent-searches`, {
            headers: { 'x-user': JSON.stringify(user) }
        });
        const data = await res.json();

        const container = document.getElementById('recentSearches');
        container.innerHTML = '';

        // Limit to last 3 searches
        const recentSearches = data.slice(0, 3);

        if (recentSearches.length === 0) {
            container.innerHTML = '<div class="empty-message">No recent searches yet</div>';
            return;
        }

        recentSearches.forEach(s => {
            const searchCard = document.createElement('div');
            searchCard.className = 'search-card';

            // Format search time
            const searchDate = new Date(s.search_time);
            const formattedSearchDate = searchDate.toLocaleTimeString('en-GB', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            const journeyDate = new Date(s.journey_date);
            const formattedJourneyDate = journeyDate.toLocaleDateString('en-BD', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            searchCard.innerHTML = `
                <h4>🚌 ${s.from_city} → ${s.to_city}</h4>
                <p><strong>Journey Date:</strong> ${formattedJourneyDate}</p>
                <p><strong>Searched:</strong> ${formattedSearchDate}</p>
                <button onclick="recentSearch(${s.from_city_id}, ${s.to_city_id}, '${s.journey_date}')">
                    Search Again
                </button>
            `;

            container.appendChild(searchCard);
        });

    } catch (err) {
        console.error('Error loading recent searches:', err);
        document.getElementById('recentSearches').innerHTML = '<div class="empty-message">Error loading searches</div>';
    }
}

/* Perform search from recent search card */
function recentSearch(fromCityId, toCityId, journeyDate) {
    window.location.href = `schedules.html?from=${fromCityId}&to=${toCityId}&date=${journeyDate}`;
}


// ============================================================
// UPCOMING TRIPS
// ============================================================

async function loadUpcomingTrips() {
    try {
        const res = await fetch(`${API}/upcoming-trips`, {
            headers: { 'x-user': JSON.stringify(user) }
        });
        const trips = await res.json();

        const container = document.getElementById('upcomingTrips');
        container.innerHTML = '';

        if (!trips || trips.length === 0) {
            container.innerHTML = '<div class="empty-message">No upcoming trips</div>';
            return;
        }


        trips.forEach((trip, index) => {
            const tripCard = document.createElement('div');
            tripCard.className = 'trip-card';
            tripCard.style.animationDelay = `${index * 0.06}s`;

            // Parse passenger info
            let passengers = [];
            if (trip.passenger_info) {
                if (typeof trip.passenger_info === 'string') {
                    try {
                        passengers = JSON.parse(trip.passenger_info);
                    } catch (e) {
                        passengers = [];
                    }
                } else if (Array.isArray(trip.passenger_info)) {
                    passengers = trip.passenger_info;
                }
            }

            const seatList = passengers.length > 0 ? passengers.map(p => p.seat_number).join(', ') : 'N/A';
            const totalFare = trip.total_fare ? parseFloat(trip.total_fare).toFixed(2) : '0.00';

            tripCard.innerHTML = `
                <div class="trip-card-header">
                    <p class="trip-route">🚌 ${trip.from_city} → ${trip.to_city}</p>
                </div>
                <div class="trip-card-body">
                    <div class="trip-detail">
                        <span class="trip-detail-label">Journey Date</span>
                        <span class="trip-detail-value">${trip.journey_date}</span>
                    </div>
                    <div class="trip-detail">
                        <span class="trip-detail-label">Departure Time</span>
                        <span class="trip-detail-value">${trip.departure_time}</span>
                    </div>
                    <div class="trip-detail">
                        <span class="trip-detail-label">Operator</span>
                        <span class="trip-detail-value">${trip.operator_name}</span>
                    </div>
                    <div class="trip-detail">
                        <span class="trip-detail-label">Contact Number</span>
                        <span class="trip-detail-value">${trip.contact_number}</span>
                    </div>
                    <div class="trip-detail">
                        <span class="trip-detail-label">Bus Number</span>
                        <span class="trip-detail-value">${trip.bus_number || 'N/A'}</span>
                    </div>
                    <div class="trip-detail">
                        <span class="trip-detail-label">Seats Booked</span>
                        <span class="trip-detail-value">${seatList}</span>
                    </div>
                    <div class="trip-divider"></div>
                    <div class="trip-total-fare">
                        <span class="label">Total Fare</span>
                        <span class="value">৳${totalFare}</span>
                    </div>
                </div>
                <div class="trip-card-footer">
                    <button class="btn-trip" onclick="openViewScheduleModal(${trip.schedule_id}, '${seatList}')">
                        Watch Schedule
                    </button>
                    <button class="btn-trip" onclick="downloadTripTicket(${trip.booking_id})">
                        Download Ticket
                    </button>
                    ${trip.booking_status !== 'cancelled' ? `
                    <button class="btn-trip" style="background: rgba(214, 40, 40, 0.1); border-color: rgba(214, 40, 40, 0.3); color: #e63946;" 
                        onclick='openCancelModal(${JSON.stringify(trip).replace(/'/g, "&apos;")})'>
                        Cancel Booking
                    </button>
                    ` : ''}
                </div>
            `;

            container.appendChild(tripCard);
        });

    } catch (err) {
        console.error('Error loading upcoming trips:', err);
        document.getElementById('upcomingTrips').innerHTML = '<div class="empty-message">Error loading trips</div>';
    }
}



// ============================================================
// CANCEL BOOKING LOGIC
// ============================================================

let currentTripToCancel = null;

function openCancelModal(trip) {
    currentTripToCancel = trip;
    const now = new Date();

    // Parse journey date (DD-MM-YYYY) and departure time (HH:MM:SS)
    const [day, month, year] = trip.journey_date.split('-').map(Number);
    const [hours, minutes, seconds] = trip.departure_time.split(':').map(Number);
    const departure = new Date(year, month - 1, day, hours, minutes, seconds);

    const timeDiffMs = departure - now;
    const timeDiffHours = timeDiffMs / (1000 * 60 * 60);

    if (timeDiffHours < 2) {
        showError('Cancellation Not Allowed', 'Bookings can only be cancelled at least 2 hours before departure.');
        return;
    }

    // Calculate refund
    let refundPercent = 0;
    if (timeDiffHours >= 72) refundPercent = 95;
    else if (timeDiffHours >= 48) refundPercent = 90;
    else if (timeDiffHours >= 36) refundPercent = 75;
    else if (timeDiffHours >= 24) refundPercent = 70;
    else if (timeDiffHours >= 18) refundPercent = 65;
    else if (timeDiffHours >= 12) refundPercent = 60;
    else if (timeDiffHours >= 6) refundPercent = 50;
    else if (timeDiffHours >= 2) refundPercent = 10;

    const totalPayment = parseFloat(trip.total_fare);
    const totalSeats = parseInt(trip.total_seats_booked);

    // Total payment includes service charge (20 per seat)
    // Deduction = (100 - refundPercent)% of (totalPayment - serviceCharge) + serviceCharge ???
    // Or normally: deduction is taken from the ticket price, and service charge is never refunded.
    // The user said: "service charge is 20 taka per seat".
    const totalServiceCharge = totalSeats * 20;
    const ticketPriceOnly = totalPayment - totalServiceCharge;

    const refundAmount = (ticketPriceOnly * refundPercent / 100);
    const deduction = totalPayment - refundAmount;

    // Populate modal
    document.getElementById('cancelTotalSeats').textContent = totalSeats;
    document.getElementById('cancelTotalPayment').textContent = `৳${totalPayment.toFixed(2)}`;
    document.getElementById('cancelTimeRemaining').textContent = `${Math.floor(timeDiffHours)}h ${Math.round((timeDiffHours % 1) * 60)}m`;
    document.getElementById('cancelDeduction').textContent = `৳${deduction.toFixed(2)}`;
    document.getElementById('cancelRefundAmount').textContent = `৳${refundAmount.toFixed(2)}`;

    // Reset modal state
    document.getElementById('cancelAgreement').checked = false;
    document.getElementById('btnConfirmCancel').disabled = true;

    // Show modal
    document.getElementById('cancelBookingOverlay').classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeCancelModal() {
    document.getElementById('cancelBookingOverlay').classList.remove('show');
    document.body.style.overflow = '';
    currentTripToCancel = null;
}

// Agreement check listener
document.getElementById('cancelAgreement')?.addEventListener('change', function () {
    document.getElementById('btnConfirmCancel').disabled = !this.checked;
});

function handleCancelConfirmation() {
    document.getElementById('customConfirmOverlay').style.display = 'flex';
}

function closeCustomConfirm() {
    document.getElementById('customConfirmOverlay').style.display = 'none';
}

async function executeCancellation() {
    if (!currentTripToCancel) return;

    closeCustomConfirm();

    try {
        const refundMethod = document.getElementById('refundMethod').value;
        const res = await fetch(`${API}/cancel-booking`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user': JSON.stringify(user)
            },
            body: JSON.stringify({
                bookingId: currentTripToCancel.booking_id,
                refundMethod: refundMethod
            })
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Failed to cancel booking');
        }

        showSuccess('Cancellation Successful', 'Your booking has been cancelled successfully. Refund will be processed as per policy.');
        closeCancelModal();
        loadUpcomingTrips();
        loadDashboard();

    } catch (err) {
        console.error('Cancellation Error:', err);
        showError('Cancellation Failed', err.message);
    }
}


// ============================================================
// PAST TRIPS
// ============================================================

async function loadPastTrips() {
    try {
        const res = await fetch(`${API}/past-trips`, {
            headers: { 'x-user': JSON.stringify(user) }
        });
        const trips = await res.json();

        const container = document.getElementById('pastTrips');
        container.innerHTML = '';

        if (!trips || trips.length === 0) {
            container.innerHTML = '<div class="empty-message">No past trips</div>';
            return;
        }

        trips.forEach((trip, index) => {
            const tripCard = document.createElement('div');
            tripCard.className = 'trip-card';
            tripCard.style.animationDelay = `${index * 0.06}s`;

            // Parse passenger info consistently with upcoming trips
            let passengers = [];
            if (trip.passenger_info) {
                if (typeof trip.passenger_info === 'string') {
                    try {
                        passengers = JSON.parse(trip.passenger_info);
                    } catch (e) {
                        passengers = [];
                    }
                } else if (Array.isArray(trip.passenger_info)) {
                    passengers = trip.passenger_info;
                }
            }

            const seatList = passengers.length > 0 ? passengers.map(p => p.seat_number).join(', ') : 'N/A';
            const totalFare = trip.total_fare ? parseFloat(trip.total_fare).toFixed(2) : '0.00';

            // Determine status badge classes
            const getBookingStatusClass = (status) => {
                const statusLower = (status || '').toLowerCase();
                if (statusLower === 'confirmed') return 'status-confirmed';
                if (statusLower === 'cancelled') return 'status-cancelled';
                if (statusLower === 'pending') return 'status-pending';
                return 'status-default';
            };

            const getScheduleStatusClass = (status) => {
                const statusLower = (status || '').toLowerCase();
                if (statusLower === 'active') return 'status-active';
                if (statusLower === 'completed') return 'status-completed';
                if (statusLower === 'cancelled') return 'status-cancelled';
                return 'status-default';
            };

            const bookingStatusClass = getBookingStatusClass(trip.booking_status);
            const scheduleStatusClass = getScheduleStatusClass(trip.schedule_status);

            // Base trip card content
            let tripHTML = `
                <div class="trip-card-header">
                    <p class="trip-route">🚌 ${trip.from_city} → ${trip.to_city}</p>
                </div>
                <div class="trip-card-body">
                    <div class="trip-detail">
                        <span class="trip-detail-label">Journey Date</span>
                        <span class="trip-detail-value">${trip.journey_date}</span>
                    </div>
                    <div class="trip-detail">
                        <span class="trip-detail-label">Departure Time</span>
                        <span class="trip-detail-value">${trip.departure_time}</span>
                    </div>
                    <div class="trip-detail">
                        <span class="trip-detail-label">Operator</span>
                        <span class="trip-detail-value">${trip.operator_name}</span>
                    </div>
                    <div class="trip-detail">
                        <span class="trip-detail-label">Bus Number</span>
                        <span class="trip-detail-value">${trip.bus_number || 'N/A'}</span>
                    </div>
                    <div class="trip-detail">
                        <span class="trip-detail-label">Seats Booked</span>
                        <span class="trip-detail-value">${seatList}</span>
                    </div>
                    <div class="trip-divider"></div>`;

            // Conditional content based on booking status
            if (trip.booking_status === 'cancelled') {
                tripHTML += `
                    <div class="trip-total-fare">
                        <span class="label">Refund Amount</span>
                        <span class="value">৳${totalFare}</span>
                    </div>`;
            } else {
                tripHTML += `
                    <div class="trip-total-fare">
                        <span class="label">Total Fare</span>
                        <span class="value">৳${totalFare}</span>
                    </div>`;
            }

            tripHTML += `
                    <div class="trip-detail">
                        <span class="label">Booking Status</span>
                        <span class="status-badge ${bookingStatusClass}">${trip.booking_status || 'N/A'}</span>
                    </div>
                    <div class="trip-detail">
                        <span class="label">Schedule Status</span>
                        <span class="status-badge ${scheduleStatusClass}">${trip.schedule_status || 'N/A'}</span>
                    </div>
                </div>
                <div class="trip-card-footer">
                    <button class="btn-trip" onclick="downloadTripTicket(${trip.booking_id})">
                        Download Ticket
                    </button>
                </div>`;

            tripCard.innerHTML = tripHTML;
            container.appendChild(tripCard);
        });

    } catch (err) {
        console.error('Error loading past trips:', err);
        document.getElementById('pastTrips').innerHTML = '<div class="empty-message">Error loading trips</div>';
    }
}

// ============================================================
// VIEW-ONLY SCHEDULE MODAL (CUSTOMER DASHBOARD)
// ============================================================

const bookingState = {
    scheduleId: null,
    scheduleDetails: null,
    seatStatuses: {},
    selectedSeats: [],
    userSeats: [],
    isViewOnly: false
};

// ============================================================
// OPEN MODAL
// ============================================================

async function openViewScheduleModal(scheduleId, userSeatsString) {
    const user = JSON.parse(localStorage.getItem('user'));

    try {
        bookingState.scheduleId = scheduleId;
        bookingState.selectedSeats = [];
        bookingState.isViewOnly = true;

        // Parse user's seats - expect comma separated list like "S1, S2" or "1, 2"
        bookingState.userSeats = userSeatsString && userSeatsString !== 'N/A'
            ? userSeatsString.split(',').map(s => {
                const trimmed = s.trim();
                return trimmed.startsWith('S') ? trimmed : `S${trimmed}`;
            })
            : [];

        // Fetch schedule details
        const detailsRes = await fetch(`${API}/schedule-details/${scheduleId}`, {
            headers: { 'x-user': JSON.stringify(user) }
        });

        const detailsData = await detailsRes.json();
        if (!detailsData.success) throw new Error(detailsData.message);
        bookingState.scheduleDetails = detailsData.schedule;

        // Fetch seats
        const seatsRes = await fetch(`${API}/schedule-seats/${scheduleId}`, {
            headers: { 'x-user': JSON.stringify(user) }
        });

        const seatsData = await seatsRes.json();
        if (!seatsData.success) throw new Error(seatsData.message);

        bookingState.seatStatuses = {};
        seatsData.seats.forEach(seat => {
            bookingState.seatStatuses[seat.seat_number] = seat.schedule_seat_status;
        });

        populateViewScheduleModal();
        showViewScheduleModal();
        renderSeatGrid();

    } catch (err) {
        console.error(err);
        showError('Failed to load schedule', err.message);
    }
}

// ============================================================
// POPULATE MODAL (Uses existing HTML structure)
// ============================================================

function populateViewScheduleModal() {
    const s = bookingState.scheduleDetails;
    const operatorDiv = document.querySelector('.view-schedule-operator');

    operatorDiv.innerHTML = `
        <h3>${s.operator_name}</h3>
        <div class="operator-details">
            <div class="operator-detail-item"><strong>Route</strong><span>${s.from_city} → ${s.to_city}</span></div>
            <div class="operator-detail-item"><strong>Journey Date</strong><span>${s.journey_date}</span></div>
            <div class="operator-detail-item"><strong>Departure</strong><span>${s.departure_time}</span></div>
            <div class="operator-detail-item"><strong>Bus No</strong><span>${s.bus_number}</span></div>
            <div class="operator-detail-item"><strong>Bus Type</strong><span>${(s.bus_type || '').toUpperCase()}</span></div>
            <div class="operator-detail-item"><strong>Fare</strong><span>৳${parseFloat(s.price || 0).toFixed(2)}</span></div>
        </div>
    `;
}

// ============================================================
// SHOW / CLOSE
// ============================================================

function showViewScheduleModal() {
    const overlay = document.getElementById('viewScheduleOverlay');
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeViewScheduleModal() {
    const overlay = document.getElementById('viewScheduleOverlay');
    if (overlay) {
        overlay.classList.remove('show');
        document.body.style.overflow = '';
    }
}

// ============================================================
// SEAT GRID
// ============================================================

function renderSeatGrid() {
    const SEAT_ROWS = 8;
    const SEATS_PER_ROW = 4;

    const grid = document.getElementById('viewSeatGrid');
    grid.innerHTML = '';

    for (let row = 1; row <= SEAT_ROWS; row++) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'view-seat-row';

        for (let col = 1; col <= SEATS_PER_ROW; col++) {
            const seatNum = (row - 1) * SEATS_PER_ROW + col;
            const seatId = `S${seatNum}`;

            const status = bookingState.seatStatuses[seatId];
            const isUserSeat = bookingState.userSeats.includes(seatId);

            const seatBtn = document.createElement('button');
            seatBtn.className = 'view-seat-btn';
            seatBtn.textContent = seatId;

            // Always disabled (view only)
            seatBtn.disabled = true;

            // Priority
            if (isUserSeat) {
                seatBtn.classList.add('user-selected'); // GREEN/FOREST
            } else if (status === 'booked') {
                seatBtn.classList.add('booked'); // RED/TEAL
            } else {
                seatBtn.classList.add('available');
            }

            rowDiv.appendChild(seatBtn);

            // Add gap for aisle
            if (col === 2) {
                const aisle = document.createElement('div');
                aisle.style.width = '30px';
                rowDiv.appendChild(aisle);
            }
        }

        grid.appendChild(rowDiv);
    }
}


// ============================================================
// DOWNLOAD TICKET
// ============================================================

function downloadTripTicket(bookingId) {
    showInfo('Coming Soon', 'PDF ticket download will be available shortly.');
}





