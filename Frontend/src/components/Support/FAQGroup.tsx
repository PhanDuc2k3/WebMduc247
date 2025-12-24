import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

interface Question {
  q: string;
  a: string;
}

interface FAQGroupProps {
  category: string;
  questions: Question[];
  icon?: React.ElementType;
}

const FAQGroup: React.FC<FAQGroupProps> = ({ category, questions, icon: Icon }) => {
  const [openCategory, setOpenCategory] = useState(false);
  const [openQuestionIndex, setOpenQuestionIndex] = useState<number | null>(null);

  return (
    <div className="border rounded shadow-sm">
      {/* Category header */}
      <button
        onClick={() => setOpenCategory(!openCategory)}
        className="w-full flex items-center justify-between p-3 font-medium text-left hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center space-x-2">
          {Icon && <Icon className="text-[#2F5FEB]" size={20} />}
          <span>{category}</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${
            openCategory ? "rotate-180 text-[#2F5FEB]" : ""
          }`}
        />
      </button>

      {/* Questions list */}
      {openCategory && (
        <div className="p-3 space-y-2 bg-gray-50">
          {questions.map((qItem, idx) => (
            <div key={idx} className="border-b last:border-b-0">
              <button
                onClick={() =>
                  setOpenQuestionIndex(openQuestionIndex === idx ? null : idx)
                }
                className="w-full text-left py-2 flex justify-between items-center hover:bg-gray-100 transition-colors"
              >
                <span>{qItem.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${
                    openQuestionIndex === idx ? "rotate-180 text-[#2F5FEB]" : ""
                  }`}
                />
              </button>
              {openQuestionIndex === idx && (
                <p className="pl-2 py-2 text-gray-700">{qItem.a}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FAQGroup;
