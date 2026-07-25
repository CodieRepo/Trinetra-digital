import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isUuid } from "../types";
import {
  getAuthenticatedActorContext,
  getErrorMessage,
} from "../../services/server";
import { isFeatureEnabled } from "@trinetra/core/config";
import { logger } from "@trinetra/core/logging";

export const dynamic = "force-dynamic";

type ClientRecord = {
  id: string;
  restaurant_enabled: boolean;
};

export async function POST(request: Request) {
  try {
    logger.info("[restaurant.setup] request received");

    if (!isRestaurantFeatureEnabled()) {
      logger.warn("[restaurant.setup] feature flag disabled");
      return NextResponse.json(
        { error: "Restaurant features are not enabled" },
        { status: 403 },
      );
    }

    const actor = await getAuthenticatedActorContext();
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const address =
      typeof body?.address === "string" ? body.address.trim() : null;
    const requestedClientId =
      typeof body?.client_id === "string" ? body.client_id.trim() : "";

    logger.info(
      {
        actor_is_admin: actor.isAdmin,
        actor_has_client: !!actor.client,
        has_requested_client_id: !!requestedClientId,
      },
      "[restaurant.setup] parsed request context",
    );

    if (!name) {
      logger.warn("[restaurant.setup] rejected: missing restaurant name");
      return NextResponse.json(
        { error: "Restaurant name is required" },
        { status: 400 },
      );
    }

    let targetClient = actor.client;

    if (actor.isAdmin && requestedClientId) {
      if (!isUuid(requestedClientId)) {
        logger.warn("[restaurant.setup] rejected: invalid requested client_id");
        return NextResponse.json(
          { error: "Invalid client_id" },
          { status: 400 },
        );
      }

      const { data: adminTargetClient, error: targetClientError } =
        await actor.getDatabaseClient()
          .from("clients")
          .select("id, restaurant_enabled")
          .eq("id", requestedClientId)
          .maybeSingle<ClientRecord>();

      if (targetClientError) {
        throw new Error(targetClientError.message);
      }

      if (!adminTargetClient) {
        logger.warn(
          { client_id: requestedClientId },
          "[restaurant.setup] client not found",
        );
        return NextResponse.json(
          { error: "Client not found" },
          { status: 404 },
        );
      }

      targetClient = {
        id: adminTargetClient.id,
        client_name: null,
        client_type: null,
        restaurant_enabled: adminTargetClient.restaurant_enabled,
      };

      if (!adminTargetClient.restaurant_enabled) {
        logger.info(
          { client_id: adminTargetClient.id },
          "[restaurant.setup] enabling restaurant mode for client",
        );
        const { error: updateClientError } = await actor.getDatabaseClient()
          .from("clients")
          .update({ restaurant_enabled: true })
          .eq("id", adminTargetClient.id);

        if (updateClientError) {
          throw new Error(updateClientError.message);
        }

        targetClient.restaurant_enabled = true;
      }
    }

    if (!targetClient) {
      logger.warn("[restaurant.setup] client profile missing for actor");
      return NextResponse.json(
        { error: "Client profile not found" },
        { status: 404 },
      );
    }

    if (!actor.isAdmin && !targetClient.restaurant_enabled) {
      logger.warn(
        { client_id: targetClient.id },
        "[restaurant.setup] rejected: restaurant mode disabled",
      );
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: existingRestaurant, error: existingRestaurantError } =
      await actor.getDatabaseClient()
        .from("restaurants")
        .select("id")
        .eq("client_id", targetClient.id)
        .maybeSingle<{ id: string }>();

    if (existingRestaurantError) {
      throw new Error(existingRestaurantError.message);
    }

    if (existingRestaurant) {
      logger.info(
        { client_id: targetClient.id, restaurant_id: existingRestaurant.id },
        "[restaurant.setup] updating existing restaurant profile",
      );
      const { data: updatedRestaurant, error: updateRestaurantError } =
        await actor.getDatabaseClient()
          .from("restaurants")
          .update({ name, address })
          .eq("id", existingRestaurant.id)
          .select("id")
          .single<{ id: string }>();

      if (updateRestaurantError || !updatedRestaurant) {
        throw new Error(
          updateRestaurantError?.message || "Failed to update restaurant",
        );
      }

      revalidatePath(`/admin/clients/${targetClient.id}`);
      revalidatePath("/client");
      revalidatePath("/client/dashboard");
      revalidatePath("/client/dashboard/restaurant");

      return NextResponse.json({
        restaurant_id: updatedRestaurant.id,
        updated: true,
      });
    }

    logger.info(
      { client_id: targetClient.id },
      "[restaurant.setup] creating new restaurant profile",
    );

    const { data: restaurant, error: restaurantError } =
      await actor.getDatabaseClient()
        .from("restaurants")
        .insert({
          client_id: targetClient.id,
          name,
          address,
        })
        .select("id")
        .single<{ id: string }>();

    if (restaurantError || !restaurant) {
      throw new Error(
        restaurantError?.message || "Failed to provision restaurant",
      );
    }

    revalidatePath(`/admin/clients/${targetClient.id}`);
    revalidatePath("/client");
    revalidatePath("/client/dashboard");
    revalidatePath("/client/dashboard/restaurant");

    return NextResponse.json({ restaurant_id: restaurant.id });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    logger.error({ error: message }, "[restaurant.setup] failed");
    const status = message.includes("Unauthorized")
      ? 401
      : message.includes("Forbidden")
        ? 403
        : message.includes("not found")
          ? 404
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
