// Controllers/ChatbotController.js
const Order = require("../models/Order");
const Store = require("../models/Store");
const { groq, chatModelName } = require("../config/groqConfig");
const { createEmbedding } = require("../services/translationService");
const {
  countProducts,
  countProductsByBrand,
  retrieveTopKProducts,
} = require("../services/productSearchService");
const {
  isProductIntent,
  isCountIntent,
  isStoreIntent,
} = require("../utils/intentDetection");
const {
  saveChatHistory,
  getChatHistory,
} = require("../services/chatHistoryService");
const {
  filterProductsByReply,
  findProductsFromReply,
} = require("../services/productMatchingService");

// ====== Main Controller ======
async function chatWithGroq(req, res) {
  console.log(
    "🚀🚀🚀 CHATBOT SERVICE - Chatbot/Controllers/ChatbotController.js - NEW CODE VERSION! 🚀🚀🚀"
  );
  const { message, userId } = req.body;
  if (!message) return res.status(400).json({ reply: "Thiếu message!" });

  let action = "chat";
  if (isStoreIntent(message)) action = "find_store";
  else if (isProductIntent(message)) action = "find_product";
  if (userId && message.toLowerCase().includes("đơn hàng"))
    action = "check_order";

  console.log("Action detected:", action);

  try {
    const history = await getChatHistory(userId);
    const historyText = history
      .map((h) => `${h.role === "user" ? "👤" : "🤖"} ${h.message}`)
      .join("\n");
    let reply = "Mình chưa hiểu ý bạn!";

    switch (action) {
      // --- FIND PRODUCT ---
      case "find_product": {
        // Dịch từ tiếng Việt sang tiếng Anh và lấy keywords
        const queryKeywords = await createEmbedding(message);

        // Log để debug
        console.log("Original message:", message);
        console.log("Translated keywords:", queryKeywords);

        if (!queryKeywords.length) {
          return res.json({
            reply: "Vui lòng nhập từ khóa tìm kiếm cụ thể hơn!",
            products: [],
          });
        }

        // Kiểm tra xem có phải câu hỏi về số lượng không
        const isCountQuestion = isCountIntent(message);
        console.log("Is count question:", isCountQuestion);

        // Đếm tổng số sản phẩm và theo brand (nếu là câu hỏi về số lượng)
        let totalCount = 0;
        let brandCounts = [];

        if (isCountQuestion) {
          totalCount = await countProducts(queryKeywords);
          brandCounts = await countProductsByBrand(queryKeywords);
          console.log("Total products count:", totalCount);
          console.log("Brand counts:", brandCounts);
        }

        // Tìm sản phẩm bằng từ khóa tiếng Anh đã dịch
        // Nếu là câu hỏi về số lượng, lấy nhiều sản phẩm hơn để hiển thị đầy đủ (tối đa 10)
        const productLimit =
          isCountQuestion && totalCount > 0 ? Math.min(totalCount, 10) : 5;
        const topProducts = await retrieveTopKProducts(queryKeywords, productLimit);

        console.log("Found products:", topProducts.length);

        // Xử lý trường hợp không tìm thấy sản phẩm
        if (topProducts.length === 0) {
          if (isCountQuestion && totalCount === 0) {
            reply = "Hiện tại không có sản phẩm nào phù hợp với yêu cầu của bạn.";
          } else {
            reply =
              "Mình không tìm thấy sản phẩm nào phù hợp. Bạn có thể thử tìm kiếm với từ khóa khác!";
          }

          if (userId) {
            await saveChatHistory(userId, "user", message);
            await saveChatHistory(userId, "bot", reply);
          }

          return res.json({
            reply,
            products: [],
          });
        }

        const dataText = topProducts
          .map((p) => {
            const metadata = p.metadata || {};
            const price = metadata.salePrice || metadata.price || 0;
            const discount = metadata.salePrice
              ? Math.round((1 - metadata.salePrice / metadata.price) * 100)
              : 0;
            const storeName = metadata.store?.name || "N/A";

            return `• ${metadata.name}
  - Thương hiệu: ${metadata.brand || "N/A"}
  - Danh mục: ${metadata.category || "N/A"}${metadata.subCategory ? ` (${metadata.subCategory})` : ""}
  - Giá: ${price.toLocaleString("vi-VN")}đ${discount > 0 ? ` (Giảm ${discount}%)` : ""}
  - Đánh giá: ⭐ ${metadata.rating?.toFixed(1) || 0} (${metadata.reviewsCount || 0} đánh giá)
  - Đã bán: ${metadata.soldCount || 0}
  - Cửa hàng: ${storeName}
  - Tồn kho: ${metadata.quantity || 0}${metadata.description ? `\n  - Mô tả: ${metadata.description.substring(0, 100)}${metadata.description.length > 100 ? "..." : ""}` : ""}`;
          })
          .join("\n\n");

        // Tạo thông tin về số lượng sản phẩm
        let countInfoText = "";
        if (isCountQuestion) {
          if (totalCount > 0) {
            countInfoText = `\n\n📊 THỐNG KÊ TỔNG QUAN:\n`;
            countInfoText += `Tổng số sản phẩm: ${totalCount}\n`;

            if (brandCounts.length > 0) {
              countInfoText += `\nSố lượng theo thương hiệu:\n`;
              brandCounts.forEach((item) => {
                countInfoText += `- ${item.brand}: ${item.count} sản phẩm\n`;
              });
            }
          } else {
            countInfoText = `\n\n📊 THỐNG KÊ: Không tìm thấy sản phẩm nào phù hợp.\n`;
          }
        }

        const prompt = `
Bạn là chatbot e-commerce thân thiện của ShopMduc247. 
Lịch sử trò chuyện:
${historyText || "(Không có tin nhắn trước đó)"}
${countInfoText}
Dữ liệu sản phẩm mẫu (hiển thị ${topProducts.length}/${totalCount > 0 ? totalCount : topProducts.length} sản phẩm):
${dataText || "Không có sản phẩm nào phù hợp."}

Người dùng hỏi: "${message}"
${
  isCountQuestion && totalCount > 0
    ? `\n⚠️ LƯU Ý QUAN TRỌNG: 
- Người dùng đang hỏi về SỐ LƯỢNG sản phẩm
- TỔNG SỐ LƯỢNG trong database: ${totalCount} sản phẩm
- Danh sách sản phẩm mẫu chỉ hiển thị ${topProducts.length} sản phẩm đầu tiên
- Bạn PHẢI trả lời về TỔNG SỐ LƯỢNG (${totalCount} sản phẩm) và liệt kê ĐẦY ĐỦ số lượng theo từng thương hiệu như đã cung cấp trong phần THỐNG KÊ TỔNG QUAN
- KHÔNG chỉ trả lời dựa trên danh sách mẫu ${topProducts.length} sản phẩm
- Ví dụ: "ShopMduc247 có tổng cộng ${totalCount} điện thoại: ${brandCounts.map((b) => `${b.count} ${b.brand}`).join(", ")}"
`
    : ""
}
Hãy trả lời ngắn gọn, thân thiện, tối đa 200 từ. ${isCountQuestion ? "Tập trung vào việc trả lời số lượng chính xác và đầy đủ theo từng thương hiệu." : "Tập trung vào gợi ý sản phẩm. Nhấn mạnh thông tin giá cả, đánh giá và cửa hàng."}
        `;

        try {
          const chatCompletion = await groq.chat.completions.create({
            messages: [
              {
                role: "system",
                content:
                  "Bạn là chatbot hỗ trợ khách hàng của ShopMduc247. Trả lời ngắn gọn, thân thiện bằng tiếng Việt.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            model: chatModelName,
            temperature: 0.2,
            max_tokens: 200,
          });

          reply = chatCompletion.choices[0]?.message?.content || reply;
        } catch (error) {
          console.error("Error calling Groq API:", error);
          // Fallback: tạo reply từ dữ liệu sản phẩm
          if (topProducts.length > 0) {
            reply = `Tôi tìm thấy ${topProducts.length} sản phẩm cho bạn:\n${topProducts
              .map((p, i) => {
                const metadata = p.metadata || {};
                const price = metadata.salePrice || metadata.price || 0;
                return `${i + 1}. ${metadata.name} - ${price.toLocaleString("vi-VN")}đ`;
              })
              .join("\n")}`;
          }
        }

        if (userId) {
          await saveChatHistory(userId, "user", message);
          await saveChatHistory(userId, "bot", reply);
        }

        // Lọc lại sản phẩm để chỉ giữ lại những sản phẩm khớp với câu trả lời
        console.log("=== FILTERING PRODUCTS BY REPLY ===");
        let filteredTopProducts = filterProductsByReply(topProducts, reply);
        
        // Nếu sau khi lọc không còn sản phẩm nào, thử tìm lại sản phẩm dựa trên câu trả lời
        if (filteredTopProducts.length === 0 && topProducts.length > 0) {
          console.log("No products matched reply, trying to find products from reply...");
          const productsFromReply = await findProductsFromReply(reply, productLimit);
          if (productsFromReply.length > 0) {
            filteredTopProducts = productsFromReply;
            console.log(`Found ${productsFromReply.length} products from reply`);
          } else {
            // Nếu vẫn không tìm thấy, giữ lại danh sách gốc
            filteredTopProducts = topProducts;
            console.log("No products found from reply, keeping original products");
          }
        }

        // Trả về full product data - ĐẢM BẢO luôn là objects, không phải strings
        console.log("=== BUILDING PRODUCTS DATA ===");
        console.log(
          "Top products structure:",
          filteredTopProducts.length,
          filteredTopProducts[0] ? Object.keys(filteredTopProducts[0]) : "empty"
        );

        const productsData = filteredTopProducts
          .filter((p) => {
            const hasMetadata = p && p.metadata;
            const hasId = hasMetadata && p.metadata._id;
            if (!hasId) {
              console.warn(
                "Filtering out product without _id:",
                p?.metadata?.name || "unknown"
              );
            }
            return hasId;
          })
          .map((p) => {
            const product = p.metadata;

            // Debug mỗi product
            if (!product._id) {
              console.error("ERROR: Product without _id in map:", product.name);
              return null;
            }

            const productData = {
              _id: product._id.toString(),
              name: product.name || "N/A",
              price: product.price || 0,
              salePrice: product.salePrice || null,
              images: Array.isArray(product.images) ? product.images : [],
              rating: product.rating || 0,
              reviewsCount: product.reviewsCount || 0,
              soldCount: product.soldCount || 0,
              brand: product.brand || null,
              category: product.category || null,
              description: product.description || null,
              store: product.store
                ? {
                    name: product.store.name || "N/A",
                    logoUrl: product.store.logoUrl || null,
                  }
                : null,
            };

            // Verify structure
            if (typeof productData._id !== "string" || !productData._id) {
              console.error("ERROR: Invalid _id in productData:", productData);
            }

            return productData;
          })
          .filter((p) => {
            const isValid = p && p._id && typeof p._id === "string";
            if (!isValid && p) {
              console.error("Filtering invalid product:", p);
            }
            return isValid;
          });

        // Debug: log products data trước khi trả về
        console.log("=== PRODUCTS DATA SUMMARY ===");
        console.log("Original products count:", topProducts.length);
        console.log("Filtered products count:", filteredTopProducts.length);
        console.log("Products data count:", productsData.length);
        console.log(
          "Products data type:",
          Array.isArray(productsData) ? "array" : typeof productsData
        );
        if (productsData.length > 0) {
          console.log("First product keys:", Object.keys(productsData[0]));
          console.log("First product _id type:", typeof productsData[0]._id);
          console.log(
            "First product sample:",
            JSON.stringify(productsData[0], null, 2)
          );
        } else {
          console.warn("⚠️ No valid products after filtering!");
          topProducts.forEach((p, i) => {
            console.log(`Product ${i}:`, {
              hasMetadata: !!p?.metadata,
              hasId: !!p?.metadata?._id,
              name: p?.metadata?.name || "unknown",
              idType: typeof p?.metadata?._id,
            });
          });
        }

        // Đảm bảo products luôn là array, không bao giờ undefined
        const response = {
          reply: reply || "Không thể tạo phản hồi",
          products: Array.isArray(productsData) ? productsData : [], // Đảm bảo luôn là array
        };

        console.log("=== FINAL RESPONSE ===");
        console.log("Reply length:", response.reply?.length || 0);
        console.log("Products array:", Array.isArray(response.products));
        console.log("Products count:", response.products?.length || 0);
        console.log("Full response keys:", Object.keys(response));

        if (response.products.length > 0) {
          console.log("Sample product:", {
            _id: response.products[0]._id,
            name: response.products[0].name,
            price: response.products[0].price,
          });
        }

        return res.json(response);
      }

      // --- CHECK ORDERS ---
      case "check_order": {
        if (!userId) {
          reply = "Bạn cần đăng nhập để xem trạng thái đơn hàng.";
          return res.json({ reply, orders: [] });
        }

        const orders = await Order.find({ userId })
          .sort({ createdAt: -1 })
          .limit(5);

        if (!orders.length) {
          reply = "Bạn chưa có đơn hàng nào.";
        } else {
          const statusMap = {
            pending: "Chờ xác nhận",
            confirmed: "Đã xác nhận",
            packed: "Đã đóng gói",
            shipped: "Đang vận chuyển",
            delivered: "Đã giao hàng",
            received: "Đã nhận hàng",
            cancelled: "Đã hủy",
          };

          const paymentStatusMap = {
            pending: "Chưa thanh toán",
            paid: "Đã thanh toán",
            failed: "Thanh toán thất bại",
          };

          reply =
            "Các đơn hàng gần đây của bạn:\n" +
            orders
              .map((o) => {
                const currentStatus =
                  o.statusHistory[o.statusHistory.length - 1]?.status ||
                  "pending";
                const statusText = statusMap[currentStatus] || currentStatus;
                const paymentStatus =
                  paymentStatusMap[o.paymentInfo?.status] || "N/A";
                return `• Mã: ${o.orderCode}\n  Trạng thái: ${statusText}\n  Thanh toán: ${paymentStatus}\n  Tổng tiền: ${o.total.toLocaleString("vi-VN")}đ\n  Ngày: ${o.createdAt.toLocaleString("vi-VN")}`;
              })
              .join("\n\n");
        }

        await saveChatHistory(userId, "user", message);
        await saveChatHistory(userId, "bot", reply);

        return res.json({ reply, orders });
      }

      // --- FIND STORE ---
      case "find_store": {
        const stores = await Store.find({ isActive: true });

        if (!stores.length) {
          reply = "Hiện tại không có cửa hàng nào hoạt động.";
          return res.json({ reply, stores: [] });
        }

        const dataText = stores
          .map((s) => {
            const categoryMap = {
              electronics: "Điện tử & Công nghệ",
              fashion: "Thời trang",
              home: "Đồ gia dụng",
              books: "Sách & Văn phòng phẩm",
              other: "Khác",
            };

            return `• ${s.name}
  - Danh mục: ${categoryMap[s.category] || s.category}${s.customCategory ? ` (${s.customCategory})` : ""}
  - Mô tả: ${s.description}
  - Địa chỉ: ${s.storeAddress}
  - Đánh giá: ⭐ ${s.rating?.toFixed(1) || 0}${s.contactPhone ? `\n  - Liên hệ: ${s.contactPhone}` : ""}`;
          })
          .join("\n\n");

        const prompt = `
Bạn là chatbot e-commerce thân thiện của ShopMduc247. 
Lịch sử trò chuyện:
${historyText || "(Không có tin nhắn trước đó)"}

Danh sách cửa hàng:
${dataText}

Người dùng hỏi: "${message}"
Hãy giới thiệu các cửa hàng phù hợp một cách ngắn gọn, thân thiện.
        `;

        try {
          const chatCompletion = await groq.chat.completions.create({
            messages: [
              {
                role: "system",
                content:
                  "Bạn là chatbot hỗ trợ khách hàng của ShopMduc247. Trả lời ngắn gọn, thân thiện bằng tiếng Việt.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            model: chatModelName,
            temperature: 0.3,
            max_tokens: 300,
          });

          reply = chatCompletion.choices[0]?.message?.content || reply;
        } catch (error) {
          console.error("Error calling Groq API:", error);
          reply = `Tôi tìm thấy ${stores.length} cửa hàng:\n${stores
            .map((s, i) => `${i + 1}. ${s.name} - ${s.category}`)
            .join("\n")}`;
        }

        if (userId) {
          await saveChatHistory(userId, "user", message);
          await saveChatHistory(userId, "bot", reply);
        }

        return res.json({
          reply,
          stores: stores.map((s) => ({
            id: s._id,
            name: s.name,
            category: s.category,
            description: s.description,
          })),
        });
      }

      // --- DEFAULT CHAT ---
      default: {
        const prompt = `
Bạn là chatbot e-commerce thân thiện của ShopMduc247.
Lịch sử trò chuyện:
${historyText || "(Không có lịch sử trước đó)"}

Người dùng vừa nói: "${message}"
Hãy phản hồi tự nhiên, ngắn gọn, thân thiện bằng tiếng Việt.
        `;

        try {
          const chatCompletion = await groq.chat.completions.create({
            messages: [
              {
                role: "system",
                content:
                  "Bạn là chatbot hỗ trợ khách hàng của ShopMduc247, một trang thương mại điện tử. Trả lời thân thiện, ngắn gọn bằng tiếng Việt. Nếu khách hàng hỏi về sản phẩm, hãy hướng dẫn họ cách tìm kiếm.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            model: chatModelName,
            temperature: 0.3,
            max_tokens: 300,
          });

          reply = chatCompletion.choices[0]?.message?.content || reply;
        } catch (error) {
          console.error("Error calling Groq API:", error);
          reply =
            "Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau hoặc liên hệ bộ phận hỗ trợ.";
        }

        if (userId) {
          await saveChatHistory(userId, "user", message);
          await saveChatHistory(userId, "bot", reply);
        }

        return res.json({ reply });
      }
    }
  } catch (err) {
    console.error("❌ Chatbot error:", err);
    return res.json({ reply: "Có lỗi xảy ra, thử lại sau nhé!" });
  }
}

module.exports = { chatWithGroq };
