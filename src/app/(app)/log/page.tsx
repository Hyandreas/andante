import { LogList } from "@/components/log/log-list";
import { getLogPageData } from "@/lib/app-data";

export default async function LogPage() {
  const data = await getLogPageData();

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <LogList groups={data.groups} weekTotal={data.weekTotal} monthTotal={data.monthTotal} />
    </div>
  );
}
