"use client";

import { UtensilsCrossed, Clock } from "lucide-react";

interface RestaurantSetupPendingProps {
  restaurantName?: string | null;
}

export default function RestaurantSetupPending({
  restaurantName,
}: RestaurantSetupPendingProps) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <div className="rounded-[28px] border border-amber-300/20 bg-stone-950 px-8 py-14 text-center text-stone-100 shadow-[0_24px_70px_rgba(0,0,0,0.25)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10">
          <UtensilsCrossed className="h-8 w-8 text-amber-400" />
        </div>

        <p className="mt-6 text-xs uppercase tracking-[0.34em] text-amber-200/70">
          Restaurant Mode
        </p>

        {restaurantName && (
          <p className="mt-2 text-lg font-medium text-white">
            {restaurantName}
          </p>
        )}

        <h1 className="mt-4 text-3xl font-semibold text-white">
          Setup in Progress
        </h1>

        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-stone-400">
          The Akuafi team is configuring your restaurant. Tables, QR codes, and
          your full dashboard will be ready once setup is complete.
        </p>

        <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-300">
          <Clock className="h-3.5 w-3.5" />
          Provisioning in progress
        </div>
      </div>
    </div>
  );
}
