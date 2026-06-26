"use client";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const ORANGE = "#f0661b";
const CHARCOAL = "#212428";
const PALETTE = ["#f0661b", "#f6a06a", "#d3d1c7"];

const cardStyle = { background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 24 };
const titleStyle = { fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "#23262a", margin: "0 0 2px" };
const subStyle = { fontSize: 12.5, color: "#9aa0a8", margin: "0 0 20px" };

function CustomTooltip({ active, payload, label, suffix = "" }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 10, padding: "10px 14px", boxShadow: "0 8px 24px rgba(33,36,40,0.1)" }}>
      {label && <div style={{ fontSize: 12, fontWeight: 700, color: "#23262a", marginBottom: 4 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: 12.5, color: "#5c616a", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color || p.payload?.fill }} />
          {p.name} : <strong style={{ color: "#23262a" }}>{p.value}{suffix}</strong>
        </div>
      ))}
    </div>
  );
}

export function ProduitsParCategorie({ data }) {
  return (
    <div style={cardStyle}>
      <h3 style={titleStyle}>Produits par catégorie</h3>
      <p style={subStyle}>Répartition du catalogue publié</p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0ece4" vertical={false} />
          <XAxis dataKey="cat" tick={{ fontSize: 11.5, fill: "#9aa0a8" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: "#9aa0a8" }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(240,102,27,0.06)" }} />
          <Bar dataKey="produits" name="Produits" fill={ORANGE} radius={[6, 6, 0, 0]} barSize={30} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AjoutsArea({ data }) {
  return (
    <div style={cardStyle}>
      <h3 style={titleStyle}>Produits ajoutés</h3>
      <p style={subStyle}>Évolution sur les 6 derniers mois</p>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="ajoutsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ORANGE} stopOpacity={0.25} />
              <stop offset="100%" stopColor={ORANGE} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0ece4" vertical={false} />
          <XAxis dataKey="mois" tick={{ fontSize: 12, fill: "#9aa0a8" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: "#9aa0a8" }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="produits" name="Produits" stroke={ORANGE} strokeWidth={3} fill="url(#ajoutsGrad)" dot={{ r: 3, fill: ORANGE }} activeDot={{ r: 6 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StatutDonut({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div style={cardStyle}>
      <h3 style={titleStyle}>Statut des produits</h3>
      <p style={subStyle}>Publiés vs brouillons</p>
      {total === 0 ? (
        <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#9aa0a8", fontSize: 13 }}>Aucun produit</div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <ResponsiveContainer width={170} height={170}>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={75} paddingAngle={2} stroke="none">
                {data.map((entry, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ flex: 1, minWidth: 130, display: "flex", flexDirection: "column", gap: 10 }}>
            {data.map((d, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: PALETTE[i % PALETTE.length] }} />
                  <span style={{ fontSize: 13, color: "#5c616a" }}>{d.name}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#23262a" }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}