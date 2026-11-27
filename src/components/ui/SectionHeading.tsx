// The heading used by every card: an icon, a short title and an optional description.
import Icon, { type IconName } from "./Icon";

type Props = { icon: IconName; title: string; description?: string; action?: React.ReactNode };

export default function SectionHeading({ icon, title, description, action }: Props) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sage-soft text-emerald-700">
        <Icon name={icon} />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
        {description && <p className="text-sm text-stone-600">{description}</p>}
      </div>
      {action}
    </div>
  );
}
