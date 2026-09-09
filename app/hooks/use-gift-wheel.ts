"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { rewardsConfig } from "../config/rewards";

export type GiftAward = {
  campaign: string;
  prizeId: string;
  reference: string | null;
  phone: string;
};
const storageKey = `clarea-gift:${rewardsConfig.campaignId}`;

function readAward(): GiftAward | null {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return null;
  const value = JSON.parse(raw);
  if (
    value?.campaign !== rewardsConfig.campaignId ||
    !rewardsConfig.prizes.some((p) => p.id === value.prizeId) ||
    (value.prizeId !== "try-again" && !/^CL-[A-F0-9]{12}$/.test(value.reference))
  )
    return null;
  return {
    campaign: value.campaign,
    prizeId: value.prizeId,
    reference: value.prizeId === "try-again" ? null : value.reference,
    phone: value.phone ?? "",
  };
}

export function useGiftWheel() {
  const [award, setAward] = useState<GiftAward | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [ready, setReady] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [rotation, setRotation] = useState(0);
  const [phone, setPhone] = useState("");
  const locked = useRef(false);
  const rotationRef = useRef(0);
  const retryAllowed = useRef(false);
  const finishSpin = useCallback(() => {
    setSpinning(false);
    if (retryAllowed.current) locked.current = false;
  }, []);
  // A user-triggered spin keeps its duration even when ambient motion is reduced.
  const duration = rewardsConfig.durationSeconds;

  useEffect(() => {
    function restore() {
      try {
        const saved = readAward();
        if (saved) {
          locked.current = saved.prizeId !== "try-again";
          retryAllowed.current = saved.prizeId === "try-again";
          setPhone(saved.phone);
          setAward(saved);
          const index = rewardsConfig.prizes.findIndex((p) => p.id === saved.prizeId);
          const step = 360 / rewardsConfig.prizes.length;
          const restingRotation = (360 - index * step) % 360;
          rotationRef.current = restingRotation;
          setRotation(restingRotation);
        }
      } catch {
        setStorageAvailable(false);
      }
      setReady(true);
    }
    restore();
    window.addEventListener("storage", restore);
    return () => {
      window.removeEventListener("storage", restore);
    };
  }, []);

  function spin() {
    if (!ready || locked.current || !phone.trim()) return;
    // Recheck other tabs immediately before issuing a local result.
    try {
      const saved = readAward();
      if (saved && saved.prizeId !== "try-again") {
        locked.current = true;
        setAward(saved);
        return;
      }
    } catch {
      setStorageAvailable(false);
    }
    locked.current = true;
    const random = crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
    const index = Math.floor(random * rewardsConfig.prizes.length);
    retryAllowed.current = rewardsConfig.prizes[index].id === "try-again";
    const newAward = {
      campaign: rewardsConfig.campaignId,
      prizeId: rewardsConfig.prizes[index].id,
      reference: retryAllowed.current
        ? null
        : `CL-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`,
      phone: phone.trim(),
    };
    // Save before animation so a refresh cannot produce a different result.
    try {
      localStorage.setItem(storageKey, JSON.stringify(newAward));
    } catch {
      setStorageAvailable(false);
    }
    setAward(newAward);
    setSpinning(true);
    const step = 360 / rewardsConfig.prizes.length;
    const landingRotation = (360 - index * step) % 360;
    const current = rotationRef.current;
    const normalizedCurrent = ((current % 360) + 360) % 360;
    const offset = (landingRotation - normalizedCurrent + 360) % 360;
    const fullSpins =
      2 + Math.floor((crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296) * 2);
    const nextRotation = current + fullSpins * 360 + offset;
    rotationRef.current = nextRotation;
    setRotation(nextRotation);
  }

  return {
    award,
    spinning,
    ready,
    rotation,
    duration,
    storageAvailable,
    spin,
    finishSpin,
    phone,
    setPhone,
  };
}
