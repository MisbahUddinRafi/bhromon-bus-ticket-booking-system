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

    const source = document.getElementById('sourceCity');
    const dest = document.getElementById('destinationCity');

    // Clear existing options
    source.innerHTML = '';
    dest.innerHTML = '';

    // Add placeholder options
    source.innerHTML = `<option value="" disabled selected>Select starting city</option>`;
    dest.innerHTML = `<option value="" disabled selected>Select destination city</option>`;

    cities.forEach(c => {
        source.innerHTML += `<option value="${c.city_id}">${c.city_name}</option>`;
        dest.innerHTML += `<option value="${c.city_id}">${c.city_name}</option>`;
    });
}

/* Operators */
async function loadOperators() {
    const res = await fetch(`${API}/operators`);
    const operators = await res.json();

    const select = document.getElementById('operatorSelect');
    const historySelect = document.getElementById('operatorHistoryList');

    // Clear existing options
    select.innerHTML = '';
    historySelect.innerHTML = '';

    // Add placeholder options
    select.innerHTML = `<option value="" disabled selected>Select operator</option>`;
    historySelect.innerHTML = `<option value="" disabled selected>Select operator</option>`;


    operators.forEach(o => {
        select.innerHTML += `<option value="${o.operator_id}">${o.operator_name}</option>`;
        historySelect.innerHTML += `<option value="${o.operator_id}">${o.operator_name}</option>`;
    });
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
    // document.getElementById('sourceCity').value = '';
    // document.getElementById('destinationCity').value = '';
    // document.getElementById('journeyDate').value = '';
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
    tableWrapper.className = 'schedules-table-wrapper';

    const table = document.createElement('table');
    table.className = 'schedules-table';

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
            <td><button class="schedule-action-btn" onclick="event.stopPropagation(); cancelSchedule(${s.schedule_id})">Cancel</button></td>
        `;
        row.onclick = () => openScheduleModal(s.schedule_id);
        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    container.appendChild(tableWrapper);
}

async function cancelSchedule(id) {
    if (!confirm('Are you sure you want to cancel this schedule? This action may affect existing bookings.')) {
        return;
    }

    try {
        const res = await fetch(`${API}/cancel-schedule/${id}`, {
            method: 'PUT'
        });

        if (res.ok) {
            showSuccess('Schedule Cancelled!', 'The bus schedule has been cancelled.');
            loadActiveSchedules();
        } else {
            showError('Cancellation Failed!', 'Could not cancel the schedule. Please try again.');
        }
    } catch (err) {
        showError('Server Error!', 'An error occurred while cancelling the schedule.');
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
    tableWrapper.className = 'schedules-table-wrapper';

    const table = document.createElement('table');
    table.className = 'schedules-table';

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
            statusClass = 'schedule-status-completed';
        } else if (s.schedule_status === 'cancelled') {
            statusClass = 'schedule-status-cancelled';
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

    const select = document.getElementById('userList');

    // Clear existing options
    select.innerHTML = '';

    // Add placeholder option
    select.innerHTML = `<option value="" disabled selected>Select user</option>`;

    users.forEach(u => {
        select.innerHTML +=
            `<option value="${u.user_id}">${u.name}</option>`;
    });
}

/* User history */
async function loadUserHistory() {
    const userSelect = document.getElementById('userList');
    const id = userSelect ? userSelect.value : null;
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
            card.className = 'schedule-card';
            card.style.cursor = 'default'; // Disable pointer cursor as per requirement

            // Determine status badge class and time label
            let bookingStatusClass = '';
            let scheduleStatusClass = '';
            let timeLabel = 'Booking Time';

            const bookingStatus = (booking.booking_status || '').toLowerCase();
            if (bookingStatus === 'confirmed') {
                bookingStatusClass = 'card-status-completed';
            } else if (bookingStatus === 'cancelled') {
                bookingStatusClass = 'card-status-cancelled';
                timeLabel = 'Cancellation Time';
            } else if (bookingStatus === 'pending') {
                bookingStatusClass = 'card-status-pending';
            }

            const scheduleStatus = (booking.schedule_status || '').toLowerCase();
            console.log('schedule status: ', scheduleStatus);
            if (scheduleStatus === 'completed') {
                scheduleStatusClass = 'card-status-completed';
            } else if (scheduleStatus === 'cancelled') {
                scheduleStatusClass = 'card-status-cancelled';
            } else if (scheduleStatus === 'active' && scheduleStatusClass !== 'card-status-cancelled') {
                scheduleStatusClass = 'card-status-pending';
            }

            // Format booking time to DD/MM/YYYY HH:MM:SS format
            let formattedBookingTime = formatBookingTime(booking.booking_time);

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
                    <div style="font-size: 13px; margin-top: 4px; padding: 6px 10px; background: rgba(82, 121, 111, 0.05); border-radius: 6px; border-left: 3px solid var(--forest); display: flex; justify-content: space-between;">
                        <span><strong>${p.seat_number || 'N/A'}</strong></span>
                        <span><strong>${p.name || 'N/A'}</strong></span>
                        <span style="font-size: 11px; opacity: 0.7; text-transform: uppercase;">${p.gender || '-'}</span>
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
                <h4 style="border-bottom: 1px solid rgba(82, 121, 111, 0.1); padding-bottom: 8px; margin-bottom: 12px;">
                    ${source} → ${destination}
                </h4>
                <div style="display: flex; flex-direction: column; gap: 6px;">
                    <p><span class="label">User:</span> ${userName}</p>
                    <p><span class="label">Booking Status:</span> <span class="${bookingStatusClass}">${booking.booking_status || 'N/A'}</span></p>
                    <p><span class="label">Schedule Status:</span> <span class="${scheduleStatusClass}">${booking.schedule_status || 'N/A'}</span></p>
                    <p><span class="label">${timeLabel}:</span> ${formattedBookingTime}</p>
                    <p><span class="label">Journey Date:</span> ${journeyDate}</p>
                    <p><span class="label">Departure:</span> ${departureTime}</p>
                    <p><span class="label">Operator:</span> ${operatorName}</p>
                    <p><span class="label">Bus Number:</span> ${busNumber}</p>
                    <p><span class="label">Seats Booked:</span> ${seatsBooked}</p>
                    <p><span class="label">Total Fare:</span> ৳${totalFare}</p>
                    <p><span class="label">Payment Method:</span> ${paymentMethod}</p>
                    <p><span class="label">Payment Type:</span> ${booking.payment_reason || 'N/A'}</p>
                </div>
                
                <div style="margin-top: 16px; border-top: 1px dashed rgba(82, 121, 111, 0.2); padding-top: 12px;">
                    <span class="label" style="display: block; margin-bottom: 6px; font-size: 12px; color: var(--forest);">👥 Passenger Details:</span>
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
    const id = operatorHistoryList.value;
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
        card.className = 'schedule-card';

        // Determine status badge class for operator history cards
        let cardStatusClass = 'card-status-active';
        if (schedule.schedule_status === 'completed') {
            cardStatusClass = 'card-status-completed';
        } else if (schedule.schedule_status === 'cancelled') {
            cardStatusClass = 'card-status-cancelled';
        }

        card.innerHTML = `
            <h4>${schedule.source_city} → ${schedule.destination_city}</h4>
            <p><span class="label">Bus Number:</span> ${schedule.bus_number}</p>
            <p><span class="label">Bus Type:</span> ${schedule.bus_type}</p>
            <p><span class="label">Operator:</span> ${schedule.operator_name}</p>
            <p><span class="label">Date:</span> ${schedule.journey_date}</p>
            <p><span class="label">Departure:</span> ${schedule.departure_time}</p>
            <p><span class="label">Price:</span> ৳${schedule.price}</p>
            <p><span class="label">Status:</span> <span class="${cardStatusClass}">${schedule.schedule_status}</span></p>
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
    let detailStatusClass = 'detail-status-active';
    if (schedule.schedule_status === 'completed') {
        detailStatusClass = 'detail-status-completed';
    } else if (schedule.schedule_status === 'cancelled') {
        detailStatusClass = 'detail-status-cancelled';
    }

    // Display schedule details
    const detailsHTML = `
        <div class="detail-item">
            <label>Operator Name</label>
            <value>${schedule.operator_name}</value>
        </div>
        <div class="detail-item">
            <label>Bus Number</label>
            <value>${schedule.bus_number}</value>
        </div>
        <div class="detail-item">
            <label>Bus Type</label>
            <value>${schedule.bus_type}</value>
        </div>
        <div class="detail-item">
            <label>From City</label>
            <value>${schedule.source_city}</value>
        </div>
        <div class="detail-item">
            <label>To City</label>
            <value>${schedule.destination_city}</value>
        </div>
        <div class="detail-item">
            <label>Journey Date</label>
            <value>${schedule.journey_date}</value>
        </div>
        <div class="detail-item">
            <label>Departure Time</label>
            <value>${schedule.departure_time}</value>
        </div>
        <div class="detail-item">
            <label>Schedule Status</label>
            <value><span class="${detailStatusClass}">${schedule.schedule_status}</span></value>
        </div>
        <div class="detail-item">
            <label>Ticket Price</label>
            <value>৳${schedule.price}</value>
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
            statusClass = 'seat-available';
        } else if (seat.schedule_seat_status === 'booked') {
            statusClass = 'seat-booked';
        } else if (seat.schedule_seat_status === 'cancelled') {
            statusClass = 'seat-cancelled';
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
