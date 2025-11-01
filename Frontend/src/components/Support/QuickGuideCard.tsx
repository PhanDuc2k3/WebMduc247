import React from 'react';

interface Props {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const QuickGuideCard: React.FC<Props> = ({ icon, title, description }) => {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-lg border-2 border-blue-100 p-6 hover:shadow-2xl hover:border-purple-300 cursor-pointer transition-all duration-300 flex flex-col items-center space-y-3 text-center group transform hover:-translate-y-2 hover:scale-105 animate-fade-in-up">
      {/* Icon trên */}
      <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-xl group-hover:shadow-2xl group-hover:rotate-12 transition-all duration-300">
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
