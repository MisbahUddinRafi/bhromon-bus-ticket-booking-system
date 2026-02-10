const form = document.getElementById("loginForm");
const message = document.getElementById("message");

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
            message.textContent = result.message;
            return;
        }

        localStorage.setItem("user", JSON.stringify(result.user));
        console.log(result.user);
        message.textContent = "Login successful!";
        alert(`Welcome, ${result.user.name}!`);

        /* redirect to dashboard */
        if (result.user.role === "admin") {
            window.location.href = "../pages/adminDashboard.html";
        } else if (result.user.role === "customer") {
            window.location.href = "../pages/customerDashboard.html";
        }
    } catch (err) {
        message.textContent = "Server error";
        console.error(err);
    }
});



function backButtonClicked() {
    window.location.href = "../index.html";
}
