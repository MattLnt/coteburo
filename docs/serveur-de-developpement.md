# Le serveur de développement

`npm run dev` lance webpack, pas Turbopack. Ce n'est pas le réglage par
défaut de Next 16, et voici pourquoi.

## Ce qui se passait

Turbopack paniquait à chaque compilation de page :

```
FATAL: An unexpected Turbopack error occurred.

Failed to write app endpoint /(admin-auth)/admin/login/page
Caused by:
- Next.js package not found
  … Execution of get_next_server_import_map failed
```

Le serveur continuait de servir les pages — 200 à chaque fois — mais son
rechargement à chaud était mort. Le client rebouclait alors en silence :

```
GET /admin/login 200 in 132ms
GET /admin/login 200 in  93ms
GET /admin/login 200 in  97ms
```

Une requête toutes les cinquante millisecondes. **La page se rechargeait
pendant qu'on tapait son mot de passe**, ce qui rendait la connexion
impossible sans qu'aucun message ne dise pourquoi.

## Ce qui a été écarté

| piste | vérification |
|---|---|
| paquet `next` absent ou cassé | 16.2.9, `require.resolve` le trouve, `dist/` et `swc-win32-x64-msvc` présents |
| cache `.next` corrompu | reproduit après suppression complète et redémarrage |
| racine mal devinée | aucun `package.json` ni verrou au-dessus du projet ; `package-lock.json` est bien à la racine |
| lien symbolique, jonction | `node_modules`, `next` et `@next` sont des dossiers réels |
| `next.config.mjs` | aucun import exotique |
| `.env.local` | absent ; `.env` porte une `DATABASE_URL` valide et `AUTH_SECRET` |
| `proxy.js` | répond 200 sur `/admin/login`, sans redirection : la boucle vient du client |

La panique existait déjà le 17 septembre, avant la refonte du catalogue.
Elle ne vient donc pas du code applicatif.

## Ce qui reste à faire

La cause profonde n'est pas trouvée. `get_next_server_import_map` ne
parvient pas à localiser le paquet `next` alors que tout indique qu'il est
là. Deux choses à surveiller :

- **Le disque est à 97 %** — seize gigaoctets libres sur quatre cent
  quarante-sept. Turbopack écrit beaucoup, et le premier message est
  « Failed to write ». Ce n'est peut-être pas la cause, mais c'est la
  première chose à corriger avant de rouvrir l'enquête.
- **`next build` fonctionne** avec Turbopack, sans une plainte. Seul le
  mode développement échoue.

Pour retenter : `npm run dev:turbopack`. Si la panique a disparu, ce
document peut partir avec.

## Un piège à ne pas répéter

`next build` et `next dev` écrivent tous les deux dans `.next`. Lancer un
build pendant que le serveur de développement tourne lui retire le sol sous
les pieds. Arrêter le serveur avant de construire, ou ne pas construire.
