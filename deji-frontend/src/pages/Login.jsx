import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      // login() returns { token, user } or throws
      const { token, user } = await login({ email, password });

      // Defensive check in case API returns unexpected shape
      if (!token || !user) {
        console.error("❌ Unexpected login response:", { token, user });
        setError("Login failed. Invalid server response.");
        return;
      }

      console.log("✅ Logged in user:", user);
      console.log("✅ JWT token:", token);

      // redirect to dashboard (root)
      navigate("/");
    } catch (err) {
      // err may be an Axios error or other
      const message =
        err?.response?.data?.message || err?.message || "Login failed. Check credentials.";
      console.error("❌ Login error:", err?.response?.data || err?.message || err);
      setError(message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form
        onSubmit={handleLogin}
        className="bg-white p-6 rounded-xl shadow-md w-80"
      >
        <h2 className="text-xl font-bold mb-4 text-center">Login</h2>

        {error && (
          <div className="mb-3 text-red-600 text-sm text-center">{error}</div>
        )}

        <input
          type="email"
          placeholder="Email"
          className="w-full p-2 mb-3 border rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full p-2 mb-3 border rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          Login
        </button>
      </form>
    </div>
  );
}
