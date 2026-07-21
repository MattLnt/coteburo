export default function FinitionsAffichage({ groupes }) {
  if (!groupes || groupes.length === 0) return null;

  return (
    <div className="mt-6 pt-6 border-t border-line">
      {groupes.map((g) => (
        <div key={g.id} className="mb-5 last:mb-0">
          <p className="font-semibold text-ink text-[14px] mb-3">{g.nom}</p>
          <div className="flex flex-wrap gap-3">
            {g.finitions.map((f) => (
              <div key={f.id} className="flex flex-col items-center gap-1.5" title={f.nom}>
                <span className="rounded-xl border border-line overflow-hidden block" style={{ width: 52, height: 52 }}>
                  {f.imageUrl ? (
                    <img src={f.imageUrl} alt={f.nom} className="w-full h-full object-cover" />
                  ) : (
                    <span className="w-full h-full block" style={{ background: f.couleur || "#f4f1ec" }} />
                  )}
                </span>
                <span className="text-[11px] text-ink-soft text-center leading-tight max-w-[64px]">{f.nom}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}