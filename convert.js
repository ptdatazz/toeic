import fs from 'fs';
import chokidar from 'chokidar';
import { createRequire } from 'module';

// Sử dụng require để import xlsx tránh lỗi "is not a function" trong môi trường module
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

// Cấu hình đường dẫn chuẩn theo cây thư mục của bạn
const excelFilePath = './vocab.xlsx';
const jsonFilePath = './src/data/vocab.json';

const convertExcelToJson = () => {
  try {
    // Kiểm tra xem file vocab.xlsx có tồn tại chưa
    if (!fs.existsSync(excelFilePath)) {
      console.log(`⏳ Chưa tìm thấy file ${excelFilePath}. Đang chờ...`);
      return;
    }

    // Đọc file Excel
    const workbook = XLSX.readFile(excelFilePath);
    
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Dựa theo dữ liệu bạn tải lên trước đó, bỏ qua 4 dòng trống đầu tiên
    const data = XLSX.utils.sheet_to_json(sheet, { range: 4 });

    // Lọc lại các cột cần thiết và bỏ các dòng trống
    const vocabList = data
      .map(row => ({
        word: row.word,
        phonetic: row.phonetic,
        meaning: row.meaning,
        usage: row.usage
      }))
      .filter(item => item.word); // Chỉ lấy những dòng có chứa từ vựng

    // Ghi dữ liệu ra file JSON
    fs.writeFileSync(jsonFilePath, JSON.stringify(vocabList, null, 2), 'utf-8');
    console.log('✅ Đã cập nhật file src/data/vocab.json thành công!');
  } catch (error) {
    console.error('❌ Lỗi khi convert:', error.message);
  }
};

// Chạy convert lần đầu tiên
convertExcelToJson();

// Thiết lập theo dõi sự thay đổi của file vocab.xlsx
console.log(`👀 Đang theo dõi file ${excelFilePath}...`);
chokidar.watch(excelFilePath).on('change', () => {
  console.log(`🔄 Phát hiện file ${excelFilePath} có thay đổi, đang cập nhật...`);
  convertExcelToJson();
});