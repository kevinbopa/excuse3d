# Alae Journey

Refonte en architecture plus professionnelle, avec un vrai point d'entree `npm run dev` et une separation claire entre code source, assets publics et build.

## Scripts

- `npm run dev` : prepare les assets publics, genere les modeles puis lance le serveur local
- `npm run build` : copie le client et les assets vers `dist/`
- `npm run preview` : prepare les assets puis lance la version `dist/`
- `npm run graphify` : genere une carte du projet dans `.graphify/`

## Structure

- `public/` : images, modeles glTF generes et vendor web pour Three.js
- `scripts/` : scripts de preparation, serveur local et build
- `.graphify/` : vue compacte du projet en JSON + Markdown
- `src/client/` : client web modulaire
- `src/client/game/core/` : input, rendu, sauvegarde, assets
- `src/client/game/data/` : donnees du jeu
- `src/client/game/GameApp.js` : orchestration principale

## Notes local

- Si `5173` est deja pris, le serveur local bascule automatiquement sur le prochain port libre et affiche l'URL exacte dans le terminal.
- Le local sert maintenant `public/` puis `src/client/`, ce qui rapproche son comportement de Vercel et evite les erreurs de resolution de fichiers.

## Fonctionnalites deja incluses

- Authentification consecutive en 2 etapes
- Nom obligatoire : `alae`
- Mot de passe obligatoire : `pardon`
- Indice apres 2 erreurs
- Choix de personnage inspire de Sonny Angel
- Monde plein ecran, rendu style jeu, camera qui suit le personnage
- 3 mondes, 3 maisons par monde, 1 cle par monde
- Numeros visibles au-dessus des maisons
- Choix `morale` ou `article de luxe`
- Articles aleatoires : `Birkin`, `Lipliner`, `Clou Cartier`, `Bisou`
- Cinematique speciale avec `bigar.jpg` pour le `Bisou`
- Lettre finale a la derniere porte
- Support clavier et tactile
