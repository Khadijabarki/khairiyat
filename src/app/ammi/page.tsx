import { redirect } from "next/navigation";

// Old link from the first version. Ammi's screen now lives at /talk/ammi.
export default function AmmiPage() {
  redirect("/talk/ammi");
}
