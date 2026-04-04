const API = 'http://localhost:3000/api/profile';
const user = JSON.parse(localStorage.getItem('user'));

if (!user) {
    window.location.href = "../index.html";
}

/* ===============================
   Load Profile Info
================================= */
async function loadProfile() {

    const res = await fetch(`${API}/profile`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'x-user': localStorage.getItem('user')
        }
    });

    if (!res.ok) {
        showError('Failed to Load!', 'Could not load your profile. Please try again.');
        return;
    }

    const data = await res.json();

    document.getElementById("name").value = data.name;
    document.getElementById("email").value = data.email;
    document.getElementById("phone").value = data.phone_number;
    document.getElementById("role").value = data.role;
}



/* ===============================
    Go Back to Dashboard
================================= */
function goBack() {
    const user = JSON.parse(localStorage.getItem('user'));

    if (user.role === 'admin') {
        window.location.href = 'adminDashboard.html';
    } else if (user.role === 'customer') {
        window.location.href = 'customerDashboard.html';
    } else {
        localStorage.clear();
        window.location.href = '../index.html';
    }
}

function toggleProfile() {
    const menu = document.getElementById('profileMenu');
    if (menu.style.display === 'none' || menu.style.display === '') {
        menu.style.display = 'block';
    } else {
        menu.style.display = 'none';
    }
}

function logout() {
    localStorage.clear();
    window.location.href = '../index.html';
}

// Close profile menu when clicking outside
document.addEventListener('click', function (e) {
    const profileBtn = document.querySelector('.btn-ghost');
    const profileMenu = document.getElementById('profileMenu');

    if (profileMenu && !e.target.closest('.btn-ghost') && !profileMenu.contains(e.target)) {
        profileMenu.style.display = 'none';
    }
});

/* ===============================
   Update Name
================================= */
async function updateName() {
    const oldName = user.name;
    const newName = document.getElementById("name").value.trim();

    if (!newName || newName === oldName) {
        showError('Invalid Input!', 'New name should be different and not empty.');
        return;
    }

    const confirmed = await showConfirm(
        'Update Profile Name?',
        `Are you sure you want to change your name from "${oldName}" to "${newName}"?`
    );

    if (!confirmed) return;

    const res = await fetch(`${API}/update-name`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'x-user': localStorage.getItem('user')
        },
        body: JSON.stringify({ name: newName })
    });

    const data = await res.json();

    if (!res.ok) {
        showError('Update Failed!', data.message);
    } else {

        let user = JSON.parse(localStorage.getItem('user'));
        user.name = newName;
        localStorage.setItem('user', JSON.stringify(user));

        showSuccess('Profile Updated!', 'Your name has been updated successfully.');
    }

}

/* ===============================
   Change Password
================================= */
async function changePassword() {

    const oldPassword = document.getElementById("oldPassword").value;
    const newPassword = document.getElementById("newPassword").value;

    if (!oldPassword || !newPassword) {
        showError('Incomplete Form!', 'Please fill all required fields.');
        return;
    }

    if (oldPassword === newPassword) {
        showError('Invalid Password!', 'New password should be different from old password.');
        return;
    }

    const confirmed = await showConfirm(
        'Change Password?',
        'Are you sure you want to change your password? You will need to use your new password for future logins.'
    );

    if (!confirmed) return;

    const res = await fetch(`${API}/change-password`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'x-user': localStorage.getItem('user')
        },
        body: JSON.stringify({ oldPassword, newPassword })
    });

    const data = await res.json();

    if (!res.ok) {
        showError('Password Change Failed!', data.message);
    } else {
        showSuccess('Password Changed!', 'Your password has been changed successfully.');

        // Clear fields
        document.getElementById("oldPassword").value = "";
        document.getElementById("newPassword").value = "";
    }
}

/* ===============================
   Delete Account
================================= */
/**
 * Custom styled prompt for password input
 */
function showPrompt(title, message, placeholder = '') {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'confirm-dialog-overlay';

        overlay.innerHTML = `
            <div class="confirm-dialog">
                <div class="confirm-dialog-title">${title}</div>
                <div class="confirm-dialog-message">${message}</div>
                <input type="password" class="prompt-input" placeholder="${placeholder}" id="promptInput">
                <div class="confirm-dialog-actions">
                    <button class="confirm-btn-cancel" id="promptCancel">Cancel</button>
                    <button class="confirm-btn-ok" id="promptOk">Confirm</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        const input = document.getElementById('promptInput');
        input.focus();

        document.getElementById('promptCancel').onclick = () => {
            overlay.remove();
            resolve(null);
        };

        document.getElementById('promptOk').onclick = () => {
            const val = input.value;
            overlay.remove();
            resolve(val);
        };

        // Handle Enter key
        input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                const val = input.value;
                overlay.remove();
                resolve(val);
            }
        };
    });
}

async function deleteAccount() {

    const oldPassword = await showPrompt(
        'Verify Identity',
        'Please enter your current password to proceed with account deletion.',
        'Enter your password'
    );

    if (!oldPassword) return;

    const confirmDelete = await showConfirm(
        '⚠️ Permanent Deletion',
        'Are you sure you want to delete your account? This action is irreversible and all your data will be cleared.'
    );
    
    if (!confirmDelete) return;

    const res = await fetch(`${API}/delete`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'x-user': localStorage.getItem('user')
        },
        body: JSON.stringify({ oldPassword })
    });

    const data = await res.json();

    if (!res.ok) {
        showError('Deletion Failed!', data.message);
    } else {

        showSuccess('Account Deleted!', 'Your account has been deleted. Redirecting...');

        localStorage.removeItem('user');

        setTimeout(() => {
            window.location.href = "../index.html";
        }, 2000);
    }
}

/* Load profile when page opens */
loadProfile();
