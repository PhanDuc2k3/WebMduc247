import React, { useEffect, useState } from "react";
import StoreCard from "../../components/Home/FeaturedStores/StoreCard";

interface StoreType {
  _id: string;
  owner: { _id: string }; // ✅ Thêm owner với _id
  name: string;
  description: string;
  join: string;
  status: "Đang online" | "Offline";
  tags: string[];
  logoUrl?: string;
  bannerUrl?: string;
}

const StoreList: React.FC = () => {
  const [stores, setStores] = useState<StoreType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/stores");
        const data = await res.json();

        const mappedStores: StoreType[] = data.stores.map((s: any) => ({
          _id: s._id,
          name: s.name,
          description: s.description,
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

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Đang tải danh sách cửa hàng...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Danh sách cửa hàng</h1>
      <p className="text-gray-600 mb-6">Khám phá các cửa hàng uy tín trên nền tảng</p>

      <div className="flex flex-wrap gap-4 mb-6">
        <input
          type="text"
          placeholder="Tìm kiếm cửa hàng..."
          className="border px-4 py-2 rounded w-full sm:w-64"
        />
        <select className="border px-4 py-2 rounded w-full sm:w-48">
          <option>Đánh giá cao nhất</option>
        </select>
        <select className="border px-4 py-2 rounded w-full sm:w-48">
          <option>Tất cả khu vực</option>
        </select>
        <button className="border px-4 py-2 rounded bg-gray-100">Bộ lọc khác</button>
      </div>

      <p className="mb-4 text-gray-700">Tìm thấy {stores.length} cửa hàng</p>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {stores.map((store) => (
          <StoreCard
            key={store._id}
            storeId={store._id}               // id của cửa hàng
            ownerId={store.owner._id}         // ✅ id của chủ shop (User)
            name={store.name}
            description={store.description}
            join={store.join}
            status={store.status}
            tags={store.tags}
            logoUrl={store.logoUrl}
            bannerUrl={store.bannerUrl}
          />
        ))}
      </div>

      <div className="mt-6 text-center">
        <button className="px-6 py-2 border rounded hover:bg-gray-100">Tải thêm cửa hàng</button>
      </div>
    </div>
  );
};

export default StoreList;
