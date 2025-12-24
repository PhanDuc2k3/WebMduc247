import React from 'react';

interface Props {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const QuickGuideCard: React.FC<Props> = ({ icon, title, description }) => {
  return (
    <div className="bg-[#2F5FEB]/5 rounded-2xl shadow-lg border-2 border-[#2F5FEB]/30 p-6 hover:shadow-2xl hover:border-[#2F5FEB] cursor-pointer transition-all duration-300 flex flex-col items-center space-y-3 text-center group transform hover:-translate-y-2 hover:scale-105 animate-fade-in-up">
      {/* Icon trên */}
      <div className="w-16 h-16 bg-[#2F5FEB] rounded-2xl flex items-center justify-center text-white shadow-xl group-hover:shadow-2xl group-hover:rotate-6 transition-all duration-300">
        {icon}
      </div>

      {/* Title */}
      <p className="font-black text-gray-900 text-lg">{title}</p>

      {/* Description */}
      <p className="text-sm text-gray-700 font-medium leading-relaxed">{description}</p>
    </div>
  );
};

export default QuickGuideCard;
