export function generateInsights({ revenue, expenses }) {
  const profit = revenue - expenses;

  if (profit > 0)
    return `🎉 Great performance! You're profitable with ₦${profit.toLocaleString()}. Keep up the momentum!`;
  if (profit < 0)
    return `⚠️ Warning: Your expenses exceed your revenue by ₦${Math.abs(profit).toLocaleString()}. Consider optimizing costs.`;
  return `📊 You broke even this period. Maintain focus on boosting sales and client retention.`;
}
