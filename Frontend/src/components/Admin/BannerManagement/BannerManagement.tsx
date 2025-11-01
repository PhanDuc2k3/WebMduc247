// src/components/Admin/BannerManagement/BannerManagement.tsx
import React, { useEffect, useState } from "react";
import bannerApi from "../../../api/bannerApi";
import type { Banner } from "../../../api/bannerApi";

const BannerManagement: React.FC = () => {
  const [mainBanner, setMainBanner] = useState<Banner | null>(null);
  const [subBanners, setSubBanners] = useState<Banner[]>([]);
  const [files, setFiles] = useState<{ [key: string]: File | null }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const mainRes = await bannerApi.getBannersByType("main");
        const main = mainRes.data[0] || {
          _id: "main-placeholder",
          title: "",
          link: "",
          imageUrl: "/placeholder.png",
          type: "main",
        };
        setMainBanner(main);

        const subRes = await bannerApi.getBannersByType("sub");
        const subData = subRes.data.slice(0, 2);
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
        console.error("Lỗi khi fetch banner:", err);
        setMainBanner({
          _id: "main-placeholder",
          title: "",
          link: "",
          imageUrl: "/placeholder.png",
          type: "main",
        });
        setSubBanners([
          { _id: "sub-placeholder-0", title: "", link: "", imageUrl: "/placeholder.png", type: "sub" },
          { _id: "sub-placeholder-1", title: "", link: "", imageUrl: "/placeholder.png", type: "sub" },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchBanners();
  }, []);

  const handleFileChange = (bannerId: string, file: File | null) => {
    setFiles(prev => ({ ...prev, [bannerId]: file }));
  };

  const updateBannerState = (bannerId: string, field: "title" | "link", value: string) => {
    if (mainBanner?._id === bannerId) setMainBanner({ ...mainBanner, [field]: value });
    else setSubBanners(subBanners.map(b => (b._id === bannerId ? { ...b, [field]: value } : b)));
  };

  const handleSave = async (banner: Banner) => {
    if (!files[banner._id] && !banner.imageUrl) {
      alert("Vui lòng chọn ảnh trước khi lưu!");
      return;
    }

    try {
      if (banner._id.includes("placeholder")) {
        // tạo banner mới
        const res = await bannerApi.createBanner({
          title: banner.title,
          link: banner.link,
          type: banner.type,
          imageFile: files[banner._id] || undefined,
        });
        alert("Đã tạo banner mới!");
        if (banner.type === "main") setMainBanner(res.data);
        else setSubBanners(prev => prev.map(b => (b._id === banner._id ? res.data : b)));
      } else {
        // cập nhật banner hiện tại
        await bannerApi.updateBanner(banner._id, {
          title: banner.title,
          link: banner.link,
          imageFile: files[banner._id] || undefined,
        });
        alert("Đã lưu banner!");
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi khi lưu banner!");
    }
  };

  const handleDeleteImage = (bannerId: string) => {
    if (window.confirm("Bạn có chắc muốn xóa ảnh này?")) handleFileChange(bannerId, null);
  };

  const handleDeleteBanner = async (bannerId: string) => {
    if (!window.confirm("Bạn có chắc muốn xóa banner này?")) return;
    try {
      if (!bannerId.includes("placeholder")) await bannerApi.deleteBanner(bannerId);

      if (mainBanner?._id === bannerId) {
        setMainBanner({
          _id: "main-placeholder",
          title: "",
          link: "",
          imageUrl: "/placeholder.png",
          type: "main",
        });
      } else {
        setSubBanners(prev => {
          const newBanners = prev.filter(b => b._id !== bannerId);
          while (newBanners.length < 2) {
            newBanners.push({
              _id: `sub-placeholder-${newBanners.length}`,
              title: "",
              link: "",
              imageUrl: "/placeholder.png",
              type: "sub",
            });
          }
          return newBanners;
        });
      }
      alert("Banner đã được xóa!");
    } catch (err) {
      console.error(err);
      alert("Lỗi khi xóa banner!");
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-pink-500 mb-4"></div>
      <p className="text-gray-600 text-lg font-medium">⏳ Đang tải banner...</p>
    </div>
  );

  const allBanners = mainBanner ? [mainBanner, ...subBanners] : subBanners;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 animate-fade-in-down">
        <h2 className="text-2xl font-bold mb-2 gradient-text flex items-center gap-2">
          <span>🎨</span> Quản lý Banner
        </h2>
        <p className="text-gray-600 text-sm">
          1 banner chính và 2 banner phụ. Chỉnh sửa hoặc xóa ảnh.
        </p>
      </div>

      <div className="space-y-6">
        {allBanners.map((b, idx) => (
          <div 
            key={b._id} 
            className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg border-2 border-gray-200 overflow-hidden animate-fade-in-up hover:shadow-2xl transition-all duration-300"
            style={{ animationDelay: `${idx * 0.1}s` }}
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className={`px-4 py-2 rounded-full font-bold text-sm ${
                  b.type === "main" 
                    ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg" 
                    : "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg"
                }`}>
                  {b.type === "main" ? "📢 Banner Chính" : "✨ Banner Phụ"}
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Preview Image */}
                <div className="lg:col-span-1">
                  <div className="relative group">
                    <img
                      src={files[b._id] ? URL.createObjectURL(files[b._id]!) : b.imageUrl}
                      alt={b.title || "Chưa có ảnh"}
                      className="w-full h-48 object-cover rounded-xl shadow-lg border-4 border-white group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <span className="text-white font-bold">👁️ Xem trước</span>
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="lg:col-span-2 space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">📝 Tiêu đề</label>
                    <input
                      type="text"
                      value={b.title}
                      placeholder="Nhập tiêu đề banner"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                      onChange={e => updateBannerState(b._id, "title", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">🔗 Link</label>
                    <input
                      type="text"
                      value={b.link || ""}
                      placeholder="Nhập link chuyển hướng"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                      onChange={e => updateBannerState(b._id, "link", e.target.value)}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-3 pt-2">
                    <label className="cursor-pointer bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center gap-2">
                      <span>📷</span>
                      <span>Chọn ảnh</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => e.target.files && handleFileChange(b._id, e.target.files[0])}
                      />
                    </label>
                    
                    <button 
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center gap-2" 
                      onClick={() => handleSave(b)}
                    >
                      <span>💾</span> Lưu
                    </button>
                    
                    <button 
                      className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center gap-2" 
                      onClick={() => handleDeleteImage(b._id)}
                    >
                      <span>🗑️</span> Xóa ảnh
                    </button>
                    
                    <button 
                      className="bg-gradient-to-r from-gray-500 to-gray-700 hover:from-gray-600 hover:to-gray-800 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center gap-2" 
                      onClick={() => handleDeleteBanner(b._id)}
                    >
                      <span>❌</span> Xóa banner
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BannerManagement;
