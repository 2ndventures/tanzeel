import { useState, useEffect } from "react";
import tanzeel from "@assets/Tanzeel_White_1776178805122.png";

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
      className={`absolute inset-0 z-[100] flex flex-col items-center justify-center transition-opacity duration-500 ${fadeOut ? "opacity-0" : "opacity-100"}`}
      style={{ background: 'linear-gradient(to bottom, hsl(224, 28%, 16%), hsl(217, 44%, 11%))' }}
      role="img"
      aria-label="Tanzeel"
    >
      {/* Decorative circles */}
      <svg
        className="absolute inset-0 w-full h-full opacity-25"
        viewBox="0 0 400 800"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="320" cy="100" r="180" stroke="hsl(44, 92%, 53%)" strokeWidth="1" />
        <circle cx="80" cy="700" r="140" stroke="hsl(44, 92%, 53%)" strokeWidth="1" />
        <circle cx="350" cy="600" r="80" stroke="hsl(44, 92%, 53%)" strokeWidth="0.5" />
        <circle cx="60" cy="200" r="60" stroke="hsl(44, 92%, 53%)" strokeWidth="0.5" />
      </svg>

      {/* Brand logo — white PNG used as a mask, filled with brand gold */}
      <div
        className="relative"
        style={{
          width: '78%',
          maxWidth: '300px',
          aspectRatio: '300 / 120',
          backgroundColor: 'hsl(44, 92%, 53%)',
          WebkitMaskImage: `url(${tanzeel})`,
          maskImage: `url(${tanzeel})`,
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
        }}
      />

      {/* Bottom pill */}
      <div className="absolute bottom-10 w-32 h-1.5 rounded-full bg-[hsl(44,92%,53%)]/50" />
    </div>
  );
}
