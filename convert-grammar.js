import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const excelFilePath = path.join(__dirname, 'grammar.xlsx'); 
const jsonFilePath = path.join(__dirname, 'src', 'data', 'grammar.json');

console.log("Đang đọc file Excel ngữ pháp...");

try {
  const workbook = xlsx.readFile(excelFilePath); 
  const sheetName = workbook.SheetNames[0]; 
  const worksheet = workbook.Sheets[sheetName];

  // --- SỬA Ở ĐÂY ---
  // range: 4 nghĩa là bỏ qua 4 dòng đầu tiên (dòng 0,1,2,3) và bắt đầu đọc từ dòng thứ 5
  const rawData = xlsx.utils.sheet_to_json(worksheet, { range: 4, defval: "" });
  // -----------------

  const formattedData = rawData.map(row => {
    // Tận dụng cách bạn đặt tên cột trong file (Giữ nguyên logic nhận diện thông minh của bạn)
    const question = row.question || row["Câu hỏi"] || row["Question"] || "";
    const ansA = row.optA || row["A"] || row["Đáp án A"] || "";
    const ansB = row.optB || row["B"] || row["Đáp án B"] || "";
    const ansC = row.optC || row["C"] || row["Đáp án C"] || "";
    const ansD = row.optD || row["D"] || row["Đáp án D"] || "";
    const answer = row.answer || row["Đáp án"] || row["Đáp án đúng"] || row["Answer"] || "";
    const explanation = row.explanation || row["Giải thích"] || row["Explanation"] || "Chưa có giải thích cho câu này.";

    return {
      question: question.toString().trim(),
      // Chỉ lấy các đáp án không rỗng
      options: [ansA, ansB, ansC, ansD].map(opt => opt.toString().trim()).filter(Boolean),
      answer: answer.toString().trim(),
      explanation: explanation.toString().trim()
    };
  })
  .filter(item => item.question !== ""); 

  fs.writeFileSync(jsonFilePath, JSON.stringify(formattedData, null, 2), 'utf-8');
  console.log(`✅ Thành công! Đã gom được ${formattedData.length} câu ngữ pháp vào data.`);

} catch (error) {
  console.error("❌ Lỗi:", error.message);
}