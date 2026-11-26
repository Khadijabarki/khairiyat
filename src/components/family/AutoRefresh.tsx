"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Reloads the dashboard data every few seconds, so a new check-in or an emergency
// alert shows up without the family having to refresh the page.
export default function AutoRefresh({ seconds = 10 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh(); // skip while the tab is hidden
    }, seconds * 1000);
    return () => clearInterval(timer);
  }, [router, seconds]);
  return null;
}
