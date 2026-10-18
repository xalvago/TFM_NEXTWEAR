"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/app/components/Header";
import { asset } from "@/app/lib/asset";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("authed") === "true") {
      setAuthed(true);
    } else {
      router.replace("/login");
    }
  }, [router]);

  if (!authed) {
    return null;
  }

  return (
    <div className="animate-page-in relative isolate flex min-h-screen flex-col lg:h-screen lg:overflow-y-auto">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <video
          className="h-full w-full scale-105 object-cover opacity-40 blur-[2px]"
          src={asset("/videos/1006-142621176.mp4")}
          autoPlay
          loop
          muted
          playsInline
        />
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-bg/55 via-neutral-bg/30 to-neutral-bg/70" />
      </div>
      <div className="shrink-0">
        <Header variant="dashboard" />
      </div>
      <main className="flex flex-1 flex-col p-4 sm:p-6 lg:min-h-0 lg:p-8">
        <div className="flex-1 lg:min-h-0">{children}</div>
      </main>
    </div>
  );
}
