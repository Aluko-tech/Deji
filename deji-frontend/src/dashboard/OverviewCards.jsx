export default function OverviewCards() {
  const stats = [
    { name: 'Revenue (30 days)', value: '₦2,400,000', change: '+12%' },
    { name: 'Total Customers', value: '412', change: '+5%' },
    { name: 'Invoices', value: '136', change: '+3%' },
    { name: 'Payments Received', value: '₦1,950,000', change: '+9%' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(({ name, value, change }) => (
        <div
          key={name}
          className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow hover:shadow-md transition"
        >
          <h4 className="text-sm text-gray-500 dark:text-gray-400">{name}</h4>
          <p className="text-2xl font-semibold text-gray-800 dark:text-gray-100">{value}</p>
          <span className="text-green-500 text-sm">{change}</span>
        </div>
      ))}
    </div>
  );
}
