// quick-login-test.mjs — test login response
const res = await fetch("http://localhost:3000/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "admin@rumahsakit.com", password: "password123" }),
});
const body = await res.json();
console.log("Status:", res.status);
console.log("Body:", JSON.stringify(body, null, 2));
