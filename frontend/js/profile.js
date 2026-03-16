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




/* ===============================
   Update Name
================================= */
async function updateName() {
    const oldName = user.name;
    const newName = document.getElementById("name").value;

    if (!newName || newName === oldName) {
        showError('Invalid Input!', 'New name should be different and not empty.');
        return;
    }

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
async function deleteAccount() {

    const oldPassword = prompt("Enter your password to confirm deletion:");

    if (!oldPassword) return;

    const confirmDelete = confirm("Are you sure you want to delete your account?");
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
