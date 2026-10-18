"use client";

import { useEffect, useRef, useState } from "react";
import { asset } from "@/app/lib/asset";

const VIDEO_A = asset("/videos/Clothing_moving_on_rail_system_202608301221.mp4");
const VIDEO_B = asset("/videos/1006-142621176.mp4");
const TRANSITION_MS = 2200;

export default function BackgroundVideoCycle() {
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const transitioning = useRef(false);
  const [active, setActive] = useState<"a" | "b">("a");
  const [transitionMs, setTransitionMs] = useState(TRANSITION_MS);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTransitionMs(reduceMotion ? 0 : TRANSITION_MS);
  }, []);

  useEffect(() => {
    const activeVideo = (active === "a" ? videoARef : videoBRef).current;
    const nextVideo = (active === "a" ? videoBRef : videoARef).current;
    if (!activeVideo || !nextVideo) return;

    function handleTimeUpdate() {
      if (transitioning.current) return;
      const remaining = activeVideo!.duration - activeVideo!.currentTime;
      const threshold = Math.max(transitionMs / 1000, 0.05);
      if (Number.isFinite(remaining) && remaining <= threshold) {
        transitioning.current = true;
        nextVideo!.currentTime = 0;
        nextVideo!.play().catch(() => {});
        setActive((prev) => (prev === "a" ? "b" : "a"));
        window.setTimeout(() => {
          transitioning.current = false;
        }, transitionMs || 50);
      }
    }

    activeVideo.addEventListener("timeupdate", handleTimeUpdate);
    return () => activeVideo.removeEventListener("timeupdate", handleTimeUpdate);
  }, [active, transitionMs]);

  const transition = `opacity ${transitionMs}ms cubic-bezier(0.45,0,0.15,1), transform ${transitionMs}ms cubic-bezier(0.45,0,0.15,1), filter ${transitionMs}ms cubic-bezier(0.45,0,0.15,1)`;

  return (
    <div className="absolute inset-0 h-full w-full overflow-hidden">
      <video
        ref={videoARef}
        src={VIDEO_A}
        autoPlay
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          opacity: active === "a" ? 1 : 0,
          transform: active === "a" ? "scale(1.02) rotate(0deg)" : "scale(1.14) rotate(-1.2deg)",
          filter: active === "a" ? "blur(0px)" : "blur(20px)",
          transition,
          zIndex: active === "a" ? 1 : 0,
        }}
      />
      <video
        ref={videoBRef}
        src={VIDEO_B}
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          opacity: active === "b" ? 1 : 0,
          transform: active === "b" ? "scale(1.02) rotate(0deg)" : "scale(1.14) rotate(1.2deg)",
          filter: active === "b" ? "blur(0px)" : "blur(20px)",
          transition,
          zIndex: active === "b" ? 1 : 0,
        }}
      />
    </div>
  );
}
