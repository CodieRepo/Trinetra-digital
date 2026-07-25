import { getDatabaseClient } from "@trinetra/core/database";
import { getDatabaseClient } from "@trinetra/core/database";
import { isFeatureEnabled } from "@trinetra/core/config";
import { logger } from "@trinetra/core/logging";

type ClientRecord = {
  id: string;
  client_name: string | null;
  client_type: string | null;
  restaurant_enabled: boolean;
};

type RestaurantRecord = {
  id: string;
  client_id: string;
  name: string;
  address: string | null;
  currency: string | null;
  is_active: boolean;
  setup_status: "pending" | "provisioned";
};

export type RestaurantClientContext = {
  user: { id: string };
  client: ClientRecord;
  restaurant: RestaurantRecord;
  getDatabaseClient(): ReturnType<typeof getSupabaseAdmin>;
};

export type AuthenticatedActorContext = {
  user: { id: string };
  isAdmin: boolean;
  client: ClientRecord | null;
  getDatabaseClient(): ReturnType<typeof getSupabaseAdmin>;
};

export async function getAuthenticatedActorContext(): Promise<AuthenticatedActorContext> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Unauthorized");
  }

  const getDatabaseClient() = getSupabaseAdmin();
  const [{ data: adminRecord }, { data: client, error: clientError }] =
    await Promise.all([
      getDatabaseClient()
        .from("admins")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle(),
      getDatabaseClient()
        .from("clients")
        .select("id, client_name, client_type, restaurant_enabled")
        .eq("user_id", user.id)
        .maybeSingle<ClientRecord>(),
    ]);

  if (clientError) {
    throw new Error(clientError.message);
  }

  return {
    user: { id: user.id },
    isAdmin: !!adminRecord,
    client: client ?? null,
    getDatabaseClient(),
  };
}

export async function requireRestaurantClientContext(): Promise<RestaurantClientContext> {
  if (!isRestaurantFeatureEnabled()) {
    logger.warn("[restaurant.context] feature flag disabled");
    throw new Error("Forbidden");
  }

  const actor = await getAuthenticatedActorContext();

  if (!actor.client) {
    logger.warn("[restaurant.context] missing client profile for actor");
    throw new Error("Client profile not found");
  }

  if (!actor.client.restaurant_enabled) {
    logger.warn(
      { client_id: actor.client.id },
      "[restaurant.context] restaurant mode disabled",
    );
    throw new Error("Forbidden");
  }

  const { data: restaurant, error: restaurantError } = await actor.getDatabaseClient()
    .from("restaurants")
    .select("id, client_id, name, address, currency, is_active, setup_status")
    .eq("client_id", actor.client.id)
    .maybeSingle<RestaurantRecord>();

  if (restaurantError) {
    logger.error(
      { error: restaurantError.message, client_id: actor.client.id },
      "[restaurant.context] restaurant query failed",
    );
    throw new Error(restaurantError.message);
  }

  if (!restaurant) {
    logger.warn(
      { client_id: actor.client.id },
      "[restaurant.context] restaurant not configured",
    );
    throw new Error("Restaurant not configured");
  }

  logger.info(
    {
      client_id: actor.client.id,
      restaurant_id: restaurant.id,
      setup_status: restaurant.setup_status,
      is_active: restaurant.is_active,
    },
    "[restaurant.context] resolved",
  );

  return {
    user: actor.user,
    client: actor.client,
    restaurant,
    getDatabaseClient(): actor.getDatabaseClient(),
  };
}

/** Restaurant readiness state for client nav / dashboard gating. */
export type RestaurantNavState = "hidden" | "pending" | "live";

/**
 * Lightweight check for the client layout to determine restaurant nav visibility.
 * Does NOT throw — returns a safe state instead.
 *
 * hidden    → no restaurant nav shown (feature off, no record, orphaned flag)
 * pending   → nav shown, but setup-in-progress screen
 * live      → nav shown, full dashboard (setup_status=provisioned AND ≥1 table)
 */
export async function getRestaurantNavState(
  userId: string,
): Promise<{ state: RestaurantNavState; restaurantName: string | null }> {
  if (!isRestaurantFeatureEnabled()) {
    logger.info(
      { user_id: userId },
      "[restaurant.nav] hidden: feature flag disabled",
    );
    return { state: "hidden", restaurantName: null };
  }

  const getDatabaseClient() = getSupabaseAdmin();

  const { data: client } = await getDatabaseClient()
    .from("clients")
    .select("id, restaurant_enabled")
    .eq("user_id", userId)
    .maybeSingle();

  if (!client || !client.restaurant_enabled) {
    logger.info(
      { user_id: userId, has_client: !!client },
      "[restaurant.nav] hidden: client missing or mode disabled",
    );
    return { state: "hidden", restaurantName: null };
  }

  const { data: restaurant } = await getDatabaseClient()
    .from("restaurants")
    .select("id, name, setup_status")
    .eq("client_id", client.id)
    .maybeSingle();

  if (!restaurant) {
    // Orphaned flag — restaurant_enabled but no record. Hide nav.
    logger.warn(
      { user_id: userId, client_id: client.id },
      "[restaurant.nav] hidden: orphaned restaurant flag",
    );
    return { state: "hidden", restaurantName: null };
  }

  if (restaurant.setup_status !== "provisioned") {
    logger.info(
      {
        user_id: userId,
        client_id: client.id,
        restaurant_id: restaurant.id,
        setup_status: restaurant.setup_status,
      },
      "[restaurant.nav] pending: setup not provisioned",
    );
    return { state: "pending", restaurantName: restaurant.name };
  }

  // Provisioned — verify at least one active table exists
  const { count } = await getDatabaseClient()
    .from("restaurant_tables")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurant.id)
    .eq("is_active", true);

  if (!count || count < 1) {
    logger.info(
      {
        user_id: userId,
        client_id: client.id,
        restaurant_id: restaurant.id,
        active_table_count: count ?? 0,
      },
      "[restaurant.nav] pending: no active tables",
    );
    return { state: "pending", restaurantName: restaurant.name };
  }

  logger.info(
    {
      user_id: userId,
      client_id: client.id,
      restaurant_id: restaurant.id,
      active_table_count: count,
    },
    "[restaurant.nav] live",
  );

  return { state: "live", restaurantName: restaurant.name };
}

export function getApiErrorStatus(message: string) {
  if (message.includes("Unauthorized")) {
    return 401;
  }

  if (message.includes("Forbidden")) {
    return 403;
  }

  if (message.includes("not found") || message.includes("not configured")) {
    return 404;
  }

  return 500;
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Internal Server Error";
}
