import React, { useState } from "react";
import ProfileInfo from "../../components/ProfileInfo/ProfileInfo";
import ProfileTabs from "../../components/ProfileTabs/ProfileTabs";
import ProfileOrders from "../../components/ProfileOrders/ProfileOrders";
import ProfileFavorites from "../../components/ProfileFavorite/ProfileFavorites";
import ProfileSettings from "../../components/ProfileSettings/ProfileSetting";
import ProfileInfoDetail from "../../components/ProfileInfoDetail/ProfileInfoDetail";
const Profile: React.FC = () => {
  const [activeTab, setActiveTab] = useState("info");

  return (
    <div className="bg-[#f8f9fb] min-h-screen py-8">
      <div className="max-w-4xl mx-auto">
        <ProfileInfo />
        <ProfileTabs activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="mt-6">
          {activeTab === "info" && <ProfileInfoDetail />}
          {activeTab === "orders" && <ProfileOrders />}
          {activeTab === "favorites" && <ProfileFavorites />}
          {activeTab === "settings" && <ProfileSettings />}
        </div>
      </div>
    </div>
  );
};

export default Profile;