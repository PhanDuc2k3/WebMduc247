import React, { useEffect, useState } from "react";
import StoreFilters from "../../components/StoreList/StoreFilters";
import StoreGrid from "../../components/StoreList/StoreGrid";
import StoreLoading from "../../components/StoreList/StoreLoading";
import type { StoreType } from "../../types/store";

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
          owner: { _id: s.owner?._id || "" },
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

  if (loading) return <StoreLoading />;

  return (
    <div className="p-6 max-w-8xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Danh sách cửa hàng</h1>
      <p className="text-gray-600 mb-6">
        Khám phá các cửa hàng uy tín trên nền tảng
      </p>

      <StoreFilters />

      <p className="mb-4 text-gray-700">Tìm thấy {stores.length} cửa hàng</p>

      <StoreGrid stores={stores} />

      <div className="mt-6 text-center">
        <button className="px-6 py-2 border rounded hover:bg-gray-100">
          Tải thêm cửa hàng
        </button>
      </div>
    </div>
  );
};

export default StoreList;
