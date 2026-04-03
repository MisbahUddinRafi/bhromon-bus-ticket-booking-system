const API = 'http://localhost:3000/api/customer';
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
    document.addEventListener('click', function(e) {
        const profileBtn = document.querySelector('.profile-btn');
        const profileMenu = document.getElementById('profileMenu');
        
        if (profileBtn && profileMenu && !profileBtn.contains(e.target) && !profileMenu.contains(e.target)) {
            profileMenu.style.display = 'none';
        }
    });

    // Prevent going back using keyboard shortcut
    document.addEventListener('keydown', function(e) {
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
                    <button class="btn-trip" onclick="openViewScheduleModal(${trip.schedule_id}, '${trip.seats_booked}')">
                        Watch Schedule
                    </button>
                    <button class="btn-trip" onclick="downloadTripTicket(${trip.booking_id})">
                        Download Ticket
                    </button>
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

            const seatList = trip.seats_booked ? trip.seats_booked.split(',').join(', ') : 'N/A';
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
                    <button class="btn-trip" onclick="downloadTripTicket(${trip.booking_id})">
                        Download Ticket
                    </button>
                </div>
            `;
            
            container.appendChild(tripCard);
        });

    } catch (err) {
        console.error('Error loading past trips:', err);
        document.getElementById('pastTrips').innerHTML = '<div class="empty-message">Error loading trips</div>';
    }
}


// ============================================================
// VIEW-ONLY SCHEDULE MODAL
// ============================================================

async function openViewScheduleModal(scheduleId, userSeatsString) {
    try {
        // Fetch schedule details
        const detailsRes = await fetch(`${API}/schedule-details/${scheduleId}`, {
            headers: { 'x-user': JSON.stringify(user) }
        });
        
        if (!detailsRes.ok) throw new Error('Failed to fetch schedule details');
        const detailsData = await detailsRes.json();
        const scheduleDetails = detailsData.schedule;

        // Fetch seat statuses
        const seatsRes = await fetch(`${API}/schedule-seats/${scheduleId}`, {
            headers: { 'x-user': JSON.stringify(user) }
        });
        
        if (!seatsRes.ok) throw new Error('Failed to fetch seats');
        const seatsData = await seatsRes.json();

        // Build seat status map
        const seatStatuses = {};
        seatsData.seats.forEach(seat => {
            seatStatuses[seat.seat_number] = seat.schedule_seat_status;
        });

        // Parse user's seats
        const userSeats = userSeatsString 
            ? userSeatsString.split(',').map(s => `S${s.trim()}`)
            : [];

        // Populate modal content
        populateViewScheduleModal(scheduleDetails, seatStatuses, userSeats);
        
        // Show modal
        const overlay = document.getElementById('viewScheduleOverlay');
        overlay.classList.add('show');
        document.body.style.overflow = 'hidden';

    } catch (err) {
        console.error('Error opening view schedule modal:', err);
        showError('Error', 'Failed to load schedule details. Please try again.');
    }
}

function populateViewScheduleModal(scheduleDetails, seatStatuses, userSeats) {
    // Populate header with operator details
    const operatorDiv = document.querySelector('.view-schedule-operator');
    operatorDiv.innerHTML = `
        <h3>${scheduleDetails.operator_name || 'Bus Operator'}</h3>
        <div class="operator-details">
            <div class="operator-detail-item">
                <strong>From</strong>
                <span>${scheduleDetails.from_city || 'Departure City'}</span>
            </div>
            <div class="operator-detail-item">
                <strong>To</strong>
                <span>${scheduleDetails.to_city || 'Arrival City'}</span>
            </div>
            <div class="operator-detail-item">
                <strong>Journey Date</strong>
                <span>${scheduleDetails.journey_date || 'Date'}</span>
            </div>
            <div class="operator-detail-item">
                <strong>Departure Time</strong>
                <span>${scheduleDetails.departure_time || 'Time'}</span>
            </div>
            <div class="operator-detail-item">
                <strong>Bus Number</strong>
                <span>${scheduleDetails.bus_number || scheduleDetails.registration_number || 'N/A'}</span>
            </div>
            <div class="operator-detail-item">
                <strong>Bus Type</strong>
                <span>${(scheduleDetails.bus_type || 'Standard').toUpperCase()}</span>
            </div>
            <div class="operator-detail-item">
                <strong>Price per Seat</strong>
                <span>৳${parseFloat(scheduleDetails.price || 0).toFixed(2)}</span>
            </div>
            <div class="operator-detail-item">
                <strong>Available Seats</strong>
                <span>${scheduleDetails.available_seats || 0}</span>
            </div>
        </div>
    `;

    // Render seat grid
    renderViewSeatGrid(seatStatuses, userSeats);
}

function renderViewSeatGrid(seatStatuses, userSeats) {
    const SEAT_ROWS = 8;
    const SEATS_PER_ROW = 4;
    const grid = document.getElementById('viewSeatGrid');
    grid.innerHTML = '';

    for (let row = 1; row <= SEAT_ROWS; row++) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'view-seat-row';

        for (let col = 1; col <= SEATS_PER_ROW; col++) {
            const seatNum = row * SEATS_PER_ROW - (SEATS_PER_ROW - col);
            const seatId = `S${seatNum}`;
            const status = seatStatuses[seatId];
            const isUserSeat = userSeats.includes(seatId);

            const seatBtn = document.createElement('button');
            seatBtn.className = 'view-seat-btn';
            seatBtn.textContent = seatId;
            seatBtn.disabled = true;

            if (status === 'booked' && !isUserSeat) {
                seatBtn.classList.add('booked');
            } else if (isUserSeat) {
                seatBtn.classList.add('user-selected');
            }

            rowDiv.appendChild(seatBtn);
        }

        grid.appendChild(rowDiv);
    }
}

function closeViewScheduleModal() {
    const overlay = document.getElementById('viewScheduleOverlay');
    overlay.classList.remove('show');
    document.body.style.overflow = '';
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const overlay = document.getElementById('viewScheduleOverlay');
    if (e.target === overlay) {
        closeViewScheduleModal();
    }
});


// ============================================================
// DOWNLOAD TICKET
// ============================================================

function downloadTripTicket(bookingId) {
    showInfo('Coming Soon', 'PDF ticket download will be available shortly.');
}





