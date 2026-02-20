const API = 'http://localhost:3000/api/admin';
const user = JSON.parse(localStorage.getItem('user'));

if (!user || user.role !== 'admin') {
    window.location.href = '../index.html';
} else {
    init();
}

window.addEventListener('pageshow', () => {
    loadDashboard();
});


function toggleProfile() {
    const menu = document.getElementById('profileMenu');
    menu.style.display =
        menu.style.display === 'none' ? 'block' : 'none';
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
    document.getElementById('welcomeText').innerText =
        `Hi Admin, ${data.name}`;
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

    const res = await fetch(`${API}/create-schedule`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-user': JSON.stringify(user)
        },
        body: JSON.stringify(data)
    });

    const result = await res.json();
    alert(result.message);

    loadActiveSchedules();
}

/* Active schedules */
async function loadActiveSchedules() {
    const res = await fetch(`${API}/active-schedules`);
    const schedules = await res.json();

    const container = document.getElementById('activeSchedules');
    container.innerHTML = '';

    schedules.forEach(s => {
        console.log(s.journey_date);
        container.innerHTML += `
            <div>
                ${s.source} → ${s.destination}
                | ${s.journey_date}
                | ${s.departure_time}
                <button onclick="cancelSchedule(${s.schedule_id})">
                    Cancel
                </button>
            </div>
        `;
    });
}

async function cancelSchedule(id) {
    await fetch(`${API}/cancel-schedule/${id}`, {
        method: 'PUT'
    });
    loadActiveSchedules();
}



async function loadPastSchedules() {
    const res = await fetch(`${API}/past-schedules`);
    const schedules = await res.json();

    const container = document.getElementById('pastSchedules');
    container.innerHTML = '';

    schedules.forEach(s => {
        container.innerHTML += `
            <div>
                ${s.source} → ${s.destination}
                | ${s.journey_date}
                | ${s.departure_time}
                | ${s.schedule_status}
            </div>
        `;
    });
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
        document.getElementById('scheduleModal').classList.add('show');
        document.getElementById('scheduleModalOverlay').classList.add('show');
    } catch (err) {
        console.error('Error fetching schedule details:', err);
        alert('Error loading schedule details');
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
