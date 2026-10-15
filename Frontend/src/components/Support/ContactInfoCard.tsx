import React from 'react';
import { Link } from 'react-router-dom';

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
    <div className="bg-white rounded-2xl border border-[#e8edf5] p-6 flex flex-col items-center text-center space-y-3 hover:border-[#cdd6f5] hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 group animate-fade-in-up">
      {/* Vòng tròn xung quanh icon */}
      <div
        className={`w-16 h-16 flex items-center justify-center rounded-full border-3 transition-all duration-300 group-hover:scale-110 shadow-lg`}
        style={{ backgroundColor: iconBgColor, borderColor: iconBorderColor }}
      >
        {icon}
      </div>

      <h3 className="text-lg font-black text-gray-900">{title}</h3>
      {title === 'Email' ? (
        <a className="text-sm sm:text-base font-bold text-[#476de4] contact-card-value" href={`mailto:${content}`}>{content}</a>
      ) : title === 'Hotline' ? (
        <a className="text-sm sm:text-base font-bold text-[#476de4] contact-card-value" href={`tel:${content.replace(/\s/g, '')}`}>{content}</a>
      ) : title === 'Trò chuyện trực tuyến' ? (
        <Link className="text-sm sm:text-base font-bold text-[#476de4] contact-card-value" to="/messages">{content}</Link>
      ) : (
        <p className="text-sm sm:text-base font-bold text-[#476de4] contact-card-value">{content}</p>
      )}
      {note && <p className="text-sm text-gray-600 font-semibold">{note}</p>}
    </div>
  );
};

export default ContactInfoCard;
