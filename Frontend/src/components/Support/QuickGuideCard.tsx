import React from 'react';

interface Props {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const QuickGuideCard: React.FC<Props> = ({ icon, title, description }) => {
  return (
    <div className="bg-blue-50 p-4 rounded shadow hover:bg-blue-100 cursor-pointer transition-colors duration-300 flex flex-col items-center space-y-2 text-center">
      {/* Icon trên */}
      <div className="w-10 h-10 flex items-center justify-center text-blue-600">
        {icon}
      </div>

      {/* Title */}
      <p className="font-medium">{title}</p>

      {/* Description */}
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
};

export default QuickGuideCard;
