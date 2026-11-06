/* ============================================================
   VÉRIFIER — le contrôleur du Snake objet (on n'y touche pas)
   ------------------------------------------------------------
   « Ça marche » n'est pas « c'est juste ». Ce fichier pose des
   questions précises à VOS objets, sur un état qu'il choisit.
   Bouton « ✅ Vérifier », en bas à droite : ✅ juste · ❌ faux
   (une phrase dit quoi) · ⏳ pas encore écrit.

   Le vérificateur du 14 octobre devait sauver le jeu, le trafiquer,
   puis tout remettre en place : il n'y avait qu'UNE partie possible,
   en variables globales. Celui-ci fabrique SON plateau à chaque
   question, avec `new Plateau(...)`, et votre partie continue de
   tourner pendant ce temps. C'est ça, une classe.
   ============================================================ */
(function () {
  'use strict';

  var vraiRandom = Math.random, SANS_FIN = new Error('sans fin');
  var TROUS = [[12, 0], [12, 23], [0, 12], [23, 12]];

  /* Un faux pinceau : il accepte tout, et compte ce qu'on lui fait dessiner. */
  function pinceau() {
    var compte = { fillRect: 0, drawImage: 0, fillText: 0, images: [] };
    var ctx = new Proxy({}, {
      get: function (o, nom) {
        if (nom === 'drawImage') { return function (img) { compte.drawImage++; compte.images.push(img); }; }
        if (nom === 'fillRect' || nom === 'fillText') { return function () { compte[nom]++; }; }
        if (nom === 'measureText') { return function () { return { width: 0 }; }; }
        if (nom === 'createLinearGradient' || nom === 'createRadialGradient') { return function () { return { addColorStop: function () {} }; }; }
        return function () {};
      },
      set: function () { return true; }
    });
    return { ctx: ctx, compte: compte };
  }
  /* Math.random plafonné : un tirage sans fin ne fige pas la page. */
  function plafonner() {
    var n = 0;
    Math.random = function () { if (++n > 300000) { throw SANS_FIN; } return vraiRandom(); };
  }
  function neuf(c, l) { var pl = new Plateau(c || 24, l || 24, pinceau().ctx); pl.enJeu = true; return pl; }
  function joueur(pl) { return pl.serpents ? pl.serpents[0] : pl.serpent; }
  function score(pl) { return pl.serpents ? joueur(pl).score : pl.score; }
  function choses(pl) { return pl.choses || pl.pommes; }
  function poser(pl, t) { if (pl.choses) { pl.choses = t; } else { pl.pommes = t; } }
  function trouver(pl, Classe) { return choses(pl).filter(function (o) { return o instanceof Classe; })[0]; }
  function ligne(x, y, sens, n) {   /* un serpent couché : la tête en (x, y), le corps derrière */
    for (var t = [], i = 0; i < n; i++) { t.push({ x: x - i * sens, y: y }); }
    return t;
  }
  /* Le joueur en (x, y), allant à droite (sens 1) ou à gauche (sens -1) ; l'autre joueur, s'il existe, au loin. */
  function placer(pl, x, y, sens, n) {
    var j = joueur(pl); j.cases = ligne(x, y, sens, n || 3); j.dx = sens; j.dy = 0;
    if (pl.serpents && pl.serpents[1]) { pl.serpents[1].cases = ligne(20, 20, 1, 3); pl.serpents[1].dx = 1; pl.serpents[1].dy = 0; }
    return j;
  }
  function attente(nom) { return ['attente', 'La classe ' + nom + ' n\'existe pas encore (le nom compte).']; }
  /* Le texte d'une méthode, sans ses commentaires. */
  function source(f) { return String(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''); }

  /* ============================================================
     LES CONTRÔLES
     ============================================================ */
  function base() {
    if (typeof Plateau === 'undefined' || typeof Serpent === 'undefined' || typeof Pomme === 'undefined') { return ['ko', 'Il manque une des trois classes : Serpent, Pomme, Plateau.']; }
    var pl = neuf(), t = joueur(pl).tete, x = t.x, y = t.y; pl.tour();
    if (joueur(pl).tete.x === x && joueur(pl).tete.y === y) { return ['ko', 'Après un tour, le serpent n\'a pas bougé.']; }
    return ['ok'];
  }
  function lesPommes() {
    if (typeof PommeDoree === 'undefined') { return attente('PommeDoree'); }
    var pl = neuf(), d = new PommeDoree(pl), n = new Pomme(pl);
    if (!(d instanceof Pomme)) { return ['ko', 'Une pomme dorée EST une pomme : class PommeDoree extends Pomme.']; }
    if (n.points !== 10) { return ['ko', 'Une pomme normale doit avoir un attribut points qui vaut 10 ; il vaut ' + n.points + '.']; }
    if (d.points !== 50) { return ['ko', 'Une pomme dorée doit valoir 50 points ; son attribut points vaut ' + d.points + '.']; }
    if (!trouver(pl, PommeDoree)) { return ['ko', 'Aucune pomme dorée sur un plateau neuf : ajoutez-la à la naissance de la partie.']; }
    pl.rejouer(); pl.enJeu = true;
    if (!trouver(pl, PommeDoree)) { return ['ko', 'Plus de pomme dorée après rejouer() : la naissance de la partie est écrite à deux endroits.']; }
    placer(pl, 5, 5, 1); d.x = 6; d.y = 5; poser(pl, [d]); pl.tour();
    if (score(pl) !== 50) { return ['ko', 'La tête mange une pomme dorée, et le score vaut ' + score(pl) + ' au lieu de 50. Qui lit les points ?']; }
    if (joueur(pl).cases.length !== 4) { return ['ko', 'Après une pomme dorée, le serpent devrait avoir 4 anneaux ; il en a ' + joueur(pl).cases.length + '.']; }
    pl = neuf(); n = new Pomme(pl); placer(pl, 5, 5, 1); n.x = 6; n.y = 5; poser(pl, [n]); pl.tour();
    if (score(pl) !== 10) { return ['ko', 'Une pomme normale donne ' + score(pl) + ' points au lieu de 10.']; }
    return ['ok'];
  }
  function leRangement() {
    if (typeof Piege === 'undefined') { return attente('Piege'); }
    var pl = neuf();
    if (!(new Piege(pl) instanceof Pomme)) { return ['ko', 'Un piège naît, se place et se dessine comme une pomme : class Piege extends Pomme.']; }
    if (typeof Pomme.prototype.touchee !== 'function') { return ['attente', 'Le piège existe. Le rangement commence : Pomme n\'a pas encore de méthode touchee(serpent, plateau).']; }
    if (!Array.isArray(pl.choses)) { return ['attente', 'Pomme sait répondre. Il reste à donner au plateau sa liste : this.choses.']; }
    if (!trouver(pl, Piege)) { return ['ko', 'Aucun piège sur un plateau neuf : ajoutez-le dans initialiser().']; }
    if (typeof pl.initialiser !== 'function') { return ['ko', 'Il manque initialiser() : le seul endroit où naît une partie.']; }
    var t = source(Plateau.prototype.tour);
    if (/instanceof|Piege|\.points|\.mange\(/.test(t)) { return ['ko', 'tour() décide encore à la place des choses (il cite le piège, les points ou mange) : il ne doit plus que leur envoyer touchee.']; }
    pl = neuf(); var g = new Piege(pl); placer(pl, 5, 5, 1, 5); g.x = 6; g.y = 5; poser(pl, [g]); pl.tour();
    if (joueur(pl).cases.length !== 3) { return ['ko', 'Sur un piège, un serpent de 5 anneaux doit en perdre 2 ; il en a ' + joueur(pl).cases.length + '.']; }
    if (!joueur(pl).vivant) { return ['ko', 'Il reste 3 anneaux : le serpent devrait vivre encore.']; }
    if (g.x === 6 && g.y === 5) { return ['ko', 'Le piège doit aller ailleurs une fois déclenché (placer).']; }
    pl = neuf(); g = new Piege(pl); placer(pl, 5, 5, 1, 3); g.x = 6; g.y = 5; poser(pl, [g]); pl.tour();
    if (joueur(pl).vivant) { return ['ko', 'Sur un piège, un serpent de 3 anneaux n\'a plus assez de longueur : il doit mourir.']; }
    pl = neuf(); pl.tour(); pl.rejouer();
    if (score(pl) !== 0) { return ['ko', 'rejouer() doit remettre le score à zéro.']; }
    return ['ok'];
  }
  function lesMurs() {
    if (typeof Mur === 'undefined') { return attente('Mur'); }
    var pl = neuf(), m = new Mur([[6, 5], [7, 5]]);
    if (!m.occupe(7, 5) || m.occupe(8, 5)) { return ['ko', 'occupe(x, y) doit dire vrai sur chaque case du mur, et faux ailleurs.']; }
    if (!Array.isArray(pl.choses)) { return ['attente', 'Faites d\'abord le rangement : le mur entre dans this.choses.']; }
    placer(pl, 5, 5, 1); poser(pl, [m]); pl.tour();
    if (joueur(pl).vivant) { return ['ko', 'La tête entre dans le mur, et le serpent vit encore : que répond le mur à touchee ?']; }
    if (!trouver(neuf(), Mur)) { return ['ko', 'Aucun mur sur un plateau neuf : ajoutez-le dans initialiser().']; }
    pl = neuf();
    for (var i = 0; i < 300; i++) {
      pl.rejouer();
      var murs = choses(pl).filter(function (o) { return o instanceof Mur; });
      var pommes = choses(pl).filter(function (o) { return o instanceof Pomme; });
      for (var a = 0; a < murs.length; a++) { for (var b = 0; b < pommes.length; b++) {
        if (murs[a].occupe(pommes[b].x, pommes[b].y)) { return ['ko', 'Une pomme est née sur un mur : dans initialiser(), le mur doit naître AVANT les pommes. caseLibre() ne peut éviter que ce qui existe déjà.']; }
      } }
    }
    return ['ok'];
  }
  function laBordure() {
    if (typeof Bordure === 'undefined') { return attente('Bordure'); }
    var pl = neuf(), b = new Bordure(pl, TROUS);
    if (!(b instanceof Mur)) { return ['ko', 'Une bordure EST un mur qui fabrique ses cases : class Bordure extends Mur.']; }
    if (!b.occupe(0, 0) || !b.occupe(23, 5) || !b.occupe(7, 23)) { return ['ko', 'La bordure doit occuper tout le tour du plateau.']; }
    if (b.occupe(5, 5)) { return ['ko', 'La bordure occupe une case du milieu : seulement le tour du plateau.']; }
    if (b.occupe(12, 0) || b.occupe(0, 12)) { return ['ko', 'Les trous doivent rester libres.']; }
    var r = neuf(30, 20), br = new Bordure(r, []);
    if (!br.occupe(29, 19) || br.occupe(29, 21) || br.occupe(15, 10)) { return ['ko', 'Plateau 30 × 20 : la bordure doit suivre plateau.colonnes et plateau.lignes. Le plateau carré cache cette erreur.']; }
    if (!trouver(neuf(), Bordure)) { return ['ko', 'Aucune bordure sur un plateau neuf : ajoutez-la dans initialiser().']; }
    var bp = trouver(neuf(), Bordure), libres = 0;
    for (var v = 0; v < 24; v++) { if (!bp.occupe(v, 0)) { libres++; } if (!bp.occupe(v, 23)) { libres++; } if (!bp.occupe(0, v)) { libres++; } if (!bp.occupe(23, v)) { libres++; } }
    if (libres === 0) { return ['ko', 'La bordure de votre plateau n\'a aucun trou : où passe le serpent ?']; }
    pl = neuf(); b = new Bordure(pl, TROUS); placer(pl, 2, 8, -1); poser(pl, [b]); pl.tour();
    if (!joueur(pl).vivant) { return ['ko', 'En x = 1, le serpent ne touche pas encore le bord : il devrait vivre.']; }
    pl.tour();
    if (joueur(pl).vivant) { return ['ko', 'La tête entre dans la bordure, et le serpent vit encore.']; }
    pl = neuf(); b = new Bordure(pl, TROUS); placer(pl, 1, 12, -1); poser(pl, [b]); pl.tour(); pl.tour(); pl.tour();
    if (!joueur(pl).vivant || joueur(pl).tete.x !== 22 || joueur(pl).tete.y !== 12) { return ['ko', 'Par le trou de gauche, le serpent doit ressortir à droite, vivant : la tête devrait être en (22, 12).']; }
    var attend = new Plateau(24, 24, pinceau().ctx);
    if (attend.enJeu !== false) { return ['ko', 'Avec une bordure, la partie ne peut plus partir toute seule : il faut un attribut enJeu, faux à la naissance de la partie.']; }
    var j = joueur(attend), tx = j.tete.x, ty = j.tete.y; attend.tour();
    if (joueur(attend).tete.x !== tx || joueur(attend).tete.y !== ty) { return ['ko', 'enJeu est faux, et le serpent avance quand même : tour() doit le lire.']; }
    return ['ok'];
  }
  function lesSprites() {
    var pl = neuf(), a = pinceau(); new Pomme(pl).dessiner(a.ctx);
    var b = pinceau(); joueur(pl).dessiner(b.ctx);
    function habille(c) { return c.compte.drawImage + c.compte.fillText > 0; }
    if (!habille(a) && !habille(b)) { return ['attente', 'Pomme et serpent se dessinent encore en carrés.']; }
    if (!habille(a)) { return ['ko', 'Le serpent a sa peau, la pomme est encore un carré.']; }
    if (!habille(b)) { return ['ko', 'La pomme a sa peau, le serpent est encore en carrés.']; }
    var imgs = a.compte.images.concat(b.compte.images);
    for (var i = 0; i < imgs.length; i++) {
      if (imgs[i] && imgs[i].complete && imgs[i].naturalWidth === 0) { return ['ko', 'Une image ne se charge pas : vérifiez le chemin (sprites/…).']; }
    }
    return ['ok'];
  }
  function laPommeQuiBouge() {
    if (typeof PommeQuiBouge === 'undefined') { return attente('PommeQuiBouge'); }
    var pl = neuf(), q = new PommeQuiBouge(pl);
    if (!(q instanceof Pomme)) { return ['ko', 'Elle se mange comme une pomme : class PommeQuiBouge extends Pomme.']; }
    if (typeof Pomme.prototype.agir !== 'function') { return ['ko', 'Tout le monde doit savoir répondre à agir(plateau) : Pomme aussi, avec une méthode vide.']; }
    if (typeof Mur !== 'undefined' && typeof Mur.prototype.agir !== 'function') { return ['ko', 'Le mur aussi doit répondre à agir(plateau), même pour ne rien faire.']; }
    if (!trouver(neuf(), PommeQuiBouge)) { return ['ko', 'Aucune pomme qui bouge sur un plateau neuf : ajoutez-la dans initialiser().']; }
    var appels = 0, garde = q.agir; q.agir = function (p) { appels++; return garde.call(q, p); };
    placer(pl, 5, 5, 1); poser(pl, [q]); pl.tour();
    if (appels === 0) { return ['ko', 'tour() n\'envoie jamais agir aux choses.']; }
    pl = neuf(); q = trouver(pl, PommeQuiBouge);
    var x = q.x, y = q.y, bouge = false, i;
    for (i = 0; i < 1500; i++) {
      q.agir(pl);
      if (q.x !== x || q.y !== y) { bouge = true; }
      for (var k = 0, o = pl.occupants; k < o.length; k++) {
        if (o[k] !== q && o[k].occupe(q.x, q.y)) { return ['ko', 'La pomme s\'est posée sur une case occupée, en (' + q.x + ',' + q.y + ') : demandez aux occupants avant de bouger.']; }
      }
    }
    if (!bouge) { return ['ko', 'En 1 500 tours, la pomme n\'a pas bougé.']; }
    return ['ok'];
  }
  function lesMiniSerpents() {
    if (typeof MiniSerpent === 'undefined') { return attente('MiniSerpent'); }
    var pl = neuf(), m = trouver(pl, MiniSerpent);
    if (!(new MiniSerpent(5, 5) instanceof Serpent)) { return ['ko', 'On ne réécrit pas un serpent, on en hérite : class MiniSerpent extends Serpent.']; }
    if (!m) { return ['ko', 'Aucun mini-serpent sur un plateau neuf : ajoutez-le dans initialiser().']; }
    var n = m.cases.length, t0 = m.tete.x + ',' + m.tete.y, va = false;
    for (var i = 0; i < 1500; i++) {
      m.agir(pl);
      if (m.tete.x + ',' + m.tete.y !== t0) { va = true; }
      for (var k = 0, o = pl.occupants; k < o.length; k++) {
        if (o[k] === m) { continue; }
        for (var c = 0; c < m.cases.length; c++) {
          if (o[k].occupe(m.cases[c].x, m.cases[c].y)) { return ['ko', 'Le mini-serpent est passé sur quelque chose : demandez aux occupants avant d\'avancer.']; }
        }
      }
    }
    if (!va) { return ['ko', 'En 1 500 tours, le mini-serpent n\'a pas bougé : agir(plateau) doit le faire avancer.']; }
    if (m.cases.length !== n || !m.vivant) { return ['ko', 'Le mini-serpent doit garder sa longueur et rester vivant.']; }
    pl = neuf(); m = new MiniSerpent(6, 5); m.cases = [{ x: 6, y: 5 }, { x: 6, y: 4 }, { x: 6, y: 3 }]; m.agir = function () {};
    placer(pl, 5, 5, 1); poser(pl, [m]); pl.tour();
    if (joueur(pl).vivant) { return ['ko', 'La tête touche un mini-serpent, et le joueur vit encore. (Vous préférez qu\'on les mange ? Dites-le dans le rapport, et oubliez cette ligne.)']; }
    return ['ok'];
  }
  function deuxJoueurs() {
    var pl = neuf();
    if (!Array.isArray(pl.serpents)) { return ['attente', 'Le plateau n\'a encore qu\'un serpent : this.serpents, un tableau de deux.']; }
    if (pl.serpents.length !== 2) { return ['ko', 'Il faut deux serpents dans this.serpents.']; }
    if (typeof PiloteClavier === 'undefined') { return attente('PiloteClavier'); }
    if (!Array.isArray(pl.pilotes) || pl.pilotes.length !== 2) { return ['ko', 'Il faut deux pilotes dans this.pilotes, un par serpent.']; }
    var a = pl.serpents[0], b = pl.serpents[1];
    a.dx = 1; a.dy = 0; b.dx = 1; b.dy = 0;
    pl.pilotes.forEach(function (p) { p.touche('ArrowUp'); });
    if (a.dy !== -1 || b.dy !== 0) { return ['ko', 'La flèche ↑ doit diriger le joueur 1, et lui seul.']; }
    pl.pilotes.forEach(function (p) { p.touche('z'); });
    if (b.dy !== -1) { return ['ko', 'La touche z doit diriger le joueur 2.']; }
    pl = neuf(); poser(pl, []); a = pl.serpents[0]; b = pl.serpents[1];
    a.cases = ligne(6, 5, 1, 5); a.dx = 1; a.dy = 0;
    b.cases = [{ x: 5, y: 6 }, { x: 5, y: 7 }, { x: 5, y: 8 }]; b.dx = 0; b.dy = -1;
    pl.tour();
    if (b.vivant) { return ['ko', 'Le joueur 2 entre dans le corps du joueur 1, et il vit encore : pour l\'autre, un serpent est un obstacle.']; }
    if (!a.vivant) { return ['ko', 'Le joueur 2 entre dans le corps du joueur 1 : c\'est le 2 qui meurt, pas le 1.']; }
    /* Le joueur 2 ne joue pas : la pomme renaît au hasard, et pourrait tomber juste devant lui. */
    pl = neuf(); var n = new Pomme(pl); placer(pl, 5, 5, 1); pl.serpents[1].vivant = false; n.x = 6; n.y = 5; poser(pl, [n]); pl.tour();
    if (pl.serpents[0].score !== 10 || pl.serpents[1].score !== 0) { return ['ko', 'Chacun son score : le joueur 1 mange, le joueur 1 marque (attribut score du serpent).']; }
    pl = neuf(); pl.rejouer();
    if (pl.pilotes[0].serpent !== pl.serpents[0]) { return ['ko', 'Après rejouer(), les pilotes dirigent encore les anciens serpents : refaites-les dans initialiser().']; }
    return ['ok'];
  }

  var ETAPES = [
    ['La base', 'le jeu est là', base, ''],
    ['Marche 1', 'Les pommes', lesPommes, 'Guidé'],
    ['Marche 2', 'Le piège et le rangement', leRangement, ''],
    ['Marche 3', 'Les murs', lesMurs, ''],
    ['Marche 4', 'La bordure à trous', laBordure, ''],
    ['Défi', 'Les sprites', lesSprites, 'Défis'],
    ['Défi', 'La pomme qui bouge', laPommeQuiBouge, ''],
    ['Défi', 'Les mini-serpents', lesMiniSerpents, ''],
    ['Défi', 'Deux joueurs', deuxJoueurs, '']
  ];
  function essayer(test) {
    plafonner();
    try { return test(); }
    catch (e) {
      if (e === SANS_FIN) { return ['ko', 'Un tirage au hasard tourne sans fin : caseLibre() ne trouve plus de case.']; }
      return ['ko', 'Votre code s\'arrête sur une erreur : « ' + (e && e.message) + ' » (F12 › Console).'];
    } finally { Math.random = vraiRandom; }
  }
  /* Pour la console : verifierSnake() rend le même résultat que le bouton. */
  window.verifierSnake = function () {
    return ETAPES.map(function (e) { var r = essayer(e[2]); return { etape: e[0] + ' · ' + e[1], etat: r[0], message: r[1] || '' }; });
  };

  /* --- Le panneau ----------------------------------------------- */
  var style = document.createElement('style'); style.textContent =
    '#verif-btn{position:fixed;right:1rem;bottom:1rem;z-index:99;font:600 .95rem system-ui,sans-serif;padding:.55rem .9rem;border-radius:6px;border:1px solid #2f6b55;background:#123326;color:#d6f5e8;cursor:pointer}' +
    '#verif{position:fixed;right:1rem;bottom:3.8rem;z-index:99;width:min(30rem,calc(100vw - 2rem));max-height:72vh;overflow:auto;box-sizing:border-box;padding:.8rem 1rem;border-radius:8px;border:1px solid #1d3a4d;background:#0d1b26;color:#cfe3ee;font:.88rem/1.45 system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.5)}' +
    '#verif[hidden]{display:none}#verif h2{margin:0 0 .5rem;font-size:.95rem}#verif ol{list-style:none;margin:0;padding:0}' +
    '#verif li{display:grid;grid-template-columns:1.6rem 1fr;gap:.1rem .3rem;padding:.35rem 0;border-top:1px solid #16303f}' +
    '#verif .msg{grid-column:2;font-size:.84rem}#verif .ok .msg{display:none}#verif .ko .msg{color:#f2a49a}#verif .attente{color:#7fa3b8}' +
    '#verif p{margin:.5rem 0 0;color:#7fa3b8;font-size:.8rem}#verif button{font:inherit;margin-top:.5rem;padding:.25rem .7rem;border-radius:4px;border:1px solid #24404f;background:#12222e;color:#cfe3ee;cursor:pointer}';
  document.head.appendChild(style);
  var bouton = document.createElement('button');
  bouton.id = 'verif-btn'; bouton.type = 'button'; bouton.textContent = '✅ Vérifier';
  var boite = document.createElement('section');
  boite.id = 'verif'; boite.hidden = true; boite.setAttribute('aria-live', 'polite');
  function verifier() {
    var html = '<h2>Ce que répondent vos objets</h2><ol>', verts = 0, r = [];
    ETAPES.forEach(function (e, i) {
      r[i] = essayer(e[2]);
      if (r[i][0] === 'ok') { verts++; }
      html += '<li class="' + r[i][0] + '"><span>' + { ok: '✅', ko: '❌', attente: '⏳' }[r[i][0]] + '</span><strong>' + e[0] + ' · ' + e[1] + '</strong><span class="msg"></span></li>';
    });
    boite.innerHTML = html + '</ol><p>' + verts + ' / ' + ETAPES.length + ' en vert. Le vérificateur fabrique ses propres plateaux : votre partie n\'a pas bougé.</p><button type="button">Relancer</button>';
    var spans = boite.querySelectorAll('.msg');   /* textContent : un message ne s'interprète jamais en HTML */
    ETAPES.forEach(function (e, i) { spans[i].textContent = r[i][1] || (r[i][0] === 'attente' ? 'pas encore écrit' : ''); });
    boite.querySelector('button').onclick = function () { this.blur(); verifier(); };
  }
  bouton.onclick = function () {
    bouton.blur(); boite.hidden = !boite.hidden; if (!boite.hidden) { verifier(); }
  };
  document.body.appendChild(boite); document.body.appendChild(bouton);
})();
