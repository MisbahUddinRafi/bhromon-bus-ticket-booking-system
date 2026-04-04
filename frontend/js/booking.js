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
async function tryCloseBookingModal() {
    if (bookingState.selectedSeats.length > 0) {
        const confirmCancel = await showConfirm(
            'Discard Selected Seats?',
            `You have selected ${bookingState.selectedSeats.length} seat(s). Are you sure you want to cancel booking these seats?`,
            'Yes, Cancel',
            'No, Keep Selecting'
        );
        if (!confirmCancel) {
            return;
        }
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
                <h4>1. Ticket Cancellation Policy</h4>
                <ul>
                    <li><strong>More Than 72 Hours Before Departure:</strong> 95% refund (5% cancellation fee)</li>
                    <li><strong>More Than 48 Hours Before Departure:</strong> 90% refund (10% cancellation fee)</li>
                    <li><strong>36-48 Hours Before Departure:</strong> 75% refund (25% cancellation fee)</li>
                    <li><strong>24-36 Hours Before Departure:</strong> 70% refund (30% cancellation fee)</li>
                    <li><strong>18-24 Hours Before Departure:</strong> 65% refund (35% cancellation fee)</li>
                    <li><strong>12-18 Hours Before Departure:</strong> 60% refund (40% cancellation fee)</li>
                    <li><strong>6-12 Hours Before Departure:</strong> 50% refund (50% cancellation fee)</li>
                    <li><strong>2-6 Hours Before Departure:</strong> 10% refund (90% cancellation fee)</li>
                    <li><strong>Less Than 2 Hours Before Departure:</strong> No refund allowed</li>
                    <li><strong>After Journey Completion:</strong> No refund allowed</li>
                    <li><strong>No-Show (not boarding without cancellation):</strong> No refund allowed</li>
                    <li><strong>Schedule Cancelled by Operator:</strong> Full refund or rescheduling on alternative bus at no additional cost</li>
                </ul>
            </div>

            <div class="policy-section">
                <h4>2. Ticket Modification Policy</h4>
                <ul>
                    <li>Tickets can be modified for dates, times, or seats up to 48 hours before departure</li>
                    <li>Modifications made 24-48 hours before departure: ৳50 modification fee applies</li>
                    <li>Modifications made less than 24 hours before departure: ৳100 modification fee applies</li>
                    <li>Seat changes on the same bus and departure are free of charge (subject to availability)</li>
                    <li>If modification results in a price difference, additional payment or refund will be processed accordingly</li>
                    <li>Modifications cannot be made within 6 hours of departure</li>
                    <li>All modifications must be done through the website; no phone or counter modifications</li>
                </ul>
            </div>

            <div class="policy-section">
                <h4>3. Booking & Reservation Policy</h4>
                <ul>
                    <li>Bookings are confirmed only after successful payment</li>
                    <li>A confirmation email will be sent with booking reference and ticket details</li>
                    <li>Seats are automatically released if payment is not completed within 15 minutes</li>
                    <li>Each passenger must provide accurate name matching government-issued ID</li>
                    <li>Name changes after booking are not permitted due to identity verification requirements</li>
                    <li>Maximum 4 seats per booking per customer per schedule</li>
                    <li>Customers can make multiple bookings for the same journey if needed</li>
                </ul>
            </div>

            <div class="policy-section">
                <h4>4. Passenger Conduct & Boarding Policy</h4>
                <ul>
                    <li>Passengers must arrive at the terminal at least 30 minutes before scheduled departure</li>
                    <li>Valid government-issued ID proof is mandatory (Passport, National ID, Student ID, or Driving License)</li>
                    <li>No boarding allowed if passenger arrives after departure time</li>
                    <li>Smoking, drinking alcohol, and consumption of non-vegetarian food (pork/beef) inside the bus are prohibited</li>
                    <li>Disruptive, abusive, or threatening behavior will result in immediate removal without refund</li>
                    <li>Gambling, illegal activities, and indecent behavior are strictly forbidden</li>
                    <li>Playing loud music or disturbing other passengers is not permitted</li>
                    <li>Photography and videography inside the bus require permission from the operator</li>
                </ul>
            </div>

            <div class="policy-section">
                <h4>5. Baggage & Belongings Policy</h4>
                <ul>
                    <li><strong>Baggage Allowance:</strong> 1 checked bag (maximum 25 kg) and 1 carry-on (maximum 7 kg) per passenger</li>
                    <li>Additional baggage will incur charges at ৳50 per 5 kg</li>
                    <li>Oversized items may not be accommodated due to bus capacity constraints</li>
                    <li>The operator is not responsible for lost, stolen, or damaged baggage</li>
                    <li>Passengers are responsible for safeguarding their valuables and personal items</li>
                    <li>Fragile items should be properly packed; damage due to improper packing is not covered</li>
                    <li>Prohibited items: weapons, explosives, flammable materials, hazardous goods, and illegal substances</li>
                    <li>Live animals are not permitted except certified service animals</li>
                </ul>
            </div>

            <div class="policy-section">
                <h4>6. Health & Safety Policy</h4>
                <ul>
                    <li>Passengers with serious medical conditions must inform the operator at booking</li>
                    <li>Passengers with contagious diseases are not permitted to travel for public health reasons</li>
                    <li>Disabled passengers and those with mobility issues will be provided reasonable accommodation</li>
                    <li>Children below 5 years may travel without a separate seat if accompanied by an adult</li>
                    <li>Pregnant women are advised to consult their physician before traveling long distances</li>
                    <li>Elderly and infirm passengers should request aisle seats for accessibility</li>
                    <li>The operator reserves the right to refuse boarding if health guidelines are not met</li>
                    <li>First aid kit is available on all buses; operators are trained in basic first aid</li>
                    <li>All buses comply with COVID-19 safety protocols and are regularly sanitized</li>
                </ul>
            </div>

            <div class="policy-section">
                <h4>7. Payment & Refund Policy</h4>
                <ul>
                    <li><strong>Accepted Payment Methods:</strong> Bkash, Nagad, Rocket, Credit/Debit Cards (Visa, Mastercard), and Cash at terminal counters</li>
                    <li>All online payments are processed through secure, encrypted payment gateways</li>
                    <li>Payment confirmation is instant; customers receive SMS and email after successful transaction</li>
                    <li>Refunds will be processed within 5-7 working days to the original payment method</li>
                    <li>Mobile banking refunds may take 2-3 working days due to provider processing time</li>
                    <li>Refund amount will be as per the applicable cancellation policy</li>
                    <li>No partial refunds are provided; cancellation refunds are calculated for entire booking</li>
                    <li>Refund requests must be submitted online; no refunds at terminal counters except for schedule cancellations</li>
                    <li>Failed or duplicate payment transactions: Full amount will be refunded within 24 hours</li>
                </ul>
            </div>

            <div class="policy-section">
                <h4>8. Liability & Disclaimer</h4>
                <ul>
                    <li>The bus operator is not liable for delays caused by traffic congestion, weather conditions, or natural disasters</li>
                    <li>The operator is not responsible for lost, stolen, or damaged personal belongings during the journey</li>
                    <li>Passengers travel at their own risk; the operator is not liable for personal injuries except in cases of gross negligence</li>
                    <li>The operator is not responsible for missed connections or onward travel due to delays</li>
                    <li>Medical emergencies on the bus will be handled by trained staff; patient care at the nearest hospital is the responsibility of the passenger</li>
                    <li>The operator reserves the right to change routes, times, or cancel services with 24-hour notice</li>
                    <li>In case of emergency, the operator may request passengers to exit the bus for safety reasons</li>
                    <li>The operator is not liable for data privacy breaches beyond industry-standard security measures</li>
                </ul>
            </div>

            <div class="policy-section">
                <h4>9. General Terms & Conditions</h4>
                <ul>
                    <li>By purchasing a ticket, passengers acknowledge and accept all terms and conditions</li>
                    <li>The booking confirmation email serves as the ticket proof; carry it printed or in digital format</li>
                    <li>The operator reserves the right to update terms and conditions with 7 days' notice</li>
                    <li>Complaints or disputes must be filed within 7 days of journey completion via email or website</li>
                    <li>Community Service Charge (if applicable) will be clearly mentioned at checkout</li>
                    <li>Children below 12 years traveling alone will not be permitted without guardian consent</li>
                    <li>The operator has the right to refuse service to customers engaging in abusive behavior toward staff</li>
                    <li>This policy is governed by the laws of Bangladesh and subject to jurisdiction of Bangladesh courts</li>
                </ul>
            </div>

            <div class="policy-section">
                <h4>10. Special Conditions</h4>
                <ul>
                    <li>Long-distance journeys (more than 8 hours) include 1 mandatory rest stop of 20 minutes</li>
                    <li>AC buses maintain temperature at 18-22°C; passengers are advised to carry light clothing</li>
                    <li>Washrooms on board are provided for emergency use only; please use terminal facilities</li>
                    <li>Free Wi-Fi is available on select buses; connection stability is not guaranteed</li>
                    <li>Charging ports may have limited availability; bring your own power bank if needed</li>
                    <li>Seat recline feature should not be used excessively to avoid inconvenience to rear passengers</li>
                    <li>Window blinds should be kept open during daytime for safety visibility</li>
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
