"use client";

import { useRewardEngine, RewardToast } from "@/store/rewardEngine";

function Toast({ toast, onDismiss }: { toast: RewardToast; onDismiss: () => void }) {
  const parts = [
    toast.coins ? `🪙 +${toast.coins}` : null,
    toast.xp    ? `⚡ +${toast.xp} XP` : null,
    toast.buildingId ? `🏗 ${toast.buildingId} unlocked!` : null,
    toast.message && !toast.coins && !toast.xp && !toast.buildingId ? toast.message : null,
  ].filter(Boolean);

  const isSpecial = !!toast.buildingId || (toast.message?.includes("!") && !toast.coins);

  return (
    <div
      onClick={onDismiss}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-2xl cursor-pointer select-none reward-toast ${
        isSpecial
          ? "bg-gradient-to-r from-yellow-400 to-orange-400 text-yellow-900"
          : "bg-white/15 backdrop-blur-md border border-white/15 text-white"
      }`}
    >
      {parts.map((part, i) => (
        <span key={i} className="text-sm font-bold whitespace-nowrap">{part}</span>
      ))}
    </div>
  );
}

export default function RewardToastStack() {
  const { toasts, dismissToast } = useRewardEngine();

  return (
    <div className="fixed top-14 right-3 z-50 flex flex-col gap-2 items-end pointer-events-none max-w-[220px]">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast toast={toast} onDismiss={() => dismissToast(toast.id)} />
        </div>
      ))}
    </div>
  );
}
