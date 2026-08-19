/**
 * Écriture ZIP en flux — sans dépendance.
 *
 * ═══ POURQUOI ÉCRIT À LA MAIN, ENCORE ═══
 *
 * Même raisonnement qu'au lot 14 pour le PDF : le dépôt n'a aucune bibliothèque
 * d'archive, et un ZIP **sans compression** est un format simple — en-tête par
 * fichier, données, catalogue central, fin de catalogue. Les pièces d'un dossier
 * sont des PDF et des JPEG, **déjà compressés** : les recompresser coûterait du
 * temps processeur pour gagner quelques pour cent. On les stocke tels quels
 * (méthode `STORE`), ce qui rend l'écriture instantanée et vérifiable.
 *
 * ═══ POURQUOI EN FLUX ═══
 *
 * ⚠️ Un export de classe, c'est trente dossiers. Tout charger en mémoire ferait
 * tomber le serveur au premier export d'école. Ici les entrées sont produites
 * **une par une** : chaque fichier est téléchargé, écrit, puis relâché. La
 * mémoire haute est celle **d'un seul document** (10 Mo au maximum, la limite du
 * lot 13), plus le catalogue — quelques centaines d'octets par fichier.
 *
 * ⚠️ Aucun fichier temporaire n'est écrit nulle part : ni sur le disque du
 * serveur, ni dans Storage. Le ZIP n'existe que le temps de traverser la
 * réponse HTTP. Il n'y a donc rien à nettoyer, et aucune seconde copie des
 * documents ne peut subsister quelque part.
 */

/* ═══════════════════ CRC-32 ═══════════════════ */

/** Table CRC-32 (polynôme 0xEDB88320), calculée une fois au chargement. */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/* ═══════════════════ écriture ═══════════════════ */

const enc = new TextEncoder();

function le(values: [number, number][]): Uint8Array {
  // [valeur, largeur en octets] — le ZIP est intégralement petit-boutiste.
  const size = values.reduce((n, [, w]) => n + w, 0);
  const out = new Uint8Array(size);
  let at = 0;
  for (const [v, w] of values) {
    let x = v >>> 0;
    for (let i = 0; i < w; i++) { out[at++] = x & 0xff; x >>>= 8; }
  }
  return out;
}

function join(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}

/** Date/heure MS-DOS. Le ZIP ne connaît pas d'autre format. */
function dosTime(d: Date): { time: number; date: number } {
  return {
    time: ((d.getHours() & 31) << 11) | ((d.getMinutes() & 63) << 5) | ((d.getSeconds() / 2) & 31),
    date: (((d.getFullYear() - 1980) & 127) << 9) | (((d.getMonth() + 1) & 15) << 5) | (d.getDate() & 31),
  };
}

export type ZipEntry = {
  /** Chemin dans l'archive, séparé par `/`. Les dossiers naissent des chemins. */
  path: string;
  bytes: Uint8Array;
  at?: Date;
};

/** Fournit les entrées une par une — c'est ce qui permet de ne rien accumuler. */
export type ZipSource = AsyncIterable<ZipEntry>;

/**
 * Assemble un ZIP en flux.
 *
 * ⚠️ **Drapeau UTF-8 (bit 11) obligatoire.** Sans lui, « Diallo-Extrait de
 * naissance.pdf » ressort avec des caractères cassés sur la moitié des
 * décompresseurs — et un nom illisible sur un dossier officiel, c'est un dossier
 * qu'on refait.
 */
export async function* zipStream(source: ZipSource): AsyncGenerator<Uint8Array> {
  const central: Uint8Array[] = [];
  let offset = 0;
  let count = 0;

  for await (const entry of source) {
    const name = enc.encode(entry.path);
    const { time, date } = dosTime(entry.at ?? new Date());
    const crc = crc32(entry.bytes);
    const size = entry.bytes.length;

    const local = join(
      le([[0x04034b50, 4], [20, 2], [0x0800, 2], [0, 2], [time, 2], [date, 2],
          [crc, 4], [size, 4], [size, 4], [name.length, 2], [0, 2]]),
      name,
    );
    yield local;
    yield entry.bytes;

    central.push(join(
      le([[0x02014b50, 4], [20, 2], [20, 2], [0x0800, 2], [0, 2], [time, 2], [date, 2],
          [crc, 4], [size, 4], [size, 4], [name.length, 2], [0, 2], [0, 2],
          [0, 2], [0, 2], [0, 4], [offset, 4]]),
      name,
    ));

    offset += local.length + size;
    count++;
  }

  const dir = join(...central);
  yield dir;
  yield le([[0x06054b50, 4], [0, 2], [0, 2], [count, 2], [count, 2], [dir.length, 4], [offset, 4], [0, 2]]);
}

/**
 * Nettoie un segment de chemin pour une archive.
 *
 * ⚠️ Retire les séparateurs et les remontées : une entrée nommée `../../etc` est
 * une attaque classique contre les décompresseurs (« zip slip »). Les accents
 * sont conservés — les élèves s'appellent Ndiaye et Diagne.
 */
export function safeSegment(name: string): string {
  return name
    .replace(/[\\/]+/g, "-")
    .replace(/\.{2,}/g, ".")
    .replace(/[\x00-\x1f\x7f:<>"|?*]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100) || "sans-nom";
}
