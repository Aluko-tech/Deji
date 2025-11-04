// services/insightService.js
export function generateInsights(data) {
  const { revenue, expenses } = data;
  const profit = revenue - expenses;

  if (profit > 0)
    return `Great job! You're profitable this period with ₦${profit.toLocaleString()}.`;
  if (profit < 0)
    return `Warning: Your expenses exceed revenue by ₦${Math.abs(profit).toLocaleString()}. Consider reducing overhead.`;
  return `You broke even this period — maintain focus on growth opportunities.`;
}
