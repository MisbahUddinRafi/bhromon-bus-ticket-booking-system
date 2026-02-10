const form = document.getElementById("signupForm");
const message = document.getElementById("message");

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
            message.textContent = result.message; 
            return; 
        }

        message.textContent = "Signup successful! You can now log in.";
        alert(`Welcome, ${result.user.name}! Please log in.`);

        /* redirect to login page */
        window.location.href = "../pages/login.html";

    } catch (err) {
        message.textContent = "Server error. Please try again later.";  
    }
}); 


function backButtonClicked() {
    window.location.href = "../index.html";
}
