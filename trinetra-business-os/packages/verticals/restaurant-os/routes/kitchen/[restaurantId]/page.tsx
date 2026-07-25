import StaffOrdersPanel from "../../components/staff/StaffOrdersPanel";

export const dynamic = "force-dynamic";

export default async function KitchenPage({
  params,
}: {
  params: Promise<{ restaurant_id: string }>;
}) {
  const { restaurant_id: restaurantId } = await params;
  return <StaffOrdersPanel restaurantId={restaurantId} role="kitchen" />;
}
