// La recherche est la dernière page publique encore rendue à la demande, et
// c'est normal : son résultat dépend de ce qui est tapé. Elle reste donc la
// plus lente du site — elle ramène toutes les fiches qui correspondent, avec
// leurs combinaisons de prix.
//
// Sans état de chargement, Next garde la page précédente à l'écran pendant ce
// temps : on clique, et rien ne bouge. Ce squelette dit « c'est parti » tout
// de suite, et laisse la grille se mettre en place à sa place exacte.
export default function ChargementRecherche() {
  return (
    <main>
      <div className="mx-auto max-w-[1400px] px-5 sm:px-7 py-8 sm:py-12">
        <div className="h-4 w-40 rounded-full bg-line/70 animate-pulse" />
        <div className="h-8 sm:h-11 w-72 max-w-full rounded-xl bg-line/70 animate-pulse mt-3" />

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5 mt-8 sm:mt-10">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-line bg-white overflow-hidden">
              <div className="aspect-[4/3] bg-line/40 animate-pulse" />
              <div className="p-3 sm:p-4 space-y-2">
                <div className="h-2.5 w-20 rounded-full bg-line/60 animate-pulse" />
                <div className="h-3.5 w-full rounded-full bg-line/60 animate-pulse" />
                <div className="h-3 w-24 rounded-full bg-line/50 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
