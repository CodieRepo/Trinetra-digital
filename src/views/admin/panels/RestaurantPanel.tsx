import RestaurantDashboard from "../../../../trinetra-business-os/packages/verticals/restaurant-os/components/admin/RestaurantDashboard";

export default function RestaurantPanel() {
  return (
    <div className="space-y-6">
      <RestaurantDashboard
        restaurantId="default-restaurant-uuid"
        restaurantName="Default Restaurant"
        currency="INR"
      />
    </div>
  );
}
