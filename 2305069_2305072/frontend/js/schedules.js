const BASE_URL = `${window.location.protocol}//${window.location.hostname}:3000`;
const API = `${BASE_URL}/api/customer`;
const user = JSON.parse(localStorage.getItem('user'));

const params = new URLSearchParams(window.location.search);
let fromCityId = params.get('from');
let toCityId = params.get('to');
let journeyDate = params.get('date');

// Default Filter State
let filters = {
    sortBy: 'price', // 'price' or 'time'
    sortOrder: 'low', // 'low' for price ascending or 'early' for time ascending
    busType: [],
    operators: []
};

let allOperators = [];
let allOperatorsCache = []; // Cache to preserve all operators even when filtering

window.onload = async () => {
    await loadCities();
    prefillValues();
    attachFilterEvents();
    await loadSchedules();
};

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



// ================= SEARCH AGAIN =================
function searchAgain() {
    const from = document.getElementById('fromCity').value;
    const to = document.getElementById('toCity').value;
    const date = document.getElementById('journeyDate').value;
    window.location.href = `schedules.html?from=${from}&to=${to}&date=${date}`;
}



// ================= CITIES =================
async function loadCities() {
    const res = await fetch(`${API}/cities`, {
        headers: { 'x-user': JSON.stringify(user) }
    });
    const cities = await res.json();

    const from = document.getElementById('fromCity');
    const to = document.getElementById('toCity');

    from.innerHTML = `<option value="" disabled>Select starting city</option>`;
    to.innerHTML = `<option value="" disabled>Select destination city</option>`;

    cities.forEach(c => {
        from.innerHTML += `<option value="${c.city_id}">${c.city_name}</option>`;
        to.innerHTML += `<option value="${c.city_id}">${c.city_name}</option>`;
    });
}

function prefillValues() {
    document.getElementById('fromCity').value = fromCityId;
    document.getElementById('toCity').value = toCityId;
    document.getElementById('journeyDate').value = journeyDate;
}



// ================= LOAD SCHEDULES =================
async function loadSchedules() {
    let url = `${API}/schedules?fromCityId=${fromCityId}&toCityId=${toCityId}&journeyDate=${journeyDate}`;

    // Add sorting parameters based on selected sort option
    if (filters.sortBy === 'price') {
        url += `&sortPrice=${filters.sortOrder}`;
    } else if (filters.sortBy === 'time') {
        url += `&sortTime=${filters.sortOrder}`;
    }

    if (filters.busType.length) url += `&busTypes=${filters.busType.join(',')}`;
    if (filters.operators.length) url += `&operatorIds=${filters.operators.join(',')}`;

    const res = await fetch(url, { headers: { 'x-user': JSON.stringify(user) } });
    const data = await res.json();

    renderSchedules(data);

    // Only extract and cache operators on the first load (when no filters active)
    if (filters.operators.length === 0 && filters.busType.length === 0) {
        extractAllOperators(data);
        allOperatorsCache = [...allOperators]; // Cache the full list
    }

    // Always use cached operators for the dropdown, not filtered data
    allOperators = allOperatorsCache;

    renderOperatorDropdown();
    renderSelectedOperators();
}

// ================= RENDER SCHEDULES =================
function renderSchedules(data) {
    const container = document.getElementById('scheduleContainer');
    const countDisplay = document.getElementById('resultsCount');
    const noMsg = document.getElementById('noSchedulesMsg');

    container.innerHTML = '';
    countDisplay.textContent = `${data.length} buses found`;

    if (!data.length) {
        noMsg.style.display = 'block';
        container.style.display = 'none';
        return;
    }

    noMsg.style.display = 'none';
    container.style.display = 'grid';

    data.forEach(s => {
        container.innerHTML += `
            <div class="schedule-card animate-fade-in-up">
                <div class="card-main">
                    <div class="operator-meta">
                        <div class="operator-branding">
                            <div>
                                <h4 class="operator-name">${s.operator_name}</h4>
                                <div style="display:flex; gap: 10px; align-items: center; margin-top: 5px;">
                                    <div class="bus-type-badge">${s.bus_type}</div>
                                    <span class="route-path">${s.from_city} → ${s.to_city}</span>
                                </div>
                            </div>
                        </div>
                        <div class="journey-info">
                            <div class="info-block">
                                <span class="info-label">DEPARTURE</span>
                                <span class="info-value">${s.departure_time}</span>
                            </div>
                            <div class="info-block">
                                <span class="info-label">SEATS</span>
                                <span class="info-value ${s.available_seats <= 10 ? 'low-seats' : ''}">
                                    ${s.available_seats} Left
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="card-action">
                        <div class="price-tag">
                            <span class="currency">৳</span>
                            <span class="amount">${s.price}</span>
                        </div>
                        <button class="book-now-btn" onclick="openBookingModal(${s.schedule_id})">
                            Select Seats
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
}

// ================= FILTER EVENTS =================
function attachFilterEvents() {
    document.querySelectorAll('input[name="sortOption"]').forEach(r => r.onchange = () => {
        const [sortBy, sortOrder] = r.value.split('-');
        filters.sortBy = sortBy;
        filters.sortOrder = sortOrder;
        loadSchedules();
    });

    document.querySelectorAll('input[name="busType"]').forEach(cb => cb.onchange = () => {
        filters.busType = Array.from(document.querySelectorAll('input[name="busType"]:checked')).map(c => c.value);
        loadSchedules();
    });
}

// ================= OPERATORS =================
function extractAllOperators(data) {
    const map = new Map();
    data.forEach(s => map.set(s.operator_id, s.operator_name));
    allOperators = [...map.entries()];
}

function toggleOperatorDropdown() {
    const dropdown = document.getElementById('operatorDropdown');
    const isVisible = dropdown.style.display !== 'none';
    dropdown.style.display = isVisible ? 'none' : 'block';

    if (!isVisible) {
        document.querySelectorAll('#operatorDropdown input[type="checkbox"]').forEach(cb => cb.checked = false);
    }
}

function renderOperatorDropdown() {
    const dropdown = document.getElementById('operatorDropdown');
    dropdown.innerHTML = '';

    const availableOperators = allOperators.filter(([id, name]) => !filters.operators.includes(String(id)));

    if (!availableOperators.length) {
        dropdown.innerHTML = `<p style="font-size: 12px; color: #888; text-align: center; padding: 10px;">All selected</p>`;
        return;
    }

    availableOperators.forEach(([id, name]) => {
        dropdown.innerHTML += `
            <label class="operator-option">
                <input type="checkbox" value="${id}" onchange="addOperator(this)"> 
                <span>${name}</span><br>
            </label>`;
    });
}

function addOperator(checkbox) {
    if (checkbox.checked && !filters.operators.includes(checkbox.value)) {
        filters.operators.push(checkbox.value);
    } else if (!checkbox.checked) {
        filters.operators = filters.operators.filter(op => op !== checkbox.value);
    }
    renderSelectedOperators();
    renderOperatorDropdown();
    loadSchedules();
}

function renderSelectedOperators() {
    const container = document.getElementById('selectedOperators');
    const noMsg = document.getElementById('noOperatorsMsg');
    container.innerHTML = '';

    if (filters.operators.length === 0) {
        noMsg.style.display = 'block';
        return;
    }

    noMsg.style.display = 'none';

    filters.operators.forEach(id => {
        const operator = allOperators.find(op => op[0] == id);
        if (!operator) return;

        container.innerHTML += `
            <div class="operator-chip">
                <span>${operator[1]}</span>
                <input type="checkbox" checked value="${id}" onchange="removeOperator(this)" style="display:none">
                <span style="cursor:pointer; margin-left: 5px;" onclick="this.previousElementSibling.click()">✕</span>
            </div>`;
    });
}

function removeOperator(checkbox) {
    filters.operators = filters.operators.filter(op => op !== checkbox.value);
    renderSelectedOperators();
    renderOperatorDropdown();
    loadSchedules();
}

// ================= RESET =================
function resetFilters() {
    filters = { sortBy: 'price', sortOrder: 'low', busType: [], operators: [] };
    document.getElementById('sortPriceLow').checked = true;
    document.querySelectorAll('input[name="busType"]').forEach(r => r.checked = false);

    allOperators = [...allOperatorsCache];
    renderSelectedOperators();
    renderOperatorDropdown();
    loadSchedules();
}


