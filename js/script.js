/* ====================================================================
   PROTECTION ANTI-TRICHE
   Bloque l'accès aux outils de développement pendant la partie.
   ==================================================================== */
(function() {
    'use strict';

    // Désactiver le menu contextuel (clic droit)
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    }, false);

    // Bloquer les raccourcis clavier des outils dev
    document.addEventListener('keydown', function(e) {
        const ctrl = e.ctrlKey || e.metaKey;
        if (e.key === 'F12') { e.preventDefault(); return; }
        if (ctrl && e.shiftKey && 'IJCijc'.includes(e.key)) { e.preventDefault(); return; }
        if (ctrl && 'uUsS'.includes(e.key)) { e.preventDefault(); return; }
    }, false);

    // Détection DevTools par différence de taille de fenêtre
    var _alerte = null;
    function _verifier() {
        var ouvert =
            (window.outerWidth  - window.innerWidth)  > 200 ||
            (window.outerHeight - window.innerHeight) > 200;
        if (ouvert && !_alerte) {
            _alerte = document.createElement('div');
            Object.assign(_alerte.style, {
                position:'fixed', inset:'0', background:'rgba(17,17,17,0.99)',
                zIndex:'999999', display:'flex', flexDirection:'column',
                alignItems:'center', justifyContent:'center',
                gap:'16px', fontFamily:'sans-serif', color:'#F4ECDC',
                textAlign:'center', padding:'24px',
            });
            _alerte.innerHTML =
                '<div style="font-size:3rem">🔒</div>' +
                '<div style="font-size:1.3rem;font-weight:700;color:#C9A24B">Outils de développement détectés</div>' +
                '<div style="max-width:360px;line-height:1.6;opacity:0.8">Fermez les outils de développement pour continuer à jouer.</div>';
            document.body.appendChild(_alerte);
        } else if (!ouvert && _alerte) {
            _alerte.remove();
            _alerte = null;
        }
    }
    setInterval(_verifier, 800);
    window.addEventListener('resize', _verifier);
})();

/* ====================================================================
   MOTEUR DE JEU
   Fonctions pures (mélange, distribution, règles des actions).
   ==================================================================== */

const PERSONNAGES = [
    {
        id: 'medecin', nom: 'Médecin', image: 'Personnage Medecin.png',
        objets: [
            { nom: 'Médicament', image: 'MedicamentMedecin.png' },
            { nom: 'Seringue',   image: 'SeringueMedecin.png'   },
            { nom: 'Stéthoscope', image: 'StetoscopeMedecin.png' },
        ],
    },
    {
        id: 'pompier', nom: 'Pompier', image: 'PersonnagePompier.png',
        objets: [
            { nom: 'Casque',  image: 'Casquepomier.png'    },
            { nom: 'Échelle', image: 'Echellepompier.png'  },
            { nom: 'Lance',   image: 'Lancepompier.png'    },
        ],
    },
    {
        id: 'vacancier', nom: 'Vacancier', image: 'PersonnageVacancier.png',
        objets: [
            { nom: 'Billet',   image: 'BilletVacancier.png'   },
            { nom: 'Bouée',    image: 'BoueeVacancier.png'    },
            { nom: 'Lunettes', image: 'LunnettesVacancier.png' },
        ],
    },
    {
        id: 'juge', nom: 'Juge', image: 'PersonnageJuge.png',
        objets: [
            { nom: 'Balance', image: 'BalanceJuge.png' },
            { nom: 'Code',    image: 'CodeJuge.png'    },
            { nom: 'Marteau', image: 'MarteauJuge.png' },
        ],
    },
];

function urlCarte(image) {
    return `assets/images/${image.replace(/ /g, '%20')}`;
}

function styleImage(image) {
    return image ? ` style="background-image:url('${urlCarte(image)}');background-size:cover;background-position:center;"` : '';
}

function creerDeckTresor() {
    const deck = [];
    for (const personnage of PERSONNAGES) {
        personnage.objets.forEach((objet, i) => {
            deck.push({
                id: `tresor-${personnage.id}-${i}`,
                famille: 'tresor',
                personnageId: personnage.id,
                nom: objet.nom,
                image: objet.image,
            });
        });
    }
    return deck;
}

// ---- Règle générale : toute carte peut soit être utilisée (effet),
// soit être échangée contre une case du plateau. Aucune carte ne peut
// être défaussée à côté de la pioche.
//
// Blocage     : bloquer une case du plateau + piocher. OU échanger.
// Déblocage   : débloquer une case bloquée + piocher. OU échanger.
// Cagibi      : carte vide, uniquement échangeable.
// Vol         : dérober une carte (face cachée) à un adversaire.
//               L'adversaire ne peut que piocher au tour suivant. OU échanger.
// Protection  : poser à côté du plateau + piocher → protégé contre
//               Vol et Vision pendant un tour (jusqu'à son prochain tour). OU échanger.
// Vision      : regarder une carte (face cachée) de l'adversaire de
//               son choix, sans la prendre. OU échanger.
function creerDeckPouvoir() {
    const deck = [];
    let n = 0;
    for (let i = 0; i < 3; i++) {
        deck.push({ id: `pouvoir-b-${n++}`, famille: 'pouvoir', sousType: 'blocage', nom: 'Crac Crouc' });
    }
    for (let i = 0; i < 3; i++) {
        deck.push({ id: `pouvoir-d-${n++}`, famille: 'pouvoir', sousType: 'deblocage', nom: 'Cric Crac' });
    }
    for (let i = 0; i < 3; i++) {
        deck.push({ id: `cagibi-${i}`, famille: 'special', sousType: 'cagibi', nom: 'Cagibi' });
    }
    for (let i = 0; i < 3; i++) {
        deck.push({ id: `vol-${i}`, famille: 'special', sousType: 'vol', nom: 'Vol' });
    }
    for (let i = 0; i < 3; i++) {
        deck.push({ id: `protection-${i}`, famille: 'special', sousType: 'protection', nom: 'Immunité' });
    }
    for (let i = 0; i < 3; i++) {
        deck.push({ id: `vision-${i}`, famille: 'special', sousType: 'vision', nom: 'Vision' });
    }
    return deck;
}

function melanger(tableau) {
    const copie = [...tableau];
    for (let i = copie.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copie[i], copie[j]] = [copie[j], copie[i]];
    }
    return copie;
}

function distribuerPartie(nbJoueurs, nbIA = 0) {
    const personnagesEnJeu = melanger(PERSONNAGES).slice(0, nbJoueurs);
    const deckComplet = melanger([...creerDeckTresor(), ...creerDeckPouvoir()]);
    const plateau = deckComplet.splice(0, 10).map((carte) => ({ carte, bloquePar: null }));
    const joueurs = personnagesEnJeu.map((personnage, i) => ({
        id: i,
        nom: nbIA > 0 ? (i === 0 ? 'Vous' : `IA ${i}`) : `Joueur ${i + 1}`,
        personnage,
        main: deckComplet.splice(0, 3),
        penalise: false,
        protege: false,
        ia: nbIA > 0 && i > 0,
    }));
    const pioche = deckComplet;
    return { joueurs, plateau, pioche };
}

function aGagne(joueur) {
    const objetsTrouves = joueur.main.filter(
        (c) => c.famille === 'tresor' && c.personnageId === joueur.personnage.id
    );
    return objetsTrouves.length >= joueur.personnage.objets.length;
}

/* ====================================================================
   ÉTAT
   ==================================================================== */

const etat = {
    phase: 'menu',
    joueurs: [],
    plateau: [],
    pioche: [],
    defaussePouvoir: [],
    tourActuel: 0,
    perspective: 0,
    selection: null,
    actionEnCours: null, // null | 'echanger' | 'blocage' | 'deblocage' | 'vol' | 'vision'
    cible: null,         // id du joueur ciblé par Vol ou Vision
    animation: false,    // true pendant une animation (bloque les interactions)
    vainqueur: null,
};

const POSITIONS_ADVERSAIRES = ['zone-haut', 'zone-gauche', 'zone-droite'];

/* ====================================================================
   MINUTEUR AUTO-PLAY (2 minutes d'inactivité → le jeu joue pour le joueur)
   ==================================================================== */

let minuteurAutoPlay  = null;
let minuteurCompte    = null;
let minuteurSonGain   = null;  // nœud gain maître du son de décompte (pour pouvoir le couper)
const DELAI_AUTO      = 120;   // secondes avant auto-play
const AFFICHER_A      = 60;    // secondes restantes : apparition du compteur (sans son)
const SON_DECOMPTE_A  = 15;    // secondes restantes : démarrage du son stressant

function demarrerMinuteur() {
    arreterMinuteur();
    if (etat.phase !== 'jeu') return;
    if (etat.joueurs[etat.tourActuel]?.ia) return; // l'IA joue automatiquement

    const debut = performance.now();
    let sonDecompteLance = false;

    minuteurCompte = setInterval(() => {
        const restant = Math.ceil(DELAI_AUTO - (performance.now() - debut) / 1000);
        if (restant <= 0) { clearInterval(minuteurCompte); minuteurCompte = null; return; }

        const badge = document.getElementById('badge-tour');
        if (!badge) return;

        const texteBase = badge.dataset.texteBase
            || badge.textContent.replace(/\s*\(\d+s\)$/, '');
        badge.dataset.texteBase = texteBase;

        if (restant <= AFFICHER_A) {
            badge.textContent = `${texteBase} (${restant}s)`;
            badge.style.color = restant <= SON_DECOMPTE_A ? '#e74c3c' : '#f39c12';
        } else {
            badge.textContent = texteBase;
            badge.style.color = '';
        }

        // Lancer le son stressant une seule fois à 15s restantes
        if (restant <= SON_DECOMPTE_A && !sonDecompteLance) {
            sonDecompteLance = true;
            sonDecompte(restant);
        }
    }, 1000);

    minuteurAutoPlay = setTimeout(() => {
        arreterMinuteur();
        jouerAutomatiquement();
    }, DELAI_AUTO * 1000);
}

function arreterMinuteur() {
    if (minuteurAutoPlay) { clearTimeout(minuteurAutoPlay); minuteurAutoPlay = null; }
    if (minuteurCompte)   { clearInterval(minuteurCompte);  minuteurCompte   = null; }
    // Couper immédiatement le son de décompte s'il joue encore
    if (minuteurSonGain && audioCtx) {
        minuteurSonGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.02);
        minuteurSonGain = null;
    }
    const badge = document.getElementById('badge-tour');
    if (badge && badge.dataset.texteBase) {
        badge.textContent = badge.dataset.texteBase;
        badge.style.color = '';
        delete badge.dataset.texteBase;
    }
}

/* Son de décompte stressant — tick métallique escaladant sur `sec` secondes.
   Schedulé entièrement dans Web Audio pour une précision parfaite.
   Un GainNode maître (minuteurSonGain) permet de tout couper instantanément. */
function sonDecompte(sec) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Gain maître → permet de couper d'un coup si le joueur agit
    const master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);
    minuteurSonGain = master;

    for (let i = 0; i < sec; i++) {
        const t       = now + i;
        const urgence = i / (sec - 1);   // 0 → 1 au fil des secondes

        // --- Tick principal ---
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(700 + urgence * 700, t);   // 700 Hz → 1400 Hz
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.10 + urgence * 0.18, t + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.055 + urgence * 0.015);
        osc.connect(gain); gain.connect(master);
        osc.start(t); osc.stop(t + 0.08);

        // --- Double-tick dans les 5 dernières secondes (heartbeat) ---
        if (i >= sec - 5) {
            const osc2  = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'square';
            osc2.frequency.setValueAtTime(500 + urgence * 300, t + 0.14);
            gain2.gain.setValueAtTime(0, t + 0.14);
            gain2.gain.linearRampToValueAtTime(0.07 + urgence * 0.10, t + 0.144);
            gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.19);
            osc2.connect(gain2); gain2.connect(master);
            osc2.start(t + 0.14); osc2.stop(t + 0.22);
        }

        // --- Grave pulsant dans les 8 dernières secondes ---
        if (i >= sec - 8) {
            const bass  = ctx.createOscillator();
            const bassG = ctx.createGain();
            bass.type = 'sine';
            bass.frequency.value = 60 + urgence * 30;
            bassG.gain.setValueAtTime(0, t);
            bassG.gain.linearRampToValueAtTime((urgence - 0.3) * 0.25, t + 0.01);
            bassG.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
            bass.connect(bassG); bassG.connect(master);
            bass.start(t); bass.stop(t + 0.25);
        }
    }
}

function jouerAutomatiquement() {
    if (etat.phase !== 'jeu' || etat.animation) return;
    const joueur = etat.joueurs[etat.tourActuel];

    // Pénalité AFK : seulement en partie à 2 joueurs, seulement pour les humains
    if (etat.joueurs.length === 2 && !joueur.ia) {
        afkCount[joueur.id] = (afkCount[joueur.id] || 0) + 1;
        if (afkCount[joueur.id] >= 5) {
            const adversaire = etat.joueurs.find(j => j.id !== joueur.id);
            arreterMinuteur();
            musiqueArreter();
            etat.phase = 'fin';
            etat.vainqueur = adversaire;
            etat.raisonVictoire = 'afk';
            jingleWTF();
            rendreFinPartie();
            return;
        }
    }

    afkTourAutoJoue = true;

    // Cas pénalisé : piocher et passer
    if (joueur.penalise) {
        passerTourPenalise();
        return;
    }

    // Trouver une case libre sur le plateau
    const casesLibres = etat.plateau
        .map((slot, i) => ({ slot, i }))
        .filter(({ slot }) => !slot.bloquePar);

    if (!casesLibres.length || !joueur.main.length) {
        // Rien à faire : on passe juste le tour
        avancerTour(false);
        return;
    }

    // Choisir la première carte de la main et une case au hasard
    const carte = joueur.main[0];
    const { i: caseIndex } = casesLibres[Math.floor(Math.random() * casesLibres.length)];

    etat.selection = carte.id;
    etat.actionEnCours = 'echanger';
    etat.cible = null;
    rendreTout();

    // Petit délai pour rendre l'action visible avant qu'elle s'exécute
    setTimeout(() => {
        if (etat.phase === 'jeu' && !etat.animation) echangerCarte(caseIndex);
    }, 600);
}

/* ====================================================================
   AUDIO
   ==================================================================== */

let audioCtx = null;

function getAudioCtx() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!audioCtx) audioCtx = new AudioCtx();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
}

function sonCarte() {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Swish : bruit blanc filtré qui descend en fréquence (mouvement de la carte)
    const bufLen = Math.floor(ctx.sampleRate * 0.1);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 1.8);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;

    const bpf = ctx.createBiquadFilter();
    bpf.type = 'bandpass';
    bpf.frequency.setValueAtTime(3200, now);
    bpf.frequency.exponentialRampToValueAtTime(700, now + 0.1);
    bpf.Q.value = 1.1;

    const g1 = ctx.createGain();
    g1.gain.setValueAtTime(0.38, now);
    g1.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    noise.connect(bpf);
    bpf.connect(g1);
    g1.connect(ctx.destination);
    noise.start(now);

    // Claquement d'atterrissage (oscil triangle qui chute en fréquence)
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(550, now + 0.065);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.15);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0, now + 0.065);
    g2.gain.linearRampToValueAtTime(0.13, now + 0.075);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(g2);
    g2.connect(ctx.destination);
    osc.start(now + 0.065);
    osc.stop(now + 0.17);
}

// Jingle casino "boum boom boum bom POUM" ~3 secondes, entièrement synthétisé
function sonVol() {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Grosse caisse : sine qui chute en fréquence
    const drum = (t, baseFreq, dur, vol) => {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(baseFreq * 2.2, now + t);
        o.frequency.exponentialRampToValueAtTime(baseFreq * 0.38, now + t + dur * 0.65);
        const g = ctx.createGain();
        g.gain.setValueAtTime(vol, now + t);
        g.gain.exponentialRampToValueAtTime(0.001, now + t + dur);
        o.connect(g); g.connect(ctx.destination);
        o.start(now + t); o.stop(now + t + dur + 0.05);
    };

    // Caisse claire : bruit blanc filtré
    const snare = (t, vol) => {
        const len = Math.floor(ctx.sampleRate * 0.13);
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.4);
        const src = ctx.createBufferSource(); src.buffer = buf;
        const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2200; f.Q.value = 0.9;
        const g = ctx.createGain(); g.gain.setValueAtTime(vol, now + t); g.gain.exponentialRampToValueAtTime(0.001, now + t + 0.13);
        src.connect(f); f.connect(g); g.connect(ctx.destination);
        src.start(now + t);
    };

    // Note mélodique (laiton / cuivre)
    const note = (t, freq, dur, vol) => {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freq;
        const lpf = ctx.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = freq * 3;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, now + t);
        g.gain.linearRampToValueAtTime(vol, now + t + 0.018);
        g.gain.setValueAtTime(vol, now + t + dur - 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, now + t + dur + 0.03);
        o.connect(lpf); lpf.connect(g); g.connect(ctx.destination);
        o.start(now + t); o.stop(now + t + dur + 0.06);
    };

    // Scintillement casino (triangle haute fréquence décroissant)
    const ping = (t, freq, vol) => {
        const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.setValueAtTime(vol, now + t);
        g.gain.exponentialRampToValueAtTime(0.001, now + t + 0.7);
        o.connect(g); g.connect(ctx.destination);
        o.start(now + t); o.stop(now + t + 0.75);
    };

    // === Roulement d'intro (0 – 0.35s) ===
    [0.00, 0.06, 0.12, 0.18, 0.23, 0.28, 0.32].forEach((t, i) =>
        snare(t, 0.08 + i * 0.04)
    );

    // === BOUM (0.38s) ===
    drum(0.38, 75, 0.30, 0.95);
    snare(0.38, 0.55);
    note(0.38, 220, 0.22, 0.28);   // La3
    ping(0.40, 880, 0.10);

    // === BOOM (0.72s) ===
    drum(0.72, 82, 0.27, 0.80);
    snare(0.72, 0.45);
    note(0.72, 261, 0.20, 0.24);   // Do4

    // === BOUM (1.06s) ===
    drum(1.06, 75, 0.30, 0.95);
    snare(1.06, 0.55);
    note(1.06, 330, 0.20, 0.28);   // Mi4

    // === BOM (1.34s — gap plus court, tension) ===
    drum(1.34, 68, 0.24, 0.70);
    snare(1.34, 0.38);
    note(1.34, 392, 0.16, 0.22);   // Sol4

    // === POUM final (1.65s — le grand coup) ===
    drum(1.65, 60, 0.55, 1.10);
    snare(1.65, 0.70);
    note(1.65, 440, 0.50, 0.35);   // La4
    note(1.70, 554, 0.45, 0.25);   // Do#5 (harmonie)
    note(1.75, 659, 0.40, 0.18);   // Mi5 (harmonie haute)
    // Cascade scintillante casino
    ping(1.65, 1047, 0.22);
    ping(1.75, 1319, 0.19);
    ping(1.85, 1568, 0.16);
    ping(1.95, 2093, 0.13);
}

/* ---- Son IMMUNITÉ : bouclier magique qui se matérialise ----
   Accord majeur ascendant (Do-Mi-Sol) + scintillement cristallin + noise brush doux
   Sensation : champ de force qui enveloppe, chaleureux et sécurisant */
function sonImmunite() {
    musiqueDucker(3800);
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    function cloche(freq, t, dur, vol) {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + t);
        gain.gain.setValueAtTime(0, now + t);
        gain.gain.linearRampToValueAtTime(vol, now + t + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.001, now + t + dur);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(now + t); osc.stop(now + t + dur + 0.05);
    }
    function bourdon(freq, t, dur, vol) {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + t);
        gain.gain.setValueAtTime(0, now + t);
        gain.gain.linearRampToValueAtTime(vol, now + t + 0.08);
        gain.gain.linearRampToValueAtTime(vol * 0.6, now + t + dur * 0.6);
        gain.gain.exponentialRampToValueAtTime(0.001, now + t + dur);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(now + t); osc.stop(now + t + dur + 0.05);
    }

    // Socle grave — fondation du bouclier
    bourdon(65.4,  0.00, 2.4, 0.20);   // Do2
    bourdon(130.8, 0.00, 2.2, 0.15);   // Do3

    // Accord montant Do-Mi-Sol (arpège lent)
    bourdon(130.8, 0.10, 2.0, 0.12);   // Do3
    bourdon(164.8, 0.30, 1.8, 0.11);   // Mi3
    bourdon(196.0, 0.55, 1.6, 0.10);   // Sol3

    // Scintillement cristallin Do4-Mi4-Sol4-Do5
    cloche(261.6, 0.70, 1.4, 0.14);
    cloche(329.6, 0.95, 1.1, 0.12);
    cloche(392.0, 1.20, 0.9, 0.11);
    cloche(523.2, 1.50, 0.8, 0.13);
    cloche(659.3, 1.75, 0.6, 0.10);
    cloche(1046.5, 2.00, 0.5, 0.08);   // étincelle finale

    // Brushe de bruit blanc doux (activation du shield)
    const bufN = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const datN = bufN.getChannelData(0);
    for (let i = 0; i < datN.length; i++) datN[i] = (Math.random() * 2 - 1);
    const brushSrc = ctx.createBufferSource();
    brushSrc.buffer = bufN;
    const bpf = ctx.createBiquadFilter();
    bpf.type = 'bandpass'; bpf.frequency.value = 1200; bpf.Q.value = 0.8;
    const brushGain = ctx.createGain();
    brushGain.gain.setValueAtTime(0, now + 0.0);
    brushGain.gain.linearRampToValueAtTime(0.06, now + 0.15);
    brushGain.gain.linearRampToValueAtTime(0, now + 0.5);
    brushSrc.connect(bpf); bpf.connect(brushGain); brushGain.connect(ctx.destination);
    brushSrc.start(now); brushSrc.stop(now + 0.6);
}

/* ---- Son VISION : voyance mystérieuse ----
   Theremin-like ondulant + pentatonique ascendante + shimmer final
   Sensation : révélation, voile qui se lève, œil qui s'ouvre */
function sonVision() {
    musiqueDucker(4000);
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Vibrato LFO sur oscillateur = effet theremin
    function theremin(freq, t, dur, vol, vibratoRate, vibratoDepth) {
        const osc  = ctx.createOscillator();
        const lfo  = ctx.createOscillator();
        const lfog = ctx.createGain();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + t);
        // montée douce sur la note
        osc.frequency.linearRampToValueAtTime(freq * 1.03, now + t + dur * 0.4);
        lfo.type = 'sine';
        lfo.frequency.value = vibratoRate;
        lfog.gain.value = vibratoDepth;
        gain.gain.setValueAtTime(0, now + t);
        gain.gain.linearRampToValueAtTime(vol, now + t + 0.18);
        gain.gain.linearRampToValueAtTime(vol * 0.7, now + t + dur * 0.7);
        gain.gain.exponentialRampToValueAtTime(0.001, now + t + dur);
        lfo.connect(lfog); lfog.connect(osc.frequency);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(now + t); osc.stop(now + t + dur + 0.1);
        lfo.start(now + t); lfo.stop(now + t + dur + 0.1);
    }
    function ting(freq, t, dur, vol) {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now + t);
        gain.gain.linearRampToValueAtTime(vol, now + t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + t + dur);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(now + t); osc.stop(now + t + dur + 0.05);
    }

    // Nappe mystérieuse basse — voile de mystère
    theremin(110,  0.00, 2.8, 0.10, 4.5, 3);    // La2 — fond grave
    theremin(220,  0.20, 2.5, 0.08, 5.0, 4);    // La3 — harmonie

    // Pentatonique ascendante (La mineur pentatonique)
    theremin(220,  0.50, 0.9, 0.14, 5.5, 6);    // La3
    theremin(261.6,0.95, 0.9, 0.13, 6.0, 7);    // Do4
    theremin(329.6,1.40, 0.8, 0.13, 6.5, 7);    // Mi4
    theremin(440,  1.85, 0.7, 0.12, 7.0, 8);    // La4 — révélation
    theremin(659.3,2.25, 0.7, 0.10, 7.5, 9);    // Mi5 — apogée

    // Scintillement final (shimmer cristallin = l'œil s'ouvre)
    ting(1760, 2.30, 0.5, 0.10);   // La6
    ting(2093, 2.38, 0.4, 0.08);   // Do7
    ting(2637, 2.46, 0.35, 0.07);  // Mi7
}

/* ---- Son BLOCAGE : serrure qui se ferme ---- */
function sonBlocage() {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Cliquetis métallique : bruit blanc court filtré medium-high
    function clac(t, vol, freq) {
        const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.03), ctx.sampleRate);
        const dat = buf.getChannelData(0);
        for (let i = 0; i < dat.length; i++) dat[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 4;
        const g = ctx.createGain();
        g.gain.setValueAtTime(vol, now + t);
        g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.03);
        src.connect(bp); bp.connect(g); g.connect(ctx.destination);
        src.start(now + t); src.stop(now + t + 0.04);
    }

    // Mécanisme : 3 cliquetis rapides (crans du mécanisme)
    clac(0.00, 0.55, 1800);
    clac(0.06, 0.45, 1600);
    clac(0.13, 0.60, 1400);

    // Verrou qui tombe : grave sourd
    const bo = ctx.createOscillator();
    const bg = ctx.createGain();
    bo.type = 'sine';
    bo.frequency.setValueAtTime(180, now + 0.18);
    bo.frequency.exponentialRampToValueAtTime(60, now + 0.42);
    bg.gain.setValueAtTime(0, now + 0.18);
    bg.gain.linearRampToValueAtTime(0.38, now + 0.21);
    bg.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    bo.connect(bg); bg.connect(ctx.destination);
    bo.start(now + 0.18); bo.stop(now + 0.58);

    // Résonance métallique finale
    clac(0.22, 0.22, 2400);
}

/* ---- Son DEBLOCAGE : serrure qui s'ouvre ---- */
function sonDeblocage() {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    function clac(t, vol, freq) {
        const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.025), ctx.sampleRate);
        const dat = buf.getChannelData(0);
        for (let i = 0; i < dat.length; i++) dat[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 3.5;
        const g = ctx.createGain();
        g.gain.setValueAtTime(vol, now + t);
        g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.025);
        src.connect(bp); bp.connect(g); g.connect(ctx.destination);
        src.start(now + t); src.stop(now + t + 0.03);
    }

    // Verrou qui monte (inverse du blocage) : grave → medium
    const bo = ctx.createOscillator();
    const bg = ctx.createGain();
    bo.type = 'sine';
    bo.frequency.setValueAtTime(55, now + 0.00);
    bo.frequency.exponentialRampToValueAtTime(160, now + 0.28);
    bg.gain.setValueAtTime(0, now);
    bg.gain.linearRampToValueAtTime(0.32, now + 0.03);
    bg.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    bo.connect(bg); bg.connect(ctx.destination);
    bo.start(now); bo.stop(now + 0.38);

    // 2 cliquetis légers (mécanisme qui se déverrouille)
    clac(0.20, 0.40, 1500);
    clac(0.28, 0.55, 1900);

    // Petit tintement libérateur
    const osc = ctx.createOscillator();
    const og  = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046, now + 0.32); // Do6
    og.gain.setValueAtTime(0, now + 0.32);
    og.gain.linearRampToValueAtTime(0.14, now + 0.34);
    og.gain.exponentialRampToValueAtTime(0.0001, now + 0.90);
    osc.connect(og); og.connect(ctx.destination);
    osc.start(now + 0.32); osc.stop(now + 0.92);
}

/* ---- Son CAGIBI : désert, vide, écho lointain ----
   Une note solitaire + écho manuel s'amenuisant + vent ténu
   Sensation : pièce vide, silence pesant, horizon infini */
function sonCagibi() {
    musiqueDucker(2200);
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Claquement sec initial : bruit blanc très court filtré — impression de porte ou de clap
    const bufClap = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.04), ctx.sampleRate);
    const datClap = bufClap.getChannelData(0);
    for (let i = 0; i < datClap.length; i++) datClap[i] = (Math.random() * 2 - 1);
    const srcClap = ctx.createBufferSource();
    srcClap.buffer = bufClap;
    const bpf = ctx.createBiquadFilter();
    bpf.type = 'bandpass'; bpf.frequency.value = 900; bpf.Q.value = 0.8;
    const gcl = ctx.createGain();
    gcl.gain.setValueAtTime(0.55, now);
    gcl.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
    srcClap.connect(bpf); bpf.connect(gcl); gcl.connect(ctx.destination);
    srcClap.start(now); srcClap.stop(now + 0.05);

    // Écho de pièce vide : même clap répercuté 4 fois, de plus en plus loin
    [0.18, 0.38, 0.60, 0.85].forEach((delay, i) => {
        const vol = 0.28 / Math.pow(2.2, i);
        const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.035), ctx.sampleRate);
        const dat = buf.getChannelData(0);
        for (let j = 0; j < dat.length; j++) dat[j] = (Math.random() * 2 - 1);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const bp2 = ctx.createBiquadFilter();
        bp2.type = 'bandpass';
        bp2.frequency.value = 800 - i * 60; // chaque écho légèrement plus grave = effet de distance
        bp2.Q.value = 1.2;
        const ge = ctx.createGain();
        ge.gain.setValueAtTime(vol, now + delay);
        ge.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.12);
        src.connect(bp2); bp2.connect(ge); ge.connect(ctx.destination);
        src.start(now + delay); src.stop(now + delay + 0.15);
    });

    // Résonance creuse basse : bourdon de caverne qui s'éteint lentement
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(82, now + 0.02);
    osc.frequency.exponentialRampToValueAtTime(68, now + 1.8);
    const gosc = ctx.createGain();
    gosc.gain.setValueAtTime(0, now);
    gosc.gain.linearRampToValueAtTime(0.12, now + 0.08);
    gosc.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
    osc.connect(gosc); gosc.connect(ctx.destination);
    osc.start(now); osc.stop(now + 1.9);
}

/* ---- Son ENTRE OUVERT : discrétion, furtivité ----
   Notes pizzicato étouffées très douces + craquement de parquet + souffle retenu
   Sensation : on tiptoe, un plancher qui grince, quelqu'un qui se faufile */
function sonEntreOuvert() {
    musiqueDucker(3300);
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    function pizz(freq, t, vol) {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq * 1.02, now + t);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.98, now + t + 0.15);
        gain.gain.setValueAtTime(0, now + t);
        gain.gain.linearRampToValueAtTime(vol, now + t + 0.008);   // attaque instantanée
        gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.22);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(now + t); osc.stop(now + t + 0.28);
    }
    function craquement(t, vol) {
        // Bruit bref et grave = parquet qui grince
        const bufC = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.08), ctx.sampleRate);
        const datC = bufC.getChannelData(0);
        for (let i = 0; i < datC.length; i++) datC[i] = (Math.random() * 2 - 1) * Math.exp(-i / (datC.length * 0.3));
        const src = ctx.createBufferSource();
        src.buffer = bufC;
        const hpf = ctx.createBiquadFilter();
        hpf.type = 'lowpass'; hpf.frequency.value = 280;
        const gn = ctx.createGain();
        gn.gain.setValueAtTime(vol, now + t);
        gn.gain.exponentialRampToValueAtTime(0.001, now + t + 0.08);
        src.connect(hpf); hpf.connect(gn); gn.connect(ctx.destination);
        src.start(now + t); src.stop(now + t + 0.1);
    }

    // Mélodie furtive descendante (chromatique, comme des pas sur la pointe)
    // Très douce — environ 40% du volume normal
    pizz(466.2, 0.00, 0.10);   // Si♭4 — premier pas
    craquement(0.08, 0.055);
    pizz(440.0, 0.32, 0.09);   // La4
    pizz(415.3, 0.62, 0.08);   // Sol#4
    craquement(0.70, 0.040);
    pizz(392.0, 0.96, 0.08);   // Sol4
    pizz(369.9, 1.30, 0.07);   // Fa#4 — on s'éloigne
    craquement(1.38, 0.030);
    pizz(349.2, 1.68, 0.07);   // Fa4
    pizz(329.6, 2.10, 0.06);   // Mi4 — presque inaudible
    craquement(2.18, 0.020);
    pizz(311.1, 2.55, 0.04);   // Mi♭4 — disparu

    // Souffle retenu — respiration de quelqu'un qui se cache
    const bufB = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const datB = bufB.getChannelData(0);
    for (let i = 0; i < datB.length; i++) datB[i] = (Math.random() * 2 - 1);
    const breathSrc = ctx.createBufferSource();
    breathSrc.buffer = bufB;
    const bpfB = ctx.createBiquadFilter();
    bpfB.type = 'bandpass'; bpfB.frequency.value = 600; bpfB.Q.value = 2.5;
    const breathGain = ctx.createGain();
    breathGain.gain.setValueAtTime(0.018, now);
    breathGain.gain.linearRampToValueAtTime(0.024, now + 1.0);
    breathGain.gain.linearRampToValueAtTime(0, now + 2.8);
    breathSrc.connect(bpfB); bpfB.connect(breathGain); breathGain.connect(ctx.destination);
    breathSrc.start(now); breathSrc.stop(now + 3.0);
}

/* ====================================================================
   MUSIQUE D'AMBIANCE — génération procédurale Web Audio API
   Em | D | Cmaj7 | Am  — Mi mineur, 76 BPM
   Timbre : arpège "pincé" (filtre balayant) + pad orgue doux + basse chaude
   ==================================================================== */

let musiqueActive  = false;
let musiqueMasterG = null;
let musiqueCtxRef  = null;
let musiqueTimer   = null;
let musiqueNext    = 0;
let musiqueBeat    = 0;

const MBEAT  = 60 / 76;
const MTOTAL = 16;

// Em7 | Dmaj | Cmaj7 | Am  — 4 beats chacun
const MCHORDS = [
    { bass: 82.41,  pad: [164.81, 196.00, 246.94, 329.63] }, // Em7 : E3 G3 B3 E4
    { bass: 73.42,  pad: [146.83, 185.00, 220.00, 293.66] }, // D   : D3 F#3 A3 D4
    { bass: 65.41,  pad: [130.81, 164.81, 196.00, 261.63] }, // C   : C3 E3 G3 C4
    { bass: 55.00,  pad: [110.00, 130.81, 164.81, 246.94] }, // Am  : A2 C3 E3 B3
];

// Arpège Mi mineur pentatonique : montée/croisement/descente sur 2 motifs de 8
const MARP = [
    164.81, 196.00, 220.00, 246.94,   // E3 G3 A3 B3
    293.66, 246.94, 220.00, 196.00,   // D4 B3 A3 G3
    164.81, 220.00, 246.94, 293.66,   // E3 A3 B3 D4
    329.63, 293.66, 246.94, 220.00,   // E4 D4 B3 A3
];

function musiqueNote(time, beat) {
    const ctx = musiqueCtxRef;
    const ci  = Math.floor((beat % MTOTAL) / 4);
    const ch  = MCHORDS[ci];

    if (beat % 4 === 0) {
        // Pad orgue : square très filtré (lowpass 420 Hz) — chaleureux, discret
        ch.pad.forEach((freq, i) => {
            const osc  = ctx.createOscillator();
            const filt = ctx.createBiquadFilter();
            const g    = ctx.createGain();
            osc.type = 'square';
            osc.frequency.value = freq;
            osc.detune.value = [0, -7, 9, -3][i];
            filt.type = 'lowpass';
            filt.frequency.value = 420;
            filt.Q.value = 0.7;
            g.gain.setValueAtTime(0, time);
            g.gain.linearRampToValueAtTime(0.024, time + 1.3);
            g.gain.setValueAtTime(0.024, time + MBEAT * 4 - 0.55);
            g.gain.linearRampToValueAtTime(0, time + MBEAT * 4 + 0.3);
            osc.connect(filt); filt.connect(g); g.connect(musiqueMasterG);
            osc.start(time); osc.stop(time + MBEAT * 4 + 0.35);
        });

        // Basse : sine + légère 2e harmonique pour corps
        const bo  = ctx.createOscillator();
        const bo2 = ctx.createOscillator();
        const bg  = ctx.createGain();
        const bg2 = ctx.createGain();
        bo.type  = 'sine'; bo.frequency.value  = ch.bass;
        bo2.type = 'sine'; bo2.frequency.value = ch.bass * 2;
        bg.gain.setValueAtTime(0, time);
        bg.gain.linearRampToValueAtTime(0.20, time + 0.22);
        bg.gain.setValueAtTime(0.20, time + MBEAT * 4 - 0.5);
        bg.gain.linearRampToValueAtTime(0, time + MBEAT * 4 + 0.12);
        bg2.gain.setValueAtTime(0, time);
        bg2.gain.linearRampToValueAtTime(0.05, time + 0.22);
        bg2.gain.setValueAtTime(0.05, time + MBEAT * 4 - 0.5);
        bg2.gain.linearRampToValueAtTime(0, time + MBEAT * 4 + 0.12);
        bo.connect(bg);   bg.connect(musiqueMasterG);
        bo2.connect(bg2); bg2.connect(musiqueMasterG);
        bo.start(time);  bo.stop(time + MBEAT * 4 + 0.18);
        bo2.start(time); bo2.stop(time + MBEAT * 4 + 0.18);
    }

    // Arpège "pincé" : triangle + filtre lowpass qui balaie (bright → dark = corde pincée)
    const freq = MARP[beat % MTOTAL];
    const ao   = ctx.createOscillator();
    const af   = ctx.createBiquadFilter();
    const ag   = ctx.createGain();
    ao.type = 'triangle';
    ao.frequency.setValueAtTime(freq, time);
    ao.frequency.exponentialRampToValueAtTime(freq * 0.9975, time + MBEAT);
    af.type = 'lowpass';
    af.frequency.setValueAtTime(2800, time);
    af.frequency.exponentialRampToValueAtTime(600, time + MBEAT * 0.55);
    af.Q.value = 2.2;
    ag.gain.setValueAtTime(0, time);
    ag.gain.linearRampToValueAtTime(0.13, time + 0.011);
    ag.gain.exponentialRampToValueAtTime(0.009, time + MBEAT * 0.58);
    ag.gain.linearRampToValueAtTime(0, time + MBEAT * 0.74);
    ao.connect(af); af.connect(ag); ag.connect(musiqueMasterG);
    ao.start(time); ao.stop(time + MBEAT * 0.78);
}

function musiqueSchedule() {
    if (!musiqueCtxRef || !musiqueActive) return;
    while (musiqueNext < musiqueCtxRef.currentTime + 0.12) {
        musiqueNote(musiqueNext, musiqueBeat);
        musiqueNext += MBEAT;
        musiqueBeat  = (musiqueBeat + 1) % MTOTAL;
    }
}

function musiqueDemarrer() {
    if (musiqueActive) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    musiqueActive = true;
    musiqueCtxRef = ctx;
    musiqueMasterG = ctx.createGain();
    musiqueMasterG.gain.setValueAtTime(0, ctx.currentTime);
    musiqueMasterG.gain.linearRampToValueAtTime(0.32, ctx.currentTime + 4);
    musiqueMasterG.connect(ctx.destination);
    musiqueNext = ctx.currentTime + 0.1;
    musiqueBeat = 0;
    musiqueTimer = setInterval(musiqueSchedule, 25);
}

function musiqueArreter() {
    if (!musiqueActive) return;
    musiqueActive = false;
    clearInterval(musiqueTimer);
    musiqueTimer = null;
    if (musiqueMasterG) {
        musiqueMasterG.gain.setTargetAtTime(0, musiqueCtxRef.currentTime, 0.5);
    }
}

function musiqueDucker(ms) {
    if (!musiqueActive || !musiqueMasterG) return;
    const ctx = musiqueCtxRef;
    const now = ctx.currentTime;
    musiqueMasterG.gain.cancelScheduledValues(now);
    musiqueMasterG.gain.setValueAtTime(musiqueMasterG.gain.value, now);
    musiqueMasterG.gain.linearRampToValueAtTime(0.03, now + 0.18);
    setTimeout(() => {
        if (!musiqueActive || !musiqueMasterG) return;
        const t = musiqueCtxRef.currentTime;
        musiqueMasterG.gain.cancelScheduledValues(t);
        musiqueMasterG.gain.setValueAtTime(musiqueMasterG.gain.value, t);
        musiqueMasterG.gain.linearRampToValueAtTime(0.32, t + 1.8);
    }, ms);
}

/* ====================================================================
   JINGLE VICTOIRE (~10s) — esprit "We Are the Champions" / "I'm So Excited"
   Entièrement procédural (Web Audio API), aucun fichier audio, libre de droits.
   ==================================================================== */
function jingleVictoire() {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.52, now);
    master.gain.setValueAtTime(0.52, now + 9.0);
    master.gain.linearRampToValueAtTime(0, now + 10.6);
    master.connect(ctx.destination);

    // Cuivre synthétique : sawtooth + octave + lowpass filtré
    function cuivre(freq, t, dur, vol = 0.28) {
        const osc  = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const mix  = ctx.createGain();
        const filt = ctx.createBiquadFilter();
        const g    = ctx.createGain();
        osc.type  = 'sawtooth'; osc.frequency.value  = freq;
        osc2.type = 'sawtooth'; osc2.frequency.value = freq * 2; osc2.detune.value = -9;
        mix.gain.value = 0.30;
        filt.type = 'lowpass'; filt.Q.value = 1.8;
        filt.frequency.setValueAtTime(180, t);
        filt.frequency.linearRampToValueAtTime(2700, t + 0.022);
        filt.frequency.setValueAtTime(2100, t + dur * 0.45);
        filt.frequency.linearRampToValueAtTime(900, t + dur);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.018);
        g.gain.setValueAtTime(vol * 0.8, t + dur * 0.5);
        g.gain.linearRampToValueAtTime(0, t + dur + 0.04);
        osc.connect(filt); osc2.connect(mix); mix.connect(filt);
        filt.connect(g); g.connect(master);
        osc.start(t); osc2.start(t); osc.stop(t + dur + 0.06); osc2.stop(t + dur + 0.06);
    }

    function accord(freqs, t, dur, vol = 0.12) { freqs.forEach(f => cuivre(f, t, dur, vol)); }

    function kick(t) {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(185, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.11);
        g.gain.setValueAtTime(0.65, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.30);
        o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.32);
    }

    function snare(t) {
        const n = Math.floor(ctx.sampleRate * 0.13);
        const b = ctx.createBuffer(1, n, ctx.sampleRate);
        const d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
        const s = ctx.createBufferSource(); const bp = ctx.createBiquadFilter(); const g = ctx.createGain();
        s.buffer = b; bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 0.65;
        g.gain.setValueAtTime(0.42, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
        s.connect(bp); bp.connect(g); g.connect(master); s.start(t); s.stop(t + 0.15);
    }

    function hihat(t, v = 0.055) {
        const n = Math.floor(ctx.sampleRate * 0.037);
        const b = ctx.createBuffer(1, n, ctx.sampleRate);
        const d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
        const s = ctx.createBufferSource(); const hp = ctx.createBiquadFilter(); const g = ctx.createGain();
        s.buffer = b; hp.type = 'highpass'; hp.frequency.value = 8500;
        g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.039);
        s.connect(hp); hp.connect(g); g.connect(master); s.start(t); s.stop(t + 0.042);
    }

    const B = 60 / 106; // ≈ 0.566s, 106 BPM

    // ─── Phrase 1 (0-2.3s) : Fanfare ascendante C4→E4→G4→C5 ───
    kick(now); snare(now);
    accord([130.81, 196.00, 261.63], now, B * 4, 0.11);
    cuivre(261.63, now,       B * 0.88, 0.30); // C4
    cuivre(329.63, now + B,   B * 0.88, 0.30); // E4
    cuivre(392.00, now + B*2, B * 0.88, 0.32); // G4
    cuivre(523.25, now + B*3, B * 1.7,  0.36); // C5 tenu
    hihat(now); hihat(now + B*0.5); hihat(now + B*1); hihat(now + B*1.5);
    kick(now + B*2); snare(now + B*2);
    hihat(now + B*2); hihat(now + B*2.5); hihat(now + B*3); hihat(now + B*3.5);

    // ─── Phrase 2 (2.3-4.5s) : F→G motif ───
    kick(now + B*4);
    accord([174.61, 220.00, 261.63], now + B*4, B*2, 0.11); // F
    accord([196.00, 246.94, 293.66], now + B*6, B*2, 0.11); // G
    cuivre(349.23, now + B*4, B*0.88, 0.28); // F4
    cuivre(392.00, now + B*5, B*0.88, 0.28); // G4
    cuivre(440.00, now + B*6, B*0.88, 0.30); // A4
    cuivre(523.25, now + B*7, B*1.7,  0.34); // C5
    hihat(now + B*4); hihat(now + B*4.5); hihat(now + B*5); hihat(now + B*5.5);
    snare(now + B*6); hihat(now + B*6); hihat(now + B*6.5); hihat(now + B*7); hihat(now + B*7.5);

    // ─── Phrase 3 (4.5-6.8s) : Montée + tension G7 ───
    kick(now + B*8);
    accord([130.81, 164.81, 196.00, 261.63], now + B*8,  B*2, 0.12);
    accord([174.61, 220.00, 261.63, 349.23], now + B*10, B*2, 0.12);
    cuivre(392.00, now + B*8,  B*0.82, 0.30); // G4
    cuivre(440.00, now + B*9,  B*0.82, 0.30); // A4
    cuivre(493.88, now + B*10, B*0.82, 0.32); // B4
    cuivre(523.25, now + B*11, B*0.82, 0.34); // C5
    kick(now + B*8); snare(now + B*10);
    hihat(now + B*8); hihat(now + B*8.5); hihat(now + B*9); hihat(now + B*9.5);
    hihat(now + B*10); hihat(now + B*10.5); hihat(now + B*11); hihat(now + B*11.5);
    kick(now + B*12); snare(now + B*12);
    accord([196.00, 246.94, 293.66, 369.99], now + B*12, B*2, 0.13); // G7
    cuivre(587.33, now + B*12, B*0.8, 0.34); // D5
    cuivre(523.25, now + B*13, B*1.0, 0.34); // C5
    hihat(now + B*12); hihat(now + B*12.5); hihat(now + B*13); hihat(now + B*13.5);

    // ─── Finale (7.9-10.5s) : Grand coup ───
    kick(now + B*14); kick(now + B*14.5); kick(now + B*15);
    snare(now + B*14); snare(now + B*14.5);
    hihat(now + B*14); hihat(now + B*14.25); hihat(now + B*14.5);
    hihat(now + B*14.75); hihat(now + B*15); hihat(now + B*15.25);
    accord([65.41, 130.81, 196.00, 261.63, 329.63, 392.00], now + B*14, 3.8, 0.10);
    cuivre(523.25, now + B*14,   B * 0.42, 0.42); // C5
    cuivre(659.25, now + B*14.5, B * 0.42, 0.44); // E5
    cuivre(783.99, now + B*15,   B * 0.42, 0.46); // G5
    cuivre(1046.5, now + B*15.5, 2.8,      0.48); // C6 grand tenu final
}

/* ====================================================================
   JINGLE DÉFAITE (~10s) — style "Game Over" / mélancolique
   Descente chromatique "wah wah wah wahh" + mélodie triste en La mineur.
   Entièrement procédural, libre de droits.
   ==================================================================== */
function jingleDefaite() {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.50, now);
    master.gain.setValueAtTime(0.50, now + 9.0);
    master.gain.linearRampToValueAtTime(0, now + 10.6);
    master.connect(ctx.destination);

    // Trompette sourdinée "wah" : sawtooth + bandpass qui sweep = effet sourdine
    function sourdine(freq, t, dur, vol = 0.30) {
        const osc  = ctx.createOscillator();
        const filt = ctx.createBiquadFilter();
        const g    = ctx.createGain();
        osc.type = 'sawtooth'; osc.frequency.value = freq;
        filt.type = 'bandpass'; filt.Q.value = 3.2;
        filt.frequency.setValueAtTime(freq * 0.55, t);
        filt.frequency.linearRampToValueAtTime(freq * 2.4, t + 0.07);  // ouverture "WA"
        filt.frequency.exponentialRampToValueAtTime(freq * 0.52, t + dur * 0.62); // fermeture "hh"
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.055);
        g.gain.setValueAtTime(vol * 0.62, t + dur * 0.65);
        g.gain.linearRampToValueAtTime(0, t + dur);
        osc.connect(filt); filt.connect(g); g.connect(master);
        osc.start(t); osc.stop(t + dur + 0.05);
    }

    // Pad sine doux (nappes tristes)
    function pad(freqs, t, dur, vol = 0.09) {
        freqs.forEach(freq => {
            const osc = ctx.createOscillator(); const g = ctx.createGain();
            osc.type = 'sine'; osc.frequency.value = freq;
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(vol, t + dur * 0.18);
            g.gain.setValueAtTime(vol, t + dur * 0.72);
            g.gain.linearRampToValueAtTime(0, t + dur);
            osc.connect(g); g.connect(master); osc.start(t); osc.stop(t + dur + 0.1);
        });
    }

    // ─── WAH WAH WAH WAHH (0-3.5s) : descente chromatique ───
    sourdine(392.00, now + 0.0,  0.82, 0.32); // G4  "wah"
    sourdine(349.23, now + 0.82, 0.82, 0.30); // F4  "wah"
    sourdine(311.13, now + 1.64, 0.82, 0.28); // Eb4 "wah"
    sourdine(261.63, now + 2.46, 1.10, 0.26); // C4  "wahhhh" (tenu, descente finale)
    pad([65.41, 82.41], now, 3.7, 0.10);       // Basse grave qui sombre

    // ─── MÉLODIE TRISTE (3.5-7.5s) : La mineur descendant ───
    pad([110.00, 130.81, 164.81], now + 3.5, 1.4, 0.09); // Am
    pad([98.00,  123.47, 146.83], now + 4.9, 1.4, 0.09); // Gm
    pad([87.31,  110.00, 130.81], now + 6.3, 1.4, 0.09); // Fm
    sourdine(220.00, now + 3.6, 0.88, 0.22); // A3
    sourdine(196.00, now + 4.5, 0.72, 0.20); // G3
    sourdine(174.61, now + 5.2, 0.72, 0.20); // F3
    sourdine(164.81, now + 5.9, 0.88, 0.22); // E3
    sourdine(146.83, now + 6.8, 0.80, 0.18); // D3

    // ─── RÉSOLUTION (7.5-10.5s) : accord Am grave qui s'évanouit ───
    pad([110.00, 130.81, 164.81, 220.00], now + 7.5, 3.5, 0.11);
    sourdine(130.81, now + 7.65, 1.4, 0.14); // C3
    sourdine(110.00, now + 9.1,  1.2, 0.09); // A2 (pianissimo)

    // Grondement basse finale
    const rum = ctx.createOscillator(); const rg = ctx.createGain();
    rum.type = 'sine';
    rum.frequency.setValueAtTime(60, now + 9.0);
    rum.frequency.linearRampToValueAtTime(38, now + 10.6);
    rg.gain.setValueAtTime(0.12, now + 9.0); rg.gain.linearRampToValueAtTime(0, now + 10.6);
    rum.connect(rg); rg.connect(master); rum.start(now + 9.0); rum.stop(now + 10.7);
}

// Jingle dubstep "WTF" — gagné par forfait AFK (~10s, 140 BPM)
function jingleWTF() {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const B = 60 / 140; // beat ≈ 0.429s

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.72, now);
    master.gain.setTargetAtTime(0, now + 9.2, 0.55);
    master.connect(ctx.destination);

    // — Scratch vinyle d'intro —
    function scratch(t, vol) {
        const len = Math.floor(ctx.sampleRate * 0.28);
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++)
            d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.07));
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const flt = ctx.createBiquadFilter();
        flt.type = 'bandpass'; flt.Q.value = 5;
        flt.frequency.setValueAtTime(3200, t);
        flt.frequency.exponentialRampToValueAtTime(400, t + 0.22);
        const g = ctx.createGain(); g.gain.setValueAtTime(vol, t);
        src.connect(flt); flt.connect(g); g.connect(master);
        src.start(t);
    }
    scratch(now + 0.00, 0.9);
    scratch(now + 0.17, 0.7);
    scratch(now + 0.30, 0.5);

    // — 4 "wut ?" descendants —
    function wut(t, freq) {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.55, t + 0.18);
        const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 900;
        const g = ctx.createGain(); g.gain.setValueAtTime(0.28, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        osc.connect(flt); flt.connect(g); g.connect(master);
        osc.start(t); osc.stop(t + 0.24);
    }
    wut(now + 0.55, 440);
    wut(now + 0.78, 330);
    wut(now + 1.00, 247);
    wut(now + 1.18, 185);

    // — Kick —
    function kick(t) {
        const osc = ctx.createOscillator();
        osc.frequency.setValueAtTime(165, t);
        osc.frequency.exponentialRampToValueAtTime(28, t + 0.28);
        const g = ctx.createGain(); g.gain.setValueAtTime(1.0, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
        osc.connect(g); g.connect(master);
        osc.start(t); osc.stop(t + 0.35);
    }

    // — Snare (bruit filtré) —
    function snare(t) {
        const len = Math.floor(ctx.sampleRate * 0.18);
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.045));
        const src = ctx.createBufferSource(); src.buffer = buf;
        const flt = ctx.createBiquadFilter(); flt.type = 'highpass'; flt.frequency.value = 900;
        const g = ctx.createGain(); g.gain.setValueAtTime(0.65, t);
        src.connect(flt); flt.connect(g); g.connect(master);
        src.start(t);
    }

    // — Wobble bass (LFO → filtre) drop 1.5-5.5s —
    const wStart = now + 1.5, wDur = 4.0;
    const wOsc = ctx.createOscillator(); wOsc.type = 'sawtooth'; wOsc.frequency.value = 55;
    const subOsc = ctx.createOscillator(); subOsc.type = 'sine'; subOsc.frequency.value = 27.5;
    const wFlt = ctx.createBiquadFilter(); wFlt.type = 'lowpass'; wFlt.Q.value = 11; wFlt.frequency.value = 80;
    const lfo = ctx.createOscillator(); lfo.frequency.setValueAtTime(2.2, wStart); lfo.frequency.linearRampToValueAtTime(4.5, wStart + wDur);
    const lfoG = ctx.createGain(); lfoG.gain.value = 950;
    lfo.connect(lfoG); lfoG.connect(wFlt.frequency);
    // Saturation douce (waveshaper)
    const wsDist = ctx.createWaveShaper();
    const wsCurve = new Float32Array(256);
    for (let i = 0; i < 256; i++) { const x = (i * 2) / 255 - 1; wsCurve[i] = (3 + 180) * x / (Math.PI + 180 * Math.abs(x)); }
    wsDist.curve = wsCurve;
    const wG = ctx.createGain(); wG.gain.setValueAtTime(0, wStart); wG.gain.linearRampToValueAtTime(0.65, wStart + 0.04); wG.gain.setValueAtTime(0.65, wStart + wDur - 0.08); wG.gain.linearRampToValueAtTime(0, wStart + wDur);
    const subG = ctx.createGain(); subG.gain.value = 0.35;
    wOsc.connect(wsDist); wsDist.connect(wFlt); wFlt.connect(wG); wG.connect(master);
    subOsc.connect(subG); subG.connect(master);
    lfo.start(wStart); lfo.stop(wStart + wDur + 0.1);
    wOsc.start(wStart); wOsc.stop(wStart + wDur + 0.1);
    subOsc.start(wStart); subOsc.stop(wStart + wDur + 0.1);

    // Batterie pendant le drop (kick 1&3, snare 2&4)
    for (let i = 0; i < 8; i++) {
        const t = wStart + i * B;
        if (i % 2 === 0) kick(t); else snare(t);
    }

    // — Glitch stutter 5.5-7.5s —
    const gStart = now + 5.5;
    const gFreqs = [880, 440, 660, 330, 1100, 220, 770, 495, 990, 165];
    for (let i = 0; i < 16; i++) {
        const t = gStart + i * 0.125;
        const osc = ctx.createOscillator(); osc.type = 'square'; osc.frequency.value = gFreqs[i % gFreqs.length];
        const g = ctx.createGain(); g.gain.setValueAtTime(0.22, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
        osc.connect(g); g.connect(master); osc.start(t); osc.stop(t + 0.1);
        if (i % 4 === 0) kick(t);
        if (i % 4 === 2) snare(t);
    }

    // — Slam final 7.5-9s —
    const sT = now + 7.5;
    kick(sT); kick(sT + B * 0.5); snare(sT + B); kick(sT + B * 1.5); snare(sT + B * 2);
    const slamO = ctx.createOscillator(); slamO.type = 'sawtooth';
    slamO.frequency.setValueAtTime(55, sT); slamO.frequency.exponentialRampToValueAtTime(18, sT + 1.2);
    const slamFlt = ctx.createBiquadFilter(); slamFlt.type = 'lowpass'; slamFlt.frequency.setValueAtTime(320, sT); slamFlt.frequency.exponentialRampToValueAtTime(40, sT + 1.2);
    const slamG = ctx.createGain(); slamG.gain.setValueAtTime(0.85, sT); slamG.gain.exponentialRampToValueAtTime(0.001, sT + 1.5);
    slamO.connect(slamFlt); slamFlt.connect(slamG); slamG.connect(master);
    slamO.start(sT); slamO.stop(sT + 1.6);
    scratch(sT + 1.6, 0.6);
    scratch(sT + 1.75, 0.4);
}

let iaTimeout = null;
let mainIdsAvant = null; // détection de changement de main pour le mélange
let afkCount = {};        // compteur d'expirations consecutives par joueur (id → nombre)
let afkTourAutoJoue = false; // true si le tour courant a été joué par auto-play

function lancerJeu(nbJoueurs, nbIA = 0) {
    if (iaTimeout !== null) { clearTimeout(iaTimeout); iaTimeout = null; }
    const { joueurs, plateau, pioche } = distribuerPartie(nbJoueurs, nbIA);
    etat.phase = 'jeu';
    etat.joueurs = joueurs;
    etat.plateau = plateau;
    etat.pioche = pioche;
    etat.defaussePouvoir = [];
    etat.tourActuel = 0;
    etat.perspective = 0;
    etat.selection = null;
    etat.actionEnCours = null;
    etat.cible = null;
    etat.animation = false;
    etat.vainqueur = null;
    etat.raisonVictoire = null;
    mainIdsAvant = null; // réinitialise le tracking de mélange
    afkCount = {};
    afkTourAutoJoue = false;

    document.getElementById('menu').style.display = 'none';
    document.getElementById('jeu').style.display = 'flex';
    document.querySelector('.table').style.display = 'flex';
    document.getElementById('panneau-test').style.display = 'block';
    // L'indicateur de tour est maintenant dans le badge de l'entête
    document.getElementById('ecran-victoire').style.display = 'none';

    rendreTout();
    demarrerMinuteur();
    musiqueDemarrer();
}

function retourMenu() {
    arreterMinuteur();
    musiqueArreter();
    if (iaTimeout !== null) { clearTimeout(iaTimeout); iaTimeout = null; }
    etat.phase = 'menu';
    document.getElementById('jeu').style.display = 'none';
    document.getElementById('menu').style.display = 'block';
}

/* ====================================================================
   ACTIONS DE JEU
   ==================================================================== */

function carteSelectionnee() {
    if (!etat.selection) return null;
    const joueurActif = etat.joueurs[etat.tourActuel];
    return joueurActif.main.find((c) => c.id === etat.selection) || null;
}

function selectionnerCarte(carteId) {
    if (etat.animation || etat.perspective !== etat.tourActuel) return;
    etat.selection = etat.selection === carteId ? null : carteId;
    // Toujours démarrer en mode échange : cliquer une case du plateau échange directement
    etat.actionEnCours = etat.selection ? 'echanger' : null;
    etat.cible = null;
    rendreTout();
}

function choisirAction(action) {
    // Re-cliquer le même bouton ramène en mode échange (le défaut)
    etat.actionEnCours = etat.actionEnCours === action ? 'echanger' : action;
    etat.cible = null;
    rendrePlateau();
    rendreJoueurs();
    rendreActionsCarte();
}

// Sélection de l'adversaire ciblé par Vol ou Vision
function choisirCible(joueurId) {
    etat.cible = joueurId;
    rendreJoueurs();
    rendreActionsCarte();
}

// Quand la pioche est vide, les cartes spéciales de la défausse sont
// retournées et mélangées pour former une nouvelle pioche.
function recyclerDefausse() {
    if (etat.pioche.length > 0) return;
    const speciales = etat.defaussePouvoir.filter((c) => c.famille === 'special' || c.famille === 'pouvoir');
    if (speciales.length === 0) return;
    etat.defaussePouvoir = etat.defaussePouvoir.filter((c) => !speciales.includes(c));
    etat.pioche = melanger(speciales);
}

// Animation : la défausse se soulève, se retourne en 3D, vole vers la pioche et atterrit avec de la fumée.
// recyclerDefausse() est appelé à la fin de l'animation, puis callback().
function animerRecyclagePioche(callback) {
    etat.animation = true;

    const defausseEl = document.getElementById('defausse-pouvoir');
    const piocheEl   = document.getElementById('pioche');
    if (!defausseEl || !piocheEl) { recyclerDefausse(); etat.animation = false; callback(); return; }

    const pileEl = defausseEl.querySelector('.pile-defausse');
    if (!pileEl) { recyclerDefausse(); etat.animation = false; callback(); return; }

    const dr = pileEl.getBoundingClientRect();   // position pile défausse
    const pr = piocheEl.querySelector('.pile-pioche')?.getBoundingClientRect()
            || piocheEl.getBoundingClientRect();  // position pile pioche

    // --- Wrapper de perspective (position:fixed, évite le bug perspective+fixed) ---
    const wrap = document.createElement('div');
    Object.assign(wrap.style, {
        position: 'fixed', left: dr.left + 'px', top: dr.top + 'px',
        width: dr.width + 'px', height: dr.height + 'px',
        zIndex: '510', pointerEvents: 'none', margin: '0',
        transformOrigin: 'center center',
    });

    // Inner avec preserve-3d pour le flip
    const inner = document.createElement('div');
    Object.assign(inner.style, {
        width: '100%', height: '100%',
        transformStyle: 'preserve-3d',
        transformOrigin: 'center center',
        transform: 'perspective(520px)',
    });
    wrap.appendChild(inner);

    // Face avant : copie visuelle de la carte défausse
    const front = pileEl.cloneNode(true);
    Object.assign(front.style, {
        position: 'absolute', inset: '0', margin: '0',
        backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
    });

    // Face arrière : dos de carte (ce que verra la pioche)
    const back = document.createElement('div');
    back.className = 'carte-dos';
    Object.assign(back.style, {
        position: 'absolute', inset: '0',
        transform: 'rotateY(180deg)',
        backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
        borderRadius: '6px',
    });

    inner.appendChild(front);
    inner.appendChild(back);
    document.body.appendChild(wrap);

    // Masquer les originaux pendant l'animation
    pileEl.style.visibility = 'hidden';

    // ─── Phase 1 : Lévitation (0-0.38s) ───
    wrap.style.transition = 'transform 0.38s cubic-bezier(0.34, 1.56, 0.64, 1)';
    wrap.style.transform  = 'translateY(-22px) scale(1.06)';

    // ─── Phase 2 : Flip 3D (0.38-1.0s) ───
    const levY = dr.top - 22;
    setTimeout(() => {
        wrap.style.transition = 'none';
        const DUR_FLIP = 620;
        const t0flip = performance.now();

        function phaseFlip(now) {
            const t = Math.min((now - t0flip) / DUR_FLIP, 1);
            inner.style.transform = `perspective(520px) rotateY(${t * 180}deg)`;
            if (t < 1) { requestAnimationFrame(phaseFlip); return; }

            // ─── Phase 3 : Vol défausse → pioche ───
            inner.style.transform = 'perspective(520px) rotateY(180deg)';
            const startX = dr.left;
            const destX  = pr.left + (pr.width  - dr.width)  / 2;
            const destY  = pr.top  + (pr.height - dr.height) / 2;
            const ARC = 80, DUR_VOL = 520;
            const t0vol = performance.now();

            function phaseVol(now2) {
                const t = Math.min((now2 - t0vol) / DUR_VOL, 1);
                const e = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
                wrap.style.left      = (startX + (destX - startX) * e) + 'px';
                wrap.style.top       = (levY   + (destY - levY)   * e - ARC * Math.sin(Math.PI * t)) + 'px';
                wrap.style.transform = `scale(${1.06 - 0.06 * e})`;
                if (t < 1) { requestAnimationFrame(phaseVol); return; }

                // ─── Atterrissage : écrasement + fumée ───
                wrap.style.transition = 'transform 0.07s ease-out';
                wrap.style.transform  = 'scaleX(1.18) scaleY(0.82)';
                creerFumee(pr);

                setTimeout(() => {
                    wrap.style.transition = 'transform 0.11s ease-out, opacity 0.22s ease 0.05s';
                    wrap.style.transform  = 'scaleX(1) scaleY(1)';
                    // Mettre à jour l'état et le rendu pendant le rebond
                    recyclerDefausse();
                    rendrePioche();
                    pileEl.style.visibility = '';

                    setTimeout(() => {
                        wrap.style.opacity = '0';
                        setTimeout(() => {
                            wrap.remove();
                            etat.animation = false;
                            callback();
                        }, 240);
                    }, 110);
                }, 75);
            }
            requestAnimationFrame(phaseVol);
        }
        requestAnimationFrame(phaseFlip);
    }, 400);
}

function avancerTour(piocher) {
    const joueurActif = etat.joueurs[etat.tourActuel];

    // Le joueur a agi lui-même avant la fin du chronomètre → on remet son compteur AFK à 0
    if (!afkTourAutoJoue) afkCount[joueurActif.id] = 0;
    afkTourAutoJoue = false;

    const finDeTour = () => {
        etat.selection = null;
        etat.actionEnCours = null;
        etat.cible = null;
        etat.tourActuel = (etat.tourActuel + 1) % etat.joueurs.length;
        const modeIA = etat.joueurs.some(j => j.ia);
        // En mode IA solo : la perspective reste fixée sur le joueur humain (id 0)
        etat.perspective = modeIA ? 0 : etat.tourActuel;
        etat.joueurs[etat.tourActuel].protege = false;
        if (!modeIA) {
            // Mode local : écran de passation pour éviter que le joueur précédent
            // voie les cartes du joueur suivant.
            afficherEcranPassation(etat.joueurs[etat.tourActuel], () => {
                rendreTout();
                demarrerMinuteur();
            });
        } else {
            rendreTout();
            demarrerMinuteur();
        }
    };

    if (piocher) {
        const besoinRecycler = etat.pioche.length === 0 &&
            etat.defaussePouvoir.some(c => c.famille === 'special' || c.famille === 'pouvoir');
        if (besoinRecycler) {
            animerRecyclagePioche(() => {
                if (etat.pioche.length > 0) {
                    joueurActif.main.push(etat.pioche.shift());
                    animerPioche(finDeTour);
                } else { finDeTour(); }
            });
            return;
        }
        recyclerDefausse();
        if (etat.pioche.length > 0) {
            joueurActif.main.push(etat.pioche.shift());
            animerPioche(finDeTour);
            return;
        }
    }
    finDeTour();
}

function echangerCarte(indexCase) {
    const carte = carteSelectionnee();
    if (!carte) return;
    const slot = etat.plateau[indexCase];
    if (slot.bloquePar) return;
    const joueurActif = etat.joueurs[etat.tourActuel];

    // Son selon la carte déposée (main → plateau)
    if (carte.sousType === 'entreouvert') sonEntreOuvert();
    else                                  sonCarte();
    // Son selon la carte récupérée (plateau → main)
    if (slot.carte && slot.carte.sousType === 'cagibi') sonCagibi();

    etat.animation = true;
    animerEchange(indexCase, carte, slot.carte, () => {
        joueurActif.main = joueurActif.main.filter((c) => c.id !== carte.id);
        joueurActif.main.push(slot.carte);
        slot.carte = carte;
        rendreTout(); // carte visible dans la main avant de passer au tour suivant
        setTimeout(() => {
            etat.animation = false;
            avancerTour(false);
        }, 550);
    });
}

function animerEchange(indexCase, carte, cartePlateau, callback) {
    const carteEl = document.querySelector(`#zone-bas [data-id="${etat.selection}"]`);
    const caseEl  = document.querySelector(`[data-slot="${indexCase}"]`);
    if (!carteEl || !caseEl) { callback(); return; }

    const cr = carteEl.getBoundingClientRect();
    const sr = caseEl.getBoundingClientRect();

    // Cacher la carte originale dans la main pendant que son clone vole
    carteEl.style.visibility = 'hidden';

    // Conteneur de perspective (ne tourne pas lui-même)
    const perspWrap = document.createElement('div');
    Object.assign(perspWrap.style, {
        position: 'fixed', left: cr.left + 'px', top: cr.top + 'px',
        width: cr.width + 'px', height: cr.height + 'px',
        zIndex: '410', pointerEvents: 'none', margin: '0',
        perspective: '600px', perspectiveOrigin: '50% 50%',
    });
    document.body.appendChild(perspWrap);

    // Wrapper 3D qui tourne (preserve-3d pour voir les deux faces)
    const flipWrap = document.createElement('div');
    Object.assign(flipWrap.style, {
        position: 'absolute', left: '0', top: '0',
        width: '100%', height: '100%',
        transformStyle: 'preserve-3d',
        transformOrigin: 'center center',
    });
    perspWrap.appendChild(flipWrap);

    // Recto : la carte avec son illustration (face avant)
    const faceFront = creerCarteVolante(carte.nom, 'carte-face', cr, 0, 0, carte.sousType || null, carte.image || null);
    faceFront.style.position = 'absolute';
    faceFront.style.left = faceFront.style.top = '0';
    faceFront.style.zIndex = '';
    faceFront.style.backfaceVisibility = 'hidden';
    faceFront.style.webkitBackfaceVisibility = 'hidden';
    faceFront.style.transition = 'none';
    faceFront.style.width = cr.width + 'px';
    faceFront.style.height = cr.height + 'px';
    flipWrap.appendChild(faceFront);

    // Verso : carte dos avec l'image Porte (face arrière, déjà retournée à 180°)
    const faceBack = document.createElement('div');
    faceBack.className = 'carte-dos';
    Object.assign(faceBack.style, {
        position: 'absolute', left: '0', top: '0',
        width: cr.width + 'px', height: cr.height + 'px',
        borderRadius: '6px',
        backfaceVisibility: 'hidden', webkitBackfaceVisibility: 'hidden',
        transform: 'rotateY(180deg)', margin: '0',
    });
    flipWrap.appendChild(faceBack);

    // --- Phase flip : 0° → 180° en 260ms ---
    // perspWrap bouge en position, flipWrap tourne en 3D
    const DUR_FLIP = 260;
    let t0 = performance.now();

    function phaseFlip(now) {
        const t = Math.min((now - t0) / DUR_FLIP, 1);
        flipWrap.style.transform = `rotateY(${t * 180}deg)`;
        // légère montée pendant le flip
        perspWrap.style.top = (cr.top - Math.sin(Math.PI * t) * 14) + 'px';
        if (t < 1) { requestAnimationFrame(phaseFlip); return; }

        flipWrap.style.transform = 'rotateY(180deg)';

        // Cacher la case du plateau pendant que son clone vole
        caseEl.style.visibility = 'hidden';

        // Préparer la carte du plateau (fixe, représente la carte cachée)
        const flyPlat = document.createElement('div');
        flyPlat.className = 'carte-dos';
        Object.assign(flyPlat.style, {
            position: 'fixed', left: sr.left + 'px', top: sr.top + 'px',
            width: sr.width + 'px', height: sr.height + 'px',
            zIndex: '408', pointerEvents: 'none', margin: '0',
            transformOrigin: 'center center',
        });
        document.body.appendChild(flyPlat);

        // --- Phase vol main (dos) → case ---
        // La carte de la main passe SOUS la carte du plateau (zIndex 407 < flyPlat 408)
        perspWrap.style.zIndex = '407';

        const destCaseX = sr.left + (sr.width  - cr.width)  / 2;
        const destCaseY = sr.top  + (sr.height - cr.height) / 2;
        const startTopAfterFlip = parseFloat(perspWrap.style.top);
        const ARC2 = 45, DUR2 = 260;
        t0 = performance.now();

        function phaseVol(now2) {
            const t = Math.min((now2 - t0) / DUR2, 1);
            const e = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
            const arc = ARC2 * Math.sin(Math.PI * t);
            perspWrap.style.left = (cr.left + (destCaseX - cr.left) * e) + 'px';
            perspWrap.style.top  = (startTopAfterFlip + (destCaseY - startTopAfterFlip) * e + arc * 0.3) + 'px';
            // On ajoute une légère rotation du wrapper total, mais la rotation 3D reste
            flipWrap.style.transform = `rotateY(180deg) rotate(${-Math.sin(Math.PI * t) * 7}deg) scale(${1 - t * 0.1})`;
            if (t < 1) { requestAnimationFrame(phaseVol); return; }

            perspWrap.style.zIndex = '405';

            // --- Phase lévitation carte plateau ---
            flyPlat.style.zIndex = '409';
            flyPlat.style.transition = 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1)';
            flyPlat.style.transform  = 'translateY(-20px) scale(1.07)';

            setTimeout(() => phaseVolPlat(flyPlat), 210);
        }
        requestAnimationFrame(phaseVol);
    }

    function phaseVolPlat(flyPlat) {
        // --- Vol carte plateau → main ---
        const destMainX = cr.left + (cr.width  - sr.width)  / 2;
        const destMainY = cr.top  + (cr.height - sr.height) / 2;
        const platX = sr.left, platY = sr.top - 20;
        flyPlat.style.transition = 'none';
        const ARC3 = 60, DUR3 = 300;
        t0 = performance.now();

        function animer3(now) {
            const t = Math.min((now - t0) / DUR3, 1);
            const e = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
            const arc = ARC3 * Math.sin(Math.PI * t);
            flyPlat.style.left      = (platX + (destMainX - platX) * e) + 'px';
            flyPlat.style.top       = (platY + (destMainY - platY) * e - arc) + 'px';
            flyPlat.style.transform = `rotate(${Math.sin(Math.PI * t) * 10}deg)`;
            if (t < 1) { requestAnimationFrame(animer3); return; }

            // Arrivée dans la main → flip de révélation (dos → face)
            phaseReveal(flyPlat, destMainX, destMainY);
        }
        requestAnimationFrame(animer3);
    }

    function phaseReveal(flyPlat, x, y) {
        // Remplacer flyPlat par un wrapper 3D pour le flip de révélation
        flyPlat.remove();

        const perspR = document.createElement('div');
        Object.assign(perspR.style, {
            position: 'fixed', left: x + 'px', top: y + 'px',
            width: sr.width + 'px', height: sr.height + 'px',
            zIndex: '411', pointerEvents: 'none', margin: '0',
            perspective: '500px',
            // fond de secours : si les deux faces sont edge-on (1 frame à 90°), on voit du sombre pas du blanc
            backgroundColor: '#1a1008', borderRadius: '6px',
        });
        document.body.appendChild(perspR);

        const innerR = document.createElement('div');
        Object.assign(innerR.style, {
            width: '100%', height: '100%',
            transformStyle: 'preserve-3d',
            transformOrigin: 'center center',
            position: 'relative',
            backgroundColor: '#1a1008', borderRadius: '6px',
        });
        perspR.appendChild(innerR);

        // Dos (visible au départ)
        const dosR = document.createElement('div');
        dosR.className = 'carte-dos';
        Object.assign(dosR.style, {
            position: 'absolute', inset: '0', borderRadius: '6px',
            backfaceVisibility: 'hidden', webkitBackfaceVisibility: 'hidden',
        });
        innerR.appendChild(dosR);

        // Face de la carte du plateau
        const faceR = document.createElement('div');
        const familleClass = cartePlateau.famille === 'pouvoir' ? 'carte-pouvoir-face'
                           : cartePlateau.famille === 'special' ? 'carte-special-face' : '';
        faceR.className = `carte-face ${familleClass}`;
        if (cartePlateau.sousType) {
            faceR.dataset.sousType = cartePlateau.sousType;
        } else if (cartePlateau.image) {
            // cartes trésor / personnage : appliquer l'image comme dans rendreZoneVous
            faceR.style.backgroundImage = `url('${urlCarte(cartePlateau.image)}')`;
            faceR.style.backgroundSize = 'cover';
            faceR.style.backgroundPosition = 'center';
        } else {
            faceR.textContent = cartePlateau.nom;
        }
        Object.assign(faceR.style, {
            position: 'absolute', left: '0', top: '0',
            width: sr.width + 'px', height: sr.height + 'px',
            borderRadius: '6px', margin: '0', padding: '0',
            backfaceVisibility: 'hidden', webkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
        });
        innerR.appendChild(faceR);

        // Flip dos → face en 280ms
        const DUR_REV = 280;
        t0 = performance.now();
        function animReveal(now) {
            const t = Math.min((now - t0) / DUR_REV, 1);
            const e = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
            innerR.style.transform = `rotateY(${180 * e}deg)`;
            if (t < 1) { requestAnimationFrame(animReveal); return; }

            // Flip terminé : callback en premier → carte déjà dans le DOM,
            // puis on fond le clone PAR-DESSUS pour que la carte n'apparaisse pas de nulle part
            perspWrap.remove();
            callback();
            // Repositionner le clone exactement sur la nouvelle carte dans la main
            const newEl = document.querySelector(`#zone-bas [data-id="${cartePlateau.id}"]`);
            if (newEl) {
                const nr = newEl.getBoundingClientRect();
                perspR.style.transition = 'none';
                perspR.style.left   = nr.left + 'px';
                perspR.style.top    = nr.top  + 'px';
                perspR.style.width  = nr.width  + 'px';
                perspR.style.height = nr.height + 'px';
                perspR.offsetHeight; // force reflow
            }
            perspR.style.transition = 'opacity 0.22s ease';
            perspR.style.opacity = '0';
            setTimeout(() => perspR.remove(), 250);
        }
        requestAnimationFrame(animReveal);
    }

    requestAnimationFrame(phaseFlip);
}

function poserBlocage(indexCase) {
    const carte = carteSelectionnee();
    if (!carte || carte.sousType !== 'blocage') return;
    const slot = etat.plateau[indexCase];
    if (slot.bloquePar) return;
    const joueurActif = etat.joueurs[etat.tourActuel];
    sonBlocage();
    joueurActif.main = joueurActif.main.filter((c) => c.id !== carte.id);
    slot.bloquePar = carte;
    avancerTour(true);
}

function poserDeblocage(indexCase) {
    const carte = carteSelectionnee();
    if (!carte || carte.sousType !== 'deblocage') return;
    const slot = etat.plateau[indexCase];
    if (!slot.bloquePar) return;
    const joueurActif = etat.joueurs[etat.tourActuel];
    sonDeblocage();
    joueurActif.main = joueurActif.main.filter((c) => c.id !== carte.id);
    etat.defaussePouvoir.push(slot.bloquePar, carte);
    slot.bloquePar = null;
    avancerTour(true);
}

// Protection : carte posée à côté du plateau, activation immédiate + piocher.
function jouerProtection() {
    const carte = carteSelectionnee();
    if (!carte || carte.sousType !== 'protection') return;
    const joueurActif = etat.joueurs[etat.tourActuel];

    sonImmunite();
    etat.animation = true;
    // onLand : met à jour la défausse dès que fly atterrit (avant le fondu)
    const onLand = () => {
        joueurActif.main = joueurActif.main.filter((c) => c.id !== carte.id);
        etat.defaussePouvoir.push(carte);
        joueurActif.protege = true;
        rendrePioche(); // rend la carte dans la défausse PENDANT que fly s'efface
    };
    // onDone : avance le tour une fois fly totalement disparu
    const onDone = () => {
        etat.animation = false;
        avancerTour(true);
    };
    animerProtection(onLand, onDone);
}

function animerProtection(onLand, onDone) {
    const carteEl    = trouverCarteActive(etat.selection);
    const defausseEl = document.getElementById('defausse-pouvoir');
    if (!carteEl || !defausseEl) { onLand(); onDone(); return; }

    carteEl.style.visibility = 'hidden';

    const cr = carteEl.getBoundingClientRect();
    const dr = defausseEl.getBoundingClientRect();

    const startX = cr.left;
    const startY = cr.top;
    const endX   = dr.left + (dr.width  - cr.width)  / 2;
    const endY   = dr.top  + (dr.height - cr.height) / 2;

    const fly = creerCarteVolante('Immunité', 'carte-special-face', cr, startX, startY, 'protection');

    fly.style.transition = 'transform 0.12s ease-out';
    fly.style.transform  = 'translateY(-10px) scale(1.06)';

    const DUREE = 420;
    const ARC   = 70;

    setTimeout(() => {
        fly.style.transition = '';
        const t0 = performance.now();

        function animer(now) {
            const t = Math.min((now - t0) / DUREE, 1);
            const e = t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t;
            fly.style.left      = (startX + (endX - startX) * e) + 'px';
            fly.style.top       = (startY - 10 + (endY - (startY - 10)) * e - ARC * Math.sin(Math.PI * t)) + 'px';
            fly.style.transform = `rotate(${Math.sin(Math.PI * t) * 12}deg) scale(${1.06 - 0.06 * t})`;

            if (t < 1) { requestAnimationFrame(animer); return; }

            // Carte atterrie : rendre la défausse MAINTENANT, avant le fondu
            onLand();

            // Fondu de fly au-dessus de la carte déjà rendue → pas de flash
            fly.style.transition = 'transform 0.14s ease, opacity 0.22s ease 0.08s';
            fly.style.transform  = 'rotate(0deg) scale(0.97)';
            setTimeout(() => {
                fly.style.opacity = '0';
                setTimeout(() => { fly.remove(); onDone(); }, 320);
            }, 100);
        }

        requestAnimationFrame(animer);
    }, 130);
}

// Vol aveugle : l'adversaire ciblé ne voit pas quelle carte est prise.
// Si l'adversaire est protégé, l'attaque est bloquée (protection consommée).
function volerCarte(joueurCibleId, carteId) {
    const joueurActif = etat.joueurs[etat.tourActuel];
    const cible = etat.joueurs.find((j) => j.id === joueurCibleId);
    if (!cible) return;
    const carteVolee = cible.main.find((c) => c.id === carteId);
    if (!carteVolee) return;

    const volCarte = carteSelectionnee();
    etat.cible = null;

    if (cible.protege) {
        cible.protege = false;
        joueurActif.main = joueurActif.main.filter((c) => c.id !== volCarte.id);
        etat.defaussePouvoir.push(volCarte);
        afficherModal(
            `<p class="modal-titre">🛡 Immunité !</p><p>${cible.nom} est immunisé — votre Vol est bloqué.</p>`,
            () => avancerTour(true)
        );
        return;
    }

    // Animation dramatique "VOL", puis la carte vole vers la défausse
    etat.animation = true;
    afficherAnimationVol(() => {
        // En mode IA, la carte Vol est dans le HUD (pas en zone-bas)
        const zoneJoueurActif = joueurActif.ia ? getZoneIA(joueurActif.id) : null;
        const volCarteEl = zoneJoueurActif
            ? document.querySelector(`#${zoneJoueurActif} [data-id="${volCarte.id}"]`)
            : document.querySelector(`#zone-bas [data-id="${volCarte.id}"]`);
        const defausseEl = document.getElementById('defausse-pouvoir');

        const terminer = () => {
            cible.main = cible.main.filter((c) => c.id !== carteId);
            joueurActif.main.push(carteVolee);
            cible.penalise = true;
            etat.animation = false;
            avancerTour(false);
        };

        if (!volCarteEl || !defausseEl) {
            joueurActif.main = joueurActif.main.filter((c) => c.id !== volCarte.id);
            etat.defaussePouvoir.push(volCarte);
            terminer();
            return;
        }

        volCarteEl.style.visibility = 'hidden';
        const cr = volCarteEl.getBoundingClientRect();
        const dr = defausseEl.getBoundingClientRect();

        // En IA, le clone vient d'une mini-carte → agrandir à taille réelle pour la visibilité
        const FW = joueurActif.ia ? 78  : cr.width;
        const FH = joueurActif.ia ? 109 : cr.height;
        const startX = cr.left + (cr.width  - FW) / 2;
        const startY = cr.top  + (cr.height - FH) / 2;
        const endX   = dr.left + (dr.width  - FW) / 2;
        const endY   = dr.top  + (dr.height - FH) / 2;

        const fly = creerCarteVolante('Vol', 'carte-special-face', { width: FW, height: FH }, startX, startY, 'vol');
        const ARC = 60, DUREE = 420, t0 = performance.now();

        function animer(now) {
            const t = Math.min((now - t0) / DUREE, 1);
            const e = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
            fly.style.left      = (startX + (endX - startX) * e) + 'px';
            fly.style.top       = (startY + (endY - startY) * e - ARC * Math.sin(Math.PI * t)) + 'px';
            fly.style.transform = `rotate(${Math.sin(Math.PI * t) * 12}deg)`;
            if (t < 1) { requestAnimationFrame(animer); return; }

            // Carte arrivée : la rendre dans la défausse avant de fondre
            joueurActif.main = joueurActif.main.filter((c) => c.id !== volCarte.id);
            etat.defaussePouvoir.push(volCarte);
            rendrePioche();

            fly.style.transition = 'transform 0.1s ease, opacity 0.18s ease 0.05s';
            fly.style.transform  = 'rotate(0deg) scale(0.95)';
            setTimeout(() => {
                fly.style.opacity = '0';
                setTimeout(() => {
                    fly.remove();
                    // Carte volée : part de la zone de la victime vers la zone du voleur
                    const voleeEl  = document.querySelector(`[data-id="${carteId}"]`);
                    const zoneIA   = joueurActif.ia ? getZoneIA(joueurActif.id) : null;
                    const cibleEl  = zoneIA
                        ? document.getElementById(zoneIA)
                        : document.getElementById('zone-bas');
                    if (!voleeEl || !cibleEl) { terminer(); return; }

                    voleeEl.style.visibility = 'hidden';
                    const vr  = voleeEl.getBoundingClientRect();
                    const tr  = cibleEl.getBoundingClientRect();
                    const dX2 = tr.left + tr.width  / 2 - vr.width  / 2;
                    const dY2 = tr.top  + tr.height / 2 - vr.height / 2;

                    const fly2 = document.createElement('div');
                    fly2.className = 'carte-dos';
                    Object.assign(fly2.style, {
                        position: 'fixed', left: vr.left + 'px', top: vr.top + 'px',
                        width: vr.width + 'px', height: vr.height + 'px',
                        zIndex: '500', pointerEvents: 'none', margin: '0',
                        transformOrigin: 'center center',
                    });
                    document.body.appendChild(fly2);

                    const DUREE2 = 440, ARC2 = 90;
                    const t02 = performance.now();
                    function animer2(now) {
                        const t = Math.min((now - t02) / DUREE2, 1);
                        const e = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
                        fly2.style.left      = (vr.left + (dX2 - vr.left) * e) + 'px';
                        fly2.style.top       = (vr.top  + (dY2  - vr.top)  * e - ARC2 * Math.sin(Math.PI * t)) + 'px';
                        fly2.style.transform = `scale(${1 - 0.5 * e}) rotate(${-Math.sin(Math.PI*t) * 10}deg)`;
                        if (t < 1) { requestAnimationFrame(animer2); return; }
                        fly2.style.transition = 'opacity 0.18s ease';
                        fly2.style.opacity    = '0';
                        setTimeout(() => { fly2.remove(); terminer(); }, 200);
                    }
                    requestAnimationFrame(animer2);
                }, 200);
            }, 100);
        }
        requestAnimationFrame(animer);
    });
}

// Vision : révèle une carte (choisie face cachée) de l'adversaire sans la prendre.
// Si l'adversaire est protégé, la vision est bloquée (protection consommée).
function utiliserVision(joueurCibleId, carteId) {
    const joueurActif = etat.joueurs[etat.tourActuel];
    const cible = etat.joueurs.find((j) => j.id === joueurCibleId);
    if (!cible) return;
    const carte = cible.main.find((c) => c.id === carteId);
    if (!carte) return;

    sonVision();
    const visionCarte = carteSelectionnee();
    joueurActif.main = joueurActif.main.filter((c) => c.id !== visionCarte.id);
    etat.defaussePouvoir.push(visionCarte);
    etat.cible = null;

    if (cible.protege) {
        cible.protege = false;
        afficherModal(
            `<p class="modal-titre">🛡 Immunité !</p><p>${cible.nom} est immunisé — votre Vision est bloquée.</p>`,
            () => avancerTour(true)
        );
        return;
    }

    const classes = ['carte-face'];
    if (carte.famille === 'pouvoir') classes.push('carte-pouvoir-face');
    if (carte.famille === 'special') classes.push('carte-special-face');
    if (carte.famille === 'tresor' && carte.personnageId === cible.personnage.id) classes.push('carte-objectif');

    afficherModal(
        `<p class="modal-titre">👁 Vision</p>
         <p class="etiquette">Carte secrète de ${cible.nom}</p>
         <div class="${classes.join(' ')}" style="margin:12px auto;${carte.image ? `background-image:url('${urlCarte(carte.image)}');background-size:cover;background-position:center;` : ''}"${carte.sousType ? ` data-sous-type="${carte.sousType}"` : ''}>${carte.sousType || carte.image ? '' : carte.nom}</div>
         <p class="aide-action" style="opacity:0.7">La carte reste dans le jeu de ${cible.nom}.</p>`,
        () => avancerTour(true),
        3000
    );
}

// Tour pénalisé : le joueur volé ne peut que piocher puis passe la main.
function passerTourPenalise() {
    const joueurActif = etat.joueurs[etat.tourActuel];
    joueurActif.penalise = false;
    // Action réelle du joueur (bouton cliqué) → reset du compteur AFK
    if (!afkTourAutoJoue) afkCount[joueurActif.id] = 0;
    afkTourAutoJoue = false;

    const finDeTour = () => {
        etat.selection = null;
        etat.actionEnCours = null;
        etat.cible = null;
        etat.tourActuel = (etat.tourActuel + 1) % etat.joueurs.length;
        const modeIA = etat.joueurs.some(j => j.ia);
        etat.perspective = modeIA ? 0 : etat.tourActuel;
        etat.joueurs[etat.tourActuel].protege = false;
        if (!modeIA) {
            afficherEcranPassation(etat.joueurs[etat.tourActuel], () => {
                rendreTout();
                demarrerMinuteur();
            });
        } else {
            rendreTout();
            demarrerMinuteur();
        }
    };

    const besoinRecycler = etat.pioche.length === 0 &&
        etat.defaussePouvoir.some(c => c.famille === 'special' || c.famille === 'pouvoir');
    if (besoinRecycler) {
        animerRecyclagePioche(() => {
            if (etat.pioche.length > 0) {
                joueurActif.main.push(etat.pioche.shift());
                animerPioche(finDeTour);
            } else { finDeTour(); }
        });
        return;
    }

    recyclerDefausse();
    if (etat.pioche.length > 0) {
        joueurActif.main.push(etat.pioche.shift());
        animerPioche(finDeTour);
    } else {
        finDeTour();
    }
}

function declarerVictoire(joueur) {
    arreterMinuteur();
    musiqueArreter();
    etat.phase = 'fin';
    etat.vainqueur = joueur;
    // En mode IA : victoire si le joueur humain gagne, défaite si une IA gagne
    // En multijoueur local : toujours victoire (quelqu'un sur l'écran a gagné)
    const modeIA = etat.joueurs.some(j => j.ia);
    if (modeIA && joueur.ia) {
        jingleDefaite();
    } else {
        jingleVictoire();
    }
    rendreFinPartie();
}

/* ====================================================================
   RÈGLES DU JEU
   ==================================================================== */

function afficherRegles() {
    if (document.getElementById('modal-regles')) {
        document.getElementById('modal-regles').remove();
        return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'modal-regles';
    overlay.className = 'overlay-modal';
    overlay.innerHTML = `
        <div class="modal-contenu modal-regles">
            <p class="modal-titre">📖 Règles du jeu</p>

            <div class="regles-corps">

                <div class="regle-section">
                    <h3>But du jeu</h3>
                    <p>Chaque joueur incarne un <strong>personnage secret</strong> (Médecin, Pompier, Vacancier ou Juge). Le premier à réunir les <strong>3 objets de son personnage</strong> dans sa main et à déclarer victoire gagne la partie.</p>
                </div>

                <div class="regle-section">
                    <h3>Mise en place</h3>
                    <ul>
                        <li>10 cartes sont placées <strong>face cachée</strong> sur le plateau central.</li>
                        <li>Chaque joueur reçoit <strong>3 cartes</strong> en main.</li>
                        <li>Votre personnage secret est visible <strong>uniquement pour vous</strong>.</li>
                        <li>En mode local, passez l'écran à chaque nouveau joueur.</li>
                    </ul>
                </div>

                <div class="regle-section">
                    <h3>Déroulement d'un tour</h3>
                    <ul>
                        <li>Cliquez une carte dans votre main pour la sélectionner.</li>
                        <li>Cliquez une case du plateau : votre carte y est déposée face cachée, et vous récupérez celle qui s'y trouvait.</li>
                        <li>La carte récupérée est révélée dans votre main.</li>
                        <li>Si c'est un objet de votre personnage, elle s'affiche en <strong style="color:#6FCF73">vert</strong> !</li>
                    </ul>
                </div>

                <div class="regle-section">
                    <h3>Cartes spéciales</h3>
                    <ul>
                        <li><strong>Crac Crouc 🔒</strong> — Pose une case du plateau hors-jeu. Personne ne peut l'utiliser jusqu'au Cric Crac. Vous piochez une carte.</li>
                        <li><strong>Cric Crac 🔓</strong> — Débloque une case verrouillée. Vous piochez une carte.</li>
                        <li><strong>Vol 🃏</strong> — Volez une carte au hasard dans la main d'un adversaire. Il ne peut que piocher au tour suivant.</li>
                        <li><strong>Vision 👁</strong> — Regardez en secret une carte dans la main d'un adversaire, sans la prendre.</li>
                        <li><strong>Entrouverte 🚪</strong> — Entrouvrez discrètement une porte du plateau pour voir la carte cachée dessous, sans l'échanger. L'information reste secrète pour les autres.</li>
                        <li><strong>Immunité 🛡</strong> — Vous protège contre le Vol et la Vision pendant un tour.</li>
                        <li><strong>Cagibi 📦</strong> — Carte vide, uniquement échangeable contre une case du plateau.</li>
                    </ul>
                </div>

                <div class="regle-section">
                    <h3>Pioche</h3>
                    <p>Quand la pioche est vide, les cartes spéciales de la défausse sont remélangées pour former une nouvelle pioche.</p>
                </div>

                <div class="regle-section">
                    <div class="regle-victoire">
                        🏆 <strong>Victoire</strong> — Dès que vous avez les 3 objets de votre personnage en main, le bouton <em>"Déclarer victoire"</em> apparaît. Cliquez-le pour gagner !
                    </div>
                </div>

            </div>

            <button class="bouton-secondaire btn-fermer-regles">Fermer</button>
        </div>
    `;

    document.body.appendChild(overlay);
    overlay.querySelector('.btn-fermer-regles').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

/* ====================================================================
   MODALE GÉNÉRIQUE
   ==================================================================== */

function afficherModal(contenu, callback, delaiAuto = 0) {
    const existing = document.getElementById('modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'modal-overlay';
    overlay.className = 'overlay-modal';
    overlay.innerHTML = `
        <div class="modal-contenu">
            ${contenu}
            ${delaiAuto ? '' : '<button id="btn-fermer-modal">Continuer</button>'}
        </div>
    `;
    document.body.appendChild(overlay);

    const fermer = () => { overlay.remove(); if (callback) callback(); };

    if (delaiAuto) {
        setTimeout(fermer, delaiAuto);
    } else {
        document.getElementById('btn-fermer-modal').addEventListener('click', fermer);
    }
}

/* ====================================================================
   ÉCRAN DE PASSATION DE TOUR (multijoueur local sans IA)
   Couvre l'écran entre deux joueurs pour qu'aucun ne voie les cartes
   de l'autre.
   ==================================================================== */

function afficherEcranPassation(joueur, callback) {
    const num = etat.joueurs.indexOf(joueur) + 1;
    const total = etat.joueurs.length;

    const overlay = document.createElement('div');
    overlay.className = 'ecran-passation';
    overlay.innerHTML = `
        <div class="passation-contenu">
            <div class="passation-badge">Tour ${num} / ${total}</div>
            <h2 class="passation-titre">Passez l'écran !</h2>
            <p class="passation-sous-titre">C'est maintenant au tour de<br><strong>${joueur.nom}</strong></p>
            <p class="passation-instruction">Assurez-vous que <strong>${joueur.nom}</strong> seul regarde l'écran,<br>puis appuyez sur le bouton pour jouer.</p>
            <button class="btn-passation">▶&nbsp;&nbsp;${joueur.nom} — Je suis prêt !</button>
        </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('.btn-passation').addEventListener('click', () => {
        callback(); // rend la vue du nouveau joueur sous l'overlay avant le fade-out
        overlay.classList.add('passation-fermeture');
        setTimeout(() => { overlay.remove(); }, 340);
    });
}

/* ====================================================================
   ANIMATION VOL
   ==================================================================== */

function afficherAnimationVol(callback) {
    const overlay = document.createElement('div');
    overlay.className = 'overlay-vol';
    overlay.innerHTML = `
        <div class="vol-texte">
            <span class="vol-lettre vol-V">V</span>
            <span class="vol-lettre vol-O">O</span>
            <span class="vol-lettre vol-L">L</span>
        </div>`;
    document.body.appendChild(overlay);
    sonVol();
    setTimeout(() => { overlay.remove(); callback(); }, 2800);
}

function animerPioche(callback) {
    etat.animation = true;
    const pileEl = document.querySelector('#pioche .carte-pioche');
    if (!pileEl) { etat.animation = false; callback(); return; }

    const pr = pileEl.getBoundingClientRect();
    pileEl.style.visibility = 'hidden';

    // Destination : zone du joueur qui pioche
    const joueurActuel = etat.joueurs[etat.tourActuel];
    let mr;
    if (joueurActuel.ia) {
        // IA : vole vers son panneau HUD
        const zoneId = getZoneIA(joueurActuel.id);
        const hudMain = zoneId ? document.querySelector(`#${zoneId} .hud-main`) : null;
        mr = hudMain
            ? hudMain.getBoundingClientRect()
            : { left: window.innerWidth / 2, top: 60, width: 44, height: 62 };
    } else {
        const mainEl = document.querySelector('#zone-bas .main-joueur');
        mr = mainEl
            ? mainEl.getBoundingClientRect()
            : { left: window.innerWidth / 2 - 32, top: window.innerHeight - 110, width: 64, height: 90 };
    }

    const fly = document.createElement('div');
    fly.className = 'carte-pioche carte-dos';
    Object.assign(fly.style, {
        position:        'fixed',
        left:            pr.left   + 'px',
        top:             pr.top    + 'px',
        width:           pr.width  + 'px',
        height:          pr.height + 'px',
        zIndex:          '400',
        pointerEvents:   'none',
        margin:          '0',
        transformOrigin: 'center center',
    });
    document.body.appendChild(fly);

    sonCarte();

    const startX = pr.left;
    const startY = pr.top;
    const endX   = mr.left + (mr.width  - pr.width)  / 2;
    const endY   = mr.top  + (mr.height - pr.height) / 2;
    const ARC    = 80;
    const DUREE  = 350;
    const t0 = performance.now();

    function animer(now) {
        const t = Math.min((now - t0) / DUREE, 1);
        const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        fly.style.left      = (startX + (endX - startX) * e) + 'px';
        fly.style.top       = (startY + (endY - startY) * e - ARC * Math.sin(Math.PI * t)) + 'px';
        fly.style.transform = `rotate(${Math.sin(Math.PI * t) * 10}deg)`;
        if (t < 1) { requestAnimationFrame(animer); return; }

        const atterrir = () => {
            fly.style.transition = 'opacity 0.18s ease';
            fly.style.opacity    = '0';
            setTimeout(() => { fly.remove(); etat.animation = false; callback(); }, 210);
        };

        if (!joueurActuel.ia) {
            // Joueur humain : pré-rendre la main avec la nouvelle carte → snap précis
            rendreZoneVous(joueurActuel);
            const nouvelleCarte = joueurActuel.main[joueurActuel.main.length - 1];
            const newEl = nouvelleCarte
                ? document.querySelector(`#zone-bas [data-id="${nouvelleCarte.id}"]`)
                : null;
            if (newEl) {
                const nr = newEl.getBoundingClientRect();
                fly.style.transition = 'left 0.07s ease-out, top 0.07s ease-out, width 0.07s, height 0.07s';
                fly.style.left   = nr.left   + 'px';
                fly.style.top    = nr.top    + 'px';
                fly.style.width  = nr.width  + 'px';
                fly.style.height = nr.height + 'px';
                setTimeout(atterrir, 80);
            } else {
                atterrir();
            }
        } else {
            // IA : simple fondu dans le HUD
            atterrir();
        }
    }

    requestAnimationFrame(animer);
}

/* ====================================================================
   ANIMATION BLOCAGE
   La carte fait un arc depuis la main jusqu'à la case ciblée,
   rebondit à l'atterrissage, puis des particules de fumée se dispersent.
   ==================================================================== */

// Table de correspondance sousType → fichier image
const CARTES_IMAGES = {
    blocage:    'CracCric.png',
    deblocage:  'CracCrouc.png',
    vol:        'Vol.png',
    vision:     'Vision.png',
    cagibi:     'Cagibi.png',
    protection: 'Immunite.png',
};

// Crée un élément carte flottant positionné en fixed, prêt à animer
// sousType optionnel : si fourni, affiche l'illustration à la place du texte
function creerCarteVolante(nom, classeExtra, refRect, x, y, sousType = null, image = null) {
    const el = document.createElement('div');
    el.className = `carte-face ${classeExtra}`;
    if (sousType && CARTES_IMAGES[sousType]) {
        el.dataset.sousType = sousType;
    } else if (image) {
        el.style.backgroundImage = `url('${urlCarte(image)}')`;
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
    } else {
        el.textContent = nom;
    }
    Object.assign(el.style, {
        position:       'fixed',
        left:           x + 'px',
        top:            y + 'px',
        width:          refRect.width  + 'px',
        height:         refRect.height + 'px',
        minHeight:      refRect.height + 'px',
        zIndex:         '500',
        pointerEvents:  'none',
        margin:         '0',
        transformOrigin:'center center',
    });
    document.body.appendChild(el);
    return el;
}

// Retrouve l'élément DOM de la carte active quel que soit le joueur (humain ou IA)
function trouverCarteActive(id) {
    const joueur = etat.joueurs[etat.tourActuel];
    if (joueur && joueur.ia) {
        const zoneId = getZoneIA(joueur.id);
        if (zoneId) return document.querySelector(`#${zoneId} [data-id="${id}"]`);
    }
    return document.querySelector(`#zone-bas [data-id="${id}"]`);
}

function animerBlocage(indexCase, callback) {
    const carteEl = trouverCarteActive(etat.selection);
    const caseEl  = document.querySelector(`[data-slot="${indexCase}"]`);
    if (!carteEl || !caseEl) { callback(); return; }

    etat.animation = true;
    carteEl.style.visibility = 'hidden';

    const cr = carteEl.getBoundingClientRect();
    const sr = caseEl.getBoundingClientRect();

    // Si l'IA joue depuis son HUD (mini-carte), agrandir le clone à taille réelle
    const joueurIA = etat.joueurs[etat.tourActuel];
    const FW = (joueurIA && joueurIA.ia) ? 78  : cr.width;
    const FH = (joueurIA && joueurIA.ia) ? 109 : cr.height;
    const startX = cr.left + (cr.width  - FW) / 2;
    const startY = cr.top  + (cr.height - FH) / 2;
    const endX   = sr.left + (sr.width  - FW) / 2;
    const endY   = sr.top  + (sr.height - FH) / 2;

    // Clone volant
    const fly = document.createElement('div');
    fly.className = 'carte-face carte-pouvoir-face';
    fly.dataset.sousType = 'blocage';
    Object.assign(fly.style, {
        position: 'fixed',
        left:   startX + 'px',
        top:    startY + 'px',
        width:  FW + 'px',
        height: FH + 'px',
        zIndex: '500',
        pointerEvents: 'none',
        margin: '0',
        transformOrigin: 'center center',
    });
    document.body.appendChild(fly);

    const DUREE = 520; // ms
    const ARC   = 110; // hauteur de l'arc en pixels
    const t0 = performance.now();

    function step(now) {
        const t = Math.min((now - t0) / DUREE, 1);

        // Trajectoire parabolique : X linéaire, Y en arc (monte puis descend)
        const x = startX + (endX - startX) * t;
        const y = startY + (endY - startY) * t - ARC * Math.sin(Math.PI * t);

        // Légère rotation en vol
        const rot = Math.sin(Math.PI * t) * 18;

        // Écrasement à l'atterrissage (t proche de 1)
        let scaleX = 1, scaleY = 1;
        if (t > 0.82) {
            const lt = (t - 0.82) / 0.18;
            const squish = Math.sin(Math.PI * lt);
            scaleX = 1 + 0.18 * squish;
            scaleY = 1 - 0.22 * squish;
        }

        fly.style.left      = x + 'px';
        fly.style.top       = y + 'px';
        fly.style.transform = `scaleX(${scaleX}) scaleY(${scaleY}) rotate(${rot}deg)`;

        if (t < 1) {
            requestAnimationFrame(step);
        } else {
            // Rebond rapide après l'écrasement
            fly.style.transition = 'transform 0.09s ease-out, opacity 0.18s ease';
            fly.style.transform  = 'scaleX(0.92) scaleY(1.08) rotate(0deg)';
            creerFumee(sr);
            setTimeout(() => {
                fly.style.transform = 'scaleX(1) scaleY(1)';
                fly.style.opacity   = '0';
                setTimeout(() => {
                    fly.remove();
                    etat.animation = false;
                    callback();
                }, 180);
            }, 90);
        }
    }

    requestAnimationFrame(step);
}

function creerFumee(rect) {
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;
    const NB = 12;

    for (let i = 0; i < NB; i++) {
        const puff  = document.createElement('div');
        const angle = (i / NB) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
        const dist  = 28 + Math.random() * 28;
        const size  = 10 + Math.random() * 14;
        const delay = Math.random() * 60;

        puff.style.cssText = `
            position: fixed;
            left: ${cx - size / 2}px;
            top:  ${cy - size / 2}px;
            width:  ${size}px;
            height: ${size}px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(210,210,210,0.9) 0%, rgba(140,140,140,0.1) 100%);
            z-index: 499;
            pointer-events: none;
            --dx: ${(Math.cos(angle) * dist).toFixed(1)}px;
            --dy: ${(Math.sin(angle) * dist).toFixed(1)}px;
            animation: fumee-anim 0.65s ease-out ${delay}ms forwards;
        `;
        document.body.appendChild(puff);
        setTimeout(() => puff.remove(), 750 + delay);
    }
}

function animerDeblocage(indexCase, callback) {
    const carteEl    = trouverCarteActive(etat.selection);
    const caseEl     = document.querySelector(`[data-slot="${indexCase}"]`);
    const defausseEl = document.getElementById('defausse-pouvoir');
    if (!carteEl || !caseEl || !defausseEl) { callback(); return; }

    etat.animation = true;
    carteEl.style.visibility = 'hidden';
    caseEl.style.visibility  = 'hidden';

    const cr = carteEl.getBoundingClientRect();   // carte en main
    const sr = caseEl.getBoundingClientRect();    // case bloquée sur le plateau
    const dr = defausseEl.getBoundingClientRect(); // emplacement défausse

    // Si l'IA joue depuis son HUD (mini-carte), agrandir le clone à taille réelle
    const joueurIAD = etat.joueurs[etat.tourActuel];
    const FWD = (joueurIAD && joueurIAD.ia) ? 78  : cr.width;
    const FHD = (joueurIAD && joueurIAD.ia) ? 109 : cr.height;

    // Positions de référence
    const handX   = cr.left + (cr.width  - FWD) / 2;
    const handY   = cr.top  + (cr.height - FHD) / 2;
    const caseX   = sr.left + (sr.width  - FWD) / 2;
    const caseY   = sr.top  + (sr.height - FHD) / 2;
    const depotX  = dr.left + (dr.width  - FWD) / 2;
    const depotY  = dr.top  + (dr.height - FHD) / 2;

    // Clone de la carte Déblocage
    const flyD = creerCarteVolante('Cric Crac', 'carte-pouvoir-face', { width: FWD, height: FHD }, handX, handY, 'deblocage');

    /* ---- Phase 1 : Déblocage vole en arc vers la case ---- */
    const DUREE1 = 420;
    const ARC1   = 90;
    const t0 = performance.now();

    function phase1(now) {
        const t = Math.min((now - t0) / DUREE1, 1);
        flyD.style.left      = (handX + (caseX - handX) * t) + 'px';
        flyD.style.top       = (handY + (caseY - handY) * t - ARC1 * Math.sin(Math.PI * t)) + 'px';
        flyD.style.transform = `rotate(${Math.sin(Math.PI * t) * 14}deg)`;
        if (t < 1) { requestAnimationFrame(phase1); return; }

        // Atterrissage doux sur la case
        flyD.style.transition = 'transform 0.12s ease-out';
        flyD.style.transform  = 'rotate(0deg) scale(1)';

        /* ---- Phase 2 : la carte Blocage se soulève ---- */
        const nomBlocage = etat.plateau[indexCase].bloquePar.nom;
        const flyB = creerCarteVolante(nomBlocage, 'carte-pouvoir-face', cr, caseX, caseY, 'blocage');

        // Le Blocage monte de 30 px comme s'il était soulevé
        setTimeout(() => {
            flyB.style.transition = 'top 0.22s cubic-bezier(0.25,0.46,0.45,0.94), transform 0.22s ease';
            flyB.style.top        = (caseY - 32) + 'px';
            flyB.style.transform  = 'scale(1.06)';

            /* ---- Phase 3 : les deux s'envolent ensemble vers la défausse ---- */
            setTimeout(() => {
                flyD.style.transition = '';
                flyB.style.transition = '';

                const DUREE3 = 440;
                const ARC3   = 55;
                const bStartY = caseY - 32; // position actuelle du Blocage
                const t1 = performance.now();

                function phase3(now) {
                    const t = Math.min((now - t1) / DUREE3, 1);
                    // Easing ease-in-out
                    const e = t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t;
                    const arc = ARC3 * Math.sin(Math.PI * t);

                    flyD.style.left = (caseX + (depotX - caseX) * e) + 'px';
                    flyD.style.top  = (caseY + (depotY - caseY) * e - arc) + 'px';

                    flyB.style.left = (caseX + (depotX - caseX) * e) + 'px';
                    flyB.style.top  = (bStartY + (depotY - bStartY) * e - arc) + 'px';

                    // Légère rotation commune pendant le vol
                    const rot = Math.sin(Math.PI * t) * 12;
                    flyD.style.transform = `rotate(${rot}deg)`;
                    flyB.style.transform = `rotate(${rot}deg) scale(1.06)`;

                    if (t < 1) { requestAnimationFrame(phase3); return; }

                    // Atterrissage : se posent ensemble, puis fondent
                    flyD.style.transition = 'transform 0.1s ease, opacity 0.2s ease 0.05s';
                    flyB.style.transition = 'transform 0.1s ease, opacity 0.2s ease 0.05s';
                    flyD.style.transform  = 'rotate(0deg) scale(0.93)';
                    flyB.style.transform  = 'rotate(0deg) scale(0.93)';

                    setTimeout(() => {
                        flyD.style.opacity = '0';
                        flyB.style.opacity = '0';
                        setTimeout(() => {
                            flyD.remove();
                            flyB.remove();
                            etat.animation = false;
                            callback();
                        }, 220);
                    }, 110);
                }

                requestAnimationFrame(phase3);
            }, 240); // durée de la phase 2
        }, 130);     // délai après atterrissage de D
    }

    requestAnimationFrame(phase1);
}

/* ====================================================================
   INTELLIGENCE ARTIFICIELLE
   ==================================================================== */

// Retourne l'id de zone HUD (#zone-haut / -gauche / -droite) du joueur IA donné
function getZoneIA(joueurId) {
    const vous   = etat.joueurs[etat.perspective];
    const autres = etat.joueurs.filter(j => j.id !== vous.id);
    const idx    = autres.findIndex(j => j.id === joueurId);
    return (idx >= 0 && idx < POSITIONS_ADVERSAIRES.length) ? POSITIONS_ADVERSAIRES[idx] : null;
}

// Échange animé depuis le panneau HUD de l'IA — animation parallèle (les deux cartes volent simultanément)
function jouerEchangeIA(carte, indexCase) {
    const joueur  = etat.joueurs[etat.tourActuel];
    const slot    = etat.plateau[indexCase];
    const caseEl  = document.querySelector(`[data-slot="${indexCase}"]`);
    const zoneId  = getZoneIA(joueur.id);
    const carteEl = zoneId ? document.querySelector(`#${zoneId} [data-id="${carte.id}"]`) : null;

    if (carte.sousType === 'entreouvert') sonEntreOuvert();
    else sonCarte();
    if (slot.carte && slot.carte.sousType === 'cagibi') sonCagibi();

    etat.animation = true;

    const terminer = () => {
        joueur.main = joueur.main.filter(c => c.id !== carte.id);
        joueur.main.push(slot.carte);
        slot.carte = carte;
        etat.animation = false;
        rendreTout();
        setTimeout(() => avancerTour(false), 400);
    };

    if (!carteEl || !caseEl) { terminer(); return; }

    const cr = carteEl.getBoundingClientRect(); // mini-carte dans le HUD
    const sr = caseEl.getBoundingClientRect();  // slot sur le plateau
    carteEl.style.visibility = 'hidden';
    caseEl.style.visibility  = 'hidden';

    // Clone mini-carte IA (part du HUD, grandit vers le slot)
    const fly = document.createElement('div');
    fly.className = 'carte-dos';
    Object.assign(fly.style, {
        position: 'fixed', left: cr.left + 'px', top: cr.top + 'px',
        width: cr.width + 'px', height: cr.height + 'px',
        zIndex: '500', pointerEvents: 'none', margin: '0',
        transformOrigin: 'center center', borderRadius: '4px',
    });
    document.body.appendChild(fly);

    // Clone carte plateau (part du plateau, rétrécit vers le HUD)
    const flyPlat = document.createElement('div');
    flyPlat.className = 'carte-dos';
    Object.assign(flyPlat.style, {
        position: 'fixed', left: sr.left + 'px', top: sr.top + 'px',
        width: sr.width + 'px', height: sr.height + 'px',
        zIndex: '499', pointerEvents: 'none', margin: '0',
        transformOrigin: 'center center', borderRadius: '6px',
    });
    document.body.appendChild(flyPlat);

    // Destinations corrigées pour transformOrigin:center (décalage demi-taille)
    const endLeft  = sr.left + (sr.width  - cr.width)  / 2; // mini → slot
    const endTop   = sr.top  + (sr.height - cr.height) / 2;
    const destX    = cr.left + (cr.width  - sr.width)  / 2; // slot → HUD
    const destY    = cr.top  + (cr.height - sr.height) / 2;
    const scaleMax = sr.width / cr.width;  // mini grandit
    const scaleMin = cr.width / sr.width;  // slot rétrécit

    const DUREE = 500, ARC = 85;
    const t0 = performance.now();

    function animerParallele(now) {
        const t = Math.min((now - t0) / DUREE, 1);
        const e = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
        const arc = ARC * Math.sin(Math.PI * t);

        // Mini-carte → slot plateau (monte puis descend en arc)
        fly.style.left      = (cr.left + (endLeft - cr.left) * e) + 'px';
        fly.style.top       = (cr.top  + (endTop  - cr.top)  * e - arc) + 'px';
        fly.style.transform = `scale(${1 + (scaleMax - 1) * e}) rotate(${Math.sin(Math.PI*t) * 8}deg)`;

        // Carte plateau → HUD IA (monte puis descend en arc)
        flyPlat.style.left      = (sr.left + (destX - sr.left) * e) + 'px';
        flyPlat.style.top       = (sr.top  + (destY  - sr.top)  * e - arc) + 'px';
        flyPlat.style.transform = `scale(${1 + (scaleMin - 1) * e}) rotate(${-Math.sin(Math.PI*t) * 6}deg)`;

        if (t < 1) { requestAnimationFrame(animerParallele); return; }

        // Les deux sont arrivées : fondu simultané
        fly.style.transition     = 'opacity 0.22s ease';
        flyPlat.style.transition = 'opacity 0.22s ease';
        fly.style.opacity        = '0';
        flyPlat.style.opacity    = '0';
        setTimeout(() => { fly.remove(); flyPlat.remove(); terminer(); }, 260);
    }

    requestAnimationFrame(animerParallele);
}

function planifierTourIA() {
    if (iaTimeout !== null || etat.animation) return;
    const joueur = etat.joueurs[etat.tourActuel];
    if (!joueur || !joueur.ia || etat.phase !== 'jeu') return;
    iaTimeout = setTimeout(() => {
        iaTimeout = null;
        jouerIA();
    }, 1100);
}

function jouerIA() {
    const joueur = etat.joueurs[etat.tourActuel];
    if (!joueur || !joueur.ia || etat.phase !== 'jeu' || etat.animation) return;

    // Bloquer les interactions humaines pendant que l'IA réfléchit + agit
    etat.animation = true;

    // Victoire automatique
    if (aGagne(joueur)) {
        setTimeout(() => { etat.animation = false; declarerVictoire(joueur); }, 600);
        return;
    }

    // Tour pénalisé : pioche forcée
    if (joueur.penalise) {
        setTimeout(() => { etat.animation = false; passerTourPenalise(); }, 900);
        return;
    }

    const main          = joueur.main;
    const autresJoueurs = etat.joueurs.filter(j => j.id !== joueur.id);
    const autresHumains = autresJoueurs.filter(j => !j.ia);
    const casesLibres   = etat.plateau.map((s, i) => ({ s, i })).filter(({ s }) => !s.bloquePar);
    const casesBloquees = etat.plateau.map((s, i) => ({ s, i })).filter(({ s }) => s.bloquePar);

    const volCard       = main.find(c => c.sousType === 'vol');
    const visionCard    = main.find(c => c.sousType === 'vision');
    const blocageCard   = main.find(c => c.sousType === 'blocage');
    const deblocageCard = main.find(c => c.sousType === 'deblocage');

    // Carte que l'IA préfère sacrifier (garde ses propres trésors en priorité)
    const carteASacrifier = main.find(c => !(c.famille === 'tresor' && c.personnageId === joueur.personnage.id));

    // agir : libère etat.animation pour que l'action puisse gérer son propre flag
    const agir = (fn) => setTimeout(() => { etat.animation = false; fn(); }, 900);

    // Priorité 1 : Vol sur adversaire non protégé
    if (volCard) {
        const cibles = autresJoueurs.filter(j => !j.protege && j.main.length > 0);
        if (cibles.length > 0) {
            const cible       = cibles[Math.floor(Math.random() * cibles.length)];
            const carteAVoler = cible.main[Math.floor(Math.random() * cible.main.length)];
            etat.selection     = volCard.id;
            etat.actionEnCours = 'vol';
            etat.cible         = cible.id;
            rendreTout();
            agir(() => volerCarte(cible.id, carteAVoler.id));
            return;
        }
    }

    // Priorité 2 : Vision sur un adversaire humain
    if (visionCard && autresHumains.length > 0) {
        const cibles = autresHumains.filter(j => !j.protege && j.main.length > 0);
        if (cibles.length > 0) {
            const cible      = cibles[Math.floor(Math.random() * cibles.length)];
            const carteAVoir = cible.main[Math.floor(Math.random() * cible.main.length)];
            etat.selection     = visionCard.id;
            etat.actionEnCours = 'vision';
            etat.cible         = cible.id;
            rendreTout();
            agir(() => utiliserVision(cible.id, carteAVoir.id));
            return;
        }
    }

    // Priorité 3 : Déblocage
    if (deblocageCard && casesBloquees.length > 0) {
        const { i: ci } = casesBloquees[Math.floor(Math.random() * casesBloquees.length)];
        etat.selection     = deblocageCard.id;
        etat.actionEnCours = 'deblocage';
        etat.cible         = null;
        rendreTout();
        agir(() => animerDeblocage(ci, () => poserDeblocage(ci)));
        return;
    }

    // Priorité 4 : Blocage (seulement si l'IA n'a rien de mieux à sacrifier)
    if (blocageCard && casesLibres.length > 0 && !carteASacrifier) {
        const { i: ci } = casesLibres[Math.floor(Math.random() * casesLibres.length)];
        etat.selection     = blocageCard.id;
        etat.actionEnCours = 'blocage';
        etat.cible         = null;
        rendreTout();
        agir(() => animerBlocage(ci, () => poserBlocage(ci)));
        return;
    }

    // Défaut : échange
    if (casesLibres.length === 0 || !main.length) {
        agir(() => avancerTour(false));
        return;
    }

    const carte      = carteASacrifier || main[0];
    const { i: ci } = casesLibres[Math.floor(Math.random() * casesLibres.length)];
    etat.selection     = carte.id;
    etat.actionEnCours = 'echanger';
    etat.cible         = null;
    rendreTout();
    agir(() => jouerEchangeIA(carte, ci));
}

/* ====================================================================
   RENDU
   ==================================================================== */

function rendreTout() {
    if (etat.phase === 'fin') return;
    rendreIndicateurTour();
    rendrePlateau();
    rendrePioche();
    rendreJoueurs();
    rendrePanneauTest();
    planifierTourIA();
}

function rendreIndicateurTour() {
    const actif = etat.joueurs[etat.tourActuel];
    const estMonTour = etat.perspective === etat.tourActuel;
    let texte;
    if (estMonTour && actif.penalise) {
        texte = `${actif.nom} — vous avez été volé ! Vous ne pouvez que piocher ce tour.`;
    } else if (estMonTour) {
        texte = `À vous de jouer, ${actif.nom} — choisissez une carte dans votre main.`;
    } else {
        texte = `C'est le tour de ${actif.nom}.`;
    }
    // Affiche dans l'entête plutôt que dans une barre séparée
    const indicEl = document.getElementById('indicateur-tour');
    indicEl.textContent = texte;
    // Badge compact dans l'entête
    const badge = document.getElementById('badge-tour');
    if (badge) badge.textContent = texte;
}

function rendrePlateau() {
    const conteneur = document.getElementById('plateau');
    const estMonTour = etat.perspective === etat.tourActuel;

    conteneur.innerHTML = etat.plateau
        .map((slot, i) => {
            const classes = ['case', 'carte-dos'];
            if (slot.bloquePar) classes.push('case-bloquee');

            let jouable = false;
            if (estMonTour && etat.actionEnCours) {
                if (etat.actionEnCours === 'echanger' && !slot.bloquePar) jouable = true;
                if (etat.actionEnCours === 'blocage' && !slot.bloquePar) jouable = true;
                if (etat.actionEnCours === 'deblocage' && slot.bloquePar) jouable = true;
            }
            if (jouable) classes.push('case-jouable');

            const titre = slot.bloquePar ? 'Carte bloquée' : 'Carte face cachée';
            return `<div class="${classes.join(' ')}" data-slot="${i}" title="${titre}"></div>`;
        })
        .join('');

    conteneur.querySelectorAll('.case-jouable').forEach((el) => {
        el.addEventListener('click', () => {
            if (etat.animation) return;
            const i = Number(el.dataset.slot);
            if (etat.actionEnCours === 'echanger') echangerCarte(i);
            else if (etat.actionEnCours === 'blocage') animerBlocage(i, () => poserBlocage(i));
            else if (etat.actionEnCours === 'deblocage') animerDeblocage(i, () => poserDeblocage(i));
        });
    });
}

function rendrePioche() {
    const nbPioche = etat.pioche.length;
    const classeRelief = nbPioche >= 3 ? 'pioche-pile-3'
                       : nbPioche === 2 ? 'pioche-pile-2' : '';

    document.getElementById('pioche').innerHTML = `
        <div class="pile-pioche ${classeRelief}">
            ${nbPioche > 0
                ? `<div class="carte-pioche carte-dos"></div>`
                : `<div class="carte-pioche pioche-vide"></div>`}
        </div>
        <div class="compteur-pioche">${nbPioche} carte${nbPioche !== 1 ? 's' : ''}</div>
    `;

    // Défausse : emplacement vide à côté, prêt à accueillir les cartes jouées
    const derniere = etat.defaussePouvoir[etat.defaussePouvoir.length - 1];
    document.getElementById('defausse-pouvoir').innerHTML = `
        <div class="pile-defausse ${derniere ? '' : 'pile-vide'}">
            ${derniere ? `<div class="carte-face carte-pouvoir-face"${derniere.sousType ? ` data-sous-type="${derniere.sousType}"` : ''}>${derniere.sousType ? '' : derniere.nom}</div>` : ''}
        </div>
        <div class="compteur-pioche">${etat.defaussePouvoir.length} défaussée${etat.defaussePouvoir.length !== 1 ? 's' : ''}</div>
    `;
}

function rendreJoueurs() {
    const vous = etat.joueurs[etat.perspective];
    rendreZoneVous(vous);

    const autres = etat.joueurs.filter((j) => j.id !== vous.id);
    POSITIONS_ADVERSAIRES.forEach((idZone, i) => {
        const el = document.getElementById(idZone);
        if (!autres[i]) { el.innerHTML = ''; return; }
        el.innerHTML = html_zoneAdversaire(autres[i]);

        const panel = el.querySelector('.hud-panel');
        const estMonTour = etat.perspective === etat.tourActuel;
        const actionCible = etat.actionEnCours === 'vol' || etat.actionEnCours === 'vision';
        const estCible = actionCible && etat.cible === autres[i].id;
        const estSelectionnable = estMonTour && actionCible && etat.cible === null;

        if (estMonTour && actionCible) {
            if (estSelectionnable) {
                if (panel) panel.addEventListener('click', () => choisirCible(autres[i].id));
            } else if (estCible) {
                el.querySelectorAll('[data-carte-action]').forEach((card) => {
                    card.addEventListener('click', () => {
                        const carteId = card.dataset.carteAction;
                        if (etat.actionEnCours === 'vol') volerCarte(autres[i].id, carteId);
                        else utiliserVision(autres[i].id, carteId);
                    });
                });
            }
        }
    });
}

function html_zoneAdversaire(joueur) {
    const actif = joueur.id === etat.tourActuel;
    const estMonTour = etat.perspective === etat.tourActuel;
    const actionCible = etat.actionEnCours === 'vol' || etat.actionEnCours === 'vision';
    const estCible = actionCible && etat.cible === joueur.id;
    const estSelectionnable = estMonTour && actionCible && etat.cible === null;

    let cartesMini;
    if (estCible) {
        cartesMini = joueur.main
            .map((c) => `<div class="carte-mini carte-dos carte-selectionnable" data-id="${c.id}" data-carte-action="${c.id}" title="Choisir cette carte"></div>`)
            .join('');
    } else {
        cartesMini = joueur.main.map((c) => {
            const estSel = joueur.ia && c.id === etat.selection;
            return `<div class="carte-mini carte-dos${estSel ? ' ia-carte-active' : ''}" data-id="${c.id}"></div>`;
        }).join('');
    }

    const badges = [];
    if (joueur.penalise) badges.push('<span class="badge badge-penalise">⚠</span>');
    if (joueur.protege) badges.push('<span class="badge badge-protege">🛡</span>');

    const panelClass = `hud-panel ${actif ? 'hud-actif' : ''} ${estSelectionnable ? 'zone-cible-action' : ''} ${estCible ? 'hud-cible' : ''}`;

    return `
        <div class="${panelClass}" data-joueur="${joueur.id}">
            <div class="hud-entete">
                <span class="hud-nom">${joueur.nom}${actif ? ' ●' : ''}</span>
                ${badges.join('')}
            </div>
            <div class="hud-cartes">
                <div class="carte-mini carte-dos hud-perso" title="Personnage caché"></div>
                <div class="hud-main">${cartesMini}</div>
            </div>
            ${estSelectionnable ? '<p class="aide-cible">Cliquer pour cibler</p>' : ''}
        </div>
    `;
}

// FLIP – Steps 3 & 4 : inversion + animation vers la nouvelle position
function appliquerFlipMain(posAvant) {
    const aAnimer = [];
    document.querySelectorAll('#zone-bas [data-id]').forEach(el => {
        const id = el.dataset.id;
        if (!posAvant[id]) return; // nouvelle carte : elle apparaît en place
        const r  = el.getBoundingClientRect();
        const dx = posAvant[id].x - r.left;
        const dy = posAvant[id].y - r.top;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
        // Invert : placer instantanément à l'ancienne position, sans transition
        el.style.transition = 'none';
        el.style.transform  = `translate(${dx}px, ${dy}px)`;
        aAnimer.push(el);
    });
    if (!aAnimer.length) return;
    // Forcer un reflow global pour que le navigateur "voie" les positions inversées
    aAnimer[0].offsetHeight;
    // Play : dans le prochain frame, on retire l'offset → la transition CSS (0.18s ease) s'enclenche
    requestAnimationFrame(() => {
        aAnimer.forEach(el => {
            el.style.transition = 'transform 0.26s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            el.style.transform  = '';
        });
        setTimeout(() => aAnimer.forEach(el => { el.style.transition = ''; }), 320);
    });
}

function rendreZoneVous(joueur) {
    // Mélange défensif : si la main a changé (carte ajoutée ou retirée),
    // on mélange l'ordre pour qu'aucun adversaire ne puisse deviner quelle carte vient d'entrer
    const currentIds = joueur.main.map(c => c.id).sort().join(',');
    if (mainIdsAvant !== null && currentIds !== mainIdsAvant) {
        for (let i = joueur.main.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [joueur.main[i], joueur.main[j]] = [joueur.main[j], joueur.main[i]];
        }
    }
    mainIdsAvant = currentIds;

    // FLIP – Step 1 : capturer les positions actuelles de chaque carte
    const posAvant = {};
    document.querySelectorAll('#zone-bas [data-id]').forEach(el => {
        const r = el.getBoundingClientRect();
        posAvant[el.dataset.id] = { x: r.left, y: r.top };
    });

    const estMonTour = etat.perspective === etat.tourActuel;
    const peutDeclarer = aGagne(joueur);

    const badgeProtection = joueur.protege
        ? '<span class="badge badge-protege">🛡 Immunité active</span>'
        : '';

    // Tour pénalisé : pioche obligatoire, pas d'autre action
    if (estMonTour && joueur.penalise) {
        document.getElementById('zone-bas').innerHTML = `
            <div class="zone-joueur-contenu zone-vous zone-active">
                <div class="personnage-central">
                    <span class="etiquette">Votre personnage</span>
                    <div class="carte-face carte-personnage-face carte-personnage-grande"${styleImage(joueur.personnage.image)}></div>
                    ${badgeProtection}
                </div>
                <div class="bloc-main">
                    <div class="main-joueur">
                        ${joueur.main.map((c) => {
                            const classes = ['carte-face'];
                            if (c.famille === 'pouvoir') classes.push('carte-pouvoir-face');
                            if (c.famille === 'special') classes.push('carte-special-face');
                            if (c.famille === 'tresor' && c.personnageId === joueur.personnage.id) classes.push('carte-objectif');
                            const st = c.sousType || '';
                            const img = !st && c.image ? styleImage(c.image) : '';
                            return `<div class="${classes.join(' ')}"${st ? ` data-sous-type="${st}"` : ''}${img}>${st || c.image ? '' : c.nom}</div>`;
                        }).join('')}
                    </div>
                    <p class="aide-action">Vous avez été volé — vous ne pouvez que piocher ce tour.</p>
                    <div class="boutons-action">
                        <button id="btn-piocher-penalise">Piocher et passer le tour</button>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('btn-piocher-penalise').addEventListener('click', passerTourPenalise);
        appliquerFlipMain(posAvant);
        return;
    }

    document.getElementById('zone-bas').innerHTML = `
        <div class="zone-joueur-contenu zone-vous ${estMonTour ? 'zone-active' : ''}">
            <div class="personnage-central">
                <span class="etiquette">Votre personnage</span>
                <div class="carte-face carte-personnage-face carte-personnage-grande"${styleImage(joueur.personnage.image)}></div>
                ${badgeProtection}
            </div>
            <div class="bloc-main">
                <div class="main-joueur">
                    ${joueur.main
                        .map((c) => {
                            const classes = ['carte-face'];
                            if (c.famille === 'pouvoir') classes.push('carte-pouvoir-face');
                            if (c.famille === 'special') classes.push('carte-special-face');
                            if (c.famille === 'tresor' && c.personnageId === joueur.personnage.id) classes.push('carte-objectif');
                            if (c.id === etat.selection) classes.push('carte-selectionnee');
                            const st = c.sousType || '';
                            const img = !st && c.image ? styleImage(c.image) : '';
                            return `<div class="${classes.join(' ')}" data-id="${c.id}"${st ? ` data-sous-type="${st}"` : ''}${img}>${st || c.image ? '' : c.nom}</div>`;
                        })
                        .join('')}
                </div>
                <div id="actions-carte" class="actions-carte"></div>
            </div>
            ${peutDeclarer ? `<button id="bouton-victoire" class="bouton-victoire">Déclarer victoire 🏆</button>` : ''}
        </div>
    `;

    if (estMonTour) {
        document.querySelectorAll('#zone-bas [data-id]').forEach((el) => {
            el.addEventListener('click', () => selectionnerCarte(el.dataset.id));
        });
        rendreActionsCarte();
    }

    const boutonVictoire = document.getElementById('bouton-victoire');
    if (boutonVictoire) boutonVictoire.addEventListener('click', () => declarerVictoire(joueur));

    appliquerFlipMain(posAvant);
}

function rendreActionsCarte() {
    const conteneur = document.getElementById('actions-carte');
    if (!conteneur) return;

    const carte = carteSelectionnee();
    if (!carte) { conteneur.innerHTML = ''; return; }

    const existeCaseBloquee = etat.plateau.some((s) => s.bloquePar);

    const actionCible = etat.actionEnCours === 'vol' || etat.actionEnCours === 'vision';
    let aideTexte;
    if (actionCible && etat.cible === null) {
        aideTexte = 'Clique un adversaire pour le cibler.';
    } else if (actionCible && etat.cible !== null) {
        aideTexte = etat.actionEnCours === 'vol'
            ? 'Clique la carte à voler (aveugle).'
            : 'Clique la carte à observer (aveugle).';
    } else if (etat.actionEnCours === 'echanger') {
        aideTexte = 'Clique une case du plateau pour échanger.';
    } else if (etat.actionEnCours) {
        aideTexte = 'Clique une case du plateau pour confirmer.';
    } else {
        aideTexte = '';
    }

    // Boutons des actions spéciales uniquement (plus de bouton Échanger)
    const boutons = [];
    if (carte.sousType === 'blocage') {
        boutons.push(`<button data-action="blocage" class="${etat.actionEnCours === 'blocage' ? 'actif' : ''}">Bloquer une case</button>`);
    }
    if (carte.sousType === 'deblocage' && existeCaseBloquee) {
        boutons.push(`<button data-action="deblocage" class="${etat.actionEnCours === 'deblocage' ? 'actif' : ''}">Débloquer une case</button>`);
    }
    if (carte.sousType === 'vol') {
        boutons.push(`<button data-action="vol" class="${etat.actionEnCours === 'vol' ? 'actif' : ''}">Voler une carte</button>`);
    }
    if (carte.sousType === 'vision') {
        boutons.push(`<button data-action="vision" class="${etat.actionEnCours === 'vision' ? 'actif' : ''}">Observer une carte</button>`);
    }
    if (carte.sousType === 'protection') {
        boutons.push(`<button id="btn-jouer-protection">Activer la protection</button>`);
    }

    conteneur.innerHTML = `
        ${aideTexte ? `<p class="aide-action">${aideTexte}</p>` : ''}
        ${boutons.length ? `<div class="boutons-action">${boutons.join('')}</div>` : ''}
    `;

    conteneur.querySelectorAll('button[data-action]').forEach((btn) => {
        btn.addEventListener('click', () => choisirAction(btn.dataset.action));
    });
    const btnProtection = document.getElementById('btn-jouer-protection');
    if (btnProtection) btnProtection.addEventListener('click', jouerProtection);
}

function rendrePanneauTest() {
    // Le panneau de changement de perspective est désactivé :
    // l'écran de passation gère le changement de joueur en mode local,
    // et la perspective suit l'IA automatiquement en mode IA.
    document.getElementById('panneau-test').innerHTML = '';
}

function rendreFinPartie() {
    document.querySelector('.table').style.display = 'none';
    document.getElementById('panneau-test').style.display = 'none';
    const bt = document.getElementById('badge-tour');
    if (bt) bt.textContent = '';

    const el = document.getElementById('ecran-victoire');
    el.style.display = 'block';
    const titreAFK = etat.raisonVictoire === 'afk'
        ? `<p class="victoire-afk">L'adversaire a laissé le chronomètre s'écouler 5 fois de suite…<br>Victoire par forfait !</p>`
        : '';
    el.innerHTML = `
        <h1>🏆 ${etat.vainqueur.nom} a gagné !</h1>
        ${titreAFK}
        <p>Personnage secret : <strong>${etat.vainqueur.personnage.nom}</strong></p>
        <div class="main-joueur">
            ${etat.vainqueur.personnage.objets
                .map((objet) => `<div class="carte-face carte-objectif"${styleImage(objet.image)}>${objet.image ? '' : objet.nom}</div>`)
                .join('')}
        </div>
        <button id="bouton-rejouer" class="bouton-secondaire">Nouvelle partie</button>
    `;
    document.getElementById('bouton-rejouer').addEventListener('click', retourMenu);
}

/* ====================================================================
   ÉVÉNEMENTS DOM
   ==================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-joueurs]').forEach((btn) => {
        btn.addEventListener('click', () => {
            lancerJeu(Number(btn.dataset.joueurs), Number(btn.dataset.ia || 0));
        });
    });
    document.getElementById('bouton-nouvelle-partie').addEventListener('click', retourMenu);
    document.getElementById('bouton-regles-jeu').addEventListener('click', afficherRegles);
    document.getElementById('bouton-regles-menu').addEventListener('click', afficherRegles);
});

/* ====================================================================
   ADAPTATEUR RÉSEAU (à brancher plus tard)
   --------------------------------------------------------------------
   Aujourd'hui : tout tourne dans un seul onglet. distribuerPartie()
   et toutes les actions sont exécutées localement, et `etat.perspective`
   simule "quel écran on regarde".

   Demain, avec ton serveur Node.js/WebSocket :
     1. Le serveur est seul à exécuter ces fonctions — jamais le
        navigateur d'un joueur. Il garde `etat` côté serveur.
     2. Un client envoie au serveur l'INTENTION ("je veux observer la
        carte X du joueur Y"), jamais l'état complet.
     3. Le serveur vérifie que c'est bien le tour de ce joueur, applique
        la règle, puis renvoie à chaque client SA version filtrée de
        l'état (sa main + son personnage en clair, tout le reste caché).
     4. `etat.perspective` disparaît : chaque appareil n'affiche que
        ce que le serveur lui a envoyé.
     5. La modale Vision est envoyée uniquement au joueur qui a joué
        la carte, pas à tous les clients.
   ==================================================================== */
