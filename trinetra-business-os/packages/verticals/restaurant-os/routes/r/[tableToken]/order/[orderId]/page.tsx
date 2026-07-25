import RestaurantOrderStatusClient from "../../components/public/OrderStatus";

export const dynamic = "force-dynamic";

export default async function RestaurantOrderPage({
  params,
}: {
  params: Promise<{ table_token: string; order_id: string }>;
}) {
  const { table_token: tableToken, order_id: orderId } = await params;
  return <RestaurantOrderStatusClient tableToken={tableToken} orderId={orderId} />;
}
