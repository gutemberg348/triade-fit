import { Leaf } from "lucide-react";
export default function Brand({ compact = false }) {
  return (
    <div className={`brand ${compact ? "brand--compact" : ""}`}>
      <span className="brand__mark">
        <Leaf />
      </span>
      {!compact && (
        <span>
          TRIADE FIT<small>PERSONAL</small>
        </span>
      )}
    </div>
  );
}
