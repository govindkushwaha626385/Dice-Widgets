import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function SignUp() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    account_no: "",
    ifsc: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signUp(form.email, form.password, {
        name: form.name || undefined,
        phone: form.phone || undefined,
        address: form.address || undefined,
        account_no: form.account_no || undefined,
        ifsc: form.ifsc || undefined,
      });
      navigate("/my-widgets", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-lg border border-slate-200 p-8">
        <h1 className="text-2xl font-semibold text-slate-800 mb-2">Create account</h1>
        <p className="text-slate-500 text-sm mb-6">Sign up for your Personal Assistant</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 text-red-700 text-sm px-4 py-2">{error}</div>
          )}
          {(["name", "email", "phone", "address", "account_no", "ifsc", "password"] as const).map(
            (field) => (
              <div key={field}>
                <label
                  htmlFor={field}
                  className="block text-sm font-medium text-slate-700 mb-1 capitalize"
                >
                  {field.replace("_", " ")}
                </label>
                <input
                  id={field}
                  type={field === "email" ? "email" : field === "password" ? "password" : "text"}
                  value={form[field]}
                  onChange={(e) => update(field, e.target.value)}
                  required={field === "email" || field === "password"}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  placeholder={
                    field === "password" ? "••••••••" : field === "email" ? "you@example.com" : ""
                  }
                />
              </div>
            )
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 text-white font-medium py-2.5 hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? "Creating account…" : "Sign up"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
