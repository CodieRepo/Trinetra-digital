import { useParams } from "react-router-dom";
import OrderStatus from "../../../trinetra-business-os/packages/verticals/restaurant-os/components/public/OrderStatus";

export default function OrderStatusPage() {
  const { tableToken, orderId } = useParams<{ tableToken: string; orderId: string }>();

  return (
    <div className="min-h-screen bg-[#faf8f5] text-stone-900 font-sans antialiased">
      <main>
        <OrderStatus tableToken={tableToken || ""} orderId={orderId || ""} />
      </main>
    </div>
  );
}
