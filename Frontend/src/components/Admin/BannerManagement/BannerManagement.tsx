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

  if (loading) return <div>Đang tải banner...</div>;

  const allBanners = mainBanner ? [mainBanner, ...subBanners] : subBanners;

  return (
    <div>
      <h2 className="font-semibold mb-2 text-lg">Quản lý Banner</h2>
      <div className="text-gray-500 mb-4 text-sm">1 banner chính và 2 banner phụ. Chỉnh sửa hoặc xóa ảnh.</div>

      <table className="w-full text-sm border">
        <thead>
          <tr className="text-left text-gray-500 border-b">
            <th className="py-2">Loại</th>
            <th>Ảnh</th>
            <th>Tiêu đề</th>
            <th>Link</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {allBanners.map(b => (
            <tr key={b._id} className="border-b">
              <td className="py-2">{b.type === "main" ? "Banner Chính" : "Banner Phụ"}</td>
              <td>
                <img
                  src={files[b._id] ? URL.createObjectURL(files[b._id]!) : b.imageUrl}
                  alt={b.title || "Chưa có ảnh"}
                  className="w-32 h-16 object-cover rounded"
                />
              </td>
              <td>
                <input
                  type="text"
                  value={b.title}
                  placeholder="Nhập tiêu đề"
                  className="border p-1 rounded w-full"
                  onChange={e => updateBannerState(b._id, "title", e.target.value)}
                />
              </td>
              <td>
                <input
                  type="text"
                  value={b.link || ""}
                  placeholder="Nhập link"
                  className="border p-1 rounded w-full"
                  onChange={e => updateBannerState(b._id, "link", e.target.value)}
                />
              </td>
              <td className="flex gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => e.target.files && handleFileChange(b._id, e.target.files[0])}
                />
                <button className="bg-green-600 text-white px-3 py-1 rounded" onClick={() => handleSave(b)}>
                  Lưu
                </button>
                <button className="bg-red-600 text-white px-3 py-1 rounded" onClick={() => handleDeleteImage(b._id)}>
                  Xóa ảnh
                </button>
                <button className="bg-gray-600 text-white px-3 py-1 rounded" onClick={() => handleDeleteBanner(b._id)}>
                  Xóa banner
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BannerManagement;
