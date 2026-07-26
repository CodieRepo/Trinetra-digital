"use client";

import { useEffect, useState } from "react";
import RestaurantDashboard from "../../../../trinetra-business-os/packages/verticals/restaurant-os/components/admin/RestaurantDashboard";

export default function RestaurantPanel() {
  const [restaurant, setRestaurant] = useState<{
    id: string;
    name: string;
    currency: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRestaurant() {
      try {
        // The dashboard itself will handle fetching data;
        // we just need a restaurant context
        setRestaurant({
          id: "default",
          name: "Default Restaurant",
          currency: "INR",
        });
      } finally {
        setLoading(false);
      }
    }
    loadRestaurant();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-stone-400">
        Loading Restaurant Module...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <RestaurantDashboard
        restaurantId={restaurant?.id || "default"}
        restaurantName={restaurant?.name || "Default Restaurant"}
        currency={restaurant?.currency || "INR"}
      />
    </div>
  );
}
