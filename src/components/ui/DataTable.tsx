"use client";

import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";

/**
 * Tableau de données du socle EduCom.
 *
 * ═══ POURQUOI UNE API COMPOSITIONNELLE, PAS UNE CONFIGURATION DE COLONNES ═══
 *
 * Un `DataTable` piloté par un tableau de `columns` serait plus élégant sur du
 * code neuf, mais il obligerait à **réécrire le rendu de chaque ligne** des 9
 * tableaux existants — leurs cellules contiennent des pastilles d'état, des
 * avatars, des menus contextuels, des liens conditionnels. Ce serait refondre
 * les écrans opérationnels, pas poser une structure.
 *
 * L'API ci-dessous se substitue balise pour balise à `<table>`/`<thead>`/`<tr>`/
 * `<th>`/`<td>`. La migration devient mécanique et la logique métier n'est pas
 * touchée.
 *
 * ═══ CE QUE LA PRIMITIVE ENCAPSULE ═══
 *
 * - **`overflow-x` sur son propre conteneur.** Aucun tableau ne doit faire
 *   défiler la page entière latéralement ; seul le tableau défile.
 * - **`tabular-nums` par défaut** sur les cellules numériques : montants,
 *   moyennes et effectifs s'alignent en colonne.
 * - **En-têtes cliquables optionnels.** `sortable` rend un vrai `<button>` dans
 *   le `<th>`, avec `aria-sort` sur la colonne active.
 *
 * ⚠️ Aucun écran ne trie aujourd'hui. La capacité est fournie mais **branchée
 * nulle part** : activer le tri serait ajouter une fonctionnalité, ce que ce
 * lot ne fait pas.
 */

export type SortDirection = "asc" | "desc";

/* ─────────────────────────────── conteneur ─────────────────────────────── */

export function DataTable({
  children,
  className = "",
  caption,
}: {
  children: ReactNode;
  className?: string;
  /** Résumé du tableau pour les lecteurs d'écran. Visuellement masqué. */
  caption?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className={`min-w-full border-collapse text-role-body ${className}`}>
        {caption && <caption className="sr-only">{caption}</caption>}
        {children}
      </table>
    </div>
  );
}

/* ──────────────────────────────── en-tête ──────────────────────────────── */

function Head({ children }: { children: ReactNode }) {
  return <thead className="border-b border-rule">{children}</thead>;
}

type HeadCellProps = Omit<ThHTMLAttributes<HTMLTableCellElement>, "className" | "onClick"> & {
  children: ReactNode;
  /** Aligne le contenu à droite — pour les colonnes de montants. */
  numeric?: boolean;
  /** Rend un bouton de tri dans l'en-tête. */
  sortable?: boolean;
  /** Direction active pour cette colonne, ou `null` si elle n'est pas triée. */
  sortDirection?: SortDirection | null;
  onSort?: () => void;
  className?: string;
};

function HeadCell({
  children,
  numeric = false,
  sortable = false,
  sortDirection = null,
  onSort,
  className = "",
  ...rest
}: HeadCellProps) {
  const base = [
    "px-4 py-3 text-role-meta font-semibold uppercase tracking-wide text-text-faint",
    numeric ? "text-right" : "text-left",
    "whitespace-nowrap",
    className,
  ].join(" ");

  // `aria-sort` doit porter sur la cellule d'en-tête, pas sur le bouton.
  const ariaSort = sortable
    ? sortDirection === "asc"
      ? "ascending"
      : sortDirection === "desc"
        ? "descending"
        : "none"
    : undefined;

  const Icon =
    sortDirection === "asc" ? ChevronUp : sortDirection === "desc" ? ChevronDown : ChevronsUpDown;

  return (
    <th scope="col" aria-sort={ariaSort} className={base} {...rest}>
      {sortable ? (
        <button
          type="button"
          onClick={onSort}
          className={`inline-flex items-center gap-1 hover:text-text-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-control ${numeric ? "flex-row-reverse" : ""}`}
        >
          {children}
          <Icon aria-hidden="true" className="h-3 w-3 shrink-0" />
        </button>
      ) : (
        children
      )}
    </th>
  );
}

/* ───────────────────────────────── corps ───────────────────────────────── */

function Body({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <tbody className={`divide-y divide-rule ${className}`}>{children}</tbody>;
}

function Row({
  children,
  className = "",
  ...rest
}: React.HTMLAttributes<HTMLTableRowElement> & { children: ReactNode }) {
  return (
    <tr className={`hover:bg-sunk/60 transition-colors ${className}`} {...rest}>
      {children}
    </tr>
  );
}

type CellProps = Omit<TdHTMLAttributes<HTMLTableCellElement>, "className"> & {
  children?: ReactNode;
  /** Aligne à droite et applique `tabular-nums`. */
  numeric?: boolean;
  className?: string;
};

function Cell({ children, numeric = false, className = "", ...rest }: CellProps) {
  return (
    <td
      className={[
        "px-4 py-3 align-middle text-text",
        numeric ? "text-right tabular-nums" : "",
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </td>
  );
}

/** Ligne occupant toute la largeur — pour un état vide à l'intérieur du tableau. */
function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-role-body text-text-soft">
        {children}
      </td>
    </tr>
  );
}

/** Pied de tableau : pagination, totaux. Hors du `<table>` pour rester simple. */
function Footer({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 border-t border-rule px-4 py-3 text-role-meta text-text-soft ${className}`}>
      {children}
    </div>
  );
}

/**
 * ⚠️ FRONTIÈRE RSC — À LIRE AVANT D'UTILISER CE COMPOSANT.
 *
 * Ce module est `"use client"`. Les propriétés statiques attachées ci-dessous
 * (`DataTable.Head`, `DataTable.Cell`…) **ne traversent pas la frontière
 * serveur/client** : depuis un composant serveur, l'import ne fournit qu'une
 * référence client, sans ses propriétés. `DataTable.Head` vaut alors `undefined`
 * et React lève « Element type is invalid: … but got: undefined ».
 *
 * La notation pointée reste donc valable **uniquement depuis un composant
 * client**. Depuis un composant serveur, utiliser les exports nommés déclarés
 * juste après — un export nommé d'un module client est, lui, correctement
 * transformé en référence client.
 *
 *   // composant client
 *   <DataTable><DataTable.Head>…</DataTable.Head></DataTable>
 *
 *   // composant serveur
 *   import { DataTable, TableHead, TableCell } from "@/components/ui/DataTable";
 *   <DataTable><TableHead>…</TableHead></DataTable>
 *
 * Les statiques sont conservées pour les écrans clients déjà migrés (Élèves,
 * Paiements) : les retirer casserait 55 sites sans bénéfice.
 */
DataTable.Head = Head;
DataTable.HeadCell = HeadCell;
DataTable.Body = Body;
DataTable.Row = Row;
DataTable.Cell = Cell;
DataTable.EmptyRow = EmptyRow;
DataTable.Footer = Footer;

/** Exports nommés — seule forme utilisable depuis un composant serveur. */
export {
  Head as TableHead,
  HeadCell as TableHeadCell,
  Body as TableBody,
  Row as TableRow,
  Cell as TableCell,
  EmptyRow as TableEmptyRow,
  Footer as TableFooter,
};

export default DataTable;
