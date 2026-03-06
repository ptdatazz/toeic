import { useState, useEffect, useRef } from "react";
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
const speakWord = (rawText) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel(); 
    const cleanText = rawText.replace(/\s*\(.*?\)\s*/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'en-US'; 
    utterance.rate = 0.85;    
    window.speechSynthesis.speak(utterance);
  } else {
    alert("Trình duyệt của bạn không hỗ trợ tính năng đọc âm thanh!");
  }
};

// --- CÁC HÀM HỖ TRỢ CHUNG ---
const shuffleArray = (array) => [...array].sort(() => Math.random() - 0.5);

const getRandomWrongOptions = (fullData, currentItem, fieldToGet) => {
  const wrongOptions = [];
  while (wrongOptions.length < 3) {
    const randomItem = fullData[Math.floor(Math.random() * fullData.length)];
    if (randomItem[fieldToGet] !== currentItem[fieldToGet] && !wrongOptions.includes(randomItem[fieldToGet])) {
      wrongOptions.push(randomItem[fieldToGet]);
    }
  }
  return wrongOptions;
};

// --- BỘ MÁY TẠO ĐỀ THI ĐA DẠNG ---
const generateVocabQuestions = (selectedData, fullData, level) => {
  return selectedData.map((item) => {
    let qType = "en_to_vn"; 
    
    if (level === 1) {
      if (Math.random() > 0.5) qType = "vn_to_en";
    }
    else if (level >= 2) {
      const types = ["en_to_vn", "vn_to_en", "typing", "listening", "scramble"];
      qType = types[Math.floor(Math.random() * types.length)];
    }

    let questionObj = { ...item, type: qType };

    if (qType === "en_to_vn" || qType === "listening") {
      const wrongOptions = getRandomWrongOptions(fullData, item, "meaning");
      questionObj.options = shuffleArray([...wrongOptions, item.meaning]);
      questionObj.answer = item.meaning;
    } else if (qType === "vn_to_en") {
      const wrongOptions = getRandomWrongOptions(fullData, item, "word");
      questionObj.options = shuffleArray([...wrongOptions, item.word]);
      questionObj.answer = item.word;
    } else if (qType === "typing" || qType === "scramble") {
      const cleanAnswer = item.word.replace(/\s*\(.*?\)\s*/g, '').trim();
      questionObj.answer = cleanAnswer;
    }

    return questionObj;
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
            <li style={{ marginBottom: "10px" }}><strong>Ôn Từ Vựng:</strong> Trả lời nhanh trước khi hết giờ. Làm sai sẽ bị phạt trộn lại từ đó. Có 3 độ khó để thử thách!</li>
            <li style={{ marginBottom: "10px" }}><strong>Ôn Ngữ Pháp:</strong> Làm từ từ suy nghĩ, chọn xong sẽ có giải thích chi tiết ngay bên dưới.</li>
            <li style={{ marginBottom: "10px" }}><strong>Nút Quay Lại:</strong> Bị khóa lúc đang làm bài. Bạn phải làm đúng <strong>chuỗi câu (Streak)</strong> thì chìa khóa mới mở 🔓.</li>
            <li><strong>Nhạc Lofi:</strong> Góc trên bên trái dùng để bật nhạc chill chill trong lúc học.</li>
          </ul>
        </div>

        <button 
          onClick={() => { playSound("click"); onDismiss(); }} 
          style={{ width: "100%", padding: "12px", fontSize: "16px", backgroundColor: "#4CAF50", color: "white", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold" }}
        >
          🚀 Đã hiểu, Vào học ngay!
        </button>
      </div>
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
    if (saved) {
        const parsedSettings = JSON.parse(saved);
        return { ...parsedSettings, difficultyLevel: 1 };
    }
    return { quizLimit: 30, timePerQuestion: 10, requiredStreak: 3, difficultyLevel: 1, survivalLives: 3, timeAttackSeconds: 30 };
  });

  const handleStart = () => {
    playSound("click");
    localStorage.setItem("toeic_vocab_settings", JSON.stringify(settings));
    onStart(settings);
  };

  return (
    <div className="container" style={{ textAlign: "center", paddingTop: "20px" }}>
      <h2 style={{ color: "#2c3e50", marginBottom: "5px" }}>⚙️ Chọn Chế Độ Chơi</h2>
      <p style={{ color: "#7f8c8d", marginBottom: "25px", fontSize: "14px" }}>Hãy thử thách bản thân với các Mode khác nhau</p>

      <div style={{ backgroundColor: "#f9f9f9", padding: "20px", borderRadius: "12px", border: "1px solid #eee", textAlign: "left", marginBottom: "25px" }}>
        
        {/* ĐỘ KHÓ (LEVEL) */}
        <div style={{ marginBottom: "20px", backgroundColor: "#fff", padding: "15px", borderRadius: "8px", borderLeft: `4px solid ${settings.difficultyLevel === 1 ? "#4CAF50" : settings.difficultyLevel === 2 ? "#FF9800" : settings.difficultyLevel === 3 ? "#E91E63" : "#F44336"}`, boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
          <label style={{ fontWeight: "bold", color: "#333", display: "block", marginBottom: "8px", fontSize: "16px" }}>
            🔥 Level {settings.difficultyLevel}: 
            <span style={{ color: settings.difficultyLevel === 1 ? "#4CAF50" : settings.difficultyLevel === 2 ? "#FF9800" : settings.difficultyLevel === 3 ? "#E91E63" : "#F44336", marginLeft: "5px" }}>
              {settings.difficultyLevel === 1 ? "Cơ Bản" : settings.difficultyLevel === 2 ? "Đa Dạng" : settings.difficultyLevel === 3 ? "Sinh Tồn ❤️" : "Time Attack ⏱️"}
            </span>
          </label>
          <input 
            type="range" min="1" max="4" step="1" 
            value={settings.difficultyLevel} 
            onChange={(e) => setSettings({...settings, difficultyLevel: parseInt(e.target.value)})} 
            style={{ width: "100%", cursor: "pointer" }} 
          />
          <div style={{ fontSize: "14px", color: "#444", marginTop: "12px", lineHeight: "1.5" }}>
            {settings.difficultyLevel === 1 && "🟢 Trắc nghiệm: Tiếng Anh -> Việt & Việt -> Anh."}
            {settings.difficultyLevel === 2 && "🟡 Trộn lẫn: Trắc nghiệm, Nghe, Xếp chữ và Gõ phím."}
            {settings.difficultyLevel === 3 && "❤️ Chơi Vô Tận. Bạn có mạng, làm sai là mất mạng. Cố gắng sống sót càng lâu càng tốt!"}
            {settings.difficultyLevel === 4 && "⏱️ Đua thời gian. Trả lời đúng +3s, Trả lời sai bị trừ 5s. Đừng để đồng hồ về 0!"}
          </div>
        </div>

        {/* THÔNG SỐ ĐẶC BIỆT CHO LEVEL 3 & 4 */}
        {settings.difficultyLevel === 3 && (
            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontWeight: "bold", color: "#333", display: "block", marginBottom: "8px" }}>❤️ Số mạng sinh tồn: <span style={{ color: "#E91E63" }}>{settings.survivalLives} mạng</span></label>
              <input type="range" min="1" max="10" step="1" value={settings.survivalLives} onChange={(e) => setSettings({...settings, survivalLives: parseInt(e.target.value)})} style={{ width: "100%", cursor: "pointer" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#888", marginTop: "5px" }}>
                <span>1 mạng</span><span>10 mạng</span>
              </div>
            </div>
        )}

        {settings.difficultyLevel === 4 && (
            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontWeight: "bold", color: "#333", display: "block", marginBottom: "8px" }}>⏱️ Thời gian bắt đầu: <span style={{ color: "#F44336" }}>{settings.timeAttackSeconds} giây</span></label>
              <input type="range" min="10" max="120" step="5" value={settings.timeAttackSeconds} onChange={(e) => setSettings({...settings, timeAttackSeconds: parseInt(e.target.value)})} style={{ width: "100%", cursor: "pointer" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#888", marginTop: "5px" }}>
                <span>10s</span><span>120s</span>
              </div>
            </div>
        )}

        {/* Ẩn các thông số Cổ điển nếu chơi Sinh Tồn hoặc Time Attack */}
        {settings.difficultyLevel <= 2 && (
          <>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontWeight: "bold", color: "#333", display: "block", marginBottom: "8px" }}>📚 Số câu mỗi lượt: <span style={{ color: "#4CAF50" }}>{settings.quizLimit}</span></label>
              <input type="range" min="5" max="100" step="5" value={settings.quizLimit} onChange={(e) => setSettings({...settings, quizLimit: parseInt(e.target.value)})} style={{ width: "100%", cursor: "pointer" }} />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontWeight: "bold", color: "#333", display: "block", marginBottom: "8px" }}>⏱️ Thời gian/câu: <span style={{ color: "#FF9800" }}>{settings.timePerQuestion}s</span></label>
              <input type="range" min="3" max="30" step="1" value={settings.timePerQuestion} onChange={(e) => setSettings({...settings, timePerQuestion: parseInt(e.target.value)})} style={{ width: "100%", cursor: "pointer" }} />
            </div>
            
            <div>
              <label style={{ fontWeight: "bold", color: "#333", display: "block", marginBottom: "8px" }}>🔓 Streak mở nút quay lại: <span style={{ color: "#2196F3" }}>{settings.requiredStreak}</span></label>
              <input type="range" min="1" max="10" step="1" value={settings.requiredStreak} onChange={(e) => setSettings({...settings, requiredStreak: parseInt(e.target.value)})} style={{ width: "100%", cursor: "pointer" }} />
            </div>
          </>
        )}

      </div>

      <button onClick={handleStart} style={{ width: "100%", padding: "15px", fontSize: "18px", backgroundColor: "#4CAF50", color: "white", borderRadius: "10px", border: "none", cursor: "pointer", fontWeight: "bold", boxShadow: "0 4px 6px rgba(0,0,0,0.1)", marginBottom: "15px" }}>
        🚀 Bắt đầu Game!
      </button>
      <button onClick={() => { playSound("click"); onBack(); }} style={{ width: "100%", padding: "10px", fontSize: "16px", backgroundColor: "#e0e0e0", color: "#555", borderRadius: "10px", border: "none", cursor: "pointer", fontWeight: "bold" }}>
        Trở về sảnh
      </button>
    </div>
  );
}

// --- COMPONENT: ÔN TỪ VỰNG CHÍNH ---
function VocabQuiz({ onBack, updateGlobal, settings }) {
  const DIFFICULTY_LEVEL = settings.difficultyLevel;
  const QUIZ_LIMIT = DIFFICULTY_LEVEL >= 3 ? 999 : settings.quizLimit; 
  const TIME_PER_QUESTION = settings.timePerQuestion;
  const REQUIRED_STREAK = settings.requiredStreak; 

  const [questionsData, setQuestionsData] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const [current, setCurrent] = useState(0); 
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);

  const [lives, setLives] = useState(DIFFICULTY_LEVEL === 3 ? settings.survivalLives : null);
  const [globalTime, setGlobalTime] = useState(DIFFICULTY_LEVEL === 4 ? settings.timeAttackSeconds : null);

  const typingInputRef = useRef(null); 
  const [typingValue, setTypingValue] = useState("");
  const [scrambleAvailable, setScrambleAvailable] = useState([]);
  const [scrambleSelected, setScrambleSelected] = useState([]);

  useEffect(() => {
    const fetchVocabFromSheets = async () => {
      try {
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

        let pool = fullData;
        if (DIFFICULTY_LEVEL >= 3) pool = [...fullData, ...fullData, ...fullData, ...fullData];
        const randomSubset = shuffleArray(pool).slice(0, QUIZ_LIMIT);
        
        setQuestionsData(generateVocabQuestions(randomSubset, fullData, DIFFICULTY_LEVEL));
      } catch (error) {
        console.error("Lỗi đồng bộ từ vựng:", error);
      } finally {
        setLoadingData(false);
      }
    };
    fetchVocabFromSheets();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [selected, setSelected] = useState(null);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!loadingData && current < questionsData.length && selected === null && !isGameOver) {
        const currentQ = questionsData[current];
        if (currentQ.type === "typing") {
            typingInputRef.current?.focus();
        } else if (currentQ.type === "scramble") {
            const letters = currentQ.answer.split('').map((char, index) => ({ id: index, char }));
            setScrambleAvailable(shuffleArray(letters));
            setScrambleSelected([]);
        } else if (currentQ.type === "listening") {
            speakWord(currentQ.word);
        }
    }
  }, [current, loadingData, questionsData, selected, isGameOver]);

  useEffect(() => {
    if (selected !== null || loadingData || isGameOver || DIFFICULTY_LEVEL === 4) return;
    if (timeLeft <= 0) {
        handleAnswer(null);
        return;
    }
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, selected, loadingData, isGameOver, DIFFICULTY_LEVEL]);

  useEffect(() => {
    if (DIFFICULTY_LEVEL !== 4 || isGameOver || loadingData) return;
    const timer = setInterval(() => {
        setGlobalTime(prev => {
            if (prev <= 1) {
                setIsGameOver(true);
                playSound("timeout");
                return 0;
            }
            return prev - 1;
        });
    }, 1000);
    return () => clearInterval(timer);
  }, [isGameOver, loadingData, DIFFICULTY_LEVEL]);

  useEffect(() => {
      if (DIFFICULTY_LEVEL === 3 && lives !== null && lives <= 0) setIsGameOver(true);
  }, [lives, DIFFICULTY_LEVEL]);

  const cheers = ["Tuyệt vời! 🎉", "Chính xác! 🚀", "Giỏi quá! ⭐", "Quá bén! 🔥"];
  const encourages = ["Không sao, thử lại nhé! 💪", "Cẩn thận xíu nào! 🌱", "Gần đúng rồi! 😅"];

  const handleAnswer = (userAnswer) => {
    if (isGameOver) return;
    const isTimeout = userAnswer === null;
    const actualOption = isTimeout ? "TIMEOUT" : userAnswer;
    setSelected(actualOption);

    const currentQ = questionsData[current];
    let isCorrect = false;

    if (!isTimeout) {
       if (currentQ.type === "typing" || currentQ.type === "scramble") {
           isCorrect = actualOption.trim().toLowerCase() === currentQ.answer.trim().toLowerCase();
       } else {
           isCorrect = actualOption === currentQ.answer;
       }
    }
    
    updateGlobal("vocab", isCorrect);

    if (isCorrect) {
      playSound("correct");
      setScore(score + 1);
      setStreak(prev => prev + 1); 
      setFeedbackMsg(cheers[Math.floor(Math.random() * cheers.length)]);
      
      if (DIFFICULTY_LEVEL === 4) setGlobalTime(t => t + 3); 
    } else {
      playSound(isTimeout ? "timeout" : "wrong");
      setStreak(0); 
      
      if (DIFFICULTY_LEVEL === 3) {
          setLives(l => l - 1); 
          setFeedbackMsg(isTimeout ? "⏰ Hết giờ! -1 ❤️" : "❌ Sai rồi! -1 ❤️");
      } else if (DIFFICULTY_LEVEL === 4) {
          setGlobalTime(t => t - 5); 
          setFeedbackMsg("❌ Sai rồi! Bị trừ 5 giây!");
      } else {
          setFeedbackMsg(isTimeout ? "⏰ Hết giờ mất rồi!" : encourages[Math.floor(Math.random() * encourages.length)]);
          setQuestionsData((prev) => {
            const newData = [...prev];
            const remaining = newData.length - current - 1;
            let insertIndex = newData.length; 
            if (remaining > 5) insertIndex = current + 3 + Math.floor(Math.random() * (remaining - 2));
            
            let penaltyItem = {...newData[current]};
            if(penaltyItem.type === "typing" || penaltyItem.type === "scramble" || penaltyItem.type === "listening") {
               penaltyItem.type = "vn_to_en";
               const wrongOptions = getRandomWrongOptions(newData, penaltyItem, "word");
               penaltyItem.options = shuffleArray([...wrongOptions, penaltyItem.word]);
            }
            newData.splice(insertIndex, 0, penaltyItem);
            return newData;
          });
      }
    }
  };

  const handleScrambleClick = (letterObj, fromAvailable) => {
      if (selected !== null) return;
      playSound("click");
      if (fromAvailable) {
          setScrambleAvailable(prev => prev.filter(item => item.id !== letterObj.id));
          setScrambleSelected(prev => [...prev, letterObj]);
      } else {
          setScrambleSelected(prev => prev.filter(item => item.id !== letterObj.id));
          setScrambleAvailable(prev => [...prev, letterObj]);
      }
  };

  const submitScramble = () => {
      const word = scrambleSelected.map(item => item.char).join('');
      handleAnswer(word);
  };

  const handleTypingSubmit = (e) => {
      e.preventDefault();
      if(typingValue.trim() !== "") {
          handleAnswer(typingValue);
      }
  }

  const nextQuestion = () => {
    playSound("click");
    setSelected(null);
    setFeedbackMsg(""); 
    setTypingValue(""); 
    const nextIdx = current + 1;
    setCurrent(nextIdx);
    setTimeLeft(TIME_PER_QUESTION); 
    if (nextIdx >= questionsData.length && DIFFICULTY_LEVEL < 3) playSound("finish");
  };

  const handleBackToHome = () => {
    playSound("click");
    localStorage.removeItem("toeic_vocab_q_temp");
    localStorage.removeItem("toeic_vocab_c_temp");
    localStorage.removeItem("toeic_vocab_s_temp");
    onBack(); 
  };

  if (loadingData) {
    return <div className="container" style={{ textAlign: "center", paddingTop: "50px" }}><h2>Đang tải bộ dữ liệu chiến đấu... ☁️</h2></div>;
  }

  if (isGameOver || (DIFFICULTY_LEVEL < 3 && current >= questionsData.length)) {
    if (DIFFICULTY_LEVEL < 3) confetti({ particleCount: 300, spread: 150, origin: { y: 0.4 } });
    
    return (
      <div className="container" style={{ textAlign: "center" }}>
        <h1 style={{ color: DIFFICULTY_LEVEL >= 3 ? "#F44336" : "#4CAF50" }}>
          {DIFFICULTY_LEVEL >= 3 ? "Game Over ☠️" : "Hoàn thành 🎉"}
        </h1>
        <h2>
          {DIFFICULTY_LEVEL === 3 && `Bạn đã sống sót qua ${score} câu!`}
          {DIFFICULTY_LEVEL === 4 && `Bạn đạt tốc độ trả lời đúng ${score} câu!`}
          {DIFFICULTY_LEVEL < 3 && "Bạn đã ôn tập xong phiên này!"}
        </h2>
        
        <div style={{ margin: "20px auto", padding: "20px", backgroundColor: "#f9f9f9", borderRadius: "12px", maxWidth: "300px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", border: "1px solid #eee" }}>
          <p style={{ fontSize: "18px", margin: "10px 0", color: "#4CAF50", fontWeight: "bold" }}>✅ Trả lời đúng: {score}</p>
          {DIFFICULTY_LEVEL < 3 && <p style={{ fontSize: "18px", margin: "10px 0", color: "#F44336", fontWeight: "bold" }}>❌ Trả lời sai: {current - score}</p>}
        </div>
        <button className="next" onClick={handleBackToHome}>Về trang chủ</button>
      </div>
    );
  }

  const currentQ = questionsData[current];
  const timePercentage = (timeLeft / TIME_PER_QUESTION) * 100;

  return (
    <div className="container">
      {/* THANH THÔNG TIN TỐI GIẢN */}
      <div style={{ position: "relative", display: "flex", justifyContent: "center", alignItems: "center", width: "100%", height: "40px", marginBottom: "15px", gap: "5px" }}>
        
        <div style={{ flex: 1, display: "flex", justifyContent: "flex-start", overflow: "hidden" }}>
          {DIFFICULTY_LEVEL < 3 && (
            <button 
              onClick={() => { 
                if(streak >= REQUIRED_STREAK) { handleBackToHome(); }
              }} 
              style={{ width: "max-content", padding: "6px 10px", fontSize: "13px", cursor: streak >= REQUIRED_STREAK ? "pointer" : "not-allowed", backgroundColor: streak >= REQUIRED_STREAK ? "#e8f5e9" : "#f0f0f0", color: streak >= REQUIRED_STREAK ? "#2e7d32" : "#999", border: "1px solid #ccc", borderRadius: "6px", fontWeight: "bold", whiteSpace: "nowrap", margin: 0, flexShrink: 0 }}
            >
              ⬅ {streak >= REQUIRED_STREAK ? "🔓" : `🔒 ${streak}/${REQUIRED_STREAK}`}
            </button>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", backgroundColor: "#fff", padding: "4px 10px", borderRadius: "20px", boxShadow: "0 2px 5px rgba(0,0,0,0.05)", border: "1px solid #eee", flexShrink: 0 }}>
          {(currentQ.type === "en_to_vn" || currentQ.type === "listening") && (
            <button 
              onClick={() => speakWord(currentQ.word)}
              style={{ width: "30px", height: "30px", borderRadius: "50%", border: "1px solid #bbdefb", backgroundColor: "#e3f2fd", color: "#1976D2", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "16px", padding: 0, margin: 0, flexShrink: 0 }}
            >
              🔊
            </button>
          )}
          <span style={{ fontWeight: "bold", color: (DIFFICULTY_LEVEL===4 ? globalTime : timeLeft) <= 5 ? "#f44336" : "#333", fontSize: "15px", minWidth: "35px", textAlign: "center", flexShrink: 0 }}>
            ⏱️ {DIFFICULTY_LEVEL === 4 ? globalTime : timeLeft}s
          </span>
        </div>

        <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", overflow: "hidden" }}>
          {DIFFICULTY_LEVEL === 3 ? (
            <span style={{ fontSize: "15px", whiteSpace: "nowrap", flexShrink: 0 }}>
               {"❤️".repeat(Math.max(0, lives))}
            </span>
          ) : (
            <span style={{ color: "#666", fontSize: "13px", whiteSpace: "nowrap", fontWeight: "bold", flexShrink: 0 }}>
              {DIFFICULTY_LEVEL === 4 ? `Đúng: ${score}` : `${current + 1}/${questionsData.length}`}
            </span>
          )}
        </div>

      </div>

      {DIFFICULTY_LEVEL < 4 && <div style={{ width: "100%", height: "8px", backgroundColor: "#e0e0e0", borderRadius: "4px", overflow: "hidden", marginBottom: "20px" }}>
        <div style={{ height: "100%", width: `${timePercentage}%`, backgroundColor: timeLeft <= 3 ? "#f44336" : "#4caf50", transition: "width 1s linear" }} />
      </div>}

      {/* --- CÁC KIỂU CÂU HỎI (ĐÃ CHỈNH SỬA BỎ <br/> LÀM PHẲNG CÂU HỎI TRÊN 1 DÒNG) --- */}
      {currentQ.type === "en_to_vn" && (
        <>
          <h2 style={{ fontSize: "22px", color: "#2c3e50" }}>What does <span style={{color: "#2196F3"}}>"{currentQ.word}"</span> mean?</h2>
          <p style={{ fontSize: "18px", color: "#555", marginBottom: "20px" }}><strong><i>{currentQ.phonetic}</i></strong></p>
          <div className="options">
            {currentQ.options.map((opt, idx) => (
              <button key={idx} onClick={() => handleAnswer(opt)} className={selected ? (opt === currentQ.answer ? "correct" : opt === selected ? "wrong" : "") : ""} disabled={selected !== null}>{opt}</button>
            ))}
          </div>
        </>
      )}

      {currentQ.type === "listening" && (
        <>
          <h2 style={{ fontSize: "20px", color: "#2c3e50" }}>🎧 Nghe và chọn nghĩa của từ:</h2>
          <h1 style={{ fontSize: "40px", color: "#FF9800", letterSpacing: "5px", margin: "10px 0" }}>????</h1>
          <div className="options" style={{ marginTop: "20px" }}>
            {currentQ.options.map((opt, idx) => (
              <button key={idx} onClick={() => handleAnswer(opt)} className={selected ? (opt === currentQ.answer ? "correct" : opt === selected ? "wrong" : "") : ""} disabled={selected !== null}>{opt}</button>
            ))}
          </div>
        </>
      )}

      {currentQ.type === "vn_to_en" && (
        <>
          <h2 style={{ fontSize: "22px", color: "#2c3e50", lineHeight: "1.4" }}>Từ nào có nghĩa là <span style={{color: "#2196F3"}}>"{currentQ.meaning}"</span>?</h2>
          <div className="options" style={{ marginTop: "20px" }}>
            {currentQ.options.map((opt, idx) => (
              <button key={idx} onClick={() => handleAnswer(opt)} className={selected ? (opt === currentQ.answer ? "correct" : opt === selected ? "wrong" : "") : ""} disabled={selected !== null} style={{ fontWeight: "bold", fontSize: "18px" }}>{opt}</button>
            ))}
          </div>
        </>
      )}

      {currentQ.type === "typing" && (
        <>
          <h2 style={{ fontSize: "22px", color: "#2c3e50", lineHeight: "1.4" }}>Gõ từ có nghĩa là <span style={{color: "#9C27B0"}}>"{currentQ.meaning}"</span></h2>
          <form onSubmit={handleTypingSubmit} style={{ marginTop: "20px" }}>
            <input ref={typingInputRef} type="text" value={typingValue} onChange={(e) => setTypingValue(e.target.value)} disabled={selected !== null} placeholder="Nhập từ vựng..." style={{ width: "100%", padding: "15px", fontSize: "20px", textAlign: "center", borderRadius: "8px", border: "2px solid #ccc", outline: "none", textTransform: "lowercase" }} autoComplete="off" autoCorrect="off" spellCheck="false" />
            {selected === null && (
              <button type="submit" style={{ width: "100%", padding: "12px", marginTop: "15px", fontSize: "18px", backgroundColor: "#2196F3", color: "white", borderRadius: "8px", border: "none", cursor: typingValue.trim() ? "pointer" : "not-allowed", opacity: typingValue.trim() ? 1 : 0.5 }}>Kiểm tra</button>
            )}
          </form>
        </>
      )}

      {currentQ.type === "scramble" && (
        <>
          <h2 style={{ fontSize: "22px", color: "#2c3e50", lineHeight: "1.4" }}>Xếp chữ có nghĩa là <span style={{color: "#E91E63"}}>"{currentQ.meaning}"</span></h2>
          
          <div style={{ minHeight: "50px", display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center", padding: "15px 0", borderBottom: "2px dashed #eee", marginBottom: "15px" }}>
              {scrambleSelected.map(item => (
                  <button key={item.id} onClick={() => handleScrambleClick(item, false)} style={{ width: "45px", height: "45px", fontSize: "22px", fontWeight: "bold", padding: 0, margin: 0, backgroundColor: "#2196F3", color: "white", borderRadius: "8px" }}>{item.char.toUpperCase()}</button>
              ))}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center", marginBottom: "20px" }}>
              {scrambleAvailable.map(item => (
                  <button key={item.id} onClick={() => handleScrambleClick(item, true)} style={{ width: "45px", height: "45px", fontSize: "22px", fontWeight: "bold", padding: 0, margin: 0, backgroundColor: "#e0e0e0", color: "#333", borderRadius: "8px" }}>{item.char.toUpperCase()}</button>
              ))}
          </div>

          {selected === null && scrambleAvailable.length === 0 && (
              <button onClick={submitScramble} style={{ width: "100%", padding: "12px", fontSize: "18px", backgroundColor: "#4CAF50", color: "white", borderRadius: "8px" }}>Kiểm tra</button>
          )}
        </>
      )}

      {/* FEEDBACK & NEXT BUTTON */}
      {selected && (
        <>
          <div style={{ marginTop: "15px", padding: "12px", borderRadius: "8px", backgroundColor: (selected.toLowerCase() === currentQ.answer.toLowerCase() || selected === currentQ.answer) ? "#e8f5e9" : "#ffebee", color: (selected.toLowerCase() === currentQ.answer.toLowerCase() || selected === currentQ.answer) ? "#2e7d32" : "#c62828", fontWeight: "bold", fontSize: "18px", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)" }}>
            {feedbackMsg}
          </div>
          
          {(currentQ.type === "vn_to_en" || currentQ.type === "typing" || currentQ.type === "scramble") && (
            <div style={{ marginTop: "15px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", padding: "15px", backgroundColor: "#f0f8ff", borderRadius: "10px", border: "2px dashed #4facfe" }}>
               <span style={{ fontSize: "14px", color: "#555", fontWeight: "bold", textTransform: "uppercase" }}>Từ tiếng Anh chính xác</span>
               <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                   <span style={{ fontSize: "26px", fontWeight: "bold", color: "#1976D2" }}>{currentQ.word}</span>
                   <button 
                       onClick={() => speakWord(currentQ.word)}
                       title="Nghe phát âm"
                       style={{ width: "36px", height: "36px", borderRadius: "50%", border: "none", backgroundColor: "#4facfe", color: "white", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "16px", padding: 0, margin: 0, boxShadow: "0 2px 5px rgba(0,0,0,0.2)", transition: "0.2s" }}
                       onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                       onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                   >
                       🔊
                   </button>
               </div>
               <span style={{ fontSize: "18px", color: "#666" }}><i>{currentQ.phonetic}</i></span>
            </div>
          )}

          {(currentQ.type === "en_to_vn" || currentQ.type === "listening") && selected !== "TIMEOUT" && selected !== currentQ.answer && (
             <div style={{ marginTop: "10px", fontSize: "18px", color: "#F44336", fontWeight: "bold" }}>
               Nghĩa đúng: <span style={{ textDecoration: "underline", color: "#4CAF50" }}>{currentQ.answer}</span>
             </div>
          )}

          <div style={{ marginTop: "15px", padding: "15px", backgroundColor: "#f8f9fa", borderRadius: "8px", borderLeft: "4px solid #90caf9", textAlign: "left" }}>
            <p style={{ margin: 0, fontSize: "16px", color: "#333", lineHeight: "1.5" }}>
              <strong>📌 Ngữ cảnh:</strong> <br/>
              {currentQ.usage}
            </p>
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", height: "40px", marginBottom: "20px", gap: "10px" }}>
        <div style={{ flex: 1, display: "flex", justifyContent: "flex-start" }}>
          <button 
            onClick={() => { 
              if(streak >= REQUIRED_STREAK) {
                playSound("click");
                onBack(); 
              }
            }} 
            style={{ width: "max-content", padding: "6px 10px", fontSize: "13px", cursor: streak >= REQUIRED_STREAK ? "pointer" : "not-allowed", backgroundColor: streak >= REQUIRED_STREAK ? "#e8f5e9" : "#f0f0f0", color: streak >= REQUIRED_STREAK ? "#2e7d32" : "#999", border: "1px solid #ccc", borderRadius: "6px", whiteSpace: "nowrap", fontWeight: "bold", margin: 0, flexShrink: 0 }}
          >
            ⬅ {streak >= REQUIRED_STREAK ? "🔓" : `🔒 ${streak}/${REQUIRED_STREAK}`}
          </button>
        </div>

        <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
          <span style={{ color: "#666", fontSize: "13px", whiteSpace: "nowrap", fontWeight: "bold", flexShrink: 0 }}>
            {current + 1}/{questionsData.length}
          </span>
        </div>
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", padding: "8px", backgroundColor: "#f0f8ff", borderRadius: "8px", border: "1px solid #cce7ff", width: "100%" }}>
        
        {/* BÊN TRÁI: Nhóm nút Nhạc */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <button onClick={toggleMusic} title={isMusicPlaying ? "Tắt nhạc" : "Bật nhạc"} style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: isMusicPlaying ? "#FF9800" : "#E0E0E0", color: isMusicPlaying ? "white" : "#666", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", transition: "0.2s", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", padding: 0 }}>
            {isMusicPlaying ? "🔊" : "🔇"}
          </button>
          <button onClick={playNextTrack} title="Chuyển sang bài khác" style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "#4facfe", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", transition: "0.2s", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", padding: 0 }}>
            ⏭️
          </button>
          <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} title="Điều chỉnh âm lượng" style={{ width: "40px", cursor: "pointer", marginLeft: "2px" }} />
        </div>

        {/* BÊN PHẢI: Tài khoản & Nút Thoát */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ fontSize: "11px", color: "#333", fontWeight: "bold", maxWidth: "60px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={currentUser.email}>
            👤 {currentUser.email.split('@')[0]}
          </span>
          <button 
            onClick={handleLogout} 
            title="Đăng xuất"
            style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "#ff4d4f", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", transition: "0.2s", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", padding: 0 }}
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