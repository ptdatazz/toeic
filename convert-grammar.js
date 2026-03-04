const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

// Đường dẫn tới file Excel và JSON
const excelFilePath = path.join(__dirname, 'grammar.xlsx'); 
const jsonFilePath = path.join(__dirname, 'src', 'data', 'grammar.json');

console.log("Đang đọc file Excel ngữ pháp...");

try {
  const workbook = xlsx.readFile(excelFilePath); 
  const sheetName = workbook.SheetNames[0]; 
  const worksheet = workbook.Sheets[sheetName];

  // Đọc dữ liệu, bỏ qua các ô trống rác
  const rawData = xlsx.utils.sheet_to_json(worksheet, { defval: "" });

  // In thử dòng đầu tiên ra màn hình để kiểm tra xem nó đọc đúng tên cột chưa
  // console.log("Dòng đầu tiên đọc được:", rawData[0]);

  const formattedData = rawData.map(row => {
    // Tự động nhận diện tên cột: Dù bạn dùng 'question' hay 'Câu hỏi' nó đều hiểu
    const question = row.question || row["Câu hỏi"] || row["Question"] || "";
    const ansA = row.optA || row["A"] || row["Đáp án A"] || "";
    const ansB = row.optB || row["B"] || row["Đáp án B"] || "";
    const ansC = row.optC || row["C"] || row["Đáp án C"] || "";
    const ansD = row.optD || row["D"] || row["Đáp án D"] || "";
    const answer = row.answer || row["Đáp án"] || row["Đáp án đúng"] || row["Answer"] || "";
    const explanation = row.explanation || row["Giải thích"] || row["Explanation"] || "Chưa có giải thích cho câu này.";

    return {
      question: question.toString().trim(),
      options: [ansA, ansB, ansC, ansD].map(opt => opt.toString().trim()).filter(Boolean),
      answer: answer.toString().trim(),
      explanation: explanation.toString().trim()
    };
  })
  // Lọc bỏ những dòng trống (những dòng không có câu hỏi)
  .filter(item => item.question !== ""); 

  fs.writeFileSync(jsonFilePath, JSON.stringify(formattedData, null, 2), 'utf-8');
  console.log(`✅ Thành công! Đã gom được ${formattedData.length} câu ngữ pháp xịn xò vào data.`);

} catch (error) {
  console.error("❌ Có lỗi xảy ra:", error.message);
  console.log("Gợi ý: Nhớ tắt file Excel đi trước khi chạy lệnh nhé!");
}