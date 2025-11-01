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
    <section className="flex flex-col md:flex-row gap-6 max-w-6xl mx-auto">
      {infoBlocks.map((block, idx) => (
        <div
          key={idx}
          className="bg-white w-full md:w-1/3 p-8 rounded-2xl shadow-xl border-2 border-gray-100 flex flex-col space-y-4 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl group animate-fade-in-up"
          style={{ animationDelay: `${idx * 0.1}s` }}
        >
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-white to-gray-50 shadow-lg group-hover:shadow-2xl transition-all duration-300 group-hover:scale-110">
              {block.icon}
            </div>
            <h3 className="text-xl font-black text-gray-900">{block.title}</h3>
          </div>
          <div className="flex flex-col space-y-2 text-sm text-gray-700 font-semibold">
            {block.content.map((line, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-lg">✓</span>
                <span>{line}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
};

export default AdditionalInfoCard;
