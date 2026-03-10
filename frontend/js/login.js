const form = document.getElementById("loginForm");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
        identifier: document.getElementById("identifier").value,
        password: document.getElementById("password").value,
    };

    try {
        const res = await fetch("http://localhost:3000/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });

        const result = await res.json();

        if (!res.ok) {
            showError('Login Failed!', result.message || 'Invalid email/phone or password.');
            return;
        }

        localStorage.setItem("user", JSON.stringify(result.user));
        console.log(result.user);
        
        showSuccess('Welcome Back!', 'Hello ' + result.user.name + '! Redirecting to dashboard...', 2000); 

        /* redirect to dashboard */
        setTimeout(() => {
            if (result.user.role === "admin") {
                window.location.href = "../pages/adminDashboard.html";
            } else if (result.user.role === "customer") {
                window.location.href = "../pages/customerDashboard.html";
            }
        }, 2000);
    } catch (err) {
        showError('Server Error!', 'An unexpected error occurred. Please try again later.');
        console.error(err);
    }
});



function backButtonClicked() {
    window.location.href = "../index.html";
}
