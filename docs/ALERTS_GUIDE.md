# Alert Message System - Implementation Guide

## Overview
The project now has a centralized alert message system using CSS classes defined in `styles.css` and a helper utility in `alerts.js`.

### Features
✓ 4 alert types: **success**, **error**, **warning**, **info**
✓ Professional gradient styling with earthy green palette
✓ Smooth animations (slide-in, shine effect, auto-dismiss)
✓ Auto-dismiss with customizable duration
✓ Dismissible by user (close button)
✓ Responsive and accessible

---

## CSS Classes in styles.css

```
.alert              - Base alert container
.alert-success      - Green success alert
.alert-error        - Red error alert
.alert-warning      - Orange warning alert
.alert-info         - Blue info alert
.alert-icon         - Icon circle
.alert-title        - Alert title
.alert-message      - Alert message text
.alert-close        - Close button
```

---

## Usage Methods

### Method 1: Programmatic (Recommended for dynamic content)

Include the alert utility in your HTML:
```html
<script src="../js/alerts.js"></script>
```

Then use the convenience functions in your JavaScript:

```javascript
// Success
showSuccess('Success!', 'Your booking has been confirmed.');

// Error
showError('Error!', 'Please fill in all fields.');

// Warning
showWarning('Warning!', 'Only 2 seats remaining on this route.');

// Info
showInfo('Info', 'Your reservation will expire in 10 minutes.');
```

**Function Signature:**
```javascript
showAlert(type, title, message, duration = 5000, containerId = null)
// type: 'success', 'error', 'warning', 'info'
// duration: milliseconds (5000 = 5 seconds, 0 = no auto-dismiss)
// containerId: optional container element ID (defaults to document.body)
```

### Method 2: Inline HTML (For static alerts)

```html
<!-- Success Alert -->
<div class="alert alert-success">
  <div class="alert-icon">✓</div>
  <div class="alert-content">
    <div class="alert-title">Success!</div>
    <div class="alert-message">Your profile has been updated successfully.</div>
  </div>
  <button class="alert-close">&times;</button>
</div>

<!-- Error Alert -->
<div class="alert alert-error">
  <div class="alert-icon">✕</div>
  <div class="alert-content">
    <div class="alert-title">Error!</div>
    <div class="alert-message">Email already exists. Please try another email.</div>
  </div>
  <button class="alert-close">&times;</button>
</div>

<!-- Warning Alert -->
<div class="alert alert-warning">
  <div class="alert-icon">⚠</div>
  <div class="alert-content">
    <div class="alert-title">Warning!</div>
    <div class="alert-message">Only 3 seats left on this bus. Book now!</div>
  </div>
  <button class="alert-close">&times;</button>
</div>

<!-- Info Alert -->
<div class="alert alert-info">
  <div class="alert-icon">ℹ</div>
  <div class="alert-content">
    <div class="alert-title">Information</div>
    <div class="alert-message">Your ticket confirmation has been sent to your email.</div>
  </div>
  <button class="alert-close">&times;</button>
</div>
```

---

## Common Examples

### In Form Submission
```javascript
fetch('/api/book-ticket', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(formData)
})
.then(res => res.json())
.then(data => {
  if (data.success) {
    showSuccess('Booking Confirmed!', `Ticket #${data.ticketId} has been created.`);
    // Redirect or refresh
    setTimeout(() => location.href = '/dashboard', 2000);
  } else {
    showError('Booking Failed!', data.message || 'Please try again later.');
  }
})
.catch(err => {
  showError('Error!', 'An unexpected error occurred.');
});
```

### In Login/Signup Pages
```javascript
// Login validation
if (!email.value) {
  showError('Invalid Input', 'Please enter your email address.');
  return false;
}

// Registration success
if (response.ok) {
  showSuccess('Account Created!', 'Please check your email to verify your account.');
}

// Authentication failed
showError('Login Failed!', 'Invalid email or password.');
```

### In Profile/Admin Pages
```javascript
// Profile update
fetch('/api/profile/update', {
  method: 'PUT',
  body: formData
})
.then(() => showSuccess('Profile Updated!', 'Your changes have been saved.', 4000))
.catch(() => showError('Update Failed!', 'Could not update your profile.'));

// Deletion warning
function deleteAccount() {
  showWarning('Confirm Deletion', 'This action cannot be undone. Delete your account?', 0);
}

// Admin actions
showInfo('Processing...', 'Please wait while we process your request...');
```

### Add Alert to Specific Container
```html
<div id="form-alerts"></div>
```

```javascript
showError('Validation Error', 'Please fix the errors below.', 0, 'form-alerts');
```

---

## Implementation Checklist

- [ ] Add `<script src="../js/alerts.js"></script>` to **login.html**
- [ ] Add script to **signup.html**
- [ ] Add script to **customerDashboard.html**
- [ ] Add script to **adminDashboard.html**
- [ ] Add script to **profile.html**
- [ ] Add script to **schedules.html**
- [ ] Update form handlers to use `showSuccess()`, `showError()`, etc.
- [ ] Update API response handlers with appropriate alerts
- [ ] Test all alert types and animations

---

## Styling Reference

| Type    | Icon | Color (Earthy Green) | Use Case |
|---------|------|---------------------|----------|
| Success | ✓    | Forest/Sage Green    | Confirmations, completed actions |
| Error   | ✕    | Red                  | Validation errors, failures |
| Warning | ⚠    | Orange               | Warnings, limits, expiry |
| Info    | ℹ    | Blue                 | Informational messages |

---

## Customization

To change colors, modify the `styles.css` alert sections:

```css
/* Change success color palette */
.alert-success {
  background: linear-gradient(135deg, rgba(82, 121, 111, 0.15) 0%, ...);
  color: #52796F;
  /* ... */
}
```

To change animation duration, edit the `slideInDown` animation in `styles.css`.

To add auto-dismiss to inline alerts, use JavaScript:

```javascript
const alert = document.querySelector('.alert');
setTimeout(() => alert.classList.add('alert-dismissing'), 5000);
```

---

## Notes
- All alerts are dismissible by clicking the close (×) button
- Alerts auto-dismiss after duration specified (default: 5 seconds)
- Alerts appear at the top-right corner when added to document.body
- Multiple alerts can be shown simultaneously
- Alerts are completely accessible with proper ARIA labels
