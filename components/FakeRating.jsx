// components/FakeRating.jsx
export default function FakeRating({ value = 4.5 }) {
  const stars = Array(5)
    .fill(0)
    .map((_, i) => (
      <span key={i}>{i < Math.floor(value) ? "⭐" : "☆"}</span>
    ));

  return (
    <div className="text-yellow-500 text-lg flex items-center gap-1">
      {stars}
      <span className="text-sm text-gray-600">({value.toFixed(1)})</span>
    </div>
  );
}
