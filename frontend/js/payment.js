/**
 * ============================================================
 * PAYMENT MODULE
 * ============================================================
 * Handles payment confirmation, T&C modal, and booking finalization.
 */

const PAYMENT_API = 'http://localhost:3000/api/customer';
const PROCESSING_FEE_PER_SEAT = 20;

const user = JSON.parse(localStorage.getItem('user'));

if (!user || user.role !== 'customer') {
    localStorage.clear();
    window.location.href = '../login.html';
}


// Payment state loaded from sessionStorage
let paymentState = {
    bookingId: null,
    scheduleId: null,
    selectedSeats: [],
    passengers: {},
    contactPhone: '',
    contactEmail: '',
    scheduleDetails: null
};


// ============================================================
// HEADER FUNCTIONS
// ============================================================

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


// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    try {
        const rawData = sessionStorage.getItem('paymentData');

        if (!rawData) {
            showError('Invalid Session', 'Payment data not found. Redirecting...');
            setTimeout(() => {
                window.location.href = './customerDashboard.html';
            }, 2000);
            return;
        }

        const data = JSON.parse(rawData);
        paymentState.bookingId = data.bookingId;
        paymentState.scheduleId = data.scheduleId;
        paymentState.selectedSeats = data.selectedSeats;
        paymentState.passengers = data.passengers;
        paymentState.contactPhone = data.contactPhone;
        paymentState.contactEmail = data.contactEmail;
        paymentState.scheduleDetails = data.scheduleDetails;

        populateScheduleDetails();
        populatePaymentSummary();

    } catch (err) {
        console.error('Error initializing payment page:', err);
        showError('Error', 'Failed to load payment data.');
    }
});


// ============================================================
// POPULATE PAGE DATA
// ============================================================

function populateScheduleDetails() {
    const d = paymentState.scheduleDetails;

    document.getElementById('schedOperator').textContent = d.operator_name || '—';
    document.getElementById('schedRoute').textContent = `${d.from_city} → ${d.to_city}`;
    document.getElementById('schedDate').textContent = d.journey_date || '—';
    document.getElementById('schedTime').textContent = d.departure_time || '—';
    document.getElementById('schedBusType').textContent = (d.bus_type || '—').toUpperCase();
    document.getElementById('schedSeats').textContent = paymentState.selectedSeats.join(', ');
}

function populatePaymentSummary() {
    const price = parseFloat(paymentState.scheduleDetails.price);
    const seatCount = paymentState.selectedSeats.length;
    const subtotal = price * seatCount;
    const processingFee = PROCESSING_FEE_PER_SEAT * seatCount;
    const totalPayable = subtotal + processingFee;

    document.getElementById('costPerSeat').textContent = `৳${price.toFixed(2)}`;
    document.getElementById('costSeatCount').textContent = seatCount;
    document.getElementById('costSubtotal').textContent = `৳${subtotal.toFixed(2)}`;
    document.getElementById('feeMultiplier').textContent = seatCount;
    document.getElementById('costProcessingFee').textContent = `৳${processingFee.toFixed(2)}`;
    document.getElementById('costTotalPayable').textContent = `৳${totalPayable.toFixed(2)}`;
}


// ============================================================
// T&C MODAL
// ============================================================

function openTncModal() {
    document.getElementById('tncOverlay').classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeTncModal() {
    document.getElementById('tncOverlay').classList.remove('show');
    document.body.style.overflow = '';
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    if (e.target.id === 'tncOverlay') {
        closeTncModal();
    }
    if (e.target.id === 'successOverlay') {
        // Don't close success modal on outside click
    }
});


// ============================================================
// CONFIRM PAYMENT
// ============================================================

async function confirmPayment() {
    // 1. Validate T&C checkbox
    const tncChecked = document.getElementById('tncCheckbox').checked;
    if (!tncChecked) {
        showWarning('Terms Required', 'Please read and accept the Terms & Conditions before proceeding.');
        return;
    }

    // 2. Validate payment method
    const selectedMethod = document.querySelector('input[name="paymentMethod"]:checked');
    if (!selectedMethod) {
        showWarning('Payment Method', 'Please select a payment method to continue.');
        return;
    }

    const paymentType = selectedMethod.value;

    // 3. Calculate total
    const price = parseFloat(paymentState.scheduleDetails.price);
    const seatCount = paymentState.selectedSeats.length;
    const processingFee = PROCESSING_FEE_PER_SEAT * seatCount;
    const totalPayable = (price * seatCount) + processingFee;

    // 4. Build seats array with passenger info
    const seats = paymentState.selectedSeats.map(seatNum => ({
        seatNumber: seatNum,
        passengerName: paymentState.passengers[seatNum].name,
        passengerGender: paymentState.passengers[seatNum].gender
    }));

    const btn = document.getElementById('confirmPaymentBtn');
    const btnText = btn.textContent;

    try {
        btn.disabled = true;
        btn.textContent = 'Processing payment...';

        // 5. Call confirm-payment API
        const res = await fetch(`${PAYMENT_API}/confirm-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user': JSON.stringify(user)
            },
            body: JSON.stringify({
                bookingId: paymentState.bookingId,
                scheduleId: paymentState.scheduleId,
                paymentType: paymentType,
                paymentAmount: totalPayable,
                seats: seats
            })
        });

        const result = await res.json();

        if (!res.ok || !result.success) {
            throw new Error(result.message || 'Payment failed');
        }

        // 6. SUCCESS — show success modal
        showSuccessModal(paymentType, totalPayable);

        // Clean up session storage
        sessionStorage.removeItem('paymentData');
        sessionStorage.removeItem('bookingData');

    } catch (err) {
        console.error('Payment error:', err);
        btn.disabled = false;
        btn.textContent = btnText;

        // Show error and redirect to schedules
        showError('Payment Failed', err.message || 'An error occurred during payment. Please try again.');

        const d = paymentState.scheduleDetails;
        setTimeout(() => {
            window.location.href = `schedules.html?from=${d.from_city_id}&to=${d.to_city_id}&date=${d.journey_date}`;
        }, 4000);
    }
}


// ============================================================
// SUCCESS MODAL
// ============================================================

function showSuccessModal(paymentType, totalAmount) {
    const d = paymentState.scheduleDetails;

    const detailsHtml = `
        <div class="success-detail-row">
            <span class="sd-label">Booking ID</span>
            <span class="sd-value">#${paymentState.bookingId}</span>
        </div>
        <div class="success-detail-row">
            <span class="sd-label">Operator</span>
            <span class="sd-value">${d.operator_name}</span>
        </div>
        <div class="success-detail-row">
            <span class="sd-label">Route</span>
            <span class="sd-value">${d.from_city} → ${d.to_city}</span>
        </div>
        <div class="success-detail-row">
            <span class="sd-label">Date</span>
            <span class="sd-value">${d.journey_date}</span>
        </div>
        <div class="success-detail-row">
            <span class="sd-label">Departure</span>
            <span class="sd-value">${d.departure_time}</span>
        </div>
        <div class="success-detail-row">
            <span class="sd-label">Seats</span>
            <span class="sd-value">${paymentState.selectedSeats.join(', ')}</span>
        </div>
        <div class="success-detail-row">
            <span class="sd-label">Payment Method</span>
            <span class="sd-value">${paymentType.charAt(0).toUpperCase() + paymentType.slice(1)}</span>
        </div>
        <div class="success-detail-row">
            <span class="sd-label">Amount Paid</span>
            <span class="sd-value" style="color: var(--forest); font-weight: 800;">৳${totalAmount.toFixed(2)}</span>
        </div>
    `;

    document.getElementById('successDetails').innerHTML = detailsHtml;
    document.getElementById('successOverlay').classList.add('show');
    document.body.style.overflow = 'hidden';
}


// ============================================================
// DOWNLOAD TICKET (placeholder)
// ============================================================

function downloadTicket() {
    showInfo('Coming Soon', 'PDF ticket download will be available shortly.');
}


// ============================================================
// NAVIGATION
// ============================================================

function goToDashboard() {
    window.location.href = './customerDashboard.html';
}
