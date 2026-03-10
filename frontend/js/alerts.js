/**
 * Alert Message Utility
 * ─────────────────────────────────────────────────────
 * Reusable alert message system with auto-dismiss.
 * Uses the CSS classes from styles.css for consistent styling.
 */

/**
 * Show an alert message
 * @param {string} type - Alert type: 'success', 'error', 'warning', 'info'
 * @param {string} title - Alert title
 * @param {string} message - Alert message/description
 * @param {number} duration - Auto-dismiss duration in ms (0 = no auto-dismiss)
 * @param {string} containerId - Container ID to append alert (default: body)
 */
function showAlert(type, title, message, duration = 5000, containerId = null) {
  const container = containerId ? document.getElementById(containerId) : document.body;
  
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type}`;
  
  // Icon map
  const icons = {
    success: '✓',
    error: '✕',
    danger: '✕',
    warning: '⚠',
    info: 'ℹ'
  };
  
  alertDiv.innerHTML = `
    <div class="alert-icon">${icons[type] || '•'}</div>
    <div class="alert-content">
      <div class="alert-title">${title}</div>
      <div class="alert-message">${message}</div>
    </div>
    <button class="alert-close" aria-label="Close alert">&times;</button>
  `;
  
  // Position fixed alerts at top
  alertDiv.style.position = container === document.body ? 'fixed' : 'relative';
  alertDiv.style.top = container === document.body ? '20px' : 'auto';
  alertDiv.style.right = container === document.body ? '20px' : 'auto';
  alertDiv.style.zIndex = container === document.body ? '10000' : 'auto';
  alertDiv.style.maxWidth = '450px';
  
  // Close button handler
  const closeBtn = alertDiv.querySelector('.alert-close');
  closeBtn.addEventListener('click', () => {
    alertDiv.classList.add('alert-dismissing');
    setTimeout(() => alertDiv.remove(), 350);
  });
  
  container.appendChild(alertDiv);
  
  // Auto-dismiss
  if (duration > 0) {
    setTimeout(() => {
      if (alertDiv.parentElement) {
        alertDiv.classList.add('alert-dismissing');
        setTimeout(() => alertDiv.remove(), 350);
      }
    }, duration);
  }
  
  return alertDiv;
}

/**
 * Convenience methods
 */
function showSuccess(title, message, duration = 5000, containerId = null) {
  return showAlert('success', title, message, duration, containerId);
}

function showError(title, message, duration = 5000, containerId = null) {
  return showAlert('error', title, message, duration, containerId);
}

function showWarning(title, message, duration = 5000, containerId = null) {
  return showAlert('warning', title, message, duration, containerId);
}

function showInfo(title, message, duration = 5000, containerId = null) {
  return showAlert('info', title, message, duration, containerId);
}

/**
 * Clear all alerts
 */
function clearAllAlerts() {
  document.querySelectorAll('.alert').forEach(alert => alert.remove());
}

/**
 * Example usage in forms/pages:
 * ─────────────────────────────────────────────────────
 * 
 * // After successful form submission
 * showSuccess('Success!', 'Your booking has been confirmed.');
 * 
 * // For errors
 * showError('Error!', 'Please check your email and try again.');
 * 
 * // For warnings
 * showWarning('Warning!', 'Only 2 seats remaining on this route.');
 * 
 * // For info messages
 * showInfo('Info', 'Your reservation will expire in 10 minutes.');
 * 
 * // Permanent alert (no auto-dismiss)
 * showSuccess('Success!', 'Your changes have been saved.', 0);
 * 
 * // Add alert to specific container
 * showError('Error', 'Invalid input', 5000, 'form-errors-container');
 */
