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


window.addEventListener('pageshow', () => {
    loadDashboard();
});

function toggleProfile() {
    const menu = document.getElementById('profileMenu');
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
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
    const journeyDate = document.getElementById('journeyDate').value;

    if (!fromCityId || !toCityId || !journeyDate) {
        alert('Please select both starting and destination cities, and a journey date.');
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
        body: JSON.stringify({ fromCityId, toCityId, journeyDate })
    });

    if (!res.ok) {
        const errorData = await res.json();
        alert(errorData.message || 'Search failed. Please try again.');
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
            const formattedDate = searchDate.toLocaleDateString('en-BD', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
            const formattedTime = searchDate.toLocaleTimeString('en-GB', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });

            searchCard.innerHTML = `
                <h4>🚌 ${s.from_city} → ${s.to_city}</h4>
                <p><strong>Date:</strong> ${formattedDate}</p>
                <p><strong>Searched:</strong> ${formattedTime}</p>
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





