"use client";

import { useState } from "react";
import WheelOfFortune, { type WheelSegment } from "./WheelOfFortune";

const CLAREA_SEGMENTS: WheelSegment[] = [
  { id: "save-10", label: "10% OFF" },
  { id: "gift", label: "Free Gift" },
  { id: "save-5", label: "5% OFF" },
  { id: "again", label: "Try Again" },
  { id: "shipping", label: "Free Shipping" },
  { id: "save-5-extra", label: "5% OFF" },
];

export default function WheelExample() {
  const [message, setMessage] = useState("Spin the Claréa wheel to reveal your gift.");

  return (
    <section className="mx-auto max-w-xl bg-[#FDF8F4] px-4 py-12 text-center">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0px] text-[#C9A05C]">
        Claréa Rewards
      </p>
      <h2 className="mb-6 font-serif text-3xl text-[#5C1A2B]">Spin to win</h2>

      <WheelOfFortune
        segments={CLAREA_SEGMENTS}
        soundEnabled
        spinLabel="Spin"
        spinningLabel="Spinning..."
        onSpinEnd={(prize) => {
          setMessage(prize === "Try Again" ? "Try again next time." : `You won ${prize}.`);
        }}
      />

      <p className="mt-6 text-sm text-stone-600" aria-live="polite">
        {message}
      </p>
    </section>
  );
}

