import React, { useEffect, useState } from "react";
import StoreCard from "./StoreCard";

interface StoreType {
  _id: string;           
  owner: string;         
  name: string;
  desc: string;
  join: string;
  status: "Đang online" | "Offline";
  tags: string[];
  logoUrl: string;
  bannerUrl: string;
}

const FeaturedStores: React.FC = () => {
  const [stores, setStores] = useState<StoreType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/stores");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        console.log("📦 [FE] Dữ liệu stores từ API:", data);

        const mappedStores: StoreType[] = data.stores.map((s: any) => ({
          _id: s._id,
          owner: s.owner,
          name: s.name,
          desc: s.description,
          join: `Tham gia từ ${new Date(s.createdAt).getFullYear()}`,
          status: s.isActive ? "Đang online" : "Offline",
          tags: s.category ? [s.category] : [],
          logoUrl: s.logoUrl,
          bannerUrl: s.bannerUrl,
        }));

        setStores(mappedStores);
      } catch (err) {
        console.error("❌ [FE] Lỗi khi fetch stores:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStores();
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">
        Đang tải danh sách cửa hàng...
      </div>
    );
  }

  return (
    <section className="p-6 bg-gray-50 rounded-lg max-w-[1400px] mx-auto">
      {/* ⭐ Tiêu đề & mô tả giống FeaturedProducts / Categories */}
      <h3 className="text-[22px] font-bold mb-1 text-gray-900">
        Tất cả cửa hàng
      </h3>
      <p className="text-sm text-gray-600 mb-6">
        Xem danh sách tất cả các cửa hàng nổi bật
      </p>

      {/* Grid hiển thị các cửa hàng */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {stores.map((store) => (
          <StoreCard
            key={store._id}
            storeId={store._id}
            ownerId={store.owner}
            name={store.name}
            description={store.desc}
            join={store.join}
            status={store.status}
            tags={store.tags}
            logoUrl={store.logoUrl}
            bannerUrl={store.bannerUrl}
          />
        ))}
      </div>

      {/* Nút xem thêm */}
      <div className="text-center mt-6 font-medium text-blue-600 cursor-pointer hover:underline">
        Xem thêm cửa hàng →
      </div>
    </section>
  );
};

export default FeaturedStores;
