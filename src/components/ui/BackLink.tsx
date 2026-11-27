// "Back" with an arrow, at the top of inner screens. The arrow points the other way in Urdu.
import Link from "next/link";
import Icon from "./Icon";

export default function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="ui-btn ui-btn-secondary mb-3 w-fit !min-h-10 !px-4 print:hidden">
      <Icon name="back" className="size-4 rtl:rotate-180" />
      {label}
    </Link>
  );
}
