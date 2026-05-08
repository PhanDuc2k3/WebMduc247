import React from 'react';

const ContactForm = () => {
  return (
    <section className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border-2 border-gray-100 p-8 text-gray-800 space-y-6 animate-fade-in-up">
      {/* Tiêu đề */}
      <div>
        <h3 className="text-2xl font-black text-gray-900 mb-2">📋 Biểu mẫu liên hệ</h3>
        <p className="text-base text-gray-600 font-semibold">
          Điền thông tin bên dưới và chúng tôi sẽ phản hồi trong vòng 24 giờ
        </p>
      </div>

      {/* Form */}
      <form className="space-y-6">
        {/* Họ tên + Email cùng hàng */}
        <div className="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0">
          <div className="flex-1">
            <label className="block text-sm font-bold mb-2">
              Họ và tên <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Nguyễn Văn A"
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
              required
            />
          </div>

          <div className="flex-1">
            <label className="block text-sm font-bold mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              placeholder="email@example.com"
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold mb-2">
            Chủ đề <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="Nhập chủ đề"
            className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-bold mb-2">
            Nội dung <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={5}
            placeholder="Nhập nội dung yêu cầu"
            className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium"
            required
          ></textarea>
        </div>

        <button
          type="submit"
          className="w-full bg-[#4B5563] text-white px-8 py-4 rounded-xl hover:bg-[#374151] transition-all duration-300 font-black text-lg shadow-xl hover:shadow-2xl transform hover:scale-105"
        >
          Gửi yêu cầu
        </button>
      </form>
    </section>
  );
};

export default ContactForm;
