const API = 'http://localhost:3000/api/admin';
const user = JSON.parse(localStorage.getItem('user'));

if (!user || user.role !== 'admin') {
    window.location.href = '../index.html';
} else {
    init();
    setupEventListeners();
}

window.addEventListener('pageshow', () => {
    if (!user || user.role !== 'admin') {
        window.location.href = '../index.html';
    }
    loadDashboard();
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

/* Helper function to format booking time */
function formatBookingTime(dateString) {
    if (!dateString) return 'N/A';
    
    // If it's already formatted as DD-MM-YYYY HH24:MI:SS, return as-is
    if (typeof dateString === 'string' && dateString.match(/^\d{2}-\d{2}-\d{4}\s\d{2}:\d{2}:\d{2}$/)) {
        return dateString;
    }
    
    // Parse the date if it's a timestamp
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
    } catch (e) {
        return dateString;
    }
}

async function init() {
    loadDashboard();
    loadCities();
    loadOperators();
    loadUsers();
    loadActiveSchedules();
    
    // Initialize Flatpickr
    const dateInput = document.getElementById('journeyDate');
    if (dateInput) {
        flatpickr(dateInput, {
            minDate: "today",
            dateFormat: "Y-m-d"
        });
    }
    resetScheduleForm();
}

/* Dashboard */
async function loadDashboard() {
    const res = await fetch(`${API}/dashboard`, {
        headers: { 'x-user': JSON.stringify(user) }
    });

    const data = await res.json();
    // Dashboard loaded successfully
}

/* Cities */
async function loadCities() {
    const res = await fetch(`${API}/cities`);
    const cities = await res.json();
    const cityOptions = cities.map(c => ({ id: c.city_id, name: c.city_name }));

    setupCustomCombobox('sourceCitySearch', 'sourceCitiesList', 'sourceCity', cityOptions);
    setupCustomCombobox('destinationCitySearch', 'destinationCitiesList', 'destinationCity', cityOptions);
}

function setupCustomCombobox(searchId, listId, hiddenId, optionsData) {
    const searchInput = document.getElementById(searchId);
    const dropdown = document.getElementById(listId);
    const hiddenInput = document.getElementById(hiddenId);
    if (!searchInput || !dropdown || searchInput.dataset.initialized) return;
    searchInput.dataset.initialized = 'true';

    function renderDropdown(filterText = '') {
        dropdown.innerHTML = '';
        const filtered = optionsData.filter(o => o.name.toLowerCase().includes(filterText.toLowerCase()));
        if (filtered.length === 0) {
            dropdown.innerHTML = `<div class="dropdown-item" style="color: #ccc; cursor: default;">No matches found</div>`;
        } else {
            filtered.forEach(item => {
                const div = document.createElement('div');
                div.className = 'dropdown-item';
                div.textContent = item.name;
                div.onclick = function() {
                    searchInput.value = item.name;
                    hiddenInput.value = item.id;
                    dropdown.classList.remove('show');
                    hiddenInput.dispatchEvent(new Event('change'));
                };
                dropdown.appendChild(div);
            });
        }
    }

    searchInput.addEventListener('focus', () => {
        renderDropdown(searchInput.value);
        dropdown.classList.add('show');
    });

    searchInput.addEventListener('input', (e) => {
        renderDropdown(e.target.value);
        hiddenInput.value = ''; // Reset ID
    });

    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('show');
            const match = optionsData.find(o => o.name.toLowerCase() === searchInput.value.toLowerCase());
            if (match) {
                searchInput.value = match.name;
                hiddenInput.value = match.id;
            } else if (!hiddenInput.value) {
                searchInput.value = '';
            }
        }
    });
}

/* Operators */
async function loadOperators() {
    const res = await fetch(`${API}/operators`);
    const operators = await res.json();
    const opsData = operators.map(o => ({ id: o.operator_id, name: o.operator_name }));

    setupCustomCombobox('operatorSearch', 'operatorsList', 'operatorSelect', opsData);
    setupCustomCombobox('operatorHistorySearch', 'operatorHistoryList', 'operatorHistorySelect', opsData);
}

/* Load buses when operator changes */
document.getElementById('operatorSelect')
    .addEventListener('change', async function () {

        const operatorId = this.value;
        const journeyDate = document.getElementById('journeyDate').value;

        if (!journeyDate) {
            alert("Select journey date first");
            return;
        }

        const res = await fetch(
            `${API}/available-buses/${operatorId}/${journeyDate}`
        );

        const buses = await res.json();
        const busSelect = document.getElementById('busSelect');
        busSelect.innerHTML = '';

        buses.forEach(b => {
            busSelect.innerHTML +=
                `<option value="${b.bus_id}">${b.bus_number}</option>`;
        });
    });


/* Create Schedule */
async function createSchedule() {

    const data = {
        sourceCityId: sourceCity.value,
        destinationCityId: destinationCity.value,
        journeyDate: journeyDate.value,
        departureTime: departureTime.value,
        price: price.value,
        busId: busSelect.value
    };

    try {
        const res = await fetch(`${API}/create-schedule`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user': JSON.stringify(user)
            },
            body: JSON.stringify(data)
        });

        const result = await res.json();

        if (result.success || res.status === 200) {
            showSuccess('Schedule Created!', 'New bus schedule has been created successfully.');
            resetScheduleForm();
            loadActiveSchedules();
        } else {
            showError('Creation Failed!', result.message || 'Could not create schedule.');
        }
    } catch (err) {
        showError('Server Error!', 'An unexpected error occurred. Please try again.');
        console.error(err);
    }
}

/* Reset Schedule Form to Default Values */
function resetScheduleForm() {
    document.getElementById('sourceCitySearch').value = '';
    document.getElementById('sourceCity').value = '';
    document.getElementById('destinationCitySearch').value = '';
    document.getElementById('destinationCity').value = '';
    document.getElementById('operatorSearch').value = '';
    document.getElementById('operatorSelect').value = '';
    
    const dateInput = document.getElementById('journeyDate');
    if (dateInput && dateInput._flatpickr) {
        dateInput._flatpickr.clear();
    }
    document.getElementById('departureTime').value = '';
    document.getElementById('price').value = '';
    document.getElementById('operatorSelect').value = '';
    document.getElementById('busSelect').innerHTML = '';
}


/* Active schedules */
async function loadActiveSchedules() {
    const res = await fetch(`${API}/active-schedules`);
    const schedules = await res.json();

    const container = document.getElementById('activeSchedules');
    container.innerHTML = '';

    if (schedules.length === 0) {
        container.innerHTML = '<div class="empty-message">No active schedules available</div>';
        return;
    }

    // Create table structure
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'data-table-wrapper';

    const table = document.createElement('table');
    table.className = 'data-table';

    // Create header
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>Route</th>
            <th>Operator</th>
            <th>Bus #</th>
            <th>Bus Type</th>
            <th>Date</th>
            <th>Time</th>
            <th>Price</th>
            <th>Action</th>
        </tr>
    `;
    table.appendChild(thead);

    // Create body
    const tbody = document.createElement('tbody');
    schedules.forEach(s => {
        const row = document.createElement('tr');
        row.style.cursor = 'pointer';
        row.innerHTML = `
            <td class="schedule-route">${s.source} → ${s.destination}</td>
            <td>${s.operator_name || '-'}</td>
            <td>${s.bus_number || '-'}</td>
            <td>${s.bus_type || '-'}</td>
            <td>${new Date(s.journey_date).toLocaleDateString('en-BD')}</td>
            <td>${s.departure_time}</td>
            <td>৳${s.price || '0'}</td>
            <td><button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); cancelSchedule(${s.schedule_id})">Cancel</button></td>
        `;
        row.onclick = () => openScheduleModal(s.schedule_id);
        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    container.appendChild(tableWrapper);
}

async function cancelSchedule(id) {
    const confirmed = await showConfirm(
        'Cancel Schedule?',
        'Are you sure you want to cancel this schedule? This action may affect existing bookings.'
    );
    
    if (!confirmed) {
        return;
    }

    try {
        const res = await fetch(`${API}/cancel-schedule/${id}`, {
            method: 'PUT'
        });

        const result = await res.json();

        if (res.ok) {
            showSuccess('Schedule Cancelled!', 'The bus schedule has been cancelled.');
            loadActiveSchedules();
        } else {
            showError('Cancellation Failed!', result.message || 'Could not cancel the schedule. Please try again.');
        }
    } catch (err) {
        showError('Server Error!', 'An error occurred while cancelling the schedule: ' + err.message);
        console.error(err);
    }
}



async function loadPastSchedules() {
    const res = await fetch(`${API}/past-schedules`);
    const schedules = await res.json();

    const container = document.getElementById('pastSchedules');
    container.innerHTML = '';

    if (schedules.length === 0) {
        container.innerHTML = '<div class="empty-message">No past schedules available</div>';
        return;
    }

    // Create table structure
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'data-table-wrapper';

    const table = document.createElement('table');
    table.className = 'data-table';

    // Create header
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>Route</th>
            <th>Operator</th>
            <th>Bus #</th>
            <th>Bus Type</th>
            <th>Date</th>
            <th>Time</th>
            <th>Price</th>
            <th>Status</th>
        </tr>
    `;
    table.appendChild(thead);

    // Create body
    const tbody = document.createElement('tbody');
    schedules.forEach(s => {
        const row = document.createElement('tr');
        row.style.cursor = 'pointer';

        // Determine status class
        let statusClass = '';
        if (s.schedule_status === 'completed') {
            statusClass = 'status-badge status-completed';
        } else if (s.schedule_status === 'cancelled') {
            statusClass = 'status-badge status-cancelled';
        } else {
            statusClass = 'status-badge status-active';
        }

        row.innerHTML = `
            <td class="schedule-route">${s.source} → ${s.destination}</td>
            <td>${s.operator_name || '-'}</td>
            <td>${s.bus_number || '-'}</td>
            <td>${s.bus_type || '-'}</td>
            <td>${new Date(s.journey_date).toLocaleDateString('en-BD')}</td>
            <td>${s.departure_time}</td>
            <td>৳${s.price || '0'}</td>
            <td><span class="${statusClass}">${s.schedule_status}</span></td>
        `;
        row.onclick = () => openScheduleModal(s.schedule_id);
        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    container.appendChild(tableWrapper);
}

/* Toggle Past Schedules visibility */
let pastSchedulesVisible = false;

function togglePastSchedules() {
    const btn = document.getElementById('pastScheduleToggleBtn');
    const container = document.getElementById('pastSchedules');

    if (!pastSchedulesVisible) {
        // Load and show
        loadPastSchedules();
        pastSchedulesVisible = true;
        btn.innerHTML = '🔽 Minimize Past Schedules';
        btn.classList.add('minimize');
    } else {
        // Hide
        container.innerHTML = '';
        pastSchedulesVisible = false;
        btn.innerHTML = '📋 View Past Schedules';
        btn.classList.remove('minimize');
    }
}







/* Load users */
async function loadUsers() {
    const res = await fetch(`${API}/users`);
    const users = await res.json();
    const userData = users.map(u => ({ id: u.user_id, name: u.name }));
    setupCustomCombobox('userSearch', 'userList', 'userSelect', userData);
}

/* User history */
async function loadUserHistory() {
    const id = document.getElementById('userSelect').value;
    if (!id) {
        showError('Selection Required', 'Please select a user from the list.');
        return;
    }

    try {
        const res = await fetch(`${API}/user-history/${id}`);
        const data = await res.json();

        const container = document.getElementById('userHistory');
        container.innerHTML = '';

        if (!data.length) {
            container.innerHTML = '<div class="empty-message">No booking history found for this user.</div>';
            return;
        }

        data.forEach(booking => {
            const card = document.createElement('div');
            card.className = 'info-card';
            card.style.cursor = 'default'; // Disable pointer cursor as per requirement

            // Determine status badge class and time label
            let bookingStatusClass = '';
            let scheduleStatusClass = '';
            let timeLabel = 'Payment Time';

            if (booking.payment_reason === 'ticket_purchase') {
                timeLabel = 'Booking Time';
            } else if (booking.payment_reason === 'refund') {
                timeLabel = 'Cancellation Time';
            }

            const bookingStatus = (booking.booking_status || '').toLowerCase();
            if (bookingStatus === 'confirmed') {
                bookingStatusClass = 'status-badge status-completed';
            } else if (bookingStatus === 'cancelled') {
                bookingStatusClass = 'status-badge status-cancelled';
            } else if (bookingStatus === 'pending') {
                bookingStatusClass = 'status-badge status-pending';
                timeLabel = 'Booking Time';
            }

            const scheduleStatus = (booking.schedule_status || '').toLowerCase();
            if (scheduleStatus === 'completed') {
                scheduleStatusClass = 'status-badge status-completed';
            } else if (scheduleStatus === 'cancelled') {
                scheduleStatusClass = 'status-badge status-cancelled';
            } else if (scheduleStatus === 'active') {
                scheduleStatusClass = 'status-badge status-active';
            }

            // Format payment time to DD/MM/YYYY HH:MM:SS format
            let formattedBookingTime = formatBookingTime(booking.payment_time);

            // Parse passenger info
            let passengers = [];
            if (booking.passenger_info) {
                if (typeof booking.passenger_info === 'string') {
                    try {
                        passengers = JSON.parse(booking.passenger_info);
                    } catch (e) {
                        passengers = [];
                    }
                } else if (Array.isArray(booking.passenger_info)) {
                    passengers = booking.passenger_info;
                }
            }

            // Format passenger info list
            let passengerHtml = '';
            if (Array.isArray(passengers) && passengers.length > 0) {
                passengerHtml = passengers.map(p => `
                    <div class="passenger-info-row">
                        <span style="flex: 0 0 35px;"><strong>${p.seat_number || 'N/A'}</strong></span>
                        <span style="flex: 1; padding: 0 10px;"><strong>${p.name || 'N/A'}</strong></span>
                        <span style="font-size: 11px; opacity: 0.7; text-transform: uppercase; font-weight: 600;">${p.gender || '-'}</span>
                    </div>
                `).join('');
            } else {
                passengerHtml = '<p style="font-size: 13px; color: #999; font-style: italic; padding: 4px;">No passenger details available</p>';
            }

            // Safely extract and display all fields
            const userName = booking.user_name || 'N/A';
            const operatorName = booking.operator_name || 'N/A';
            const busNumber = booking.bus_number || 'N/A';
            const seatsBooked = booking.total_seats_booked || 0;
            const totalFare = (booking.total_fare !== null && booking.total_fare !== undefined) ? booking.total_fare : 'N/A';
            const paymentMethod = booking.payment_method || 'N/A';
            const source = booking.source || 'Unknown';
            const destination = booking.destination || 'Unknown';
            const journeyDate = booking.journey_date || 'N/A';
            const departureTime = booking.departure_time || 'N/A';

            card.innerHTML = `
                <h4>${source} → ${destination}</h4>
                <div class="info-row"><span class="label">User</span> <span class="value">${userName}</span></div>
                <div class="info-row"><span class="label">Booking Status</span> <span class="value"><span class="${bookingStatusClass}">${booking.booking_status || 'N/A'}</span></span></div>
                <div class="info-row"><span class="label">Schedule Status</span> <span class="value"><span class="${scheduleStatusClass}">${booking.schedule_status || 'N/A'}</span></span></div>
                <br>
                <div class="info-row"><span class="label">${timeLabel}</span> <span class="value" style="font-size: 13px;">${formattedBookingTime}</span></div>
                <div class="info-row"><span class="label">Journey Date</span> <span class="value">${journeyDate}</span></div>
                <div class="info-row"><span class="label">Departure</span> <span class="value">${departureTime}</span></div>
                <br>
                <div class="info-row"><span class="label">Operator</span> <span class="value">${operatorName}</span></div>
                <div class="info-row"><span class="label">Bus Number</span> <span class="value">${busNumber}</span></div>
                <div class="info-row"><span class="label">Seats Booked</span> <span class="value">${seatsBooked}</span></div>
                <br>
                <div class="info-row"><span class="label">Total Fare</span> <span class="value">৳${totalFare}</span></div>
                <div class="info-row"><span class="label">Payment Method</span> <span class="value">${paymentMethod}</span></div>
                <div class="info-row"><span class="label">Payment Type</span> <span class="value">${booking.payment_reason || 'N/A'}</span></div>
                
                <div class="passenger-list">
                    <span class="label" style="display: block; margin-bottom: 2px;">👥 Passenger Details</span>
                    ${passengerHtml}
                </div>
            `;

            container.appendChild(card);
        });
    } catch (err) {
        console.error('Error loading user history:', err);
        showError('Fetch Error', 'Could not load user booking history.');
    }
}




/* Operator history */
async function loadOperatorHistory() {
    const id = document.getElementById('operatorHistorySelect').value;
    const res = await fetch(`${API}/operator-history/${id}`);
    const data = await res.json();

    const container = document.getElementById('operatorHistory');
    container.innerHTML = '';

    if (!data.length) {
        container.innerHTML = `<p>No schedules found for this operator.</p>`;
        return;
    }

    data.forEach(schedule => {
        const card = document.createElement('div');
        card.className = 'info-card';

        // Determine status badge class for operator history cards
        let cardStatusClass = 'status-badge status-active';
        if (schedule.schedule_status === 'completed') {
            cardStatusClass = 'status-badge status-completed';
        } else if (schedule.schedule_status === 'cancelled') {
            cardStatusClass = 'status-badge status-cancelled';
        }

        card.innerHTML = `
            <h4>${schedule.source_city} → ${schedule.destination_city}</h4>
            <div class="info-row"><span class="label">Bus Number</span> <span class="value">${schedule.bus_number}</span></div>
            <div class="info-row"><span class="label">Bus Type</span> <span class="value">${schedule.bus_type}</span></div>
            <div class="info-row"><span class="label">Operator</span> <span class="value">${schedule.operator_name}</span></div>
            <div class="info-row"><span class="label">Date</span> <span class="value">${schedule.journey_date}</span></div>
            <div class="info-row"><span class="label">Departure</span> <span class="value">${schedule.departure_time}</span></div>
            <div class="info-row"><span class="label">Price</span> <span class="value">৳${schedule.price}</span></div>
            <div class="info-row" style="margin-top:10px;"><span class="label">Status</span> <span class="value"><span class="${cardStatusClass}">${schedule.schedule_status}</span></span></div>
        `;
        card.onclick = () => openScheduleModal(schedule.schedule_id);
        container.appendChild(card);
    });
}

/* Open Modal with Schedule Details */
async function openScheduleModal(scheduleId) {
    try {
        const res = await fetch(`${API}/schedule-details/${scheduleId}`);
        const data = await res.json();

        displayScheduleDetails(data);

        // Show modal and overlay
        document.getElementById('scheduleModalOverlay').classList.add('show');
        document.body.style.overflow = 'hidden'; // Prevent scrolling background
    } catch (err) {
        console.error('Error fetching schedule details:', err);
        showError('Error!', 'Could not load schedule details. Please try again.');
    }
}

/* Display Schedule Details */
function displayScheduleDetails(data) {
    const schedule = data.schedule;
    const seats = data.seats;

    // Determine status class for schedule details modal
    let detailStatusClass = 'status-badge status-active';
    if (schedule.schedule_status === 'completed') {
        detailStatusClass = 'status-badge status-completed';
    } else if (schedule.schedule_status === 'cancelled') {
        detailStatusClass = 'status-badge status-cancelled';
    }

    // Display schedule details
    const detailsHTML = `
        <div style="display: flex; flex-direction: column;">
            <label style="font-weight: 700; font-size: 11px; text-transform: uppercase; color: var(--sage); margin-bottom: 4px;">Operator Name</label>
            <span style="font-size: 15px; font-weight: 500; color: #fff;">${schedule.operator_name}</span>
        </div>
        <div style="display: flex; flex-direction: column;">
            <label style="font-weight: 700; font-size: 11px; text-transform: uppercase; color: var(--sage); margin-bottom: 4px;">Bus Number</label>
            <span style="font-size: 15px; font-weight: 500; color: #fff;">${schedule.bus_number}</span>
        </div>
        <div style="display: flex; flex-direction: column;">
            <label style="font-weight: 700; font-size: 11px; text-transform: uppercase; color: var(--sage); margin-bottom: 4px;">Bus Type</label>
            <span style="font-size: 15px; font-weight: 500; color: #fff;">${schedule.bus_type}</span>
        </div>
        <div style="display: flex; flex-direction: column;">
            <label style="font-weight: 700; font-size: 11px; text-transform: uppercase; color: var(--sage); margin-bottom: 4px;">From City</label>
            <span style="font-size: 15px; font-weight: 500; color: #fff;">${schedule.source_city}</span>
        </div>
        <div style="display: flex; flex-direction: column;">
            <label style="font-weight: 700; font-size: 11px; text-transform: uppercase; color: var(--sage); margin-bottom: 4px;">To City</label>
            <span style="font-size: 15px; font-weight: 500; color: #fff;">${schedule.destination_city}</span>
        </div>
        <div style="display: flex; flex-direction: column;">
            <label style="font-weight: 700; font-size: 11px; text-transform: uppercase; color: var(--sage); margin-bottom: 4px;">Journey Date</label>
            <span style="font-size: 15px; font-weight: 500; color: #fff;">${schedule.journey_date}</span>
        </div>
        <div style="display: flex; flex-direction: column;">
            <label style="font-weight: 700; font-size: 11px; text-transform: uppercase; color: var(--sage); margin-bottom: 4px;">Departure Time</label>
            <span style="font-size: 15px; font-weight: 500; color: #fff;">${schedule.departure_time}</span>
        </div>
        <div style="display: flex; flex-direction: column;">
            <label style="font-weight: 700; font-size: 11px; text-transform: uppercase; color: var(--sage); margin-bottom: 4px;">Schedule Status</label>
            <span style="font-size: 15px; font-weight: 500;"><span class="${detailStatusClass}">${schedule.schedule_status}</span></span>
        </div>
        <div style="display: flex; flex-direction: column; grid-column: 1 / -1;">
            <label style="font-weight: 700; font-size: 11px; text-transform: uppercase; color: var(--sage); margin-bottom: 4px;">Ticket Price</label>
            <span style="font-size: 15px; font-weight: 500; color: #fff;">৳${schedule.price}</span>
        </div>
    `;

    document.getElementById('scheduleDetailsContent').innerHTML = detailsHTML;

    // Display seats table
    displaySeatsTable(seats);
}

/* Display Seats Table */
function displaySeatsTable(seats) {
    const tbody = document.getElementById('seatsTableBody');
    tbody.innerHTML = '';

    seats.forEach(seat => {
        const row = document.createElement('tr');

        // Status badge class
        let statusClass = '';
        if (seat.schedule_seat_status === 'available') {
            statusClass = 'status-badge status-active';
        } else if (seat.schedule_seat_status === 'booked') {
            statusClass = 'status-badge status-cancelled';
        } else if (seat.schedule_seat_status === 'cancelled') {
            statusClass = 'status-badge status-default';
        }

        row.innerHTML = `
            <td><strong>${seat.seat_number}</strong></td>
            <td><span class="${statusClass}">${seat.schedule_seat_status}</span></td>
            <td>${seat.buyer_name ? seat.buyer_name : '<span class="empty-cell">-</span>'}</td>
            <td>${seat.phone_number ? seat.phone_number : '<span class="empty-cell">-</span>'}</td>
            <td>${seat.email ? seat.email : '<span class="empty-cell">-</span>'}</td>
            <td>${seat.passenger_name ? seat.passenger_name : '<span class="empty-cell">-</span>'}</td>
            <td>${seat.passenger_gender ? seat.passenger_gender : '<span class="empty-cell">-</span>'}</td>
        `;

        tbody.appendChild(row);
    });
}

/* Close Modal */
function closeScheduleModal() {
    document.getElementById('scheduleModalOverlay').classList.remove('show');
    document.body.style.overflow = ''; // Restore scrolling
}
