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

        message.textContent = "Login successful!";
        alert(`Welcome, ${result.user.name}!`);
    } catch (err) {
        message.textContent = "Server error";
    }
});
