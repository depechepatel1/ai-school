import { useState } from "react";

export function useXP(initialXP = 1250, initialLevel = 3) {
  const [xp, setXp] = useState(initialXP);
  const [level, setLevel] = useState(initialLevel);

  const addXP = (amount: number) => {
    setXp((p) => {
      const next = p + amount;
      if (Math.floor(next / 500) > Math.floor(p / 500)) setLevel((l) => l + 1);
      return next;
    });
  };

  return { xp, level, addXP };
}
