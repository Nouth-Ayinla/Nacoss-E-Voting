"use client";

import { useEffect, useState } from "react";

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

export default function CountdownTimer({ targetDate, onComplete }: { targetDate: string; onComplete?: () => void }) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

  useEffect(() => {
    const target = new Date(targetDate).getTime();

    function update() {
      const now = Date.now();
      const difference = target - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        if (onComplete) onComplete();
        return false;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
      return true;
    }

    const active = update();
    if (!active) return;

    const interval = setInterval(() => {
      const active = update();
      if (!active) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate, onComplete]);

  if (!timeLeft) return null;

  return (
    <div className="flex gap-4 items-center justify-center p-6 bg-white border border-outline-variant rounded-2xl shadow-sm max-w-md mx-auto animate-slide-in">
      <div className="flex flex-col items-center">
        <span className="text-display-sm font-extrabold text-primary font-technical-code">{timeLeft.days.toString().padStart(2, "0")}</span>
        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Days</span>
      </div>
      <span className="text-display-sm font-extrabold text-outline-variant">:</span>
      <div className="flex flex-col items-center">
        <span className="text-display-sm font-extrabold text-primary font-technical-code">{timeLeft.hours.toString().padStart(2, "0")}</span>
        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Hours</span>
      </div>
      <span className="text-display-sm font-extrabold text-outline-variant">:</span>
      <div className="flex flex-col items-center">
        <span className="text-display-sm font-extrabold text-primary font-technical-code">{timeLeft.minutes.toString().padStart(2, "0")}</span>
        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Mins</span>
      </div>
      <span className="text-display-sm font-extrabold text-outline-variant">:</span>
      <div className="flex flex-col items-center">
        <span className="text-display-sm font-extrabold text-primary font-technical-code text-rose-500">{timeLeft.seconds.toString().padStart(2, "0")}</span>
        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Secs</span>
      </div>
    </div>
  );
}
