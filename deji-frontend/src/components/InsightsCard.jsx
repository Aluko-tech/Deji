// src/components/InsightsCard.jsx
import { Card, CardContent } from "@/components/ui/card";

export default function InsightsCard({ insight }) {
  return (
    <Card className="hover:shadow-md transition">
      <CardContent>
        <h3 className="text-lg font-semibold">{insight.title}</h3>
        <p className="text-sm text-gray-600">{insight.description}</p>
      </CardContent>
    </Card>
  );
}
