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
    (value.prizeId !== "try-again" && !/^CL(?:-[A-F0-9]{12}|2-[A-F0-9]{24})$/.test(value.reference))
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
  const pendingId = useRef<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState("");
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

  async function spin() {
    if (!ready || locked.current || !phone.trim()) return;
    locked.current = true;
    setRequesting(true);
    setError("");
    pendingId.current ??= crypto.randomUUID();
    try {
      const response = await fetch("/api/rewards/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, requestId: pendingId.current }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "تعذر إصدار الهدية. حاولي مرة أخرى / Please retry");
      const newAward = data as GiftAward;
      const index = rewardsConfig.prizes.findIndex((p) => p.id === newAward.prizeId);
      if (index < 0) throw new Error("تعذر تأكيد النتيجة / Invalid result");
      pendingId.current = null;
      retryAllowed.current = newAward.prizeId === "try-again";
      try {
        localStorage.setItem(storageKey, JSON.stringify(newAward));
      } catch {
        setStorageAvailable(false);
      }
      setAward(newAward);
      setSpinning(true);
      const step = 360 / rewardsConfig.prizes.length;
      const landing = (360 - index * step) % 360;
      const current = rotationRef.current;
      const offset = (landing - (((current % 360) + 360) % 360) + 360) % 360;
      const next = current + 3 * 360 + offset;
      rotationRef.current = next;
      setRotation(next);
    } catch (e) {
      locked.current = false;
      setError((e as Error).message);
    } finally {
      setRequesting(false);
    }
  }

  return {
    award,
    spinning,
    requesting,
    error,
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
