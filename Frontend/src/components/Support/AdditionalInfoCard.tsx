import React from 'react';
import { Clock, Mail, ShieldCheck } from 'lucide-react';

const AdditionalInfoCard = () => {
  const infoBlocks = [
    {
      title: 'Giờ làm việc',
      content: ['Thứ 2 - Thứ 7: 8:00 - 22:00', 'Chủ nhật: 9:00 - 20:00'],
      icon: <Clock size={24} className="text-green-700" />,
      bgColor: 'bg-green-50',
    },
    {
      title: 'Thời gian phản hồi',
      content: ['Email: Trong vòng 24 giờ', 'Hotline: Ngay lập tức', 'Chat: 2-5 phút'],
      icon: <Mail size={24} className="text-blue-700" />,
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Chính sách hỗ trợ',
      content: ['Miễn phí 100%', 'Hỗ trợ tận tình', 'Giải quyết nhanh chóng'],
      icon: <ShieldCheck size={24} className="text-purple-700" />,
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <section className="flex flex-col md:flex-row gap-4 max-w-6xl mx-auto p-6 text-gray-800 font-sans">
      {infoBlocks.map((block, idx) => (
        <div
          key={idx}
          className={`${block.bgColor} w-full md:w-1/3 p-6 rounded shadow flex flex-col space-y-2 transition transform hover:-translate-y-1 hover:shadow-lg`}
        >
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-3 rounded-full bg-white shadow-sm">
              {block.icon}
            </div>
            <h3 className="text-lg font-semibold">{block.title}</h3>
          </div>
          <div className="flex flex-col space-y-1 text-sm text-gray-700">
            {block.content.map((line, i) => (
              <span key={i}>{line}</span>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
};

export default AdditionalInfoCard;
