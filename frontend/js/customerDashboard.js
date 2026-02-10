const API = 'http://localhost:3000/api/customer';
const user = JSON.parse(localStorage.getItem('user'));

if (!user || user.role !== 'customer') {
    window.location.href = 'login.html';
} else {
    /* Init */
    loadDashboard();
    loadCities();
    loadRecentSearches();
}

function toggleProfile() {
    const menu = document.getElementById('profileMenu');
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
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
    document.getElementById('welcomeText').innerText = `Hi, ${data.name}`;
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

    if (!fromCityId || !toCityId) {
        alert('Please select both starting and destination cities.');
        return;
    }

    if (fromCityId === toCityId) {
        alert('Starting city and destination city cannot be the same.');
        return;
    }

    const res = await fetch(`${API}/search`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-user': JSON.stringify(user)
        },
        body: JSON.stringify({ fromCityId, toCityId })
    });

    if (!res.ok) {
        const errorData = await res.json();
        alert(errorData.message || 'Search failed. Please try again.');
        return;
    }

    loadRecentSearches();
}


/* Recent searches */
async function loadRecentSearches() {
    const res = await fetch(`${API}/recent-searches`, {
        headers: { 'x-user': JSON.stringify(user) }
    });
    const data = await res.json();

    const container = document.getElementById('recentSearches');
    container.innerHTML = '';

    data.forEach(s => {
        container.innerHTML += `
      <div>
        <p>${s.from_city} → ${s.to_city}</p>
        <p>${new Date(s.search_time).toLocaleString()}</p>
        <button>Search Ticket</button>
      </div>
    `;
    });
}


