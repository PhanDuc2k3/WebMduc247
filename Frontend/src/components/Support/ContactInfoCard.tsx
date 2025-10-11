import React from 'react';

interface Props {
  title: string;
  content: string;
  note?: string;
  icon: React.ReactNode;
  iconBgColor: string;     // màu nền nhạt
  iconBorderColor: string; // màu viền vòng tròn (nhạt)
}

const ContactInfoCard: React.FC<Props> = ({ title, content, note, icon, iconBgColor, iconBorderColor }) => {
  return (
    <div className="bg-white shadow rounded p-4 flex flex-col items-center text-center space-y-2 hover:scale-105 transition-transform duration-300">
      {/* Vòng tròn xung quanh icon */}
      <div
        className={`w-14 h-14 flex items-center justify-center rounded-full border-2 transition-all duration-300`}
        style={{ backgroundColor: iconBgColor, borderColor: iconBorderColor }}
      >
        {icon}
      </div>

      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-blue-600 font-medium">{content}</p>
      {note && <p className="text-sm text-gray-500">{note}</p>}
    </div>
  );
};

export default ContactInfoCard;
