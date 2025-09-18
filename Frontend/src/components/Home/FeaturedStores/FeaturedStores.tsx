import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface StoreType {
  _id: string;
  name: string;
  desc: string;
  rating: string;
  products: string;
  join: string;
  status: string;
  tags: string[];
  logoUrl: string;
  bannerUrl: string;
}

const FeaturedStores: React.FC = () => {
  const [stores, setStores] = useState<StoreType[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/stores"); // backend endpoint
        const data = await res.json();
        const mappedStores: StoreType[] = data.stores.map((s: any) => ({
          _id: s._id,
          name: s.name,
          desc: s.description,
          rating: s.rating || "0",
          products: s.products?.length + " sản phẩm" || "0 sản phẩm",
          join: `Tham gia từ ${new Date(s.createdAt).getFullYear()}`,
          status: s.isActive ? "Đang online" : "Offline",
          tags: s.category ? [s.category] : [],
          logoUrl: s.logoUrl,
          bannerUrl: s.bannerUrl,
        }));
        setStores(mappedStores);
      } catch (err) {
        console.error("Lỗi khi fetch stores:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStores();
  }, []);

  if (loading) return <div className="p-6 text-center">Đang tải danh sách cửa hàng...</div>;

  return (
    <section className="px-4 py-6 max-w-[1400px] mx-auto">
      <h3 className="text-xl font-semibold mb-1">Tất cả cửa hàng</h3>
      <p className="text-gray-500 mb-4">Xem danh sách tất cả các cửa hàng</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {stores.map((store) => (
          <div
            key={store._id}
            className="bg-white rounded-lg shadow flex flex-col overflow-hidden min-w-[250px]"
          >
            {/* Banner */}
            <div className="h-32 w-full overflow-hidden">
              <img
                src={store.bannerUrl}
                alt={store.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Info */}
            <div className="p-4 flex flex-col flex-1">
              <div className="flex items-center gap-3 mb-2">
                <img
                  src={store.logoUrl}
                  alt={store.name}
                  className="w-12 h-12 rounded border object-cover"
                />
                <div>
                  <div className="font-medium">{store.name}</div>
                  <div className="text-xs text-gray-500">{store.join}</div>
                </div>
              </div>

              <div className="text-sm text-gray-600 flex-1 mb-3">{store.desc}</div>

              <div className="flex flex-wrap gap-2 mb-3">
                {store.tags.map((tag, i) => (
                  <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {tag}
                  </span>
                ))}
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    store.status === "Đang online"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {store.status}
                </span>
              </div>

              <div className="mt-auto flex gap-2">
                <button
                  onClick={() => navigate(`/store/${store._id}`)}
                  className="flex-1 bg-black text-white py-2 rounded text-sm"
                >
                  Xem cửa hàng
                </button>
                <button className="flex-1 bg-gray-100 text-gray-700 py-2 rounded text-sm">
                  Chat ngay
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FeaturedStores;
