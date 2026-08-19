/**
 * Numérisation et assemblage PDF — **module utilisable côté navigateur**.
 *
 * ⚠️ Aucun import de base ici : ce fichier est chargé par le composant de scan,
 * qui est `"use client"`. C'est la règle établie au lot 13.1, après trois écrans
 * restés en HTTP 500 parce qu'un composant client entraînait Prisma → `pg` →
 * `dns` dans le bundle navigateur.
 *
 * ═══ POURQUOI UN ÉCRIVAIN PDF ÉCRIT À LA MAIN ═══
 *
 * Le cahier des charges demande de ne générer un PDF que si la conversion est
 * **réellement supportée**. Ajouter une bibliothèque PDF (~300 Ko de JavaScript)
 * pour empiler des JPEG sur des pages A4 serait cher pour un téléphone sur
 * données mobiles au Sénégal — et l'immense majorité de son code ne servirait
 * jamais. Un PDF d'images est un format simple : catalogue, pages, une image
 * par page en `DCTDecode` (le JPEG passe tel quel, **sans réencodage**), table
 * xref. C'est écrit ici, en une centaine de lignes, sans dépendance.
 *
 * ⚠️ **Le JPEG n'est jamais décodé ni réencodé** : ses octets sont copiés dans
 * le flux. C'est ce qui rend l'assemblage instantané sur un téléphone et évite
 * la perte de qualité d'une seconde compression.
 */

/** Point A4 à 72 dpi — l'unité native du PDF. */
export const A4 = { width: 595.28, height: 841.89 };

/**
 * Côté long maximal d'une page capturée, en pixels.
 *
 * 1600 px sur une feuille A4 ≈ 190 dpi : un extrait de naissance manuscrit reste
 * lisible, et la page pèse quelques centaines de kilooctets au lieu de plusieurs
 * mégaoctets. Monter à 3000 px n'ajoute rien de lisible et fait échouer l'envoi
 * sur une connexion faible.
 */
export const MAX_EDGE = 1600;

/** Nombre de pages au-delà duquel on refuse — garde-fou mémoire côté téléphone. */
export const MAX_PAGES = 20;

export type ScanPage = {
  /** Octets JPEG, tels quels. */
  bytes: Uint8Array;
  width: number;
  height: number;
};

/* ═══════════════════ écriture PDF ═══════════════════ */

const enc = new TextEncoder();
const bytes = (s: string) => enc.encode(s);

/**
 * Assemble des JPEG en un PDF d'une page par image.
 *
 * Chaque image est **contenue** dans une page A4 en conservant son rapport
 * d'aspect et centrée : déformer une pièce d'identité pour remplir la page la
 * rendrait suspecte à l'œil et illisible à la machine.
 */
export function pdfFromJpegs(pages: ScanPage[]): Uint8Array {
  if (pages.length === 0) throw new Error("Aucune page à assembler.");

  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;

  const push = (u: Uint8Array) => { chunks.push(u); length += u.length; };
  const obj = (n: number, body: string) => { offsets[n] = length; push(bytes(`${n} 0 obj\n${body}\nendobj\n`)); };

  push(bytes("%PDF-1.4\n"));
  // Un commentaire d'octets hauts : signale aux outils que le fichier est binaire.
  push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

  // 1 = catalogue, 2 = arbre des pages, puis 3 objets par page.
  const pageIds = pages.map((_, i) => 3 + i * 3);
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`);

  pages.forEach((p, i) => {
    const pageId = 3 + i * 3, imgId = pageId + 1, contentId = pageId + 2;

    // Contenir sans déformer : un seul facteur d'échelle pour les deux axes.
    const scale = Math.min(A4.width / p.width, A4.height / p.height);
    const w = p.width * scale, h = p.height * scale;
    const x = (A4.width - w) / 2, y = (A4.height - h) / 2;

    obj(pageId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.width.toFixed(2)} ${A4.height.toFixed(2)}] ` +
      `/Resources << /XObject << /Im0 ${imgId} 0 R >> >> /Contents ${contentId} 0 R >>`);

    // Image : le flux JPEG est recopié sans transformation (DCTDecode).
    offsets[imgId] = length;
    push(bytes(
      `${imgId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${p.width} /Height ${p.height} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.bytes.length} >>\nstream\n`));
    push(p.bytes);
    push(bytes("\nendstream\nendobj\n"));

    const content = `q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /Im0 Do Q\n`;
    obj(contentId, `<< /Length ${content.length} >>\nstream\n${content}endstream`);
  });

  // Table xref : chaque décalage doit être exact, sinon aucun lecteur n'ouvre
  // le fichier. C'est la seule partie réellement fragile de l'écriture.
  const count = 3 + pages.length * 3;
  const xrefAt = length;
  let xref = `xref\n0 ${count}\n0000000000 65535 f \n`;
  for (let n = 1; n < count; n++) {
    xref += `${String(offsets[n] ?? 0).padStart(10, "0")} 00000 n \n`;
  }
  push(bytes(xref));
  push(bytes(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`));

  const out = new Uint8Array(length);
  let at = 0;
  for (const c of chunks) { out.set(c, at); at += c.length; }
  return out;
}

/* ═══════════════════ lecture des dimensions JPEG ═══════════════════ */

/**
 * Largeur et hauteur d'un JPEG, lues dans ses marqueurs.
 *
 * ⚠️ Nécessaire côté serveur, où il n'y a ni `Image` ni `canvas` : le
 * vérificateur assemble de vrais PDF sans navigateur. Les marqueurs SOF0 à SOF15
 * portent la taille ; on saute les segments intermédiaires par leur longueur.
 */
export function jpegSize(buf: Uint8Array): { width: number; height: number } | null {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    // SOF0..SOF15, sauf DHT (c4), JPGA (c8) et DAC (cc) qui ne portent pas la taille.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: (buf[i + 5] << 8) | buf[i + 6], width: (buf[i + 7] << 8) | buf[i + 8] };
    }
    i += 2 + ((buf[i + 2] << 8) | buf[i + 3]);
  }
  return null;
}
