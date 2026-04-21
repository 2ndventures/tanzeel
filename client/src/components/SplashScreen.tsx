import { useState, useEffect } from "react";
import { BrandOrnament } from "./BrandOrnament";

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
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${fadeOut ? "opacity-0" : "opacity-100"}`}
      data-testid="splash-screen"
    >
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        <BrandOrnament size={160} animated label="Tanzeel" />
        <h1 className="font-heading text-4xl font-semibold tracking-tight text-foreground">
          Tanzeel
        </h1>
      </div>
    </div>
  );
}
