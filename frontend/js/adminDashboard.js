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

    // Setup modal dragging
    initModalDrag();
}

let modalPos = { x: 0, y: 0 };
let modalOffset = { x: 0, y: 0 };
let isDragging = false;

function initModalDrag() {
    const modal = document.getElementById('scheduleModal');
    const header = document.querySelector('.modal-header');

    if (!modal || !header) return;

    // Remove previous listeners by cloning
    const newHeader = header.cloneNode(true);
    header.parentNode.replaceChild(newHeader, header);

    const updatedHeader = document.querySelector('.modal-header');

    updatedHeader.addEventListener('mousedown', function(e) {
        isDragging = true;
        const rect = modal.getBoundingClientRect();
        
        // Store the initial position
        modalPos.x = rect.left;
        modalPos.y = rect.top;
        
        // Store the offset between click position and modal position
        modalOffset.x = e.clientX - rect.left;
        modalOffset.y = e.clientY - rect.top;
        
        updatedHeader.style.cursor = 'grabbing';
        
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        e.preventDefault();

        const newX = e.clientX - modalOffset.x;
        const newY = e.clientY - modalOffset.y;

        // Apply boundaries to keep modal within viewport
        const maxX = window.innerWidth - modal.offsetWidth;
        const maxY = window.innerHeight - modal.offsetHeight;

        const constrainedX = Math.max(10, Math.min(newX, maxX - 10));
        const constrainedY = Math.max(10, Math.min(newY, maxY - 10));

        modal.style.left = constrainedX + 'px';
        modal.style.top = constrainedY + 'px';
        modal.style.transform = 'none'; // Remove center transform when dragging
    });

    document.addEventListener('mouseup', function() {
        if (isDragging) {
            isDragging = false;
            updatedHeader.style.cursor = 'move';
            document.body.style.userSelect = 'auto';
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
    const id = userList.value;
    const res = await fetch(`${API}/user-history/${id}`);
    const data = await res.json();

    document.getElementById('userHistory')
        .innerHTML = JSON.stringify(data, null, 2);
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
        card.innerHTML = `
            <h4>${schedule.source_city} → ${schedule.destination_city}</h4>
            <p><span class="label">Bus Number:</span> ${schedule.bus_number}</p>
            <p><span class="label">Bus Type:</span> ${schedule.bus_type}</p>
            <p><span class="label">Operator:</span> ${schedule.operator_name}</p>
            <p><span class="label">Date:</span> ${schedule.journey_date}</p>
            <p><span class="label">Departure:</span> ${schedule.departure_time}</p>
            <p><span class="label">Price:</span> ৳${schedule.price}</p>
            <p><span class="label">Status:</span> <strong>${schedule.schedule_status}</strong></p>
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
        
        // Reset modal position to center - clear all pixel values
        const modal = document.getElementById('scheduleModal');
        modal.style.top = '50vh';
        modal.style.left = '50vw';
        modal.style.transform = 'translate(-50%, -50%)';
        modal.style.position = 'fixed';
        
        modal.classList.add('show');
        document.getElementById('scheduleModalOverlay').classList.add('show');
        
        // Reinitialize dragging after modal is shown
        setTimeout(() => {
            initModalDrag();
        }, 50);
    } catch (err) {
        console.error('Error fetching schedule details:', err);
        showError('Error!', 'Could not load schedule details. Please try again.');
    }
}

/* Display Schedule Details */
function displayScheduleDetails(data) {
    const schedule = data.schedule;
    const seats = data.seats;

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
            <value>${schedule.schedule_status}</value>
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
    document.getElementById('scheduleModal').classList.remove('show');
    document.getElementById('scheduleModalOverlay').classList.remove('show');
}
