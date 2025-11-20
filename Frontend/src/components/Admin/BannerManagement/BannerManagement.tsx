// src/components/Admin/BannerManagement/BannerManagement.tsx
import React, { useEffect, useState } from "react";
import { Image, Megaphone, Sparkles, FileText, Link as LinkIcon, Camera, Save, Trash2, Loader2, Plus } from "lucide-react";
import ConfirmDialog from "../../ui/ConfirmDialog";
import bannerApi from "../../../api/bannerApi";
import type { Banner } from "../../../api/bannerApi";
import { toast } from "react-toastify";

const BannerManagement: React.FC = () => {
  const [mainBanners, setMainBanners] = useState<Banner[]>([]);
  const [subBanners, setSubBanners] = useState<Banner[]>([]);
  const [files, setFiles] = useState<{ [key: string]: File | null }>({});
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; banner: Banner | null }>({ open: false, banner: null });

  const fetchBanners = async () => {
    try {
      const mainRes = await bannerApi.getBannersByType("main");
      setMainBanners(mainRes.data || []);

      const subRes = await bannerApi.getBannersByType("sub");
      setSubBanners(subRes.data || []);
    } catch (err) {
      console.error("Lỗi khi fetch banner:", err);
      setMainBanners([]);
      setSubBanners([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleFileChange = (bannerId: string, file: File | null) => {
    setFiles(prev => ({ ...prev, [bannerId]: file }));
  };

  const updateBannerState = (bannerId: string, field: "title" | "link", value: string) => {
    if (mainBanners.some(b => b._id === bannerId)) {
      setMainBanners(mainBanners.map(b => (b._id === bannerId ? { ...b, [field]: value } : b)));
    } else {
      setSubBanners(subBanners.map(b => (b._id === bannerId ? { ...b, [field]: value } : b)));
    }
  };

  const handleSave = async (banner: Banner) => {
    if (!files[banner._id] && !banner.imageUrl) {
      toast.warning("Vui lòng chọn ảnh trước khi lưu!");
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
        toast.success("Đã tạo banner mới!");
        await fetchBanners(); // Refresh danh sách
        setFiles(prev => {
          const newFiles = { ...prev };
          delete newFiles[banner._id];
          return newFiles;
        });
      } else {
        // cập nhật banner hiện tại
        await bannerApi.updateBanner(banner._id, {
          title: banner.title,
          link: banner.link,
          imageFile: files[banner._id] || undefined,
        });
        toast.success("Đã lưu banner!");
        await fetchBanners(); // Refresh danh sách
        setFiles(prev => {
          const newFiles = { ...prev };
          delete newFiles[banner._id];
          return newFiles;
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi lưu banner!");
    }
  };

  const handleDeleteBanner = async (banner: Banner) => {
    if (banner._id.includes("placeholder")) {
      // Nếu là placeholder, chỉ xóa khỏi state
      if (banner.type === "main") {
        setMainBanners(prev => prev.filter(b => b._id !== banner._id));
      } else {
        setSubBanners(prev => prev.filter(b => b._id !== banner._id));
      }
      setFiles(prev => {
        const newFiles = { ...prev };
        delete newFiles[banner._id];
        return newFiles;
      });
      return;
    }

    setDeleteConfirm({ open: true, banner });
  };

  const handleDelete = async () => {
    if (!deleteConfirm.banner) return;
    const banner = deleteConfirm.banner;
    setDeleteConfirm({ open: false, banner: null });
    try {
      await bannerApi.deleteBanner(banner._id);
      toast.success("Đã xóa banner!");
      await fetchBanners(); // Refresh danh sách
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi xóa banner!");
    }
  };

  const handleAddBanner = (type: "main" | "sub") => {
    const newBanner: Banner = {
      _id: `${type}-placeholder-${Date.now()}`,
      title: "",
      link: "",
      imageUrl: "/placeholder.png",
      type: type,
    };
    
    if (type === "main") {
      setMainBanners([...mainBanners, newBanner]);
    } else {
      setSubBanners([...subBanners, newBanner]);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-12 md:py-20">
      <Loader2 className="w-12 h-12 md:w-16 md:h-16 text-pink-500 animate-spin mb-4" />
      <p className="text-gray-600 text-sm md:text-lg font-medium">Đang tải banner...</p>
    </div>
  );

  const allBanners = [
    ...mainBanners.map(b => ({ ...b, type: "main" as const })),
    ...subBanners.map(b => ({ ...b, type: "sub" as const }))
  ];

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="mb-4 sm:mb-6 animate-fade-in-down">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 gradient-text flex items-center gap-2">
          <Image className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
          <span>Quản lý Banner</span>
        </h2>
        <p className="text-gray-600 text-xs sm:text-sm md:text-base">
          Quản lý banner chính và banner phụ. Thêm, chỉnh sửa hoặc xóa banner.
        </p>
      </div>

      {/* Total Banners Count */}
      <div className="mb-4 sm:mb-6 animate-fade-in-up">
        <div className="bg-purple-600 rounded-lg md:rounded-xl p-4 md:p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-xs md:text-sm font-medium mb-1">Tổng số banner</p>
              <p className="text-white text-2xl md:text-4xl font-bold">
                {allBanners.length.toLocaleString('vi-VN')}
              </p>
            </div>
            <Image className="w-12 h-12 md:w-16 md:h-16 text-white opacity-80" />
          </div>
        </div>
      </div>

      {/* Add Banner Buttons */}
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => handleAddBanner("main")}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-3 rounded-lg sm:rounded-xl font-semibold sm:font-bold text-xs sm:text-sm shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Thêm Banner Chính</span>
        </button>
        <button
          onClick={() => handleAddBanner("sub")}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-3 rounded-lg sm:rounded-xl font-semibold sm:font-bold text-xs sm:text-sm shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Thêm Banner Phụ</span>
        </button>
      </div>

      <div className="space-y-4 sm:space-y-6">
        {allBanners.map((b, idx) => (
          <div 
            key={b._id} 
            className="bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-200 overflow-hidden animate-fade-in-up hover:shadow-2xl transition-all duration-300"
            style={{ animationDelay: `${idx * 0.1}s` }}
          >
            <div className="p-4 sm:p-5 md:p-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <span className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full font-bold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 ${
                  b.type === "main" 
                    ? "bg-blue-500 text-white shadow-lg" 
                    : "bg-green-500 text-white shadow-lg"
                }`}>
                  {b.type === "main" ? (
                    <>
                      <Megaphone className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>Banner Chính</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>Banner Phụ</span>
                    </>
                  )}
                </span>
              </div>

              {/* Form Fields - Full width on mobile, no preview */}
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>Tiêu đề</span>
                  </label>
                  <input
                    type="text"
                    value={b.title}
                    placeholder="Nhập tiêu đề banner"
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base border-2 border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    onChange={e => updateBannerState(b._id, "title", e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>Link</span>
                  </label>
                  <input
                    type="text"
                    value={b.link || ""}
                    placeholder="Nhập link chuyển hướng"
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base border-2 border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    onChange={e => updateBannerState(b._id, "link", e.target.value)}
                  />
                </div>

                {/* Image Preview - Simple display */}
                {(files[b._id] || b.imageUrl) && (
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-1.5">
                      <Image className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>Ảnh hiện tại</span>
                    </label>
                    <img
                      src={files[b._id] ? URL.createObjectURL(files[b._id]!) : b.imageUrl}
                      alt={b.title || "Banner"}
                      className="w-[40%] h-32 sm:h-40 md:h-48 object-cover rounded-lg sm:rounded-xl shadow-md border-2 border-gray-200"
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 pt-2">
                  <label className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-3 rounded-lg sm:rounded-xl font-semibold sm:font-bold text-xs sm:text-sm shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2">
                    <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Chọn ảnh</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => e.target.files && handleFileChange(b._id, e.target.files[0])}
                    />
                  </label>
                  
                  <button 
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-3 rounded-lg sm:rounded-xl font-semibold sm:font-bold text-xs sm:text-sm shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2" 
                    onClick={() => handleSave(b)}
                  >
                    <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Lưu</span>
                  </button>
                  
                  <button 
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-3 rounded-lg sm:rounded-xl font-semibold sm:font-bold text-xs sm:text-sm shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2" 
                    onClick={() => handleDeleteBanner(b)}
                  >
                    <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Xóa banner</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, banner: null })}
        onConfirm={handleDelete}
        title="Xác nhận xóa banner"
        message="Bạn có chắc muốn xóa banner này không?"
        type="danger"
        confirmText="Xóa"
      />
    </div>
  );
};

export default BannerManagement;
