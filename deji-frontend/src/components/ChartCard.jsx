import { Card, CardContent } from "@/components/ui/card";

export default function ChartCard({ title, children }) {
  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <CardContent className="h-64">{children}</CardContent>
    </Card>
  );
}
