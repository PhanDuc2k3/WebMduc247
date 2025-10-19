import React, { useEffect, useState } from "react";
import bannerApi from "../../../api/bannerApi";
import type { Banner } from "../../../api/bannerApi";
const Banner: React.FC = () => {
  const [mainBanner, setMainBanner] = useState<Banner | null>(null);
  const [subBanners, setSubBanners] = useState<Banner[]>([]);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const mainRes = await bannerApi.getBannersByType("main");
        setMainBanner(mainRes.data[0] || null);

        const subRes = await bannerApi.getBannersByType("sub");
        const subData = subRes.data.slice(0, 2);
        // Nếu chưa đủ 2 banner phụ → thêm placeholder
        while (subData.length < 2) {
          subData.push({
            _id: `sub-placeholder-${subData.length}`,
            title: "",
            link: "",
            imageUrl: "/placeholder.png",
            type: "sub",
          });
        }
        setSubBanners(subData);
      } catch (err) {
        console.error(err);
      }
    };
    fetchBanners();
  }, []);

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 mt-8">
      {/* Banner chính */}
      {mainBanner && (
        <div className="lg:flex-[2] relative rounded-2xl overflow-hidden w-full h-[450px] group">
          <img
            src={mainBanner.imageUrl || "/placeholder.png"}
            alt={mainBanner.title || "Banner Chính"}
            className="w-full h-full object-cover transition duration-500 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/30 flex flex-col justify-end p-6 text-white transition duration-500 ease-out group-hover:bg-black/50">
            <h2 className="text-2xl lg:text-3xl font-bold mb-3 opacity-90 transition duration-500 ease-out group-hover:text-4xl group-hover:font-extrabold group-hover:opacity-100">
              {mainBanner.title || "Banner Chính"}
            </h2>
            <p className="text-base lg:text-lg mb-4 opacity-80 transition duration-500 ease-out group-hover:opacity-100 group-hover:text-white/90">
              {/* Nếu muốn hiển thị mô tả từ backend, thêm field description vào model */}
            </p>
            {mainBanner.link && (
              <a
                href={mainBanner.link}
                className="bg-white text-[#3a5ef7] px-4 lg:px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition duration-300 ease-out text-sm lg:text-base group-hover:scale-110"
              >
                Mua ngay
              </a>
            )}
          </div>
        </div>
      )}

      {/* Banner phụ */}
      <div className="lg:flex-1 flex flex-col gap-4 lg:gap-6">
        {subBanners.map((b, idx) => (
          <div key={b._id} className="flex-1 relative rounded-2xl overflow-hidden w-full h-[200px] group">
            <img
              src={b.imageUrl || "/placeholder.png"}
              alt={b.title || `Banner Phụ ${idx + 1}`}
              className="w-full h-full object-cover transition duration-500 ease-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/30 flex flex-col justify-end p-4 text-white transition duration-500 ease-out group-hover:bg-black/50">
              <div className="text-lg lg:text-xl font-bold opacity-90 transition duration-500 ease-out group-hover:font-extrabold group-hover:opacity-100">
                {b.title || `Banner Phụ ${idx + 1}`}
              </div>
              <div className="text-sm lg:text-base my-2 opacity-80 transition duration-500 ease-out group-hover:opacity-100 group-hover:text-white/90">
                {/* Nếu muốn hiển thị mô tả phụ từ backend, thêm field description */}
              </div>
              {b.link && (
                <a
                  href={b.link}
                  className={`${
                    idx === 0 ? "bg-[#ff7e5f]" : "bg-[#00c6fb]"
                  } px-3 lg:px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition duration-300 ease-out text-sm lg:text-base group-hover:scale-110`}
                >
                  {idx === 0 ? "Xem ngay" : "Mua sắm"}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Banner;
