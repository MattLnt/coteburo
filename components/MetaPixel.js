"use client";
import { useEffect, useRef } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { PIXEL_ID, viderFile } from "@/lib/pixel";
import { useConsentement } from "@/components/ConsentementContext";

// Le chargeur du Meta Pixel.
//
// Le <Script> n'est rendu QUE si le visiteur a accepté : tant qu'il n'a pas
// répondu, ou s'il a refusé, aucune balise n'existe dans la page et aucune
// requête ne part chez Meta. C'est la raison d'être de ce composant — un
// script posé dans le layout et bridé ensuite aurait déjà été chargé.

export default function MetaPixel() {
  const { etat, charge, accepte } = useConsentement();
  // La dernière adresse pour laquelle un PageView est parti. Le script
  // d'initialisation en envoie un tout seul au chargement ; ce sont les
  // navigations suivantes, côté navigateur, qu'il faut rattraper.
  const dernierChemin = useRef(null);
  const chemin = usePathname();

  useEffect(() => {
    if (!accepte) return;
    if (dernierChemin.current === null) {
      // Le PageView de cette page-là appartient au script d'init.
      dernierChemin.current = chemin;
      return;
    }
    if (dernierChemin.current === chemin) return;
    dernierChemin.current = chemin;
    if (typeof window.fbq === "function") window.fbq("track", "PageView");
  }, [accepte, chemin]);

  // Les événements posés avant l'injection du script attendent dans la file
  // de lib/pixel.js. `onReady` du <Script> la vide, mais ne se déclenche pas
  // sur toutes les versions pour un script en ligne : ce guet de trois
  // secondes est le filet, et il s'arrête dès que `fbq` existe.
  useEffect(() => {
    if (!accepte) return;
    if (typeof window.fbq === "function") { viderFile(); return; }
    let restants = 20;
    const minuteur = setInterval(() => {
      if (typeof window.fbq === "function") {
        viderFile();
        clearInterval(minuteur);
      } else if (--restants <= 0) {
        clearInterval(minuteur);
      }
    }, 150);
    return () => clearInterval(minuteur);
  }, [accepte]);

  // Un visiteur qui accepte puis se rétracte depuis la page confidentialité :
  // le script est déjà en mémoire, on lui retire le droit d'émettre sans
  // attendre un rechargement.
  useEffect(() => {
    if (etat === "refuse" && typeof window !== "undefined" && typeof window.fbq === "function") {
      try { window.fbq("consent", "revoke"); } catch {}
    }
  }, [etat]);

  if (!charge || !accepte) return null;

  return (
    <Script id="meta-pixel" strategy="afterInteractive" onReady={viderFile}>
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('consent','grant');
fbq('init','${PIXEL_ID}');
fbq('track','PageView');`}
    </Script>
  );
}
