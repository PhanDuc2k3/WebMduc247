import React from 'react';

interface Props {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const QuickGuideCard: React.FC<Props> = ({ icon, title, description }) => {
  return (
    <div className="bg-[#f7f9fd] rounded-2xl border border-[#e8edf5] p-6 hover:shadow-lg hover:border-[#cdd6f5] cursor-pointer transition-all duration-300 flex flex-col items-center space-y-3 text-center group transform hover:-translate-y-1 animate-fade-in-up">
      {/* Icon trên */}
      <div className="w-16 h-16 bg-[#476de4] rounded-2xl flex items-center justify-center text-white shadow-md group-hover:rotate-3 transition-all duration-300">
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
