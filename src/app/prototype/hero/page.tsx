import NavPrototype from "./NavPrototype";
import HeroPhoto from "./HeroPhoto";

/**
 * Page du prototype — `/prototype/hero`.
 *
 * Elle ne contient QUE la barre et le hero. Pas de sections suivantes, pas de
 * pied de page : on juge un hero, et tout ce qu'on ajouterait en dessous
 * changerait la façon dont on le juge.
 */
export default function PagePrototypeHero() {
  return (
    <>
      <NavPrototype />
      <main>
        <HeroPhoto />
      </main>
    </>
  );
}
