const API = 'http://localhost:3000/api/admin';
const user = JSON.parse(localStorage.getItem('user'));

if (!user || user.role !== 'admin') {
    window.location.href = '../index.html';
} else {
    init();
}

function toggleProfile() {
    const menu = document.getElementById('profileMenu');
    menu.style.display =
        menu.style.display === 'none' ? 'block' : 'none';
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
        container.innerHTML += `
            <div>
                ${s.source} → ${s.destination}
                | ${s.journey_date}
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

    document.getElementById('operatorHistory')
        .innerHTML = JSON.stringify(data, null, 2);
}
