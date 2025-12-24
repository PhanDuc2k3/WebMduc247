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
    <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-100 p-6 flex flex-col items-center text-center space-y-3 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 group animate-fade-in-up">
      {/* Vòng tròn xung quanh icon */}
      <div
        className={`w-16 h-16 flex items-center justify-center rounded-full border-3 transition-all duration-300 group-hover:scale-110 shadow-lg`}
        style={{ backgroundColor: iconBgColor, borderColor: iconBorderColor }}
      >
        {icon}
      </div>

      <h3 className="text-lg font-black text-gray-900">{title}</h3>
      <p className="text-lg font-bold text-[#2F5FEB]">{content}</p>
      {note && <p className="text-sm text-gray-600 font-semibold">{note}</p>}
    </div>
  );
};

export default ContactInfoCard;
