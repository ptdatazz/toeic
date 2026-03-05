import { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import "./App.css";

// Import Firebase
import { auth, db } from "./firebase";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

// --- ÂM THANH HIỆU ỨNG (SFX) ---
const playSound = (type) => {
  let url = "";
  if (type === "correct") url = "https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3"; 
  else if (type === "wrong") url = "https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3"; 
  else if (type === "timeout") url = "https://assets.mixkit.co/active_storage/sfx/2570/2570-preview.mp3"; 
  else if (type === "finish") url = "https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3"; 
  else if (type === "click") url = "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3"; 
  
  if (url) {
    const audio = new Audio(url);
    audio.volume = type === "finish" ? 0.6 : (type === "click" ? 0.5 : 1.0);
    audio.play().catch(e => console.log("Trình duyệt chặn âm thanh:", e));
  }
};

// --- HÀM ĐỌC TỪ VỰNG (TEXT-TO-SPEECH) ---
const speakWord = (text) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel(); // Dừng câu trước nếu đang đọc dở
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US'; // Giọng Anh-Mỹ
    utterance.rate = 0.85;    // Đọc chậm rãi, rõ ràng
    window.speechSynthesis.speak(utterance);
  } else {
    alert("Trình duyệt của bạn không hỗ trợ tính năng đọc âm thanh!");
  }
};

// --- CÁC HÀM HỖ TRỢ CHUNG ---
const shuffleArray = (array) => [...array].sort(() => Math.random() - 0.5);

const getRandomWrongOptions = (fullData, count, currentWord) => {
  const wrongOptions = [];
  while (wrongOptions.length < count) {
    const randomIndex = Math.floor(Math.random() * fullData.length);
    const randomItem = fullData[randomIndex];
    if (randomItem.word !== currentWord && !wrongOptions.includes(randomItem.meaning)) {
      wrongOptions.push(randomItem.meaning);
    }
  }
  return wrongOptions;
};

const generateVocabQuestions = (selectedData, fullData) => {
  return selectedData.map((item) => {
    const wrongOptions = getRandomWrongOptions(fullData, 3, item.word);
    const options = shuffleArray([...wrongOptions, item.meaning]);
    return { ...item, options, answer: item.meaning };
  });
};

// --- COMPONENT: BẢNG HƯỚNG DẪN SỬ DỤNG ---
function WelcomeTutorial({ onDismiss }) {
  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.6)", zIndex: 999, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px", boxSizing: "border-box" }}>
      <div style={{ backgroundColor: "white", padding: "30px", borderRadius: "15px", maxWidth: "450px", width: "100%", textAlign: "center", boxShadow: "0 10px 30px rgba(0,0,0,0.2)", animation: "popIn 0.3s ease-out" }}>
        <h2 style={{ color: "#2c3e50", marginTop: 0, fontSize: "1.8rem" }}>Chào mừng bạn mới! 👋</h2>
        
        <div style={{ textAlign: "left", color: "#444", fontSize: "15px", lineHeight: "1.6", marginBottom: "25px" }}>
          <p><strong>🎯 Luật chơi để trở thành TOEIC Master:</strong></p>
          <ul style={{ paddingLeft: "20px" }}>
            <li style={{ marginBottom: "10px" }}><strong>Ôn Từ Vựng:</strong> Mỗi lượt 30 câu. Trả lời nhanh trong 10 giây. Làm sai sẽ bị phạt trộn câu đó lại làm đến khi nào đúng thì thôi!</li>
            <li style={{ marginBottom: "10px" }}><strong>Ôn Ngữ Pháp:</strong> Mỗi lượt 10 câu. Cứ làm từ từ suy nghĩ, chọn xong sẽ có giải thích chi tiết ngay bên dưới.</li>
            <li style={{ marginBottom: "10px" }}><strong>Nút Quay Lại:</strong> Bị khóa lúc đang làm bài. Bạn phải làm đúng <strong>3 câu liên tiếp</strong> (Streak 3) thì chìa khóa mới mở 🔓.</li>
            <li><strong>Nhạc Lofi:</strong> Góc trên bên trái dùng để bật nhạc chill chill trong lúc ở sảnh chờ.</li>
          </ul>
        </div>

        <button 
          onClick={() => { playSound("click"); onDismiss(); }} 
          style={{ width: "100%", padding: "12px", fontSize: "16px", backgroundColor: "#4CAF50", color: "white", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold" }}
        >
          🚀 Đã hiểu, Vào học ngay!
        </button>
      </div>

      <style>{`
        @keyframes popIn {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// --- COMPONENT: ĐĂNG NHẬP / ĐĂNG KÝ ---
function AuthScreen() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    playSound("click");
    setError("");
    setLoading(true);

    if (!email.trim() || !password.trim()) {
      setLoading(false);
      return setError("Vui lòng nhập đầy đủ Email và Mật khẩu!");
    }

    try {
      if (isLoginMode) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await setDoc(doc(db, "users", user.uid), {
          vocab: { correct: 0, total: 0 },
          grammar: { correct: 0, total: 0 }
        });
        alert("Đăng ký thành công!");
      }
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') setError("Email này đã được sử dụng!");
      else if (err.code === 'auth/invalid-credential') setError("Sai email hoặc mật khẩu!");
      else if (err.code === 'auth/weak-password') setError("Mật khẩu phải có ít nhất 6 ký tự!");
      else setError("Có lỗi xảy ra, vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ textAlign: "center", paddingTop: "50px", maxWidth: "400px" }}>
      <h1 style={{ fontSize: "2.5rem", marginBottom: "10px", color: "#2c3e50" }}>TOEIC Master 🚀</h1>
      <p style={{ color: "#7f8c8d", marginBottom: "30px" }}>Vui lòng đăng nhập để đồng bộ tiến độ</p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px", backgroundColor: "#f9f9f9", padding: "30px", borderRadius: "12px", boxShadow: "0 4px 10px rgba(0,0,0,0.1)" }}>
        <h2 style={{ margin: "0 0 15px 0", color: "#333" }}>{isLoginMode ? "Đăng Nhập" : "Tạo Tài Khoản"}</h2>
        {error && <div style={{ color: "red", backgroundColor: "#ffebee", padding: "10px", borderRadius: "5px", fontSize: "14px" }}>{error}</div>}
        <input type="email" placeholder="Nhập Email của bạn" value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: "12px", borderRadius: "8px", border: "1px solid #ccc", fontSize: "16px" }} />
        <input type="password" placeholder="Mật khẩu (ít nhất 6 ký tự)" value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: "12px", borderRadius: "8px", border: "1px solid #ccc", fontSize: "16px" }} />
        <button type="submit" disabled={loading} style={{ padding: "12px", fontSize: "18px", backgroundColor: loading ? "#9e9e9e" : "#4CAF50", color: "white", borderRadius: "8px", border: "none", cursor: loading ? "not-allowed" : "pointer", fontWeight: "bold", marginTop: "10px" }}>
          {loading ? "Đang xử lý..." : (isLoginMode ? "Vào Học Ngay" : "Đăng Ký")}
        </button>
        <p style={{ margin: "10px 0 0 0", fontSize: "14px", color: "#666" }}>
          {isLoginMode ? "Chưa có tài khoản?" : "Đã có tài khoản?"}{" "}
          <span onClick={() => { playSound("click"); setIsLoginMode(!isLoginMode); setError(""); }} style={{ color: "#2196F3", cursor: "pointer", fontWeight: "bold", textDecoration: "underline" }}>
            {isLoginMode ? "Đăng ký ngay" : "Đăng nhập"}
          </span>
        </p>
      </form>
    </div>
  );
}

// --- COMPONENT: CÀI ĐẶT TỪ VỰNG TRƯỚC KHI VÀO HỌC ---
function VocabSettings({ onStart, onBack }) {
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("toeic_vocab_settings");
    return saved ? JSON.parse(saved) : { quizLimit: 30, timePerQuestion: 10, requiredStreak: 3 };
  });

  const handleStart = () => {
    playSound("click");
    localStorage.setItem("toeic_vocab_settings", JSON.stringify(settings));
    onStart(settings);
  };

  return (
    <div className="container" style={{ textAlign: "center", paddingTop: "20px" }}>
      <h2 style={{ color: "#2c3e50", marginBottom: "5px" }}>⚙️ Cài đặt bài học</h2>
      <p style={{ color: "#7f8c8d", marginBottom: "25px", fontSize: "14px" }}>Tùy chỉnh độ khó cho phù hợp với bạn</p>

      <div style={{ backgroundColor: "#f9f9f9", padding: "20px", borderRadius: "12px", border: "1px solid #eee", textAlign: "left", marginBottom: "25px" }}>
        
        <div style={{ marginBottom: "20px" }}>
          <label style={{ fontWeight: "bold", color: "#333", display: "block", marginBottom: "8px" }}>
            📚 Số lượng từ vựng mỗi lượt: <span style={{ color: "#4CAF50" }}>{settings.quizLimit} câu</span>
          </label>
          <input 
            type="range" min="5" max="100" step="5" 
            value={settings.quizLimit} 
            onChange={(e) => setSettings({...settings, quizLimit: parseInt(e.target.value)})} 
            style={{ width: "100%", cursor: "pointer" }} 
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#888", marginTop: "5px" }}>
            <span>5 câu</span><span>100 câu</span>
          </div>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ fontWeight: "bold", color: "#333", display: "block", marginBottom: "8px" }}>
            ⏱️ Thời gian chọn đáp án: <span style={{ color: "#FF9800" }}>{settings.timePerQuestion} giây</span>
          </label>
          <input 
            type="range" min="3" max="30" step="1" 
            value={settings.timePerQuestion} 
            onChange={(e) => setSettings({...settings, timePerQuestion: parseInt(e.target.value)})} 
            style={{ width: "100%", cursor: "pointer" }} 
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#888", marginTop: "5px" }}>
            <span>3s (Siêu khó)</span><span>30s (Dễ)</span>
          </div>
        </div>

        <div>
          <label style={{ fontWeight: "bold", color: "#333", display: "block", marginBottom: "8px" }}>
            🔓 Số câu đúng liên tiếp để mở khóa nút Quay lại: <span style={{ color: "#2196F3" }}>{settings.requiredStreak} câu</span>
          </label>
          <input 
            type="range" min="1" max="10" step="1" 
            value={settings.requiredStreak} 
            onChange={(e) => setSettings({...settings, requiredStreak: parseInt(e.target.value)})} 
            style={{ width: "100%", cursor: "pointer" }} 
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#888", marginTop: "5px" }}>
            <span>1 câu</span><span>10 câu</span>
          </div>
        </div>

      </div>

      <button onClick={handleStart} style={{ width: "100%", padding: "15px", fontSize: "18px", backgroundColor: "#4CAF50", color: "white", borderRadius: "10px", border: "none", cursor: "pointer", fontWeight: "bold", boxShadow: "0 4px 6px rgba(0,0,0,0.1)", marginBottom: "15px" }}>
        🚀 Bắt đầu học ngay!
      </button>
      <button onClick={() => { playSound("click"); onBack(); }} style={{ width: "100%", padding: "10px", fontSize: "16px", backgroundColor: "#e0e0e0", color: "#555", borderRadius: "10px", border: "none", cursor: "pointer", fontWeight: "bold" }}>
        Trở về sảnh
      </button>
    </div>
  );
}


// --- COMPONENT: ÔN TỪ VỰNG CHÍNH ---
function VocabQuiz({ onBack, updateGlobal, settings }) {
  const QUIZ_LIMIT = settings.quizLimit;
  const TIME_PER_QUESTION = settings.timePerQuestion;
  const REQUIRED_STREAK = settings.requiredStreak; 

  const [questionsData, setQuestionsData] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const [current, setCurrent] = useState(() => parseInt(localStorage.getItem("toeic_vocab_c_temp")) || 0);
  const [score, setScore] = useState(() => parseInt(localStorage.getItem("toeic_vocab_s_temp")) || 0);

  useEffect(() => {
    const fetchVocabFromSheets = async () => {
      try {
        const saved = localStorage.getItem("toeic_vocab_q_temp");
        if (saved) {
          setQuestionsData(JSON.parse(saved));
          setLoadingData(false);
          return; 
        }

        const SHEET_ID = "1nAdOxZBZ3-Bawh3Ks54KaIYLPgGZfTuchebwbCYW8dU";
        const SHEET_NAME = "Vocab"; 

        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&headers=1&sheet=${SHEET_NAME}`;
        
        const response = await fetch(url);
        const text = await response.text();
        const jsonString = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
        const result = JSON.parse(jsonString);

        const headers = result.table.cols.map(col => col.label);
        const fullData = result.table.rows.map(row => {
          let obj = {};
          headers.forEach((header, index) => {
            obj[header] = (row.c[index] && row.c[index].v) ? row.c[index].v.toString() : "";
          });
          return obj;
        });

        if (fullData.length === 0) {
          alert("Cảnh báo: Không đọc được dòng chữ nào từ Google Sheets! Hãy kiểm tra lại tên Sheet");
          return;
        }

        const randomSubset = shuffleArray(fullData).slice(0, QUIZ_LIMIT);
        const formattedData = generateVocabQuestions(randomSubset, fullData);

        setQuestionsData(formattedData);
      } catch (error) {
        console.error("Lỗi đồng bộ từ vựng:", error);
      } finally {
        setLoadingData(false);
      }
    };

    fetchVocabFromSheets();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loadingData && questionsData.length > 0) {
      localStorage.setItem("toeic_vocab_q_temp", JSON.stringify(questionsData));
      localStorage.setItem("toeic_vocab_c_temp", current);
      localStorage.setItem("toeic_vocab_s_temp", score);
    }
  }, [questionsData, current, score, loadingData]);

  const clearStorageAndExit = () => {
    localStorage.removeItem("toeic_vocab_q_temp");
    localStorage.removeItem("toeic_vocab_c_temp");
    localStorage.removeItem("toeic_vocab_s_temp");
    onBack();
  };

  const [selected, setSelected] = useState(null);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (selected !== null || timeLeft <= 0 || loadingData) return;
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, selected, loadingData]);

  useEffect(() => {
    if (timeLeft === 0 && selected === null) handleAnswer(null); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, selected]);

  const cheers = ["Tuyệt vời! 🎉", "Chính xác! 🚀", "Giỏi quá! ⭐", "Xuất sắc! 🔥"];
  const encourages = ["Không sao, thử lại sau nhé! 💪", "Cố lên, sai để nhớ lâu hơn! 🌱", "Gần đúng rồi! 😅"];

  const handleAnswer = (option) => {
    const isTimeout = !option || option === "TIMEOUT";
    const actualOption = isTimeout ? "TIMEOUT" : option;
    setSelected(actualOption);

    const isCorrect = !isTimeout && actualOption === questionsData[current].answer;
    updateGlobal("vocab", isCorrect);

    if (isCorrect) {
      playSound("correct");
      setScore(score + 1);
      setStreak(prev => prev + 1); 
      setFeedbackMsg(cheers[Math.floor(Math.random() * cheers.length)]);
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    } else {
      playSound(isTimeout ? "timeout" : "wrong");
      setStreak(0); 
      setFeedbackMsg(isTimeout ? "⏰ Hết giờ mất rồi!" : encourages[Math.floor(Math.random() * encourages.length)]);
      
      setQuestionsData((prev) => {
        const newData = [...prev];
        const remaining = newData.length - current - 1;
        let insertIndex = newData.length; 
        if (remaining > 5) insertIndex = current + 3 + Math.floor(Math.random() * (remaining - 2));
        newData.splice(insertIndex, 0, newData[current]);
        return newData;
      });
    }
  };

  const nextQuestion = () => {
    playSound("click");
    setSelected(null);
    setFeedbackMsg(""); 
    const nextIdx = current + 1;
    setCurrent(nextIdx);
    setTimeLeft(TIME_PER_QUESTION); 
    
    if (nextIdx >= questionsData.length) playSound("finish");
  };

  if (loadingData) {
    return <div className="container" style={{ textAlign: "center", paddingTop: "50px" }}><h2>Đang kết nối kho từ vựng đám mây... ☁️</h2></div>;
  }

  if (current >= questionsData.length) {
    confetti({ particleCount: 300, spread: 150, origin: { y: 0.4 } });
    const wrongCount = current - score;
    const ratio = Math.round((score / current) * 100) || 0;

    return (
      <div className="container" style={{ textAlign: "center" }}>
        <h1>Hoàn thành 🎉</h1>
        <h2>Bạn đã ôn tập xong phiên này!</h2>
        <div style={{ margin: "20px auto", padding: "20px", backgroundColor: "#f9f9f9", borderRadius: "12px", maxWidth: "300px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", border: "1px solid #eee" }}>
          <p style={{ fontSize: "18px", margin: "10px 0", color: "#4CAF50", fontWeight: "bold" }}>✅ Trả lời đúng: {score}</p>
          <p style={{ fontSize: "18px", margin: "10px 0", color: "#F44336", fontWeight: "bold" }}>❌ Trả lời sai: {wrongCount}</p>
          <hr style={{ border: "0", borderTop: "1px solid #ddd", margin: "15px 0" }} />
          <h3 style={{ margin: 0, color: ratio >= 50 ? "#4CAF50" : "#FF9800" }}>🎯 Tỷ lệ chính xác: {ratio}%</h3>
        </div>
        <button className="next" onClick={() => { playSound("click"); clearStorageAndExit(); }}>Về trang chủ</button>
      </div>
    );
  }

  const currentQ = questionsData[current];
  const timePercentage = (timeLeft / TIME_PER_QUESTION) * 100;

  return (
    <div className="container">
      {/* THANH THÔNG TIN: QUAY LẠI - CỤM LOA & ĐỒNG HỒ - TIẾN ĐỘ (ĐÃ TỐI GIẢN) */}
      <div style={{ position: "relative", display: "flex", justifyContent: "center", alignItems: "center", width: "100%", height: "40px", marginBottom: "15px" }}>
        
        {/* Nút Quay Lại */}
        <button 
          onClick={() => { 
            if(streak >= REQUIRED_STREAK) {
              playSound("click");
              clearStorageAndExit();
            }
          }} 
          style={{ position: "absolute", left: "0", width: "max-content", padding: "5px 8px", fontSize: "14px", cursor: streak >= REQUIRED_STREAK ? "pointer" : "not-allowed", backgroundColor: streak >= REQUIRED_STREAK ? "#e8f5e9" : "#f0f0f0", color: streak >= REQUIRED_STREAK ? "#2e7d32" : "#999", border: "1px solid #ccc", borderRadius: "5px", whiteSpace: "nowrap", fontWeight: "bold", zIndex: 10 }}
        >
          ⬅ {streak >= REQUIRED_STREAK ? "🔓" : `🔒 ${streak}/${REQUIRED_STREAK}`}
        </button>

        {/* Cụm Giữa: Nút Loa Đọc Từ Vựng & Đồng Hồ */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "#fff", padding: "4px 10px", borderRadius: "20px", boxShadow: "0 2px 5px rgba(0,0,0,0.05)", border: "1px solid #eee", zIndex: 5 }}>
          <button 
            onClick={() => speakWord(currentQ.word)}
            title="Nghe phát âm (Chuẩn Anh-Mỹ)"
            style={{ width: "32px", height: "32px", borderRadius: "50%", border: "1px solid #bbdefb", backgroundColor: "#e3f2fd", color: "#1976D2", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "16px", padding: 0, margin: 0, transition: "0.2s" }}
            onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.1)"}
            onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            🔊
          </button>
          <span style={{ fontWeight: "bold", color: timeLeft <= 3 ? "#f44336" : "#333", fontSize: "16px", minWidth: "40px", textAlign: "left" }}>
            ⏱️ {timeLeft}s
          </span>
        </div>

        {/* Tiến độ */}
        <span style={{ position: "absolute", right: "0", color: "#666", fontSize: "14px", whiteSpace: "nowrap", fontWeight: "bold" }}>
          {current + 1}/{questionsData.length}
        </span>

      </div>

      <div style={{ width: "100%", height: "8px", backgroundColor: "#e0e0e0", borderRadius: "4px", overflow: "hidden", marginBottom: "20px" }}>
        <div style={{ height: "100%", width: `${timePercentage}%`, backgroundColor: timeLeft <= 3 ? "#f44336" : "#4caf50", transition: "width 1s linear" }} />
      </div>

      <h2 style={{ fontSize: "24px", color: "#2c3e50" }}>What does "{currentQ.word}" mean?</h2>
      <p style={{ fontSize: "18px", color: "#555", marginBottom: "20px" }}><strong><i>{currentQ.phonetic}</i></strong></p>

      <div className="options">
        {currentQ.options.map((option, idx) => (
          <button key={idx} onClick={() => handleAnswer(option)} className={selected ? (option === currentQ.answer ? "correct" : option === selected ? "wrong" : "") : ""} disabled={selected !== null}>
            {option}
          </button>
        ))}
      </div>

      {selected && (
        <>
          <div style={{ marginTop: "15px", padding: "12px", borderRadius: "8px", backgroundColor: selected === currentQ.answer ? "#e8f5e9" : "#ffebee", color: selected === currentQ.answer ? "#2e7d32" : "#c62828", fontWeight: "bold", fontSize: "18px", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)" }}>
            {selected === "TIMEOUT" ? "⏰ Hết giờ mất rồi!" : feedbackMsg}
          </div>
          <div style={{ marginTop: "15px", padding: "15px", backgroundColor: "#f8f9fa", borderRadius: "8px", borderLeft: "4px solid #90caf9", textAlign: "left" }}>
            <p style={{ margin: 0, fontSize: "16px", color: "#333", lineHeight: "1.5" }}><strong>📌 Ngữ cảnh dùng:</strong> <br/>{currentQ.usage}</p>
          </div>
          <button className="next" onClick={nextQuestion} style={{ marginTop: "20px", width: "100%", padding: "15px", fontSize: "18px", fontWeight: "bold", borderRadius: "10px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
            Câu tiếp theo ➡️
          </button>
        </>
      )}
    </div>
  );
}

// --- COMPONENT: ÔN NGỮ PHÁP ---
function GrammarQuiz({ onBack, updateGlobal }) {
  const GRAMMAR_LIMIT = 10; 
  const REQUIRED_STREAK = 3; 

  const [questionsData, setQuestionsData] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const [current, setCurrent] = useState(() => parseInt(localStorage.getItem("toeic_grammar_c_temp")) || 0);
  const [score, setScore] = useState(() => parseInt(localStorage.getItem("toeic_grammar_s_temp")) || 0);

  useEffect(() => {
    const fetchGrammarFromSheets = async () => {
      try {
        const saved = localStorage.getItem("toeic_grammar_q_temp");
        if (saved) {
          setQuestionsData(JSON.parse(saved));
          setLoadingData(false);
          return;
        }

        const SHEET_ID = "1nAdOxZBZ3-Bawh3Ks54KaIYLPgGZfTuchebwbCYW8dU";
        const SHEET_NAME = "Grammar"; 

        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&headers=1&sheet=${SHEET_NAME}`;
        
        const response = await fetch(url);
        const text = await response.text();

        const jsonString = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
        const result = JSON.parse(jsonString);

        const headers = result.table.cols.map(col => col.label);
        const rawData = result.table.rows.map(row => {
          let obj = {};
          headers.forEach((header, index) => {
            obj[header] = (row.c[index] && row.c[index].v) ? row.c[index].v.toString() : "";
          });
          return obj;
        });

        const formattedData = rawData.map(item => {
          const question = item.question || item["Câu hỏi"] || item["Question"] || "";
          const ansA = item.optA || item["A"] || item["Đáp án A"] || "";
          const ansB = item.optB || item["B"] || item["Đáp án B"] || "";
          const ansC = item.optC || item["C"] || item["Đáp án C"] || "";
          const ansD = item.optD || item["D"] || item["Đáp án D"] || "";
          const answer = item.answer || item["Đáp án"] || item["Đáp án đúng"] || item["Answer"] || "";
          const explanation = item.explanation || item["Giải thích"] || item["Explanation"] || "Chưa có giải thích chi tiết.";

          return {
            question: question.trim(),
            options: [ansA, ansB, ansC, ansD].map(opt => opt.trim()).filter(Boolean),
            answer: answer.trim(),
            explanation: explanation.trim()
          };
        }).filter(item => item.question !== "");

        if (formattedData.length === 0) {
          alert("Chưa có dữ liệu Ngữ pháp! Hãy kiểm tra sheet 'Grammar'.");
          return;
        }

        const randomSubset = shuffleArray(formattedData).slice(0, GRAMMAR_LIMIT);
        setQuestionsData(randomSubset);
      } catch (error) {
        console.error("Lỗi đồng bộ ngữ pháp:", error);
      } finally {
        setLoadingData(false);
      }
    };

    fetchGrammarFromSheets();
  }, []);

  useEffect(() => {
    if (!loadingData && questionsData.length > 0) {
      localStorage.setItem("toeic_grammar_q_temp", JSON.stringify(questionsData));
      localStorage.setItem("toeic_grammar_c_temp", current);
      localStorage.setItem("toeic_grammar_s_temp", score);
    }
  }, [questionsData, current, score, loadingData]);

  const clearStorageAndExit = () => {
    localStorage.removeItem("toeic_grammar_q_temp");
    localStorage.removeItem("toeic_grammar_c_temp");
    localStorage.removeItem("toeic_grammar_s_temp");
    onBack();
  };

  const [selected, setSelected] = useState(null);
  const [streak, setStreak] = useState(0);

  const handleAnswer = (option) => {
    setSelected(option);
    const isCorrect = option === questionsData[current].answer;
    
    updateGlobal("grammar", isCorrect);

    if (isCorrect) {
      playSound("correct");
      setScore(score + 1);
      setStreak(prev => prev + 1); 
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } else {
      playSound("wrong");
      setStreak(0); 
    }
  };

  const nextQuestion = () => {
    playSound("click");
    setSelected(null);
    const nextIdx = current + 1;
    setCurrent(nextIdx);
    
    if (nextIdx >= questionsData.length) playSound("finish");
  };

  if (loadingData) {
    return <div className="container" style={{ textAlign: "center", paddingTop: "50px" }}><h2>Đang tải bộ câu hỏi Ngữ pháp... ☁️</h2></div>;
  }

  if (current >= questionsData.length) {
    confetti({ particleCount: 300, spread: 150, origin: { y: 0.4 } });
    const wrongCount = current - score;
    const ratio = Math.round((score / current) * 100) || 0;

    return (
      <div className="container" style={{ textAlign: "center" }}>
        <h1>Hoàn thành 🎉</h1>
        <h2>Bạn đã hoàn thành {questionsData.length} câu Ngữ pháp!</h2>
        <div style={{ margin: "20px auto", padding: "20px", backgroundColor: "#f9f9f9", borderRadius: "12px", maxWidth: "300px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", border: "1px solid #eee" }}>
          <p style={{ fontSize: "18px", margin: "10px 0", color: "#2196F3", fontWeight: "bold" }}>✅ Trả lời đúng: {score}</p>
          <p style={{ fontSize: "18px", margin: "10px 0", color: "#F44336", fontWeight: "bold" }}>❌ Trả lời sai: {wrongCount}</p>
          <hr style={{ border: "0", borderTop: "1px solid #ddd", margin: "15px 0" }} />
          <h3 style={{ margin: 0, color: ratio >= 50 ? "#2196F3" : "#FF9800" }}>🎯 Tỷ lệ chính xác: {ratio}%</h3>
        </div>
        <button className="next" onClick={() => { playSound("click"); clearStorageAndExit(); }}>Về trang chủ</button>
      </div>
    );
  }

  const currentQ = questionsData[current];

  return (
    <div className="container">
      {/* THANH THÔNG TIN QUAY LẠI - NGỮ PHÁP (TỐI GIẢN) */}
      <div style={{ position: "relative", display: "flex", justifyContent: "center", alignItems: "center", width: "100%", height: "40px", marginBottom: "20px" }}>
        
        {/* Nút Quay Lại */}
        <button 
          onClick={() => { 
            if(streak >= REQUIRED_STREAK) {
              playSound("click");
              clearStorageAndExit();
            }
          }} 
          style={{ position: "absolute", left: "0", width: "max-content", padding: "5px 8px", fontSize: "14px", cursor: streak >= REQUIRED_STREAK ? "pointer" : "not-allowed", backgroundColor: streak >= REQUIRED_STREAK ? "#e8f5e9" : "#f0f0f0", color: streak >= REQUIRED_STREAK ? "#2e7d32" : "#999", border: "1px solid #ccc", borderRadius: "5px", whiteSpace: "nowrap", fontWeight: "bold", zIndex: 10 }}
        >
          ⬅ {streak >= REQUIRED_STREAK ? "🔓" : `🔒 ${streak}/${REQUIRED_STREAK}`}
        </button>

        {/* Tiến độ */}
        <span style={{ position: "absolute", right: "0", color: "#666", fontSize: "14px", whiteSpace: "nowrap", fontWeight: "bold" }}>
          {current + 1}/{questionsData.length}
        </span>

      </div>

      <h2 style={{ lineHeight: "1.5" }}>{currentQ.question}</h2>

      <div className="options">
        {currentQ.options.map((option, idx) => (
          <button key={idx} onClick={() => handleAnswer(option)} className={selected ? (option === currentQ.answer ? "correct" : option === selected ? "wrong" : "") : ""} disabled={selected !== null}>
            {option}
          </button>
        ))}
      </div>

      {selected && (
        <div style={{ marginTop: "20px", textAlign: "left", backgroundColor: "#f9f9f9", padding: "20px", borderRadius: "8px", borderLeft: "5px solid #2196F3" }}>
          <h4 style={{ margin: "0 0 10px 0", color: "#2196F3", fontSize: "20px" }}>💡 Giải thích:</h4>
          <p style={{ margin: 0, fontSize: "18px", lineHeight: "1.6" }}>{currentQ.explanation}</p>
          <button className="next" onClick={nextQuestion} style={{ width: "100%", marginTop: "20px", fontSize: "18px" }}>Câu tiếp theo</button>
        </div>
      )}
    </div>
  );
}

// --- ĐƯA BỘ MÁY NHẠC RA NGOÀI ---
const BGM_PLAYLIST = [
  "/music/1.mp3",       
  "/music/2.mp3",    
  "/music/3.mp3",    
  "/music/4.mp3",        
  "/music/5.mp3",     
  "/music/6.mp3",     
  "/music/7.mp3",     
  "/music/8.mp3", 
  "/music/9.mp3"
];

const globalBgm = new Audio();
globalBgm.loop = false;

// --- COMPONENT: APP CHÍNH ---
function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [screen, setScreen] = useState("home"); 
  const [vocabSettings, setVocabSettings] = useState(null);
  
  const [showTutorial, setShowTutorial] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(true); 
  const [currentTrackIndex, setCurrentTrackIndex] = useState(Math.floor(Math.random() * BGM_PLAYLIST.length));
  const [volume, setVolume] = useState(0.4); 

  const forcePlayMusic = () => {
    if (isMusicPlaying) {
      if (!globalBgm.src || !globalBgm.src.includes(BGM_PLAYLIST[currentTrackIndex])) {
        globalBgm.src = BGM_PLAYLIST[currentTrackIndex];
      }
      globalBgm.play().catch(e => console.log("Trình duyệt đợi tương tác: ", e));
    }
  };

  useEffect(() => {
    if (currentUser) {
      const hasSeenTutorial = localStorage.getItem("toeic_tutorial_seen");
      if (!hasSeenTutorial) {
        setShowTutorial(true);
      } else {
        forcePlayMusic();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  useEffect(() => {
    globalBgm.volume = volume;
  }, [volume]);

  // Mắt thần tự động dừng nhạc khi thu nhỏ web
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        globalBgm.pause();
      } else {
        if (isMusicPlaying && screen === "home" && !showTutorial && currentUser) {
          globalBgm.play().catch(e => console.log("Lỗi bật lại nhạc: ", e));
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isMusicPlaying, screen, showTutorial, currentUser]);

  useEffect(() => {
    const handleEnded = () => {
      setCurrentTrackIndex((prev) => (prev + 1) % BGM_PLAYLIST.length);
    };
    globalBgm.addEventListener("ended", handleEnded);
    return () => globalBgm.removeEventListener("ended", handleEnded);
  }, []);

  useEffect(() => {
    globalBgm.src = BGM_PLAYLIST[currentTrackIndex];
    if (isMusicPlaying && screen === "home" && !showTutorial) {
      globalBgm.play().catch(e => console.log("Đợi tương tác..."));
    }
  }, [currentTrackIndex, isMusicPlaying, screen, showTutorial]);

  useEffect(() => {
    if (screen === "home" && isMusicPlaying && !showTutorial && currentUser) {
      globalBgm.play().catch(e => console.log("Đợi tương tác..."));
    } else {
      globalBgm.pause();
    }
  }, [screen, isMusicPlaying, showTutorial, currentUser]);

  const toggleMusic = () => {
    playSound("click");
    if (isMusicPlaying) {
      globalBgm.pause();
    } else {
      globalBgm.play().catch(() => alert("Vui lòng click nhẹ vào màn hình 1 cái rồi bật lại nhạc nhé!"));
    }
    setIsMusicPlaying(!isMusicPlaying);
  };

  const playNextTrack = () => {
    playSound("click");
    setCurrentTrackIndex((prev) => (prev + 1) % BGM_PLAYLIST.length);
    if (!isMusicPlaying) setIsMusicPlaying(true);
  };
  
  const [globalStats, setGlobalStats] = useState({
    vocab: { correct: 0, total: 0 },
    grammar: { correct: 0, total: 0 }
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setGlobalStats(docSnap.data());
        }
      } else {
        setCurrentUser(null);
      }
      setAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  const disableRightClick = (e) => e.preventDefault();

  const handleLogout = async () => {
    playSound("click");
    await signOut(auth);
    setCurrentUser(null);
    globalBgm.pause(); 
    setIsMusicPlaying(false);
  };

  const updateGlobalStats = async (type, isCorrect) => {
    if (!currentUser) return;
    setGlobalStats(prev => {
      const newStats = { 
        ...prev, 
        [type]: { correct: prev[type].correct + (isCorrect ? 1 : 0), total: prev[type].total + 1 } 
      };
      setDoc(doc(db, "users", currentUser.uid), newStats, { merge: true });
      return newStats;
    });
  };

  if (authChecking) {
    return <div style={{textAlign:"center", marginTop:"100px"}}><h2>Đang kết nối hệ thống... ⏳</h2></div>;
  }

  if (!currentUser) {
    return (
      <div onContextMenu={disableRightClick} onClick={forcePlayMusic}>
        <AuthScreen />
      </div>
    );
  }

  if (screen === "vocab_settings") {
    return (
      <div onContextMenu={disableRightClick}>
        <VocabSettings 
          onBack={() => setScreen("home")} 
          onStart={(settingsConfig) => {
            setVocabSettings(settingsConfig); 
            setScreen("vocab"); 
          }} 
        />
      </div>
    );
  }

  if (screen === "vocab") return <VocabQuiz onBack={() => { playSound("click"); setScreen("home"); }} updateGlobal={updateGlobalStats} settings={vocabSettings} />;
  if (screen === "grammar") return <GrammarQuiz onBack={() => { playSound("click"); setScreen("home"); }} updateGlobal={updateGlobalStats} />;

  const vocabTotal = globalStats.vocab.total;
  const vocabCorrect = globalStats.vocab.correct;
  const vocabRatio = vocabTotal > 0 ? Math.round((vocabCorrect / vocabTotal) * 100) : 0;

  const grammarTotal = globalStats.grammar.total;
  const grammarCorrect = globalStats.grammar.correct;
  const grammarRatio = grammarTotal > 0 ? Math.round((grammarCorrect / grammarTotal) * 100) : 0;

  return (
    <div className="container" onContextMenu={disableRightClick} style={{ textAlign: "center", paddingTop: "20px", maxWidth: "450px" }}>
      
      {showTutorial && (
        <WelcomeTutorial 
          onDismiss={() => {
            localStorage.setItem("toeic_tutorial_seen", "true");
            setShowTutorial(false);
            forcePlayMusic(); 
          }} 
        />
      )}

      {/* THANH THÔNG TIN BÊN TRÊN */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", padding: "8px 12px", backgroundColor: "#f0f8ff", borderRadius: "8px", border: "1px solid #cce7ff", flexWrap: "wrap", gap: "10px" }}>
        
        {/* BÊN TRÁI: Nhóm nút Nhạc */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button onClick={toggleMusic} title={isMusicPlaying ? "Tắt nhạc" : "Bật nhạc"} style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: isMusicPlaying ? "#FF9800" : "#E0E0E0", color: isMusicPlaying ? "white" : "#666", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", transition: "0.2s", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", padding: 0 }}>
            {isMusicPlaying ? "🔊" : "🔇"}
          </button>
          <button onClick={playNextTrack} title="Chuyển sang bài khác" style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "#4facfe", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", transition: "0.2s", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", padding: 0 }}>
            ⏭️
          </button>
          <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} title="Điều chỉnh âm lượng" style={{ width: "60px", cursor: "pointer", marginLeft: "4px" }} />
        </div>

        {/* BÊN PHẢI: Tài khoản (NÚT THOÁT ĐÃ ĐƯỢC CHUYỂN THÀNH ICON) */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "12px", color: "#333", fontWeight: "bold", maxWidth: "80px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={currentUser.email}>
            👤 {currentUser.email}
          </span>
          <button 
            onClick={handleLogout} 
            title="Đăng xuất"
            style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "#ff4d4f", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", transition: "0.2s", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", padding: 0 }}
            onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.1)"}
            onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            🚪
          </button>
        </div>
      </div>

      <h1 style={{ fontSize: "2.2rem", margin: "10px 0", color: "#2c3e50" }}>TOEIC Master 🚀</h1>
      <p style={{ color: "#7f8c8d", marginBottom: "25px" }}>Đã đồng bộ dữ liệu đám mây ☁️</p>

      {/* DASHBOARD THỐNG KÊ */}
      <div style={{ display: "flex", justifyContent: "center", gap: "15px", marginBottom: "35px", flexWrap: "wrap" }}>
        <div style={{ flex: "1", backgroundColor: "#f9f9f9", padding: "15px", borderRadius: "12px", minWidth: "140px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid #eee", textAlign: "left" }}>
          <h3 style={{ margin: "0 0 10px 0", color: "#4CAF50", fontSize: "16px" }}>📚 Từ vựng</h3>
          <p style={{ margin: "4px 0", fontSize: "14px", color: "#555" }}>Đã học: <strong>{vocabTotal}</strong> câu</p>
          <p style={{ margin: "4px 0", fontSize: "14px", color: "#555" }}>Đúng: <strong style={{color: "#4CAF50"}}>{vocabCorrect}</strong> | Sai: <strong style={{color: "#F44336"}}>{vocabTotal - vocabCorrect}</strong></p>
          <div style={{ width: "100%", height: "6px", backgroundColor: "#e0e0e0", borderRadius: "3px", marginTop: "12px" }}>
            <div style={{ width: `${vocabRatio}%`, height: "100%", backgroundColor: vocabRatio >= 50 ? "#4CAF50" : "#FF9800", borderRadius: "3px" }}></div>
          </div>
          <p style={{ margin: "6px 0 0 0", fontSize: "13px", fontWeight: "bold", textAlign: "right", color: vocabRatio >= 50 ? "#4CAF50" : "#FF9800" }}>Tỷ lệ: {vocabRatio}%</p>
        </div>

        <div style={{ flex: "1", backgroundColor: "#f9f9f9", padding: "15px", borderRadius: "12px", minWidth: "140px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid #eee", textAlign: "left" }}>
          <h3 style={{ margin: "0 0 10px 0", color: "#2196F3", fontSize: "16px" }}>📝 Ngữ pháp</h3>
          <p style={{ margin: "4px 0", fontSize: "14px", color: "#555" }}>Đã học: <strong>{grammarTotal}</strong> câu</p>
          <p style={{ margin: "4px 0", fontSize: "14px", color: "#555" }}>Đúng: <strong style={{color: "#2196F3"}}>{grammarCorrect}</strong> | Sai: <strong style={{color: "#F44336"}}>{grammarTotal - grammarCorrect}</strong></p>
          <div style={{ width: "100%", height: "6px", backgroundColor: "#e0e0e0", borderRadius: "3px", marginTop: "12px" }}>
            <div style={{ width: `${grammarRatio}%`, height: "100%", backgroundColor: grammarRatio >= 50 ? "#2196F3" : "#FF9800", borderRadius: "3px" }}></div>
          </div>
          <p style={{ margin: "6px 0 0 0", fontSize: "13px", fontWeight: "bold", textAlign: "right", color: grammarRatio >= 50 ? "#2196F3" : "#FF9800" }}>Tỷ lệ: {grammarRatio}%</p>
        </div>
      </div>

      {/* MENU CHÍNH */}
      <div style={{ display: "flex", flexDirection: "column", gap: "15px", maxWidth: "300px", margin: "0 auto" }}>
        <button onClick={() => { playSound("click"); setScreen("vocab_settings"); }} style={{ padding: "15px", fontSize: "18px", backgroundColor: "#4CAF50", color: "white", borderRadius: "10px", border: "none", cursor: "pointer", boxShadow: "0 4px 6px rgba(0,0,0,0.1)", transition: "transform 0.2s" }} onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-3px)"} onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}>
          Bắt đầu luyện Từ Vựng
        </button>
        <button onClick={() => { playSound("click"); setScreen("grammar"); }} style={{ padding: "15px", fontSize: "18px", backgroundColor: "#2196F3", color: "white", borderRadius: "10px", border: "none", cursor: "pointer", boxShadow: "0 4px 6px rgba(0,0,0,0.1)", transition: "transform 0.2s" }} onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-3px)"} onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}>
          Bắt đầu luyện Ngữ Pháp
        </button>
      </div>
    </div>
  );
}

export default App;