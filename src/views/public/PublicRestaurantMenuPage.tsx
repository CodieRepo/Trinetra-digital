import { useParams } from "react-router-dom";
import PublicMenu from "../../../trinetra-business-os/packages/verticals/restaurant-os/components/public/PublicMenu";

export default function PublicRestaurantMenuPage() {
  const { tableToken } = useParams<{ tableToken: string }>();

  return (
    <div className="min-h-screen bg-[#FAF2EE] text-[#2A1622] font-sans antialiased">
      <main>
        <PublicMenu tableToken={tableToken || ""} />
      </main>
    </div>
  );
}
