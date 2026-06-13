export default function CatalogueFilters() {
  return (
    <aside className="hidden lg:block rounded-[24px] border border-line bg-surface px-5 pb-4">
      <Group title="Catégorie">
        <Check label="Sièges ergonomiques" count="42" defaultChecked />
        <Check label="Fauteuils de direction" count="28" />
        <Check label="Chaises de réunion" count="31" />
        <Check label="Chaises visiteur" count="27" />
      </Group>
      <Group title="Marque">
        <Check label="OfficePro" count="54" defaultChecked />
        <Check label="Buronomic" count="38" />
        <Check label="Sokoa" count="36" />
      </Group>
      <Group title="Prix">
        <div className="pt-3">
          <div className="relative h-1 rounded bg-surface-2">
            <div className="absolute left-[18%] right-[32%] h-1 rounded bg-orange" />
            <span className="absolute left-[18%] top-1/2 h-[15px] w-[15px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-orange bg-white" />
            <span className="absolute left-[68%] top-1/2 h-[15px] w-[15px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-orange bg-white" />
          </div>
          <div className="flex justify-between text-[12.5px] text-ink-soft mt-3"><span>120 € HT</span><span>890 € HT</span></div>
        </div>
      </Group>
      <Group title="Coloris">
        <div className="flex flex-wrap gap-2.5 pt-3">
          {["#23262A", "#F0661B", "#3C6E8F", "#7E8B6A", "#B8B2A6", "#9C3B36"].map((c) => (
            <span key={c} className="h-[26px] w-[26px] rounded-full ring-1 ring-line cursor-pointer" style={{ background: c }} />
          ))}
        </div>
      </Group>
      <Group title="Disponibilité" last>
        <Check label="En stock" count="61" />
        <Check label="Expédition 24h" count="44" />
      </Group>
      <button className="w-full text-center text-[13px] font-semibold text-orange py-2">Réinitialiser les filtres</button>
    </aside>
  );
}

function Group({ title, children, last }) {
  return (
    <div className={`py-5 ${last ? "" : "border-b border-line/70"}`}>
      <h4 className="font-display font-bold text-[15px]">{title}</h4>
      <div className="mt-3 flex flex-col gap-2.5">{children}</div>
    </div>
  );
}

function Check({ label, count, defaultChecked }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer text-sm text-ink-soft hover:text-ink">
      <input type="checkbox" defaultChecked={defaultChecked} className="peer sr-only" />
      <span className="grid h-[18px] w-[18px] place-items-center rounded-[5px] border border-line peer-checked:bg-orange peer-checked:border-orange transition">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><path d="m20 6-11 11-5-5" /></svg>
      </span>
      <span>{label}</span>
      <span className="ml-auto text-xs text-ink-soft bg-surface-2 rounded-full px-2 py-0.5">{count}</span>
    </label>
  );
}