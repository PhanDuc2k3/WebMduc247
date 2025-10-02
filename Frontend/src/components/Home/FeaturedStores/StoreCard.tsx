import React from "react";
import { useNavigate } from "react-router-dom";

interface StoreCardProps {
  id: string;
  name: string;
  description: string;
  join: string;
  status?: "Đang online" | "Offline";
  tags?: string[];
  logoUrl?: string;
  bannerUrl?: string;
  
}

const StoreCard: React.FC<StoreCardProps> = ({
  id,
  name,
  description,
  join,
  status,
  tags = [],
  logoUrl,
  bannerUrl,
}) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition p-6 flex flex-col overflow-hidden min-w-[250px]">
      {/* Banner */}
      {bannerUrl && (
        <div className="h-32 w-full overflow-hidden rounded-lg mb-4">
          <img src={bannerUrl} alt={name} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Info */}
      <div className="flex flex-col flex-1">
        <div className="flex items-center gap-3 mb-2">
          {logoUrl && (
            <img src={logoUrl} alt={name} className="w-12 h-12 rounded border object-cover" />
          )}
          <div>
            <div className="text-lg font-semibold text-gray-900">{name}</div>
            <div className="text-xs text-gray-500">{join}</div>
          </div>
        </div>

        <div className="text-gray-600 text-sm mb-3 flex-1">{description}</div>

        <div className="flex flex-wrap gap-2 mb-3">
          {tags.map((tag, i) => (
            <span
              key={i}
              className="text-xs bg-gray-100 text-blue-600 px-2 py-1 rounded font-medium"
            >
              {tag}
            </span>
          ))}
          <span
            className={`text-xs px-2 py-1 rounded font-medium ${
              status === "Đang online"
                ? "bg-green-100 text-green-700"
                : "bg-gray-300 text-gray-600"
            }`}
          >
            {status}
          </span>
        </div>

        <div className="mt-auto flex gap-3">
          <button
            onClick={() => navigate(`/store/${id}`)}
            className="flex-1 bg-gray-900 text-white py-2 rounded-md font-semibold hover:bg-gray-800 transition"
          >
            Xem cửa hàng
          </button>
          <button className="flex-1 border border-gray-300 text-gray-900 py-2 rounded-md font-semibold hover:bg-gray-100 transition">
            Chat ngay
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoreCard;
