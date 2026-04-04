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
 * Styled confirmation dialog
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message
 * @param {string} confirmText - Text for confirm button (default: 'Yes')
 * @param {string} cancelText - Text for cancel button (default: 'No')
 * @returns {Promise<boolean>} - Resolves to true if confirmed, false if cancelled
 */
function showConfirm(title, message, confirmText = 'Yes', cancelText = 'No') {
  return new Promise((resolve) => {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'confirm-dialog-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 50000;
      animation: fadeIn 0.3s ease-out;
    `;

    // Create dialog
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    dialog.style.cssText = `
      background: linear-gradient(135deg, #f8f9f5 0%, #e8ebe5 100%);
      border: 2px solid #527f6f;
      border-radius: 12px;
      padding: 32px;
      max-width: 420px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(82, 127, 111, 0.25);
      animation: slideInUp 0.4s ease-out;
    `;

    // Create title
    const titleEl = document.createElement('h3');
    titleEl.style.cssText = `
      margin: 0 0 12px 0;
      color: #2d4a42;
      font-size: 20px;
      font-weight: 600;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    `;
    titleEl.textContent = title;

    // Create message
    const messageEl = document.createElement('p');
    messageEl.style.cssText = `
      margin: 0 0 28px 0;
      color: #555;
      font-size: 15px;
      line-height: 1.6;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    `;
    messageEl.textContent = message;

    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    `;

    // Cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = cancelText;
    cancelBtn.style.cssText = `
      padding: 10px 24px;
      border: 2px solid #c0c0c0;
      background: white;
      color: #555;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      transition: all 0.3s ease;
    `;
    cancelBtn.addEventListener('mouseover', () => {
      cancelBtn.style.background = '#f0f0f0';
      cancelBtn.style.borderColor = '#999';
    });
    cancelBtn.addEventListener('mouseout', () => {
      cancelBtn.style.background = 'white';
      cancelBtn.style.borderColor = '#c0c0c0';
    });
    cancelBtn.addEventListener('click', () => {
      overlay.remove();
      resolve(false);
    });

    // Confirm button
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = confirmText;
    confirmBtn.style.cssText = `
      padding: 10px 24px;
      border: none;
      background: linear-gradient(135deg, #527f6f 0%, #3d5f57 100%);
      color: white;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      transition: all 0.3s ease;
    `;
    confirmBtn.addEventListener('mouseover', () => {
      confirmBtn.style.background = 'linear-gradient(135deg, #3d5f57 0%, #2a4740 100%)';
      confirmBtn.style.transform = 'translateY(-2px)';
      confirmBtn.style.boxShadow = '0 8px 20px rgba(82, 127, 111, 0.3)';
    });
    confirmBtn.addEventListener('mouseout', () => {
      confirmBtn.style.background = 'linear-gradient(135deg, #527f6f 0%, #3d5f57 100%)';
      confirmBtn.style.transform = 'translateY(0)';
      confirmBtn.style.boxShadow = 'none';
    });
    confirmBtn.addEventListener('click', () => {
      overlay.remove();
      resolve(true);
    });

    // Allow closing by clicking outside dialog (ESC key)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
        resolve(false);
      }
    });

    document.addEventListener('keydown', function handleEsc(e) {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', handleEsc);
        overlay.remove();
        resolve(false);
      }
    });

    // Assemble dialog
    buttonContainer.appendChild(cancelBtn);
    buttonContainer.appendChild(confirmBtn);
    dialog.appendChild(titleEl);
    dialog.appendChild(messageEl);
    dialog.appendChild(buttonContainer);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Focus confirm button for better UX
    confirmBtn.focus();
  });
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
