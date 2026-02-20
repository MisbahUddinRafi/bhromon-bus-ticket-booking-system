const API = 'http://localhost:3000/api/customer';
const user = JSON.parse(localStorage.getItem('user'));

const params = new URLSearchParams(window.location.search);
let fromCityId = params.get('from');
let toCityId = params.get('to');
let journeyDate = params.get('date');

// 🔵 Default Filter State
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
function goDashboard() { window.location.href = '../pages/dashboard.html'; }
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
    const res = await fetch(`${API}/cities`, { headers: { 'x-user': JSON.stringify(user) } });
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
    container.innerHTML = '';
    if (!data.length) { container.innerHTML = `<p>No schedules found.</p>`; return; }

    data.forEach(s => {
        container.innerHTML += `
            <div style="border:1px solid black; padding:10px; margin:10px;">
                <h4>${s.operator_name}</h4>
                <p>Departure: ${s.departure_time}</p>
                <p>Arrival: ${s.arrival_time}</p>
                <p>Bus Type: ${s.bus_type}</p>
                <p>Price: ৳${s.price}</p>
                <button onclick="bookSeat()" style="background-color: #28a745; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">Book Seat</button>
            </div>
        `;
    });
}

// ================= BOOK SEAT =================
function bookSeat() {
    alert('Under construction');
}

// ================= FILTER EVENTS =================
function attachFilterEvents() {
    // Handle sort option selection (sort criteria and order combined)
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

    // Reset checkbox states when opening dropdown
    if (!isVisible) {
        document.querySelectorAll('#operatorDropdown input[type="checkbox"]').forEach(cb => cb.checked = false);
    }
}

function renderOperatorDropdown() {
    const dropdown = document.getElementById('operatorDropdown');
    dropdown.innerHTML = '';

    // Only show operators that are not yet selected in filters
    const availableOperators = allOperators.filter(([id, name]) => !filters.operators.includes(String(id)));

    if (!availableOperators.length) {
        dropdown.innerHTML = `<p class="no-operators-message">All operators are selected</p>`;
        return;
    }

    availableOperators.forEach(([id, name]) => {
        dropdown.innerHTML += `<label>
            <input type="checkbox" value="${id}" onchange="addOperator(this)"> ${name}
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

        container.innerHTML += `<div class="selected-operator-badge">
            <label>
                <input type="checkbox" checked value="${id}" onchange="removeOperator(this)">
                ${operator[1]}
            </label>
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
    
    // Restore operators cache when filters are reset
    allOperators = [...allOperatorsCache];
    renderSelectedOperators();
    renderOperatorDropdown();
    loadSchedules();
}
