export const AUTH = {
  name: "alae",
  password: "pardon"
};

export const LUXURY_ITEMS = ["Birkin", "Lipliner", "Clou Cartier", "Bisou"];

const FAIRY_TOWNFOLK = {
  elderMage: "/assets/images/fairy-townfolk-elder-mage.png",
  florist: "/assets/images/fairy-townfolk-florist.png",
  smith: "/assets/images/fairy-townfolk-smith.png",
  seamstress: "/assets/images/fairy-townfolk-seamstress.png"
};

export const CHARACTERS = [
  {
    id: "duckie",
    name: "Duckie Angel",
    role: "Inspire de Sonny Angel",
    description: "Petit etre bebe, doux, brillant, avec de vrais petits pieds et un esprit canard tres cute.",
    skin: "#ffd8c7",
    hair: "#4d2d25",
    accent: "#ffd543",
    float: "#ffea78",
    hat: "duck"
  },
  {
    id: "petaline",
    name: "Petaline Angel",
    role: "Sonny Angel floral",
    description: "Une petite mascotte feerique et tendre, toute ronde, avec une fleur geante et une silhouette de bebe ange.",
    skin: "#ffd8c7",
    hair: "#56322a",
    accent: "#ff8ecd",
    float: "#ffd7ee",
    hat: "flower"
  },
  {
    id: "starling",
    name: "Starling Angel",
    role: "Sonny Angel etoile",
    description: "Un mini guide magique, pastel et brillant, comme une mascotte de mmorpg romantique avec une allure de petit ange collectionnable.",
    skin: "#ffd8c7",
    hair: "#5d382f",
    accent: "#92ddff",
    float: "#d4f2ff",
    hat: "star"
  }
];

export const FINAL_LETTER = `
  <article class="letter-paper">
    <div class="letter-top">
      <div class="letter-seal">
        <span class="letter-badge">&#10084;</span>
        <span>Pour Alae</span>
      </div>
      <div class="letter-motifs">
        <span>&#10024;</span>
        <span>&#10047;</span>
        <span>&#9825;</span>
        <span>&#10024;</span>
      </div>
    </div>
    <p class="letter-intro">Une petite lettre finale, douce, serieuse et entierement pour toi.</p>
    <div class="letter-body">
      <p>Alae,</p>
      <p>Je n&rsquo;ai pas voulu t&rsquo;envoyer un simple message. J&rsquo;ai voulu creer quelque chose qui montre reellement ce que je suis pret a faire pour me rattraper.</p>
      <p>J&rsquo;ai donc construit cette aventure, pensee specialement pour toi.</p>
      <p>Quand tu t&rsquo;y connectes, tu entres dans un parcours interactif. Ce n&rsquo;est pas un jeu classique. Chaque etape a un sens precis&nbsp;: comprendre, ressentir, reconstruire.</p>
      <p>Tu avances a ton rythme. Rien n&rsquo;est force. Rien n&rsquo;essaie de prendre ta place.</p>
      <p>A travers chaque maison, chaque cle et chaque monde, le but etait simple&nbsp;: te montrer que je ne veux pas juste parler, mais regarder mes erreurs en face, comprendre ta peine et meriter de faire mieux.</p>
      <p>Je voulais que tu voies que derriere les couleurs, les details cute et les petites choses legeres, il y a quelque chose de tres serieux&nbsp;: mon ressenti, mon regret, et ma volonte sincere de me rattraper.</p>
      <p>Le but n&rsquo;est pas de te convaincre avec des mots. Le but est de te montrer, etape par etape, que j&rsquo;ai reflechi, que j&rsquo;ai compris, et que je suis pret a faire les efforts necessaires.</p>
      <p>Et a la fin, il n&rsquo;y a pas une demande automatique. Il y a simplement un choix qui t&rsquo;appartient entierement.</p>
      <p>Tu peux continuer. Tu peux t&rsquo;arreter. Tu peux fermer tout cela si tu le veux.</p>
      <p>Mais quoi que tu choisisses, une chose reste vraie&nbsp;: si tu as besoin de moi, je serai la. Sans condition. Sans pression.</p>
      <p class="letter-signature">Kevin</p>
    </div>
    <div class="letter-note">Avec tendresse, patience et tout le respect que je te dois.</div>
  </article>
`;

export const WORLDS = [
  {
    id: "ressenti",
    name: "Monde 1",
    subtitle: "Le monde du ressenti",
    hint: "La premiere maison pose la phrase la plus serieuse.",
    skyTop: "#4f7bdb",
    skyBottom: "#20375e",
    terrainA: "#79b5ff",
    terrainB: "#6c8fe8",
    flower: "#d8f2ff",
    portalColor: "#ffe58f",
    homeLabel: "Chaumiere des lucioles",
    houses: [
      {
        id: "w1-h1",
        number: 1,
        title: "La verite que je ne dois pas contourner",
        text: "Je sais que ce que tu as ressenti n'etait ni exagere, ni secondaire. Ce qui t'a blessee merite d'etre regarde en face, sans defense rapide, sans minimisation et sans confort pour moi.",
        extra: "C'est ici que le parcours devient honnete : a l'endroit exact ou je reconnais la profondeur de ta blessure.",
        rewardFlavor: "La morale de cette maison parle de reconnaissance totale.",
        style: {
          label: "Observatoire du ressenti",
          architecture: "sanctuary",
          roof: "#7fa6ff",
          wall: "#f2f7ff",
          trim: "#d6e6ff"
        },
        position: { x: -420, y: 120 },
        size: { w: 180, h: 150 }
      },
      {
        id: "w1-h2",
        number: 2,
        title: "L'ecoute que j'aurais du t'offrir",
        text: "J'aurais du t'ecouter jusqu'au bout, avec calme et humilite, au lieu de chercher trop vite a expliquer mon intention. Une blessure ne se repare pas en se justifiant avant d'avoir compris.",
        rewardFlavor: "La morale de cette maison parle d'une ecoute plus lente et plus vraie.",
        style: {
          label: "Atelier de l'ecoute",
          architecture: "atelier",
          roof: "#88d2f4",
          wall: "#fff3ef",
          trim: "#f7d8c9"
        },
        position: { x: 0, y: -80 },
        size: { w: 180, h: 150 }
      },
      {
        id: "w1-h3",
        number: 3,
        title: "La premiere cle",
        text: "Comprendre une erreur, ce n'est pas dire pardon une fois. C'est accepter que l'autre ait eu mal, que sa peine existe pleinement, et que je doive changer quelque chose de vrai en moi.",
        extra: "La premiere cle s'illumine. La porte du monde suivant peut maintenant t'attendre.",
        rewardFlavor: "La morale de cette maison parle d'un changement reel, pas d'une phrase rapide.",
        givesKey: true,
        style: {
          label: "Maison de la premiere cle",
          architecture: "guild",
          roof: "#4f75c8",
          wall: "#eef4ff",
          trim: "#ffe6b2"
        },
        position: { x: 430, y: 110 },
        size: { w: 180, h: 150 }
      }
    ],
    decorations: [
      {
        type: "town",
        x: -680,
        y: 20,
        label: "Clairiere des Messagers",
        theme: "azure",
        scale: 1.08
      },
      {
        type: "river",
        points: [
          { x: -720, y: 460 },
          { x: -420, y: 250 },
          { x: -120, y: 110 },
          { x: 140, y: -10 },
          { x: 420, y: -190 },
          { x: 760, y: -380 }
        ],
        width: 92,
        color: "#8ce4ff"
      },
      { type: "home", x: 120, y: 470, color: "#ffe6b4", roof: "#e6a4d7", label: "Maison du personnage" },
      { type: "fairy", x: 240, y: 420, palette: ["#ffd6f0", "#ff9ecf", "#fff7ff"] },
      {
        type: "resident",
        x: -705,
        y: 100,
        src: FAIRY_TOWNFOLK.elderMage,
        label: "Grande archiviste",
        scale: 15,
        wander: { radiusX: 16, radiusY: 10, speed: 0.42 }
      },
      {
        type: "resident",
        x: -600,
        y: 72,
        src: FAIRY_TOWNFOLK.smith,
        label: "Forgeron des voeux",
        scale: 14,
        wander: { radiusX: 12, radiusY: 8, speed: 0.34 }
      },
      {
        type: "resident",
        x: -642,
        y: -26,
        src: FAIRY_TOWNFOLK.seamstress,
        label: "Tisseuse des mots",
        scale: 13.8,
        wander: { radiusX: 18, radiusY: 12, speed: 0.38 }
      },
      { type: "animal", animal: "deer", x: -110, y: 290, color: "#e8d8c0" },
      { type: "animal", animal: "rabbit", x: 210, y: 305, color: "#fff4ff" },
      { type: "mageShop", x: -645, y: 70, roof: "#a5d4ff", glow: "#b9f2ff", sign: "Potions" },
      { type: "lanternCluster", x: 520, y: 280, color: "#fff4ba" },
      { type: "castle", x: 0, y: -720, color: "#d8e8ff", glow: "#fff0c4" },
      { type: "tree", x: -540, y: -280, color: "#92e0d5", radius: 70 },
      { type: "tree", x: 590, y: -260, color: "#b9dcff", radius: 74 },
      { type: "pond", x: 380, y: -330, rx: 130, ry: 80 },
      { type: "crystal", x: -220, y: 310, color: "#fff1a0", size: 42 }
    ]
  },
  {
    id: "paillette",
    name: "Monde 2",
    subtitle: "Le monde paillete japonais",
    hint: "Ici, meme les autels cute rappellent l'humilite d'une vraie excuse.",
    skyTop: "#9b68ff",
    skyBottom: "#412867",
    terrainA: "#f0b7ff",
    terrainB: "#d889ff",
    flower: "#fff1ff",
    portalColor: "#fff0ff",
    homeLabel: "Maison rosee de Petaline",
    houses: [
      {
        id: "w2-h1",
        number: 1,
        title: "La douceur n'efface rien",
        text: "J'ai voulu que ce monde soit beau, tendre et cute, mais je sais qu'aucune paillette ne peut remplacer une vraie prise de conscience. La douceur du decor ne vaut que si la sincerite reste au centre.",
        rewardFlavor: "La morale de cette maison rappelle qu'une jolie forme ne remplace jamais le fond.",
        style: {
          label: "Maison des rubans",
          architecture: "atelier",
          roof: "#ff95d2",
          wall: "#fff4ff",
          trim: "#ffe0f5"
        },
        position: { x: -420, y: 110 },
        size: { w: 180, h: 150 }
      },
      {
        id: "w2-h2",
        number: 2,
        title: "L'humilite derriere le geste",
        text: "Les silhouettes d'excuse japonaises montrent quelque chose de fort : pour demander pardon, il faut parfois plier son ego, ralentir, et accepter de se tenir plus bas que sa propre fierte.",
        rewardFlavor: "La morale de cette maison parle de l'ego qui doit enfin descendre.",
        style: {
          label: "Salon de l'humilite",
          architecture: "sanctuary",
          roof: "#e2b4ff",
          wall: "#fff7ff",
          trim: "#ffe8ff"
        },
        position: { x: 0, y: -90 },
        size: { w: 180, h: 150 }
      },
      {
        id: "w2-h3",
        number: 3,
        title: "La cle pailletee",
        text: "Une excuse reste vide si elle est seulement jolie. Elle devient precieuse quand la beaute autour sert juste a porter une verite humble, nette et constante.",
        extra: "La deuxieme cle scintille autour du personnage comme une promesse plus sincere.",
        rewardFlavor: "La morale de cette maison parle de beaute au service d'une verite.",
        givesKey: true,
        style: {
          label: "Pavillon paillete",
          architecture: "guild",
          roof: "#b67aff",
          wall: "#fff1ff",
          trim: "#fff0c7"
        },
        position: { x: 420, y: 120 },
        size: { w: 180, h: 150 }
      }
    ],
    decorations: [
      {
        type: "town",
        x: -660,
        y: 5,
        label: "Ville des Etoffes Sacrees",
        theme: "rose",
        scale: 1.12
      },
      {
        type: "river",
        points: [
          { x: -760, y: 390 },
          { x: -460, y: 220 },
          { x: -120, y: 70 },
          { x: 180, y: -80 },
          { x: 470, y: -260 },
          { x: 760, y: -430 }
        ],
        width: 88,
        color: "#d9c7ff"
      },
      { type: "home", x: 110, y: 470, color: "#fff0ff", roof: "#ff9fda", label: "Maison du personnage" },
      { type: "fairy", x: 240, y: 420, palette: ["#ffe8ff", "#ff9add", "#fff7ff"] },
      {
        type: "resident",
        x: -700,
        y: 80,
        src: FAIRY_TOWNFOLK.florist,
        label: "Marchande fleurie",
        scale: 14,
        wander: { radiusX: 14, radiusY: 12, speed: 0.46 }
      },
      {
        type: "resident",
        x: -602,
        y: 36,
        src: FAIRY_TOWNFOLK.seamstress,
        label: "Couturiere des promesses",
        scale: 13.8,
        wander: { radiusX: 15, radiusY: 10, speed: 0.41 }
      },
      {
        type: "resident",
        x: -662,
        y: -48,
        src: FAIRY_TOWNFOLK.elderMage,
        label: "Gardienne des rubans",
        scale: 14.6,
        wander: { radiusX: 10, radiusY: 8, speed: 0.3 }
      },
      { type: "animal", animal: "fox", x: -80, y: 330, color: "#ffd1cb" },
      { type: "animal", animal: "rabbit", x: 310, y: 340, color: "#fff3fb" },
      { type: "mageShop", x: -645, y: 40, roof: "#ffb8ea", glow: "#fff1ff", sign: "Rune Shop" },
      { type: "lanternCluster", x: 540, y: 250, color: "#ffd8ff" },
      { type: "castle", x: 0, y: -720, color: "#f8defd", glow: "#fff0ff" },
      { type: "billboard", x: -560, y: -220, src: "/assets/images/japanese-apology-1.jpg", frame: "#fff0ff" },
      { type: "billboard", x: 570, y: -230, src: "/assets/images/japanese-apology-2.jpg", frame: "#fff0ff" },
      { type: "billboard", x: -220, y: 340, src: "/assets/images/japanese-apology-3.jpg", frame: "#fff0ff" },
      { type: "billboard", x: 250, y: 330, src: "/assets/images/japanese-apology-4.jpg", frame: "#fff0ff" },
      { type: "pond", x: -410, y: -360, rx: 150, ry: 84 },
      { type: "crystal", x: 160, y: -330, color: "#ffe0ff", size: 48 }
    ]
  },
  {
    id: "promesses",
    name: "Monde 3",
    subtitle: "Le monde des actes",
    hint: "Le dernier monde parle de patience, d'actes et de respect du rythme.",
    skyTop: "#64b4a5",
    skyBottom: "#27453e",
    terrainA: "#b0ffe1",
    terrainB: "#80d9b3",
    flower: "#ecfff7",
    portalColor: "#fff0c7",
    homeLabel: "Maison des promesses",
    houses: [
      {
        id: "w3-h1",
        number: 1,
        title: "Les actes avant les promesses",
        text: "Je ne veux pas seulement t'annoncer que je ferai mieux. Je veux que cela se voie dans la duree, dans la facon de parler, d'ecouter, d'agir, et dans la constance quand l'emotion sera redescendue.",
        rewardFlavor: "La morale de cette maison parle d'une constance qui dure apres l'emotion.",
        style: {
          label: "Forge des actes",
          architecture: "guild",
          roof: "#72d7b5",
          wall: "#effff8",
          trim: "#d8f6ea"
        },
        position: { x: -420, y: 120 },
        size: { w: 180, h: 150 }
      },
      {
        id: "w3-h2",
        number: 2,
        title: "Respecter ton rythme sans pression",
        text: "Si tu as besoin de temps, de distance ou meme de silence, alors cela doit etre respecte. Une vraie reparation ne pousse pas l'autre a aller plus vite pour me rassurer moi.",
        rewardFlavor: "La morale de cette maison parle d'un respect qui ne presse jamais l'autre.",
        style: {
          label: "Maison du calme",
          architecture: "atelier",
          roof: "#8fd8ba",
          wall: "#fff8ec",
          trim: "#f1e4bc"
        },
        position: { x: 0, y: -80 },
        size: { w: 180, h: 150 }
      },
      {
        id: "w3-h3",
        number: 3,
        title: "La cle finale",
        text: "Le pardon ne se reclame pas comme un du. Il se merite peut-etre, il s'espere avec humilite, et il reste toujours libre. Cette cle n'ouvre pas une victoire. Elle ouvre seulement la lettre complete.",
        extra: "La derniere cle tombe doucement dans tes mains. La porte finale peut maintenant s'ouvrir.",
        rewardFlavor: "La morale de cette maison parle d'un pardon qui reste toujours libre.",
        givesKey: true,
        style: {
          label: "Porte des promesses",
          architecture: "sanctuary",
          roof: "#5fc2a4",
          wall: "#f4fff8",
          trim: "#fff0c7"
        },
        position: { x: 420, y: 120 },
        size: { w: 180, h: 150 }
      }
    ],
    decorations: [
      {
        type: "town",
        x: -675,
        y: 12,
        label: "Bastide des Serments",
        theme: "mint",
        scale: 1.1
      },
      {
        type: "river",
        points: [
          { x: -760, y: 430 },
          { x: -430, y: 260 },
          { x: -40, y: 130 },
          { x: 220, y: -20 },
          { x: 500, y: -220 },
          { x: 760, y: -420 }
        ],
        width: 98,
        color: "#9be7db"
      },
      { type: "home", x: 110, y: 470, color: "#f9f5d7", roof: "#8fd8ba", label: "Maison du personnage" },
      { type: "fairy", x: 240, y: 430, palette: ["#e8fff8", "#9be7db", "#fffbea"] },
      {
        type: "resident",
        x: -704,
        y: 86,
        src: FAIRY_TOWNFOLK.smith,
        label: "Maitre artisan",
        scale: 14.2,
        wander: { radiusX: 13, radiusY: 9, speed: 0.36 }
      },
      {
        type: "resident",
        x: -610,
        y: 34,
        src: FAIRY_TOWNFOLK.elderMage,
        label: "Dame des serments",
        scale: 14.5,
        wander: { radiusX: 14, radiusY: 11, speed: 0.29 }
      },
      {
        type: "resident",
        x: -662,
        y: -46,
        src: FAIRY_TOWNFOLK.florist,
        label: "Jardiniere du pardon",
        scale: 13.8,
        wander: { radiusX: 17, radiusY: 12, speed: 0.43 }
      },
      { type: "animal", animal: "deer", x: -170, y: 310, color: "#e7d8b5" },
      { type: "animal", animal: "bird", x: 320, y: 300, color: "#f0fff5" },
      { type: "mageShop", x: -640, y: 50, roof: "#9ce7c0", glow: "#e7fff8", sign: "Elixirs" },
      { type: "lanternCluster", x: 535, y: 250, color: "#fff0c7" },
      { type: "castle", x: 0, y: -725, color: "#d7fff0", glow: "#fff0c7" },
      { type: "tree", x: -560, y: -250, color: "#9befcd", radius: 72 },
      { type: "tree", x: 570, y: -220, color: "#cbffe8", radius: 76 },
      { type: "pond", x: 390, y: -340, rx: 135, ry: 86 },
      { type: "crystal", x: -180, y: 330, color: "#fff0c4", size: 42 }
    ]
  }
];
