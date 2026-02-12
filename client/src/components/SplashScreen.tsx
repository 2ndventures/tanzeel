import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFadeOut(true), 1800);
    const finishTimer = setTimeout(() => onFinish(), 2300);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-b from-primary to-secondary transition-opacity duration-500 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Decorative circles */}
      <svg
        className="absolute inset-0 w-full h-full opacity-20"
        viewBox="0 0 400 800"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="320" cy="100" r="180" stroke="white" strokeWidth="1" />
        <circle cx="80" cy="700" r="140" stroke="white" strokeWidth="1" />
        <circle cx="350" cy="600" r="80" stroke="white" strokeWidth="0.5" />
        <circle cx="60" cy="200" r="60" stroke="white" strokeWidth="0.5" />
      </svg>

      {/* Content */}
      <div className="relative flex flex-col items-center gap-6">
        <Icon icon="solar:moon-stars-bold" className="size-40 text-white" />
        <h1 className="text-7xl font-black tracking-tighter text-white">
          Simple Quran
        </h1>
      </div>

      {/* Bottom pill */}
      <div className="absolute bottom-10 w-32 h-1.5 rounded-full bg-white/40" />
    </div>
  );
}
