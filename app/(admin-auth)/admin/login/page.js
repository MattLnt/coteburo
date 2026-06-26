"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Email ou mot de passe incorrect.");
    } else {
      router.push("/admin");
      router.refresh();
    }
  };

  return (
    <main className="min-h-screen grid place-items-center bg-bg px-5">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-8">
          <p className="font-display font-bold text-2xl text-ink">Côté <span className="text-orange">BURO</span></p>
          <p className="text-ink-soft text-sm mt-1">Espace d'administration</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface border border-line rounded-2xl p-7 shadow-[0_1px_4px_rgba(33,36,40,0.06)]">
          {error && (
            <div className="mb-5 rounded-xl bg-orange-tint border border-orange/30 px-4 py-3 text-orange-dark text-sm">{error}</div>
          )}

          <label className="block text-sm font-semibold text-ink mb-1.5">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email"
            className="w-full rounded-xl border border-line bg-bg px-4 py-3 text-ink outline-none focus:border-orange transition mb-5" placeholder="admin@coteburo.fr" />

          <label className="block text-sm font-semibold text-ink mb-1.5">Mot de passe</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password"
            className="w-full rounded-xl border border-line bg-bg px-4 py-3 text-ink outline-none focus:border-orange transition mb-6" placeholder="••••••••" />

          <button type="submit" disabled={loading}
            className="w-full rounded-full bg-orange text-white font-semibold py-3.5 hover:bg-orange-dark transition disabled:opacity-60">
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>
      </div>
    </main>
  );
}