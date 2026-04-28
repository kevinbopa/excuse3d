# Alae Journey

Refonte en architecture plus professionnelle, avec un vrai point d'entree `npm run dev`.

## Scripts

- `npm run dev` : lance le serveur local de developpement sur `http://localhost:5173`
- `npm run build` : copie le client et les assets vers `dist/`
- `npm run preview` : lance le meme serveur sur `http://localhost:4173`
- `npm run graphify` : genere une carte du projet dans `.graphify/`

## Structure

- `scripts/` : serveur local et build
- `.graphify/` : vue compacte du projet en JSON + Markdown
- `src/client/` : client web modulaire
- `src/client/game/core/` : input, rendu, sauvegarde, assets
- `src/client/game/data/` : donnees du jeu
- `src/client/game/GameApp.js` : orchestration principale

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
