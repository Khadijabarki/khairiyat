import Icon from "./Icon";

// Shown while a page is being fetched: a heart inside a turning ring, on the page's own
// light background (or dark theme), so nothing flashes. full = no page frame exists yet.
export default function Loading({ full = false }: { full?: boolean }) {
  const circle = (
    <div role="status" className="flex flex-col items-center">
      <span className="relative flex size-16 items-center justify-center" aria-hidden>
        <span className="absolute inset-0 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-700 motion-reduce:animate-none" />
        <Icon name="heart" className="size-7 text-emerald-700" />
      </span>
      <span className="sr-only">Loading…</span>
    </div>
  );
  return full ? (
    <main className="ui-page flex items-center justify-center">{circle}</main>
  ) : (
    <div className="flex min-h-[70dvh] items-center justify-center">{circle}</div>
  );
}
