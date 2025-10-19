// src/components/Admin/BannerManagement/BannerManagement.tsx
import React, { useEffect, useState } from "react";
import bannerApi, { type Banner } from "../../../api/bannerApi";

const BannerManagement: React.FC = () => {
  const [mainBanner, setMainBanner] = useState<Banner | null>(null);
  const [subBanners, setSubBanners] = useState<Banner[]>([]);
  const [files, setFiles] = useState<{ [key: string]: File | null }>({});

  useEffect(() => {
    bannerApi.getBannersByType("main").then(res => setMainBanner(res.data[0]));
    bannerApi.getBannersByType("sub").then(res => setSubBanners(res.data));
  }, []);

  const handleChange = (banner: Banner, field: string, value: string) => {
    if (banner.type === "main") {
      setMainBanner(prev => prev ? { ...prev, [field]: value } : null);
    } else {
      setSubBanners(prev =>
        prev.map(b => (b._id === banner._id ? { ...b, [field]: value } : b))
      );
    }
  };

  const handleFileChange = (bannerId: string, file: File) => {
    setFiles(prev => ({ ...prev, [bannerId]: file }));
  };

  const handleSave = async (banner: Banner) => {
    await bannerApi.updateBanner(banner._id, {
      title: banner.title,
      link: banner.link,
      imageFile: files[banner._id] || undefined,
    });
    alert("Saved!");
  };

  return (
    <div className="space-y-6">
      <h2 className="font-bold text-lg">Banner Chính</h2>
      {mainBanner && (
        <BannerItem
          banner={mainBanner}
          file={files[mainBanner._id]}
          onChange={handleChange}
          onFileChange={handleFileChange}
          onSave={handleSave}
        />
      )}

      <h2 className="font-bold text-lg">Banner Phụ</h2>
      {subBanners.map(b => (
        <BannerItem
          key={b._id}
          banner={b}
          file={files[b._id]}
          onChange={handleChange}
          onFileChange={handleFileChange}
          onSave={handleSave}
        />
      ))}
    </div>
  );
};

interface BannerItemProps {
  banner: Banner;
  file?: File | null;
  onChange: (banner: Banner, field: string, value: string) => void;
  onFileChange: (bannerId: string, file: File) => void;
  onSave: (banner: Banner) => void;
}

const BannerItem: React.FC<BannerItemProps> = ({
  banner,
  file,
  onChange,
  onFileChange,
  onSave,
}) => {
  const preview = file ? URL.createObjectURL(file) : banner.imageUrl;

  return (
    <div className="border p-4 rounded-md flex flex-col md:flex-row gap-4 items-center">
      <img
        src={preview}
        alt="banner"
        className="w-48 h-24 object-cover rounded"
      />
      <div className="flex-1 flex flex-col gap-2">
        <input
          type="text"
          value={banner.title}
          placeholder="Tiêu đề"
          className="border p-1 rounded"
          onChange={e => onChange(banner, "title", e.target.value)}
        />
        <input
          type="text"
          value={banner.link || ""}
          placeholder="Link"
          className="border p-1 rounded"
          onChange={e => onChange(banner, "link", e.target.value)}
        />
        <input
          type="file"
          accept="image/*"
          onChange={e =>
            e.target.files && onFileChange(banner._id, e.target.files[0])
          }
        />
        <button
          className="bg-black text-white px-4 py-1 rounded w-24"
          onClick={() => onSave(banner)}
        >
          Save
        </button>
      </div>
    </div>
  );
};

export default BannerManagement;
