/* ============================================================
   SNAKE — VERSION 3 : trois objets qui se parlent
   ------------------------------------------------------------
   Même jeu que la version 0. Le serpent existe maintenant comme
   une chose : il a un nom, il tient son propre état, et on lui
   PARLE au lieu d'aller fouiller dedans.

   Deux nouveautés arrivées presque gratuitement, et c'est tout
   l'intérêt : le score, et une deuxième pomme.
   ============================================================ */

const COLONNES = 50;
const LIGNES = 24;
const CASE = 20;

const img_Pomme = new Image();
img_Pomme.src = 'sprites/pomme.png';

const img_PommeDoree = new Image();
img_PommeDoree.src = 'sprites/pomme-doree.png';

const img_Piege = new Image();
img_Piege.src = 'sprites/Piege.png';

const img_Mur = new Image();
img_Mur.src = 'sprites/mur.png';

const img_Tete = new Image();
img_Tete.src = 'sprites/tete-bleue.png';

const img_Corps = new Image();
img_Corps.src = 'sprites/corps-bleu.png';


/* ============================================================
   LE SERPENT — il sait où il est, et où il va.
   ============================================================ */
class Serpent {
  constructor(x, y, longueur = 3) {
    this.cases = [];
    for (let i = 0; i < longueur; i++) {
      this.cases.push({ x: x - i, y: y });
    }
    this.dx = 1;
    this.dy = 0;
    this.vivant = true;
  }

  get tete() {
    return this.cases[0];
  }

  /* On lui DEMANDE s'il occupe une case. On ne lit pas ses tableaux. */
  occupe(x, y) {
    return this.cases.some(c => c.x === x && c.y === y);
  }

  tourner(dx, dy) {
    if (dx === -this.dx && dy === -this.dy) return;   // demi-tour interdit
    this.dx = dx;
    this.dy = dy;
  }

  /* Grandir, c'est recopier sa queue : la case en trop sera
     « consommée » par le prochain déplacement. */
  mange() {
    const queue = this.cases[this.cases.length - 1];
    this.cases.push({ x: queue.x, y: queue.y });
  }

  raccourcir(n) {
    if (this.cases.length - n < 2) {
      this.vivant = false;
      return;
    }
    this.cases.splice(-n);
  }

  avance(plateau) {
    const suivante = plateau.caseSuivante(this.tete, this.dx, this.dy);

    if (suivante === null || this.occupe(suivante.x, suivante.y)) {
      this.vivant = false;
      return;
    }

    this.cases.unshift(suivante);
    this.cases.pop();
  }

  dessiner(ctx) {

    for (const c of this.cases) {
      ctx.save();
      ctx.translate(c.x * CASE + CASE / 2, c.y * CASE + CASE / 2);
      ctx.rotate(Math.atan2(this.dy, this.dx));
      if (c === this.cases[0]) {
        ctx.drawImage(img_Tete, -CASE / 2, -CASE / 2, CASE, CASE);
      }
      else {
        ctx.drawImage(img_Corps, -CASE / 2, -CASE / 2, CASE, CASE);
      }
      ctx.restore();

    }
  }
}


/* ============================================================
   LA POMME — elle sait où elle est, et sait aller ailleurs.
   `occupe` porte le MÊME nom que chez le serpent : c'est ce qui
   permet au plateau de leur parler sans savoir à qui il parle.
   ============================================================ */
class Pomme {
  constructor(plateau) {
    this.x = 0;
    this.y = 0;
    this.couleur = '#e05a4b';
    this.points = 10;
    this.placer(plateau);
  }

  occupe(x, y) {
    return this.x === x && this.y === y;
  }

  placer(plateau) {
    const c = plateau.caseLibre();
    this.x = c.x;
    this.y = c.y;
  }

  touchee(serpent, plateau) {
    serpent.mange();
    this.placer(plateau);
    plateau.marquer(this.points);
  }

  dessiner(ctx) {
    ctx.drawImage(img_Pomme, this.x * CASE, this.y * CASE, CASE, CASE);
  }
}

class PommeDoree extends Pomme {
  constructor(plateau) {
    super(plateau);
    this.couleur = '#ffd700';
    this.points = 50;
  }

  dessiner(ctx) {
    ctx.drawImage(img_PommeDoree, this.x * CASE, this.y * CASE, CASE, CASE);
  }
}

class Piege extends Pomme {
  constructor(plateau) {
    super(plateau);
    this.couleur = '#8e44ad';
    this.points = 0;
  }

  touchee(serpent, plateau) {
    serpent.raccourcir(2);
    this.placer(plateau);
  }

  dessiner(ctx) {
    ctx.drawImage(img_Piege, this.x * CASE, this.y * CASE, CASE, CASE);
  }
}

class Mur {
  constructor(cases) {
    this.cases = cases.map(([x, y]) => ({ x: x, y: y }));
  }

  occupe(x, y) {
    return this.cases.some(c => c.x === x && c.y === y);
  }

  touchee(serpent) {
    serpent.vivant = false;
  }

  dessiner(ctx) {
    for (const c of this.cases) {
      ctx.drawImage(img_Mur, c.x * CASE, c.y * CASE, CASE, CASE)
    }
  }
}

class Bordure extends Mur {
  constructor(plateau, trous) {
    const cases = [];
    for (let x = 0; x < plateau.colonnes; x++) {
      for (let y = 0; y < plateau.lignes; y++) {
        const auBord = x === 0 || y === 0 || x === plateau.colonnes - 1 || y === plateau.lignes - 1;
        const trou = trous.some(([tx, ty]) => tx === x && ty === y);
        if (auBord && !trou) cases.push([x, y]);
      } 
    }
    super(cases);
  }
}


/* ============================================================
   LE PLATEAU — il ne connaît pas l'intérieur des autres.
   Il pose des questions et transmet des messages.
   ============================================================ */
class Plateau {
  constructor(colonnes, lignes, ctx) {
    this.colonnes = colonnes;
    this.lignes = lignes;
    this.ctx = ctx;
    this.initialiser();         // ← la deuxième pomme : une ligne
  }

  initialiser() {
    this.enJeu = false;
    this.score = 0;
    this.serpent = new Serpent(8, 8);
    this.choses = [];
    this.ajouter(new Bordure(this, [[0, 5], [this.colonnes - 1, 5], [0, 18], [this.colonnes - 1, 18]]));
    this.ajouter(new Pomme(this));
    this.ajouter(new PommeDoree(this));
    this.ajouter(new Piege(this));
  }

  ajouter(chose) {
    this.choses.push(chose);
  }

  marquer(points) {
    this.score += points;
  }

  /* Tout ce qui peut occuper une case répond à `occupe`. */
  get occupants() {
    return [this.serpent, ...this.choses];
  }

  caseLibre() {
    while (true) {
      const x = Math.floor(Math.random() * this.colonnes);
      const y = Math.floor(Math.random() * this.lignes);
      if (!this.occupants.some(o => o.occupe(x, y))) {
        return { x: x, y: y };
      }
    }
  }

  /* 🧱 LE SEUL ENDROIT QUI CONNAÎT LES BORDS.
     Un mur qui tue, ce serait `return null` au lieu du modulo. */
  caseSuivante(depuis, dx, dy) {
    return {
      x: (depuis.x + dx + this.colonnes) % this.colonnes,
      y: (depuis.y + dy + this.lignes) % this.lignes
    };
  }

  tour() {
    if (this.enJeu && this.serpent.vivant) {
      this.serpent.avance(this);

      const tete = this.serpent.tete;
      for (const chose of this.choses) {
        if (chose.occupe(tete.x, tete.y)) {   // on DEMANDE à la pomme
          chose.touchee(this.serpent, this);
        }
      }
    }
    this.dessiner();
  }

  rejouer() {
    this.initialiser();
  }

  dessiner() {
    const ctx = this.ctx;
    ctx.fillStyle = '#0c1a24';
    ctx.fillRect(0, 0, this.colonnes * CASE, this.lignes * CASE);

    for (const o of this.occupants) {
      o.dessiner(ctx);
    }

    ctx.fillStyle = '#7fa3b8';
    ctx.font = '16px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Score : ' + this.score, 28, 40);

    if (!this.serpent.vivant) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, this.colonnes * CASE, this.lignes * CASE);
      ctx.fillStyle = '#ffffff';
      ctx.font = '28px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Perdu — R pour rejouer',
        this.colonnes * CASE / 2, this.lignes * CASE / 2);
    }
  }
}


/* ============================================================
   LE DÉMARRAGE
   ------------------------------------------------------------
   `window.plateau` est délibéré : c'est ce qui permet d'ouvrir la
   console et de parler au jeu pendant qu'il tourne.
       plateau.serpent.cases
       plateau.serpent.tourner(0, -1)
       Object.getOwnPropertyNames(Object.getPrototypeOf(plateau.serpent))
   ============================================================ */
const canvas = document.getElementById('jeu');
const plateau = new Plateau(COLONNES, LIGNES, canvas.getContext('2d'));
window.plateau = plateau;

document.addEventListener('keydown', e => {
  if (e.key === 'q') plateau.serpent.tourner(-1, 0);
  if (e.key === 'd') plateau.serpent.tourner(1, 0);
  if (e.key === 'z') plateau.serpent.tourner(0, -1);
  if (e.key === 's') plateau.serpent.tourner(0, 1);
  if (e.key === 'r' || e.key === 'R') plateau.rejouer();
  else plateau.enJeu = true;
  if (e.key.startsWith('Arrow')) e.preventDefault();
});

setInterval(() => plateau.tour(), 120);
