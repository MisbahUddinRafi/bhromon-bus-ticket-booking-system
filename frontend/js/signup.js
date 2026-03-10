const form = document.getElementById("signupForm");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        phone_number: document.getElementById("phone").value,
        password: document.getElementById("password").value
    }; 

    try {
        const res = await fetch("http://localhost:3000/api/auth/signup", {
            method: "POST", 
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });

        const result = await res.json();

        if (!res.ok) {
            showError('Signup Failed!', result.message || 'Please check your information and try again.');
            return; 
        }

        showSuccess('Account Created!', `Welcome ${result.user.name}! Redirecting to login...`, 2500);

        /* redirect to login page */
        setTimeout(() => {
            window.location.href = "../pages/login.html";
        }, 2500);

    } catch (err) {
        showError('Server Error!', 'An unexpected error occurred. Please try again later.');
        console.error(err);
    }
});
function backButtonClicked() {
    window.location.href = "../index.html";
}
