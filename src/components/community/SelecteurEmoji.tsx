"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Clock, Smile, ThumbsUp, Heart, GraduationCap, PartyPopper, X } from "lucide-react";

export type CategorieEmoji = {
  id: string;
  nom: string;
  icone: React.ReactNode;
  emojis: { char: string; mots: string[] }[];
};

const CATEGORIES: CategorieEmoji[] = [
  {
    id: "smileys",
    nom: "Smileys & Émotions",
    icone: <Smile className="h-4 w-4" />,
    emojis: [
      { char: "😀", mots: ["sourire", "heureux", "joie", "content"] },
      { char: "😃", mots: ["sourire", "yeux ouverts", "joyeux"] },
      { char: "😄", mots: ["rire", "sourire", "joie"] },
      { char: "😁", mots: ["rayonnant", "dents", "content"] },
      { char: "😆", mots: ["mdr", "rire", "yeux fermes"] },
      { char: "😅", mots: ["soulagement", "sueur", "ouf"] },
      { char: "😂", mots: ["pleure de rire", "mdr", "lol", "mort de rire"] },
      { char: "🤣", mots: ["roule par terre", "mort de rire", "fou rire"] },
      { char: "😊", mots: ["timide", "sourire doux", "gentil"] },
      { char: "😇", mots: ["ange", "innocent", "saint"] },
      { char: "🙂", mots: ["leger sourire", "doux", "ok"] },
      { char: "😉", mots: ["clin d'oeil", "clin", "complice"] },
      { char: "😌", mots: ["soulage", "zen", "paisible"] },
      { char: "😍", mots: ["yeux coeur", "amour", "adore", "coup de coeur"] },
      { char: "🥰", mots: ["amoureux", "tendresse", "coeurs"] },
      { char: "😘", mots: ["bisou", "baiser", "coeur"] },
      { char: "😋", mots: ["delicieux", "miam", "langue"] },
      { char: "😎", mots: ["cool", "lunettes", "classe"] },
      { char: "🤓", mots: ["intello", "etudiant", "lunettes"] },
      { char: "🧐", mots: ["monocle", "curieux", "analyse"] },
      { char: "🤔", mots: ["reflexion", "penser", "doute"] },
      { char: "🤫", mots: ["chut", "silence", "secret"] },
      { char: "🤗", mots: ["calin", "ouvert", "accueil"] },
      { char: "🫡", mots: ["salut militaire", "compris", "recu", "a vos ordres"] },
      { char: "🤐", mots: ["bouche cousue", "motus", "silence"] },
      { char: "🤨", mots: ["sourcil leve", "sceptique", "doute"] },
      { char: "😐", mots: ["neutre", "sans avis", "bof"] },
      { char: "😑", mots: ["blasé", "fatigue", "decu"] },
      { char: "😶", mots: ["sans voix", "bouche bee"] },
      { char: "😏", mots: ["malicieux", "narquois"] },
      { char: "😒", mots: ["agace", "blasé", "soupir"] },
      { char: "🙄", mots: ["yeux au ciel", "pff"] },
      { char: "😬", mots: ["embarrasse", "malaise", "oups"] },
      { char: "😮‍💨", mots: ["soupir", "soulagement", "fatigue"] },
      { char: "🥱", mots: ["baille", "sommeil", "fatigue"] },
      { char: "😴", mots: ["dort", "nuit", "dodo"] },
      { char: "😷", mots: ["masque", "malade", "sante"] },
      { char: "🤒", mots: ["fievre", "thermo", "malade"] },
      { char: "🤕", mots: ["blesse", "bandage", "bobo"] },
      { char: "🤢", mots: ["nausee", "malade", "vert"] },
      { char: "🤮", mots: ["vomir", "degout"] },
      { char: "🥵", mots: ["chaud", "chaleur", "canicule"] },
      { char: "🥶", mots: ["froid", "gel", "glagla"] },
      { char: "😵", mots: ["vertige", "ko", "sonne"] },
      { char: "🤯", mots: ["cerveau explose", "incroyable", "choc"] },
      { char: "🥳", mots: ["fete", "anniversaire", "chapeau", "bravo"] },
      { char: "🥸", mots: ["deguisement", "faux nez"] },
      { char: "🥺", mots: ["implorant", "s'il te plait", "emouvant"] },
      { char: "😢", mots: ["larme", "triste", "pleur"] },
      { char: "😭", mots: ["pleure", "sanglots", "tristesse"] },
      { char: "😱", mots: ["cri", "peur", "effroi", "choc"] },
      { char: "😖", mots: ["frustration", "enerve"] },
      { char: "😤", mots: ["victoire", "fier", "fume"] },
      { char: "😡", mots: ["colere", "furieux", "rouge"] },
      { char: "🤬", mots: ["insultes", "rage", "colere"] },
    ],
  },
  {
    id: "gestes",
    nom: "Gestes & Mains",
    icone: <ThumbsUp className="h-4 w-4" />,
    emojis: [
      { char: "👍", mots: ["pouce", "pouce en l'air", "ok", "d'accord", "bravo", "valide"] },
      { char: "👎", mots: ["pouce en bas", "pas d'accord", "non", "mauvais"] },
      { char: "👌", mots: ["parfait", "ok", "super", "nickel"] },
      { char: "✌️", mots: ["victoire", "paix", "peace"] },
      { char: "🤞", mots: ["doigts croises", "chance", "espoir"] },
      { char: "🤟", mots: ["je t'aime", "rock"] },
      { char: "🤙", mots: ["appel", "shaka", "tranquille"] },
      { char: "👋", mots: ["coucou", "bonjour", "salut", "au revoir"] },
      { char: "✋", mots: ["main levee", "stop", "present"] },
      { char: "🤚", mots: ["dos de la main", "stop"] },
      { char: "🖐️", mots: ["cinq", "main ouverte"] },
      { char: "👐", mots: ["mains ouvertes", "accueil"] },
      { char: "🙌", mots: ["mains en l'air", "hourra", "celebration", "gloire"] },
      { char: "👏", mots: ["applaudissements", "bravo", "felicitations", "claps"] },
      { char: "🤝", mots: ["poignee de main", "accord", "partenaire", "bienvenue"] },
      { char: "🙏", mots: ["priere", "merci", "svp", "remerciement", "namaste"] },
      { char: "✍️", mots: ["ecrire", "stylo", "signature", "devoirs"] },
      { char: "💪", mots: ["muscle", "force", "courage", "determination"] },
      { char: "👀", mots: ["yeux", "regard", "attention", "vu"] },
      { char: "👂", mots: ["oreille", "ecoute", "entendu"] },
      { char: "🧠", mots: ["cerveau", "intelligence", "reflexion"] },
      { char: "🙋", mots: ["lever la main", "question", "participer"] },
      { char: "🙆", mots: ["d'accord", "ok", "geste"] },
      { char: "🙅", mots: ["non", "interdit", "refus"] },
      { char: "🙇", mots: ["pardon", "respect", "incline"] },
    ],
  },
  {
    id: "coeurs",
    nom: "Cœurs & Symboles",
    icone: <Heart className="h-4 w-4" />,
    emojis: [
      { char: "❤️", mots: ["coeur rouge", "amour", "aime", "like"] },
      { char: "🧡", mots: ["coeur orange", "amitie"] },
      { char: "💛", mots: ["coeur jaune", "joie"] },
      { char: "💚", mots: ["coeur vert", "nature", "esperance"] },
      { char: "💙", mots: ["coeur bleu", "confiance"] },
      { char: "💜", mots: ["coeur violet", "douceur"] },
      { char: "🖤", mots: ["coeur noir"] },
      { char: "🤍", mots: ["coeur blanc", "purete"] },
      { char: "💔", mots: ["coeur brise", "triste", "peine"] },
      { char: "💖", mots: ["coeur etincelant", "brillant", "amour"] },
      { char: "💗", mots: ["coeur battant", "emotion"] },
      { char: "💓", mots: ["coeur qui vibre", "pouls"] },
      { char: "✨", mots: ["etoiles", "magie", "brillant", "nouveau"] },
      { char: "⭐", mots: ["etoile", "favorite", "important"] },
      { char: "🌟", mots: ["etoile brillante", "succes", "top"] },
      { char: "🔥", mots: ["feu", "flamme", "chaud", "populaire", "urgent"] },
      { char: "💯", mots: ["100", "parfait", "note maximale", "top"] },
      { char: "✅", mots: ["coche", "valide", "fait", "termine", "bon"] },
      { char: "❌", mots: ["croix", "faux", "erreur", "refuse"] },
      { char: "⚠️", mots: ["attention", "alerte", "danger", "warning"] },
      { char: "💡", mots: ["idee", "ampoule", "astuce", "inspiration"] },
      { char: "📌", mots: ["epingle", "punaise", "important", "fixer"] },
      { char: "📍", mots: ["localisation", "lieu", "adresse"] },
      { char: "💬", mots: ["bulle", "message", "discussion"] },
      { char: "📢", mots: ["megaphone", "annonce", "attention", "communique"] },
      { char: "🔔", mots: ["cloche", "notification", "rappel"] },
    ],
  },
  {
    id: "ecole",
    nom: "École & Études",
    icone: <GraduationCap className="h-4 w-4" />,
    emojis: [
      { char: "🎓", mots: ["diplome", "bac", "etudes", "reussite", "universite"] },
      { char: "🏫", mots: ["ecole", "etablissement", "college", "lycee"] },
      { char: "📚", mots: ["livres", "bibliotheque", "cours", "lecture"] },
      { char: "📖", mots: ["livre ouvert", "lecon"] },
      { char: "📝", mots: ["memo", "devoir", "exercice", "redaction", "note"] },
      { char: "✏️", mots: ["crayon", "dessin", "ecriture"] },
      { char: "🖊️", mots: ["stylo", "correction"] },
      { char: "📏", mots: ["regle", "geometrie", "mesure"] },
      { char: "📐", mots: ["equerre", "triangle", "maths"] },
      { char: "🎒", mots: ["cartable", "sac", "rentree"] },
      { char: "🗓️", mots: ["calendrier", "date", "planning", "emploi du temps"] },
      { char: "⏰", mots: ["reveil", "horaire", "heure", "retard"] },
      { char: "📊", mots: ["graphique", "statistiques", "bulletin", "moyenne"] },
      { char: "📈", mots: ["progression", "hausse", "amelioration"] },
      { char: "🏆", mots: ["trophee", "coupe", "premier", "vainqueur", "prix"] },
      { char: "🥇", mots: ["medaille d'or", "premier", "1er"] },
      { char: "🥈", mots: ["medaille d'argent", "deuxieme", "2e"] },
      { char: "🥉", mots: ["medaille de bronze", "troisieme", "3e"] },
      { char: "🎨", mots: ["art", "peinture", "dessin", "creativite"] },
      { char: "🎭", mots: ["theatre", "spectacle", "fete"] },
      { char: "🔬", mots: ["microscope", "sciences", "svt"] },
      { char: "🧪", mots: ["eprouvette", "chimie", "experience"] },
      { char: "💻", mots: ["ordinateur", "informatique", "numerique"] },
    ],
  },
  {
    id: "fete",
    nom: "Célébration & Vie",
    icone: <PartyPopper className="h-4 w-4" />,
    emojis: [
      { char: "🎉", mots: ["fete", "confettis", "bravo", "felicitations", "joie"] },
      { char: "🎊", mots: ["ballon confettis", "succes"] },
      { char: "🎈", mots: ["ballon", "anniversaire"] },
      { char: "🎁", mots: ["cadeau", "surprise", "recompense"] },
      { char: "🍰", mots: ["gateau", "anniversaire", "partage"] },
      { char: "☕", mots: ["cafe", "pause", "salle des profs", "matin"] },
      { char: "🍵", mots: ["the", "infusion"] },
      { char: "🥐", mots: ["croissant", "petit dej"] },
      { char: "🍎", mots: ["pomme", "fruit", "gouter"] },
      { char: "🥪", mots: ["sandwich", "cantine", "dejeuner"] },
      { char: "⚽", mots: ["foot", "ballon", "sport", "recreation"] },
      { char: "🏀", mots: ["basket", "sport", "eps"] },
      { char: "🚌", mots: ["bus scolaire", "transport", "sortie"] },
      { char: "☀️", mots: ["soleil", "beau temps", "chaleur"] },
      { char: "🌈", mots: ["arc-en-ciel", "couleurs", "espoir"] },
      { char: "🌸", mots: ["fleur", "printemps", "beau"] },
    ],
  },
];

const CLE_STOCKAGE_RECENTS = "educom:emojis:recents";
const MAX_RECENTS = 24;

function chargerRecents(): string[] {
  if (typeof window === "undefined") return ["👍", "❤️", "😊", "🎉", "👏", "🙏", "✅", "🔥"];
  try {
    const raw = localStorage.getItem(CLE_STOCKAGE_RECENTS);
    if (!raw) return ["👍", "❤️", "😊", "🎉", "👏", "🙏", "✅", "🔥"];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : ["👍", "❤️", "😊", "🎉", "👏", "🙏", "✅", "🔥"];
  } catch {
    return ["👍", "❤️", "😊", "🎉", "👏", "🙏", "✅", "🔥"];
  }
}

function sauvegarderRecent(char: string) {
  if (typeof window === "undefined") return;
  try {
    const recents = chargerRecents().filter((x) => x !== char);
    recents.unshift(char);
    localStorage.setItem(CLE_STOCKAGE_RECENTS, JSON.stringify(recents.slice(0, MAX_RECENTS)));
  } catch {}
}

export type SelecteurEmojiProps = {
  onSelect: (emoji: string) => void;
  onClose?: () => void;
  className?: string;
};

export default function SelecteurEmoji({ onSelect, onClose, className = "" }: SelecteurEmojiProps) {
  const [recherche, setRecherche] = useState("");
  const [categorieActive, setCategorieActive] = useState<string>("recents");
  const [recents, setRecents] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRecents(chargerRecents());
    // Auto-focus the search bar
    inputRef.current?.focus();
  }, []);

  const choisir = (char: string) => {
    sauvegarderRecent(char);
    setRecents((prev) => [char, ...prev.filter((c) => c !== char)].slice(0, MAX_RECENTS));
    onSelect(char);
  };

  // Filtrage par recherche
  const resultatsRecherche = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return null;
    const correspondants: string[] = [];
    const vu = new Set<string>();

    for (const cat of CATEGORIES) {
      for (const item of cat.emojis) {
        if (!vu.has(item.char)) {
          if (item.mots.some((m) => m.toLowerCase().includes(q)) || item.char === q) {
            correspondants.push(item.char);
            vu.add(item.char);
          }
        }
      }
    }
    return correspondants;
  }, [recherche]);

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-label="Sélecteur d'émojis"
      className={`flex w-72 flex-col rounded-2xl border border-rule bg-surface shadow-xl sm:w-80 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Barre de recherche */}
      <div className="flex items-center gap-2 border-b border-rule px-3 py-2">
        <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-text-faint" />
        <input
          ref={inputRef}
          type="text"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher un émoji…"
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-xs text-text placeholder:text-text-faint focus:outline-none focus:ring-0"
        />
        {recherche && (
          <button
            type="button"
            onClick={() => setRecherche("")}
            aria-label="Effacer"
            className="flex h-5 w-5 items-center justify-center rounded-full text-text-faint hover:bg-sunk hover:text-text"
          >
            <X aria-hidden="true" className="h-3 w-3" />
          </button>
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="ml-1 flex h-6 w-6 items-center justify-center rounded-lg text-text-soft hover:bg-sunk hover:text-text sm:hidden"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Onglets des catégories (WhatsApp style) */}
      {!recherche && (
        <div className="flex items-center justify-between border-b border-rule bg-sunk/30 px-2 py-1">
          <button
            type="button"
            onClick={() => setCategorieActive("recents")}
            title="Récents"
            aria-label="Récents"
            aria-pressed={categorieActive === "recents"}
            className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs transition-colors ${
              categorieActive === "recents" ? "bg-surface text-primary-ink shadow-2xs" : "text-text-soft hover:text-text"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategorieActive(cat.id)}
              title={cat.nom}
              aria-label={cat.nom}
              aria-pressed={categorieActive === cat.id}
              className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs transition-colors ${
                categorieActive === cat.id ? "bg-surface text-primary-ink shadow-2xs" : "text-text-soft hover:text-text"
              }`}
            >
              {cat.icone}
            </button>
          ))}
        </div>
      )}

      {/* Grille d'émojis */}
      <div className="max-h-60 min-h-48 overflow-y-auto p-2 scrollbar-thin">
        {recherche ? (
          resultatsRecherche && resultatsRecherche.length > 0 ? (
            <div>
              <p className="px-1 pb-1 text-[11px] font-semibold text-text-faint">{resultatsRecherche.length} résultat(s)</p>
              <div className="grid grid-cols-7 gap-1 sm:grid-cols-8">
                {resultatsRecherche.map((char) => (
                  <button
                    key={char}
                    type="button"
                    onClick={() => choisir(char)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-xl transition-transform hover:scale-125 hover:bg-sunk active:scale-95"
                  >
                    {char}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-text-soft">
              Aucun émoji trouvé pour &laquo;&nbsp;{recherche}&nbsp;&raquo;.
            </div>
          )
        ) : (
          <div>
            {categorieActive === "recents" ? (
              <div>
                <p className="px-1 pb-1 text-[11px] font-semibold text-text-faint">Récents & populaires</p>
                <div className="grid grid-cols-7 gap-1 sm:grid-cols-8">
                  {recents.map((char) => (
                    <button
                      key={char}
                      type="button"
                      onClick={() => choisir(char)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-xl transition-transform hover:scale-125 hover:bg-sunk active:scale-95"
                    >
                      {char}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              (() => {
                const cat = CATEGORIES.find((c) => c.id === categorieActive);
                if (!cat) return null;
                return (
                  <div>
                    <p className="px-1 pb-1 text-[11px] font-semibold text-text-faint">{cat.nom}</p>
                    <div className="grid grid-cols-7 gap-1 sm:grid-cols-8">
                      {cat.emojis.map((item) => (
                        <button
                          key={item.char}
                          type="button"
                          onClick={() => choisir(item.char)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl text-xl transition-transform hover:scale-125 hover:bg-sunk active:scale-95"
                        >
                          {item.char}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        )}
      </div>
    </div>
  );
}
