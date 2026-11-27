// The friendly panel beside a form on wide screens.
import FamilyIllustration from "./FamilyIllustration";

export default function SidePanel({ title, points }: { title: string; points: string[] }) {
  return (
    <aside className="ui-card hidden self-start overflow-hidden p-6 text-center lg:sticky lg:top-24 lg:block print:hidden">
      <FamilyIllustration />
      <h2 className="mt-4 text-xl font-semibold text-stone-900">{title}</h2>
      <ul className="mt-3 space-y-2 text-sm text-stone-600">
        {points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </aside>
  );
}
