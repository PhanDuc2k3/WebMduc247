import React from 'react';

const ContactForm = () => {
  return (
    <section className="max-w mx-auto p-6 bg-white rounded shadow text-gray-800 font-sans space-y-6">
      {/* Tiêu đề */}
      <div>
        <h3 className="text-lg font-semibold">Biểu mẫu liên hệ</h3>
        <p className="text-sm text-gray-600">
          Điền thông tin bên dưới và chúng tôi sẽ phản hồi trong vòng 24 giờ
        </p>
      </div>

      {/* Form */}
      <form className="space-y-4">
        {/* Họ tên + Email cùng hàng */}
        <div className="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">
              Họ và tên <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Nguyễn Văn A"
              className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              placeholder="email@example.com"
              className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Chủ đề <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="Nhập chủ đề"
            className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Nội dung <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={5}
            placeholder="Nhập nội dung yêu cầu"
            className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          ></textarea>
        </div>

        <button
          type="submit"
          className="bg-black text-white px-6 py-2 rounded hover:bg-gray-900 transition"
        >
          Gửi yêu cầu
        </button>
      </form>
    </section>
  );
};

export default ContactForm;
