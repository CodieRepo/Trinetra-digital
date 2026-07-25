import PublicRestaurantMenu from "../../components/public/PublicMenu";

export default async function PublicTableMenuPage({
  params,
}: {
  params: Promise<{ table_token: string }>;
}) {
  const { table_token: tableToken } = await params;
  return <PublicRestaurantMenu tableToken={tableToken} />;
}
