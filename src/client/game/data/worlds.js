export const AUTH = {
  name: "alae",
  password: "pardon"
};

export const LUXURY_ITEMS = ["Birkin", "Lipliner", "Clou Cartier", "Bisou"];

export const CHARACTERS = [
  {
    id: "duckie",
    name: "Duckie Angel",
    role: "Inspire de Sonny Angel",
    description: "Petit etre bebe, doux, brillant, avec un esprit canard tres cute.",
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
    description: "Une petite mascotte feerique et tendre avec une fleur geante au-dessus de la tete.",
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
    description: "Un mini guide magique, pastel et brillant, comme une mascotte de mmorpg romantique.",
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
    houses: [
      {
        id: "w1-h1",
        number: 1,
        title: "La verite que je ne dois pas contourner",
        text: "Je sais que ce que tu as ressenti n'etait ni exagere, ni secondaire. Ce qui t'a blessee merite d'etre regarde en face, sans defense rapide, sans minimisation et sans confort pour moi.",
        extra: "C'est ici que le parcours devient honnete : a l'endroit exact ou je reconnais la profondeur de ta blessure.",
        rewardFlavor: "La morale de cette maison parle de reconnaissance totale.",
        position: { x: -420, y: 120 },
        size: { w: 180, h: 150 }
      },
      {
        id: "w1-h2",
        number: 2,
        title: "L'ecoute que j'aurais du t'offrir",
        text: "J'aurais du t'ecouter jusqu'au bout, avec calme et humilite, au lieu de chercher trop vite a expliquer mon intention. Une blessure ne se repare pas en se justifiant avant d'avoir compris.",
        rewardFlavor: "La morale de cette maison parle d'une ecoute plus lente et plus vraie.",
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
        position: { x: 430, y: 110 },
        size: { w: 180, h: 150 }
      }
    ],
    decorations: [
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
    houses: [
      {
        id: "w2-h1",
        number: 1,
        title: "La douceur n'efface rien",
        text: "J'ai voulu que ce monde soit beau, tendre et cute, mais je sais qu'aucune paillette ne peut remplacer une vraie prise de conscience. La douceur du decor ne vaut que si la sincerite reste au centre.",
        rewardFlavor: "La morale de cette maison rappelle qu'une jolie forme ne remplace jamais le fond.",
        position: { x: -420, y: 110 },
        size: { w: 180, h: 150 }
      },
      {
        id: "w2-h2",
        number: 2,
        title: "L'humilite derriere le geste",
        text: "Les silhouettes d'excuse japonaises montrent quelque chose de fort : pour demander pardon, il faut parfois plier son ego, ralentir, et accepter de se tenir plus bas que sa propre fierte.",
        rewardFlavor: "La morale de cette maison parle de l'ego qui doit enfin descendre.",
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
        position: { x: 420, y: 120 },
        size: { w: 180, h: 150 }
      }
    ],
    decorations: [
      { type: "billboard", x: -560, y: -220, src: "/images.jpg", frame: "#fff0ff" },
      { type: "billboard", x: 570, y: -230, src: "/images (1).jpg", frame: "#fff0ff" },
      { type: "billboard", x: -220, y: 340, src: "/t\u00e9l\u00e9chargement.jpg", frame: "#fff0ff" },
      { type: "billboard", x: 250, y: 330, src: "/t\u00e9l\u00e9chargement (1).jpg", frame: "#fff0ff" },
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
    houses: [
      {
        id: "w3-h1",
        number: 1,
        title: "Les actes avant les promesses",
        text: "Je ne veux pas seulement t'annoncer que je ferai mieux. Je veux que cela se voie dans la duree, dans la facon de parler, d'ecouter, d'agir, et dans la constance quand l'emotion sera redescendue.",
        rewardFlavor: "La morale de cette maison parle d'une constance qui dure apres l'emotion.",
        position: { x: -420, y: 120 },
        size: { w: 180, h: 150 }
      },
      {
        id: "w3-h2",
        number: 2,
        title: "Respecter ton rythme sans pression",
        text: "Si tu as besoin de temps, de distance ou meme de silence, alors cela doit etre respecte. Une vraie reparation ne pousse pas l'autre a aller plus vite pour me rassurer moi.",
        rewardFlavor: "La morale de cette maison parle d'un respect qui ne presse jamais l'autre.",
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
        position: { x: 420, y: 120 },
        size: { w: 180, h: 150 }
      }
    ],
    decorations: [
      { type: "tree", x: -560, y: -250, color: "#9befcd", radius: 72 },
      { type: "tree", x: 570, y: -220, color: "#cbffe8", radius: 76 },
      { type: "pond", x: 390, y: -340, rx: 135, ry: 86 },
      { type: "crystal", x: -180, y: 330, color: "#fff0c4", size: 42 }
    ]
  }
];
