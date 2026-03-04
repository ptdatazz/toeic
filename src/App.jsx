import { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import "./App.css";
import vocabData from "./data/vocab.json";
import grammarData from "./data/grammar.json"; 

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

// --- COMPONENT: ĐĂNG NHẬP / ĐĂNG KÝ (MỚI) ---
function AuthScreen({ onLogin }) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      return setError("Vui lòng nhập đầy đủ tài khoản và mật khẩu!");
    }

    // Lấy danh sách user từ LocalStorage
    const users = JSON.parse(localStorage.getItem("toeic_users")) || [];

    if (isLoginMode) {
      // Xử lý Đăng nhập
      const user = users.find(u => u.username === username && u.password === password);
      if (user) {
        onLogin(username);
      } else {
        setError("Sai tên đăng nhập hoặc mật khẩu!");
      }
    } else {
      // Xử lý Đăng ký
      const userExists = users.some(u => u.username === username);
      if (userExists) {
        setError("Tên đăng nhập này đã có người sử dụng!");
      } else {
        users.push({ username, password });
        localStorage.setItem("toeic_users", JSON.stringify(users));
        alert("Đăng ký thành công! Đang tự động đăng nhập...");
        onLogin(username);
      }
    }
  };

  return (
    <div className="container" style={{ textAlign: "center", paddingTop: "50px", maxWidth: "400px" }}>
      <h1 style={{ fontSize: "2.5rem", marginBottom: "10px", color: "#2c3e50" }}>TOEIC Master 🚀</h1>
      <p style={{ color: "#7f8c8d", marginBottom: "30px" }}>Vui lòng đăng nhập để lưu trữ tiến độ</p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px", backgroundColor: "#f9f9f9", padding: "30px", borderRadius: "12px", boxShadow: "0 4px 10px rgba(0,0,0,0.1)" }}>
        <h2 style={{ margin: "0 0 15px 0", color: "#333" }}>{isLoginMode ? "Đăng Nhập" : "Tạo Tài Khoản"}</h2>
        
        {error && <div style={{ color: "red", backgroundColor: "#ffebee", padding: "10px", borderRadius: "5px", fontSize: "14px" }}>{error}</div>}

        <input 
          type="text" 
          placeholder="Tên đăng nhập" 
          value={username} 
          onChange={(e) => setUsername(e.target.value)}
          style={{ padding: "12px", borderRadius: "8px", border: "1px solid #ccc", fontSize: "16px" }}
        />
        <input 
          type="password" 
          placeholder="Mật khẩu" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: "12px", borderRadius: "8px", border: "1px solid #ccc", fontSize: "16px" }}
        />

        <button type="submit" style={{ padding: "12px", fontSize: "18px", backgroundColor: "#4CAF50", color: "white", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold", marginTop: "10px" }}>
          {isLoginMode ? "Vào Học Ngay" : "Đăng Ký"}
        </button>

        <p style={{ margin: "10px 0 0 0", fontSize: "14px", color: "#666" }}>
          {isLoginMode ? "Chưa có tài khoản?" : "Đã có tài khoản?"}{" "}
          <span 
            onClick={() => { setIsLoginMode(!isLoginMode); setError(""); }} 
            style={{ color: "#2196F3", cursor: "pointer", fontWeight: "bold", textDecoration: "underline" }}
          >
            {isLoginMode ? "Đăng ký ngay" : "Đăng nhập"}
          </span>
        </p>
      </form>
    </div>
  );
}

// --- COMPONENT: ÔN TỪ VỰNG ---
function VocabQuiz({ onBack, updateGlobal, currentUser }) {
  const QUIZ_LIMIT = 30;
  const TIME_PER_QUESTION = 10;
  const REQUIRED_STREAK = 3; 

  // Lưu tiến độ theo từng user
  const storageKeyQ = `toeic_vocab_q_${currentUser}`;
  const storageKeyC = `toeic_vocab_current_${currentUser}`;
  const storageKeyS = `toeic_vocab_score_${currentUser}`;

  const [questionsData, setQuestionsData] = useState(() => {
    const saved = localStorage.getItem(storageKeyQ);
    if (saved) return JSON.parse(saved);
    const randomSubset = shuffleArray(vocabData).slice(0, QUIZ_LIMIT);
    return generateVocabQuestions(randomSubset, vocabData);
  });

  const [current, setCurrent] = useState(() => parseInt(localStorage.getItem(storageKeyC)) || 0);
  const [score, setScore] = useState(() => parseInt(localStorage.getItem(storageKeyS)) || 0);

  useEffect(() => {
    localStorage.setItem(storageKeyQ, JSON.stringify(questionsData));
    localStorage.setItem(storageKeyC, current);
    localStorage.setItem(storageKeyS, score);
  }, [questionsData, current, score, storageKeyQ, storageKeyC, storageKeyS]);

  const clearStorageAndExit = () => {
    localStorage.removeItem(storageKeyQ);
    localStorage.removeItem(storageKeyC);
    localStorage.removeItem(storageKeyS);
    onBack();
  };

  const [selected, setSelected] = useState(null);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (selected !== null || timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, selected]);

  useEffect(() => {
    if (timeLeft === 0 && selected === null) handleAnswer(null); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, selected]);

  const cheers = ["Tuyệt vời! 🎉", "Chính xác! 🚀", "Giỏi quá! ⭐", "Xuất sắc! 🔥"];
  const encourages = ["Không sao, thử lại sau nhé! 💪", "Cố lên, sai để nhớ lâu hơn! 🌱", "Gần đúng rồi! 😅"];

  const handleAnswer = (option) => {
    setSelected(option || "TIMEOUT");
    const isCorrect = option === questionsData[current].answer;

    updateGlobal("vocab", isCorrect);

    if (isCorrect) {
      setScore(score + 1);
      setStreak(prev => prev + 1); 
      setFeedbackMsg(cheers[Math.floor(Math.random() * cheers.length)]);
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    } else {
      setStreak(0); 
      setFeedbackMsg(encourages[Math.floor(Math.random() * encourages.length)]);
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
    setSelected(null);
    setFeedbackMsg(""); 
    setCurrent(current + 1);
    setTimeLeft(TIME_PER_QUESTION); 
  };

  const handleBackClick = () => {
    if (streak >= REQUIRED_STREAK) clearStorageAndExit(); 
  };

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

        <button className="next" onClick={clearStorageAndExit}>Về trang chủ</button>
      </div>
    );
  }

  const currentQ = questionsData[current];
  const timePercentage = (timeLeft / TIME_PER_QUESTION) * 100;

  return (
    <div className="container">
      <div style={{ position: "relative", display: "flex", justifyContent: "center", alignItems: "center", width: "100%", height: "35px", marginBottom: "10px" }}>
        <button 
          onClick={handleBackClick} 
          style={{ 
            position: "absolute", left: "0", width: "max-content", padding: "4px 10px", fontSize: "12px", cursor: streak >= REQUIRED_STREAK ? "pointer" : "not-allowed", 
            backgroundColor: streak >= REQUIRED_STREAK ? "#e8f5e9" : "#f0f0f0", 
            color: streak >= REQUIRED_STREAK ? "#2e7d32" : "#999",
            border: "1px solid #ccc", borderRadius: "5px", whiteSpace: "nowrap",
            transition: "all 0.3s ease"
          }}
        >
          ⬅ Quay lại {streak >= REQUIRED_STREAK ? "🔓" : `🔒 (${streak}/${REQUIRED_STREAK})`}
        </button>
        
        <span style={{ fontWeight: "bold", color: timeLeft <= 3 ? "red" : "#333", whiteSpace: "nowrap" }}>
          ⏱️ {timeLeft}s
        </span>
        
        <span style={{ position: "absolute", right: "0", color: "#666", fontSize: "14px", whiteSpace: "nowrap" }}>
          Tiến độ: {current + 1}/{questionsData.length}
        </span>
      </div>

      <div style={{ width: "100%", height: "8px", backgroundColor: "#e0e0e0", borderRadius: "4px", overflow: "hidden", marginBottom: "20px" }}>
        <div style={{ height: "100%", width: `${timePercentage}%`, backgroundColor: timeLeft <= 3 ? "#f44336" : "#4caf50", transition: "width 1s linear" }} />
      </div>

      <h2>What does "{currentQ.word}" mean?</h2>
      <p><strong><i>{currentQ.phonetic}</i></strong></p>

      <div className="options">
        {currentQ.options.map((option, idx) => (
          <button
            key={idx}
            onClick={() => handleAnswer(option)}
            className={selected ? (option === currentQ.answer ? "correct" : option === selected ? "wrong" : "") : ""}
            disabled={selected !== null}
          >
            {option}
          </button>
        ))}
      </div>

      {selected && (
        <>
          <div style={{ marginTop: "15px", padding: "10px", borderRadius: "8px", backgroundColor: selected === currentQ.answer ? "#e8f5e9" : "#ffebee", color: selected === currentQ.answer ? "#2e7d32" : "#c62828", fontWeight: "bold", fontSize: "18px" }}>
            {selected === "TIMEOUT" ? "⏰ Hết giờ!" : feedbackMsg}
          </div>
          <p style={{ marginTop: "15px", fontSize: "16px" }}><strong>Dùng trong:</strong> {currentQ.usage}</p>
          <button className="next" onClick={nextQuestion}>Câu tiếp theo</button>
        </>
      )}
    </div>
  );
}

// --- COMPONENT: ÔN NGỮ PHÁP ---
function GrammarQuiz({ onBack, updateGlobal, currentUser }) {
  const REQUIRED_STREAK = 3; 

  // Lưu tiến độ theo từng user
  const storageKeyQ = `toeic_grammar_q_${currentUser}`;
  const storageKeyC = `toeic_grammar_current_${currentUser}`;
  const storageKeyS = `toeic_grammar_score_${currentUser}`;

  const [questionsData] = useState(() => {
    const saved = localStorage.getItem(storageKeyQ);
    if (saved) return JSON.parse(saved);
    return shuffleArray(grammarData).slice(0, 10);
  });

  const [current, setCurrent] = useState(() => parseInt(localStorage.getItem(storageKeyC)) || 0);
  const [score, setScore] = useState(() => parseInt(localStorage.getItem(storageKeyS)) || 0);

  useEffect(() => {
    localStorage.setItem(storageKeyQ, JSON.stringify(questionsData));
    localStorage.setItem(storageKeyC, current);
    localStorage.setItem(storageKeyS, score);
  }, [questionsData, current, score, storageKeyQ, storageKeyC, storageKeyS]);

  const clearStorageAndExit = () => {
    localStorage.removeItem(storageKeyQ);
    localStorage.removeItem(storageKeyC);
    localStorage.removeItem(storageKeyS);
    onBack();
  };

  const [selected, setSelected] = useState(null);
  const [streak, setStreak] = useState(0);

  const handleAnswer = (option) => {
    setSelected(option);
    const isCorrect = option === questionsData[current].answer;
    
    updateGlobal("grammar", isCorrect);

    if (isCorrect) {
      setScore(score + 1);
      setStreak(prev => prev + 1); 
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } else {
      setStreak(0); 
    }
  };

  const handleBackClick = () => {
    if (streak >= REQUIRED_STREAK) clearStorageAndExit();
  };

  if (current >= questionsData.length) {
    confetti({ particleCount: 300, spread: 150, origin: { y: 0.4 } });
    const wrongCount = current - score;
    const ratio = Math.round((score / current) * 100) || 0;

    return (
      <div className="container" style={{ textAlign: "center" }}>
        <h1>Hoàn thành 🎉</h1>
        <h2>Bạn đã luyện xong phần Ngữ pháp!</h2>
        
        <div style={{ margin: "20px auto", padding: "20px", backgroundColor: "#f9f9f9", borderRadius: "12px", maxWidth: "300px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", border: "1px solid #eee" }}>
          <p style={{ fontSize: "18px", margin: "10px 0", color: "#2196F3", fontWeight: "bold" }}>✅ Trả lời đúng: {score}</p>
          <p style={{ fontSize: "18px", margin: "10px 0", color: "#F44336", fontWeight: "bold" }}>❌ Trả lời sai: {wrongCount}</p>
          <hr style={{ border: "0", borderTop: "1px solid #ddd", margin: "15px 0" }} />
          <h3 style={{ margin: 0, color: ratio >= 50 ? "#2196F3" : "#FF9800" }}>🎯 Tỷ lệ chính xác: {ratio}%</h3>
        </div>

        <button className="next" onClick={clearStorageAndExit}>Về trang chủ</button>
      </div>
    );
  }

  const currentQ = questionsData[current];

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: "20px", height: "35px" }}>
        <button 
          onClick={handleBackClick} 
          style={{ 
            width: "max-content", padding: "4px 10px", fontSize: "12px", cursor: streak >= REQUIRED_STREAK ? "pointer" : "not-allowed", 
            backgroundColor: streak >= REQUIRED_STREAK ? "#e8f5e9" : "#f0f0f0", 
            color: streak >= REQUIRED_STREAK ? "#2e7d32" : "#999",
            border: "1px solid #ccc", borderRadius: "5px", whiteSpace: "nowrap",
            transition: "all 0.3s ease"
          }}
        >
          ⬅ Quay lại {streak >= REQUIRED_STREAK ? "🔓" : `🔒 (${streak}/${REQUIRED_STREAK})`}
        </button>

        <span style={{ color: "#666", fontSize: "14px", whiteSpace: "nowrap" }}>
          Câu: {current + 1} / {questionsData.length}
        </span>
      </div>

      <h2 style={{ lineHeight: "1.5" }}>{currentQ.question}</h2>

      <div className="options">
        {currentQ.options.map((option, idx) => (
          <button
            key={idx}
            onClick={() => handleAnswer(option)}
            className={selected ? (option === currentQ.answer ? "correct" : option === selected ? "wrong" : "") : ""}
            disabled={selected !== null}
          >
            {option}
          </button>
        ))}
      </div>

      {selected && (
        <div style={{ marginTop: "20px", textAlign: "left", backgroundColor: "#f9f9f9", padding: "20px", borderRadius: "8px", borderLeft: "5px solid #2196F3" }}>
          <h4 style={{ margin: "0 0 10px 0", color: "#2196F3", fontSize: "20px" }}>💡 Giải thích:</h4>
          <p style={{ margin: 0, fontSize: "18px", lineHeight: "1.6" }}>{currentQ.explanation}</p>
          <button className="next" onClick={() => { setSelected(null); setCurrent(current + 1); }} style={{ width: "100%", marginTop: "20px", fontSize: "18px" }}>
            Câu tiếp theo
          </button>
        </div>
      )}
    </div>
  );
}

// --- COMPONENT: APP (Điều hướng chính) ---
function App() {
  // State quản lý tài khoản đăng nhập
  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem("toeic_current_user"));
  
  const [screen, setScreen] = useState(() => localStorage.getItem("toeic_current_screen") || "home");

  // Load số liệu thống kê tùy thuộc vào người dùng đang đăng nhập
  const [globalStats, setGlobalStats] = useState({
    vocab: { correct: 0, total: 0 },
    grammar: { correct: 0, total: 0 }
  });

  // Khi currentUser thay đổi, tải lại số liệu của người đó
  useEffect(() => {
    if (currentUser) {
      const savedStats = localStorage.getItem(`toeic_global_stats_${currentUser}`);
      if (savedStats) {
        setGlobalStats(JSON.parse(savedStats));
      } else {
        setGlobalStats({ vocab: { correct: 0, total: 0 }, grammar: { correct: 0, total: 0 } });
      }
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem("toeic_current_screen", screen);
  }, [screen]);

  // Khóa bôi đen/chuột phải
  const disableRightClick = (e) => e.preventDefault();

  const handleLogin = (username) => {
    localStorage.setItem("toeic_current_user", username);
    setCurrentUser(username);
    setScreen("home");
  };

  const handleLogout = () => {
    localStorage.removeItem("toeic_current_user");
    setCurrentUser(null);
  };

  const updateGlobalStats = (type, isCorrect) => {
    setGlobalStats(prev => {
      const newStats = { 
        ...prev, 
        [type]: { 
          correct: prev[type].correct + (isCorrect ? 1 : 0), 
          total: prev[type].total + 1 
        } 
      };
      localStorage.setItem(`toeic_global_stats_${currentUser}`, JSON.stringify(newStats));
      return newStats;
    });
  };

  // NẾU CHƯA ĐĂNG NHẬP -> HIỂN THỊ MÀN HÌNH AUTH
  if (!currentUser) {
    return (
      <div onContextMenu={disableRightClick}>
        <AuthScreen onLogin={handleLogin} />
      </div>
    );
  }

  // CÁC MÀN HÌNH QUIZ ĐƯỢC TRUYỀN THÊM currentUser ĐỂ LƯU TIẾN ĐỘ RIÊNG
  if (screen === "vocab") return <VocabQuiz onBack={() => setScreen("home")} updateGlobal={updateGlobalStats} currentUser={currentUser} />;
  if (screen === "grammar") return <GrammarQuiz onBack={() => setScreen("home")} updateGlobal={updateGlobalStats} currentUser={currentUser} />;

  const vocabTotal = globalStats.vocab.total;
  const vocabCorrect = globalStats.vocab.correct;
  const vocabRatio = vocabTotal > 0 ? Math.round((vocabCorrect / vocabTotal) * 100) : 0;

  const grammarTotal = globalStats.grammar.total;
  const grammarCorrect = globalStats.grammar.correct;
  const grammarRatio = grammarTotal > 0 ? Math.round((grammarCorrect / grammarTotal) * 100) : 0;

  return (
    <div className="container" onContextMenu={disableRightClick} style={{ textAlign: "center", paddingTop: "20px", maxWidth: "450px" }}>
      
      {/* HEADER HIỂN THỊ THÔNG TIN USER VÀ NÚT ĐĂNG XUẤT */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", padding: "10px", backgroundColor: "#f0f8ff", borderRadius: "8px", border: "1px solid #cce7ff" }}>
        <span style={{ fontSize: "14px", color: "#333", fontWeight: "bold" }}>👤 Xin chào, {currentUser}!</span>
        <button onClick={handleLogout} style={{ padding: "4px 10px", fontSize: "12px", backgroundColor: "#ff4d4f", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>
          Đăng xuất
        </button>
      </div>

      <h1 style={{ fontSize: "2.2rem", margin: "10px 0", color: "#2c3e50" }}>TOEIC Master 🚀</h1>
      <p style={{ color: "#7f8c8d", marginBottom: "25px" }}>Bảng điều khiển học tập của bạn</p>

      {/* --- DASHBOARD THỐNG KÊ --- */}
      <div style={{ display: "flex", justifyContent: "center", gap: "15px", marginBottom: "35px", flexWrap: "wrap" }}>
        <div style={{ flex: "1", backgroundColor: "#f9f9f9", padding: "15px", borderRadius: "12px", minWidth: "150px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid #eee", textAlign: "left" }}>
          <h3 style={{ margin: "0 0 10px 0", color: "#4CAF50", fontSize: "16px" }}>📚 Từ vựng</h3>
          <p style={{ margin: "4px 0", fontSize: "14px", color: "#555" }}>Đã học: <strong>{vocabTotal}</strong> câu</p>
          <p style={{ margin: "4px 0", fontSize: "14px", color: "#555" }}>
            Đúng: <strong style={{color: "#4CAF50"}}>{vocabCorrect}</strong> | Sai: <strong style={{color: "#F44336"}}>{vocabTotal - vocabCorrect}</strong>
          </p>
          <div style={{ width: "100%", height: "6px", backgroundColor: "#e0e0e0", borderRadius: "3px", marginTop: "12px" }}>
            <div style={{ width: `${vocabRatio}%`, height: "100%", backgroundColor: vocabRatio >= 50 ? "#4CAF50" : "#FF9800", borderRadius: "3px" }}></div>
          </div>
          <p style={{ margin: "6px 0 0 0", fontSize: "13px", fontWeight: "bold", textAlign: "right", color: vocabRatio >= 50 ? "#4CAF50" : "#FF9800" }}>Tỷ lệ: {vocabRatio}%</p>
        </div>

        <div style={{ flex: "1", backgroundColor: "#f9f9f9", padding: "15px", borderRadius: "12px", minWidth: "150px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid #eee", textAlign: "left" }}>
          <h3 style={{ margin: "0 0 10px 0", color: "#2196F3", fontSize: "16px" }}>📝 Ngữ pháp</h3>
          <p style={{ margin: "4px 0", fontSize: "14px", color: "#555" }}>Đã học: <strong>{grammarTotal}</strong> câu</p>
          <p style={{ margin: "4px 0", fontSize: "14px", color: "#555" }}>
            Đúng: <strong style={{color: "#2196F3"}}>{grammarCorrect}</strong> | Sai: <strong style={{color: "#F44336"}}>{grammarTotal - grammarCorrect}</strong>
          </p>
          <div style={{ width: "100%", height: "6px", backgroundColor: "#e0e0e0", borderRadius: "3px", marginTop: "12px" }}>
            <div style={{ width: `${grammarRatio}%`, height: "100%", backgroundColor: grammarRatio >= 50 ? "#2196F3" : "#FF9800", borderRadius: "3px" }}></div>
          </div>
          <p style={{ margin: "6px 0 0 0", fontSize: "13px", fontWeight: "bold", textAlign: "right", color: grammarRatio >= 50 ? "#2196F3" : "#FF9800" }}>Tỷ lệ: {grammarRatio}%</p>
        </div>
      </div>

      {/* --- MENU CHỌN BÀI --- */}
      <div style={{ display: "flex", flexDirection: "column", gap: "15px", maxWidth: "300px", margin: "0 auto" }}>
        <button 
          onClick={() => setScreen("vocab")} 
          style={{ padding: "15px", fontSize: "18px", backgroundColor: "#4CAF50", color: "white", borderRadius: "10px", border: "none", cursor: "pointer", boxShadow: "0 4px 6px rgba(0,0,0,0.1)", transition: "transform 0.2s" }}
          onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-3px)"}
          onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}
        >
          Bắt đầu luyện Từ Vựng
        </button>
        
        <button 
          onClick={() => setScreen("grammar")} 
          style={{ padding: "15px", fontSize: "18px", backgroundColor: "#2196F3", color: "white", borderRadius: "10px", border: "none", cursor: "pointer", boxShadow: "0 4px 6px rgba(0,0,0,0.1)", transition: "transform 0.2s" }}
          onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-3px)"}
          onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}
        >
          Bắt đầu luyện Ngữ Pháp
        </button>
      </div>
    </div>
  );
}

export default App;