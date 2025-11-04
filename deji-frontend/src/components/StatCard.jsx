export default function StatCard({ title, value, icon: Icon, color = "bg-blue-600" }) {
  return (
    <div className={`p-4 rounded-2xl shadow-md text-white ${color} flex items-center justify-between`}>
      <div>
        <h4 className="text-sm opacity-80">{title}</h4>
        <h2 className="text-2xl font-semibold">{value}</h2>
      </div>
      {Icon && <Icon size={28} className="opacity-80" />}
    </div>
  );
}
