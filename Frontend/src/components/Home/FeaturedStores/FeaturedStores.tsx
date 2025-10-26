import React, { useEffect, useState } from "react";
import StoreCard from "./StoreCard";
import storeApi from "../../../api/storeApi";
import type { StoreType } from "../../../types/store";
import { useNavigate } from "react-router-dom";

const FeaturedStores: React.FC = () => {
  const [stores, setStores] = useState<StoreType[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStores = async () => {
      setLoading(true);
      try {
        const { data } = await storeApi.getAllActiveStores();
        const mappedStores: StoreType[] = data.stores.map((s: any) => ({
          ...s,
          rating: s.rating ?? 0,
          products: s.products ?? 0,
          followers: s.followers ?? 0,
          responseRate: s.responseRate ?? 0,
          responseTime: s.responseTime ?? "—",
          joinDate: s.joinDate ?? new Date(s.createdAt).toLocaleDateString(),
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
    return (
      <div className="p-6 text-center text-gray-500">
        Đang tải danh sách cửa hàng...
      </div>
    );
  }

  if (!stores.length) {
    return (
      <div className="p-6 text-center text-gray-500">
        Không có cửa hàng nào.
      </div>
    );
  }

  // 👇 Giới hạn hiển thị tối đa 6 cửa hàng (2 hàng nếu mỗi hàng 3 cột)
  const visibleStores = stores.slice(0, 6);

  return (
    <section className="p-6 bg-gray-50 rounded-lg w-full">
      <h3 className="text-[22px] font-bold mb-1 text-gray-900">
        Cửa hàng nổi bật
      </h3>
      <p className="text-sm text-gray-600 mb-6">
        Một số cửa hàng tiêu biểu trên hệ thống
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 justify-start items-start">
        {visibleStores.map((store) => (
          <StoreCard
            key={store._id}
            storeId={store._id}
            ownerId={
              typeof store.owner === "string" ? store.owner : store.owner._id
            }
            name={store.name}
            description={store.description}
            logoUrl={store.logoUrl}
            bannerUrl={store.bannerUrl}
            createdAt={store.createdAt}
            isActive={store.isActive}
            customCategory={store.customCategory}
          />
        ))}
      </div>

      {/* 👇 Chuyển hướng đến trang /store */}
      <div
        onClick={() => navigate("/stores")}
        className="text-center mt-6 font-medium text-blue-600 cursor-pointer hover:underline"
      >
        Xem thêm cửa hàng →
      </div>
    </section>
  );
};

export default FeaturedStores;
