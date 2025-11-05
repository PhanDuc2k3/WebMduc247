import React, { useEffect, useState } from "react";
import StoreCard from "./StoreCard";
import storeApi from "../../../api/storeApi";
import type { StoreType } from "../../../types/store";
import { useNavigate } from "react-router-dom";
import { useChat } from "../../../context/chatContext";

const FeaturedStores: React.FC = () => {
  const [stores, setStores] = useState<StoreType[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { onlineStores } = useChat();

  useEffect(() => {
    const fetchStores = async () => {
      setLoading(true);
      try {
        const { data } = await storeApi.getAllActiveStores();
        const mappedStores: StoreType[] = data.stores.map((s: any) => {
          // Đảm bảo createdAt được truyền đúng format
          const createdAtValue = s.createdAt || s.created_at || s.created;
          
          return {
            ...s,
            rating: s.rating ?? 0,
            products: s.products ?? 0,
            followers: s.followers ?? 0,
            responseRate: s.responseRate ?? 0,
            responseTime: s.responseTime ?? "—",
            joinDate: createdAtValue ? new Date(createdAtValue).toLocaleDateString() : "—",
            createdAt: createdAtValue, // ✅ Đảm bảo createdAt được truyền vào
            isActive: s.isActive ?? true,
            customCategory: s.category || s.customCategory,
          };
        });
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
    <section className="p-6 bg-gradient-to-br from-gray-50 via-white to-gray-50 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 w-full">
      <div className="mb-6 animate-fade-in-down">
        <h3 className="text-[24px] lg:text-[28px] font-bold mb-2 text-gray-900 gradient-text">
          🏬 Cửa hàng nổi bật
        </h3>
        <p className="text-sm text-gray-600">
          Một số cửa hàng tiêu biểu trên hệ thống
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 justify-start items-start">
        {visibleStores.map((store, index) => (
          <div
            key={store._id}
            className="animate-slide-up"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <StoreCard
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
              isOnline={onlineStores.includes(store._id)}
            />
          </div>
        ))}
      </div>

      {/* 👇 Chuyển hướng đến trang /store */}
      <div
        onClick={() => navigate("/stores")}
        className="text-center mt-8 cursor-pointer"
      >
        <span className="inline-block font-bold text-blue-600 hover:text-blue-700 hover:underline transition-all duration-300 transform hover:scale-105 text-lg">
          Xem thêm cửa hàng →
        </span>
      </div>
    </section>
  );
};

export default FeaturedStores;
