import RestaurantDashboard from "../../components/admin/RestaurantDashboard";
import RestaurantSetupPending from "../../components/admin/RestaurantSetupPending";
import {
  getErrorMessage,
  requireRestaurantClientContext,
} from "../../services/server";

export const dynamic = "force-dynamic";

async function loadRestaurantDashboardContext() {
  try {
    const context = await requireRestaurantClientContext();

    // Check provisioning safety: setup_status must be 'provisioned' AND at least 1 active table
    if (context.restaurant.setup_status !== "provisioned") {
      return { context, live: false, errorMessage: null as string | null };
    }

    const { count } = await getDatabaseClient()
      .from("restaurant_tables")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", context.restaurant.id)
      .eq("is_active", true);

    if (!count || count < 1) {
      return { context, live: false, errorMessage: null };
    }

    return { context, live: true, errorMessage: null };
  } catch (error: unknown) {
    return { context: null, live: false, errorMessage: getErrorMessage(error) };
  }
}

export default async function ClientRestaurantDashboardPage() {
  const { context, live, errorMessage } =
    await loadRestaurantDashboardContext();

  // Fully provisioned with tables → show real dashboard
  if (context && live) {
    return (
      <RestaurantDashboard
        restaurantId={context.restaurant.id}
        restaurantName={context.restaurant.name}
        currency={context.restaurant.currency || "INR"}
      />
    );
  }

  // Restaurant exists but not fully live → show polished pending screen
  if (context && !live) {
    return <RestaurantSetupPending restaurantName={context.restaurant.name} />;
  }

  // Auth error, feature disabled, or no restaurant record → error fallback
  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <div className="rounded-[28px] border border-amber-300/20 bg-stone-950 px-6 py-10 text-center text-stone-100 shadow-[0_24px_70px_rgba(0,0,0,0.25)]">
        <p className="text-xs uppercase tracking-[0.34em] text-amber-200/70">
          Restaurant Mode
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-white">
          Restaurant dashboard unavailable
        </h1>
        <p className="mt-3 text-sm text-stone-400">
          {errorMessage ||
            "This client is not provisioned for restaurant mode yet."}
        </p>
      </div>
    </div>
  );
}
