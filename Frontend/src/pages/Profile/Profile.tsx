import React, { useEffect, useState } from "react";
import ProfileInfo from "../../components/ProfileInfo/ProfileInfo";
import ProfileTabs from "../../components/ProfileTabs/ProfileTabs";
import ProfileOrders from "../../components/ProfileOrders/ProfileOrders";
import ProfileFavorites from "../../components/ProfileFavorite/ProfileFavorites";
import ProfileSettings from "../../components/ProfileSettings/ProfileSetting";
import ProfileInfoDetail from "../../components/ProfileInfoDetail/ProfileInfoDetail";

const Profile: React.FC = () => {
  const [activeTab, setActiveTab] = useState("info");
  const [isEditing, setIsEditing] = useState(false);
  const [user, setUser] = useState<any>(null);

  // fetch user 1 lần
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("http://localhost:5000/api/users/profile", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setUser(data.user))
      .catch((err) => console.error("Lỗi fetch user:", err));
  }, []);

  if (!user) return <div>Đang tải...</div>;

  return (
    <div className="bg-[#f8f9fb] min-h-screen py-8">
      <div className="max-w-4xl mx-auto">
        {/* ProfileInfo chỉ hiển thị user */}
        <ProfileInfo user={user} onEdit={() => setIsEditing(true)} />

        <ProfileTabs activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="mt-6">
          {activeTab === "info" && (
            <ProfileInfoDetail
              isEditing={isEditing}
              onCancel={() => setIsEditing(false)}
              onUpdated={(newUser) => {
                setUser(newUser);   // cập nhật state chung
                setIsEditing(false);
              }}
              user={user}           // truyền user xuống
            />
          )}
          {activeTab === "orders" && <ProfileOrders />}
          {activeTab === "favorites" && <ProfileFavorites />}
          {activeTab === "settings" && <ProfileSettings />}
        </div>
      </div>
    </div>
  );
};

export default Profile;
