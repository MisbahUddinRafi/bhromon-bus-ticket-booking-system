/**
 * ============================================================
 * BOOKING MODULE - Seat Selection & Booking Management
 * ============================================================
 * 
 * Handles:
 * - Modal window creation with drag functionality
 * - Seat grid rendering (8 rows x 4 seats = 32 seats)
 * - Seat selection/deselection (max 4 seats)
 * - Live price calculation
 * - Policies tab display
 * - Booking validation and confirmation
 */

const BOOKING_API = 'http://localhost:3000/api/customer';
const MAX_SEATS = 4;
const SEAT_ROWS = 8;
const SEATS_PER_ROW = 4;
const TOTAL_SEATS = SEAT_ROWS * SEATS_PER_ROW;

// Booking State
let bookingState = {
    scheduleId: null,
    bookingId: null,
    selectedSeats: [],
    seatStatuses: {},  // { 'S1': 'available', ... }
    scheduleDetails: null,
    isDragging: false,
    dragOffset: { x: 0, y: 0 },
    dragListeners: null  // Store drag event listeners for cleanup
};

// ============================================================
// INITIALIZATION
// ============================================================

/**
 * Open booking modal for a schedule
 * Fetches schedule details and seat status, opens modal
 */
async function openBookingModal(scheduleId) {
    const user = JSON.parse(localStorage.getItem('user'));
    
    try {
        // Set schedule ID
        bookingState.scheduleId = scheduleId;
        bookingState.selectedSeats = [];

        // Fetch schedule details
        const detailsRes = await fetch(`${BOOKING_API}/schedule-details/${scheduleId}`, {
            headers: { 'x-user': JSON.stringify(user) }
        });
        
        if (!detailsRes.ok) throw new Error('Failed to fetch schedule details');
        const detailsData = await detailsRes.json();
        bookingState.scheduleDetails = detailsData.schedule;
        
        // Debug: Log the actual data received from API
        console.log('Schedule Details Received:', bookingState.scheduleDetails);

        // Fetch seat statuses
        const seatsRes = await fetch(`${BOOKING_API}/schedule-seats/${scheduleId}`, {
            headers: { 'x-user': JSON.stringify(user) }
        });
        
        if (!seatsRes.ok) throw new Error('Failed to fetch seats');
        const seatsData = await seatsRes.json();
        
        // Build seat status map
        bookingState.seatStatuses = {};
        seatsData.seats.forEach(seat => {
            bookingState.seatStatuses[seat.seat_number] = seat.schedule_seat_status;
        });

        // Create and show modal
        createBookingModalDOM();
        showBookingModal();
        renderSeatGrid();

    } catch (err) {
        console.error('Error opening booking modal:', err);
        showError('Unable to open booking window. Please try again.');
    }
}

// ============================================================
// MODAL DOM CREATION & MANAGEMENT
// ============================================================

/**
 * Create the complete booking modal DOM structure
 */
function createBookingModalDOM() {
    // Remove existing modal if any
    const existing = document.getElementById('bookingModal');
    if (existing) existing.remove();

    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.id = 'bookingModalOverlay';
    overlay.className = 'booking-modal-overlay';
    
    // Create modal panel
    const modal = document.createElement('div');
    modal.id = 'bookingModal';
    modal.className = 'booking-modal-panel';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'booking-modal-header';
    header.innerHTML = `
        <div class="booking-header-left">
            <div class="booking-header-title">
                <h3>${bookingState.scheduleDetails.operator_name || 'Bus Operator'}</h3>
            </div>
            <div class="booking-header-columns">
                <div class="booking-header-column">
                    <div class="header-detail">
                        <strong>From</strong>
                        <span>${bookingState.scheduleDetails.from_city || bookingState.scheduleDetails.departure_city || bookingState.scheduleDetails.origin || 'Departure City'}</span>
                    </div>
                    <div class="header-detail">
                        <strong>To</strong>
                        <span>${bookingState.scheduleDetails.to_city || bookingState.scheduleDetails.arrival_city || bookingState.scheduleDetails.destination || 'Arrival City'}</span>
                    </div>
                    <div class="header-detail">
                        <strong>Journey Date</strong>
                        <span>${bookingState.scheduleDetails.journey_date || bookingState.scheduleDetails.departure_date || bookingState.scheduleDetails.date || 'Date'}</span>
                    </div>
                    <div class="header-detail">
                        <strong>Departure Time</strong>
                        <span>${bookingState.scheduleDetails.departure_time || bookingState.scheduleDetails.time || 'Time'}</span>
                    </div>
                </div>
                <div class="booking-header-column">
                    <div class="header-detail">
                        <strong>Bus Number</strong>
                        <span>${bookingState.scheduleDetails.bus_number || bookingState.scheduleDetails.busNumber || bookingState.scheduleDetails.bus_id || bookingState.scheduleDetails.registration_number || 'N/A'}</span>
                    </div>
                    <div class="header-detail">
                        <strong>Bus Type</strong>
                        <span>${(bookingState.scheduleDetails.bus_type || 'Standard').toUpperCase()}</span>
                    </div>
                    <div class="header-detail">
                        <strong>Price</strong>
                        <span>৳${parseFloat(bookingState.scheduleDetails.price || 0).toFixed(2)}</span>
                    </div>
                    <div class="header-detail">
                        <strong>Available Seats</strong>
                        <span>${bookingState.scheduleDetails.available_seats || 0}</span>
                    </div>
                </div>
            </div>
        </div>
        <button id="bookingModalCloseBtn" class="booking-modal-close-btn" onclick="tryCloseBookingModal()">
            ✕
        </button>
    `;

    // Create tab buttons
    const tabBar = document.createElement('div');
    tabBar.className = 'booking-tab-bar';
    tabBar.innerHTML = `
        <button class="booking-tab-btn booking-tab-active" id="tabSeats" onclick="switchTab('seats')">
            Seats
        </button>
        <button class="booking-tab-btn" id="tabPolicies" onclick="switchTab('policies')">
            Policies
        </button>
    `;

    // Create body
    const body = document.createElement('div');
    body.className = 'booking-modal-body';
    body.id = 'bookingModalBody';

    // Create seats tab content
    const seatsTab = document.createElement('div');
    seatsTab.id = 'seatsTabContent';
    seatsTab.className = 'booking-tab-content booking-active-tab';
    
    // Seat status legend
    const legend = document.createElement('div');
    legend.className = 'seat-status-legend';
    legend.innerHTML = `
        <div class="legend-item">
            <div class="seat-box available"></div>
            <span>Available</span>
        </div>
        <div class="legend-item">
            <div class="seat-box booked"></div>
            <span>Booked</span>
        </div>
        <div class="legend-item">
            <div class="seat-box selected"></div>
            <span>Selected</span>
        </div>
        <div class="legend-meta">Maximum 4 seats can be selected</div>
    `;
    seatsTab.appendChild(legend);

    // Seat grid
    const grid = document.createElement('div');
    grid.id = 'seatGrid';
    grid.className = 'seat-grid';
    seatsTab.appendChild(grid);

    body.appendChild(seatsTab);

    // Create policies tab content
    const policiesTab = document.createElement('div');
    policiesTab.id = 'policiesTabContent';
    policiesTab.className = 'booking-tab-content';
    policiesTab.innerHTML = getPoliciesHTML();
    
    body.appendChild(policiesTab);

    // Create footer
    const footer = document.createElement('div');
    footer.className = 'booking-modal-footer';
    footer.innerHTML = `
        <div class="booking-footer-top">
            <div class="footer-item">
                <span>Seats Selected:</span>
                <strong id="seatsSelectedCount">0</strong>
            </div>
            <div class="footer-item">
                <span>Total Fare:</span>
                <strong id="totalFareDisplay">৳0.00</strong>
            </div>
        </div>
        <button id="continueBookingBtn" class="btn-continue-booking" onclick="proceedToPassengerDetails()" disabled>
            Next: Enter Passenger Details
        </button>
    `;

    // Assemble modal with scrollable content wrapper
    // Create scrollable container for header, tabs, and body
    const scrollableContent = document.createElement('div');
    scrollableContent.className = 'booking-scrollable-content';
    scrollableContent.appendChild(header);
    scrollableContent.appendChild(tabBar);
    scrollableContent.appendChild(body);
    
    // Assemble modal
    modal.appendChild(scrollableContent);
    modal.appendChild(footer);

    // Add to page
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Add click-outside-to-close functionality
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            tryCloseBookingModal();
        }
    });

    // Make modal draggable
    makeModalDraggable();

    // Show overlay
    setTimeout(() => {
        overlay.classList.add('show');
    }, 10);
}

/**
 * Show booking modal with animation
 */
function showBookingModal() {
    const overlay = document.getElementById('bookingModalOverlay');
    if (overlay) {
        overlay.style.display = 'block';
    }
}

/**
 * Hide booking modal with animation
 */
function closeBookingModal() {
    const overlay = document.getElementById('bookingModalOverlay');
    if (overlay) {
        overlay.classList.remove('show');
        
        setTimeout(() => {
            // Remove event listeners for dragging
            if (bookingState.dragListeners) {
                document.removeEventListener('mousemove', bookingState.dragListeners.mousemove);
                document.removeEventListener('mouseup', bookingState.dragListeners.mouseup);
                bookingState.dragListeners = null;
            }
            
            // Disable overlay interaction and hide
            overlay.style.pointerEvents = 'none';
            overlay.style.display = 'none';
            
            // Remove the modal DOM
            overlay.remove();
            
            // Reset booking state
            bookingState.scheduleId = null;
            bookingState.bookingId = null;
            bookingState.selectedSeats = [];
            bookingState.seatStatuses = {};
            bookingState.scheduleDetails = null;
            bookingState.isDragging = false;
        }, 300);
    }
}

/**
 * Try to close modal - confirm if seats selected
 */
function tryCloseBookingModal() {
    if (bookingState.selectedSeats.length > 0) {
        const confirmCancel = confirm(
            `You have selected ${bookingState.selectedSeats.length} seat(s). Are you sure you want to cancel booking these seats?`
        );
        if (!confirmCancel) return;
    }

    closeBookingModal();
}

/**
 * Make modal draggable
 */
function makeModalDraggable() {
    const modal = document.getElementById('bookingModal');
    const header = modal.querySelector('.booking-modal-header');

    // Create event handler functions that can be referenced for removal
    const handleMouseMove = (e) => {
        if (!bookingState.isDragging) return;

        const modal = document.getElementById('bookingModal');
        if (modal) {
            modal.style.left = (e.clientX - bookingState.dragOffset.x) + 'px';
            modal.style.top = (e.clientY - bookingState.dragOffset.y) + 'px';
        }
    };

    const handleMouseUp = () => {
        bookingState.isDragging = false;
    };

    // Store listeners for cleanup
    bookingState.dragListeners = {
        mousemove: handleMouseMove,
        mouseup: handleMouseUp
    };

    header.addEventListener('mousedown', (e) => {
        // Don't allow drag if clicking on buttons
        if (e.target.closest('button')) return;

        bookingState.isDragging = true;
        const rect = modal.getBoundingClientRect();
        bookingState.dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    });

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
}

// ============================================================
// SEAT GRID RENDERING
// ============================================================

/**
 * Render the 8x4 seat grid
 */
function renderSeatGrid() {
    const grid = document.getElementById('seatGrid');
    if (!grid) return;

    grid.innerHTML = '';

    for (let row = 1; row <= SEAT_ROWS; row++) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'seat-row';

        for (let col = 1; col <= SEATS_PER_ROW; col++) {
            const seatNum = row * SEATS_PER_ROW - (SEATS_PER_ROW - col);
            const seatId = `S${seatNum}`;
            const status = bookingState.seatStatuses[seatId];
            const isSelected = bookingState.selectedSeats.includes(seatId);
            

            const seatBtn = document.createElement('button');
            seatBtn.className = 'seat-button';
            seatBtn.id = `seat-${seatId}`;
            seatBtn.textContent = seatId;

            // Remove all seat status classes first
            seatBtn.classList.remove('seat-available', 'seat-selected', 'seat-booked');

            // Apply status class - normalize status to lowercase
            const normalizedStatus = status ? status.toLowerCase().trim() : '';
            
            if (normalizedStatus === 'booked') {
                seatBtn.classList.add('seat-booked');
                seatBtn.disabled = true;
            } else if (isSelected) {
                seatBtn.classList.add('seat-selected');
                seatBtn.disabled = false;
            } else {
                seatBtn.classList.add('seat-available');
                seatBtn.disabled = false;
            }
            
            seatBtn.onclick = () => toggleSeatSelection(seatId);
            rowDiv.appendChild(seatBtn);
        }

        grid.appendChild(rowDiv);
    }
}

// ============================================================
// SEAT SELECTION LOGIC
// ============================================================

/**
 * Toggle seat selection
 */
function toggleSeatSelection(seatId) {
    const status = bookingState.seatStatuses[seatId];

    // Cannot select booked or cancelled seats
    if (status !== 'available') {
        showError('This seat is already booked. Please select another seat.');
        return;
    }

    // Check if already selected
    if (bookingState.selectedSeats.includes(seatId)) {
        // Deselect
        bookingState.selectedSeats = bookingState.selectedSeats.filter(s => s !== seatId);
    } else {
        // Check max seats constraint
        if (bookingState.selectedSeats.length >= MAX_SEATS) {
            showError(`Maximum ${MAX_SEATS} seats can be selected per booking.`);
            return;
        }

        // Select
        bookingState.selectedSeats.push(seatId);
    }

    // Re-render and update UI
    renderSeatGrid();
    updateFooterInfo();
}

/**
 * Update footer information (seats count, total fare)
 */
function updateFooterInfo() {
    const count = bookingState.selectedSeats.length;
    const price = parseFloat(bookingState.scheduleDetails.price);
    const totalFare = count * price;

    document.getElementById('seatsSelectedCount').textContent = count;
    document.getElementById('totalFareDisplay').textContent = `৳${totalFare.toFixed(2)}`;

    // Enable/disable continue button
    const btn = document.getElementById('continueBookingBtn');
    btn.disabled = count === 0;
}

// ============================================================
// TAB SWITCHING
// ============================================================

/**
 * Switch between Seats and Policies tabs
 */
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.booking-tab-btn').forEach(btn => {
        btn.classList.remove('booking-tab-active');
    });
    
    if (tabName === 'seats') {
        document.getElementById('tabSeats').classList.add('booking-tab-active');
    } else {
        document.getElementById('tabPolicies').classList.add('booking-tab-active');
    }

    // Update tab content
    document.querySelectorAll('.booking-tab-content').forEach(content => {
        content.classList.remove('booking-active-tab');
    });

    if (tabName === 'seats') {
        document.getElementById('seatsTabContent').classList.add('booking-active-tab');
    } else {
        document.getElementById('policiesTabContent').classList.add('booking-active-tab');
    }
}

// ============================================================
// POLICIES CONTENT
// ============================================================

/**
 * Get structured policies HTML
 */
function getPoliciesHTML() {
    return `
        <div class="policies-content">
            <div class="policy-section">
                <h4>Ticket Cancellation Policy</h4>
                <ul>
                    <li><strong>Before 24 Hours:</strong> Full refund minus 5% administrative fee</li>
                    <li><strong>12-24 Hours Before Departure:</strong> 75% refund of ticket price</li>
                    <li><strong>6-12 Hours Before Departure:</strong> 50% refund of ticket price</li>
                    <li><strong>Less Than 6 Hours:</strong> No refund allowed</li>
                    <li><strong>After Departure:</strong> No refund allowed</li>
                </ul>
            </div>

            <div class="policy-section">
                <h4>Ticket Modification Policy</h4>
                <ul>
                    <li>Tickets can be modified up to 24 hours before departure</li>
                    <li>A modification fee of ৳100 will be applicable for date or time changes</li>
                    <li>Seat changes are free if available on the selected route and time</li>
                    <li>Modified tickets cannot be cancelled; standard cancellation policy applies</li>
                </ul>
            </div>

            <div class="policy-section">
                <h4>Passenger Conduct Policy</h4>
                <ul>
                    <li>Passengers must report 30 minutes before scheduled departure</li>
                    <li>Valid ID proof is mandatory for all passengers</li>
                    <li>Passengers arriving after boarding will not be permitted</li>
                    <li>Smoking, alcohol, and disruptive behavior are strictly prohibited</li>
                    <li>Baggage allowance: 1 checked bag (25 kg) and 1 carry-on (7 kg) per passenger</li>
                </ul>
            </div>

            <div class="policy-section">
                <h4>Health & Safety Policy</h4>
                <ul>
                    <li>Passengers with serious medical conditions must inform the operator</li>
                    <li>Disabled passengers will be accommodated with assistance</li>
                    <li>Children below 5 years must be accompanied by an adult (seats not compulsory)</li>
                    <li>Pregnant women are advised to consult their physician before traveling</li>
                    <li>The operator reserves the right to refuse boarding if health guidelines are violated</li>
                </ul>
            </div>

            <div class="policy-section">
                <h4>Payment & Refund Policy</h4>
                <ul>
                    <li>Accepted payment methods: Bkash, Nagad, Credit/Debit Cards, Cash at terminal</li>
                    <li>Refunds will be processed within 5-7 working days to the original payment method</li>
                    <li>In case of schedule cancellation, 100% refund or rescheduling is offered</li>
                    <li>Partial refunds are not available; cancellation is for the full ticket</li>
                </ul>
            </div>

            <div class="policy-section">
                <h4>Terms & Conditions</h4>
                <ul>
                    <li>The bus operator is not liable for delays due to traffic or weather conditions</li>
                    <li>The operator is not responsible for lost or damaged personal belongings</li>
                    <li>By purchasing a ticket, passengers agree to all terms and conditions</li>
                    <li>The operator reserves the right to change schedules with prior notification</li>
                    <li>Complaints must be filed within 7 days of journey completion</li>
                </ul>
            </div>
        </div>
    `;
}

// ============================================================
// BOOKING FLOW
// ============================================================

/**
 * Proceed to passenger details validation
 * Validates: 1. Max 4 seats constraint, 2. Seat availability
 * Then redirects to passengerInfo page
 */
async function proceedToPassengerDetails() {
    if (bookingState.selectedSeats.length === 0) {
        showError('Please select at least one seat.');
        return;
    }

    const user = JSON.parse(localStorage.getItem('user'));
    const btn = document.getElementById('continueBookingBtn');
    const originalText = btn.textContent;

    try {
        btn.disabled = true;
        btn.textContent = 'Validating...';

        // ====================================
        // VALIDATION 1: Check existing bookings
        // ====================================
        const checkRes = await fetch(`${BOOKING_API}/check-existing-bookings/${bookingState.scheduleId}`, {
            headers: { 'x-user': JSON.stringify(user) }
        });

        if (!checkRes.ok) {
            showError('Failed to check existing bookings. Please try again.');
            btn.disabled = false;
            btn.textContent = originalText;
            return;
        }

        const checkData = await checkRes.json();
        const existingSeats = checkData.existing_seats || 0;
        const totalSeats = existingSeats + bookingState.selectedSeats.length;

        // Validate max 4 seats constraint
        if (totalSeats > MAX_SEATS) {
            const message = `You already have ${existingSeats} seat(s) booked on this schedule.\n\nYou can only book maximum ${MAX_SEATS} seats per schedule.\n\nYou can select ${MAX_SEATS - existingSeats} more seat(s).`;
            showError(message);
            btn.disabled = false;
            btn.textContent = originalText;
            return;
        }

        // ====================================
        // VALIDATION 2: Check seat availability
        // ====================================
        const seatsRes = await fetch(`${BOOKING_API}/schedule-seats/${bookingState.scheduleId}`, {
            headers: { 'x-user': JSON.stringify(user) }
        });

        if (!seatsRes.ok) {
            showError('Failed to validate seat availability. Please try again.');
            btn.disabled = false;
            btn.textContent = originalText;
            return;
        }

        const seatsData = await seatsRes.json();
        const seatStatusMap = {};
        seatsData.seats.forEach(seat => {
            seatStatusMap[seat.seat_number] = seat.schedule_seat_status;
        });

        // Check if any selected seat is no longer available
        const unavailableSeats = [];
        bookingState.selectedSeats.forEach(seatNum => {
            if (seatStatusMap[seatNum] !== 'available') {
                unavailableSeats.push(seatNum);
            }
        });

        if (unavailableSeats.length > 0) {
            const message = `The following seat(s) are no longer available: ${unavailableSeats.join(', ')}\n\nPlease select different seats.`;
            showError(message);
            btn.disabled = false;
            btn.textContent = originalText;
            return;
        }

        // ====================================
        // ALL VALIDATIONS PASSED
        // ====================================
        // Store booking data for passenger info page
        sessionStorage.setItem('bookingData', JSON.stringify({
            scheduleId: bookingState.scheduleId,
            selectedSeats: bookingState.selectedSeats,
            scheduleDetails: bookingState.scheduleDetails
        }));

        // Redirect to passenger info page
        window.location.href = './passengerInfo.html';

    } catch (err) {
        console.error('Error validating seats:', err);
        showError('An error occurred. Please try again.');
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Show error alert using alerts.js
 */
function showError(message) {
    showAlert('error', '⚠ Booking Error', message, 5000);
}

/**
 * Show success alert using alerts.js
 */
function showSuccess(message) {
    showAlert('success', '✓ Success', message, 3000);
}
