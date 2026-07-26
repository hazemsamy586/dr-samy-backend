// =====================================
// DR. SAMY FELAFEL - Backend Server
// =====================================

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// مفتاح بسيط لحماية صفحة عرض الحجزات (غيّره لأي كلمة سر تانية تحت في الإعدادات)
const ADMIN_KEY = process.env.ADMIN_KEY || "samy2026";

const DATA_FILE = path.join(__dirname, "data", "consultations.json");

// السماح للموقع (الفرونت إند) إنه يتواصل مع الباك إند
app.use(cors());
app.use(express.json());

// التأكد من وجود ملف تخزين البيانات
function ensureDataFile() {
    if (!fs.existsSync(path.join(__dirname, "data"))) {
        fs.mkdirSync(path.join(__dirname, "data"));
    }
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
    }
}

function readConsultations() {
    ensureDataFile();
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw);
}

function saveConsultations(list) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2));
}

// ---------- فحص إن السيرفر شغال ----------
app.get("/", (req, res) => {
    res.send("Dr. Samy Felafel backend is running ✅");
});

// ---------- استقبال طلب حجز جديد من فورم الموقع ----------
app.post("/api/consultations", (req, res) => {
    const { fullName, phoneNumber, animalType, serviceType, message, country } = req.body;

    if (!fullName || !phoneNumber || !animalType || !serviceType || !message) {
        return res.status(400).json({ success: false, error: "من فضلك املأ جميع الحقول المطلوبة" });
    }

    const newEntry = {
        id: Date.now(),
        fullName,
        phoneNumber,
        animalType,
        serviceType,
        message,
        country: country || "غير محدد",
        createdAt: new Date().toISOString(),
        status: "جديد"
    };

    const list = readConsultations();
    list.unshift(newEntry);
    saveConsultations(list);

    res.status(201).json({ success: true, data: newEntry });
});

// ---------- عرض كل الحجزات (محمي بمفتاح بسيط) ----------
// مثال على الاستخدام: /api/consultations?key=samy2026
app.get("/api/consultations", (req, res) => {
    const key = req.query.key;

    if (key !== ADMIN_KEY) {
        return res.status(401).json({ success: false, error: "غير مصرح لك بالدخول" });
    }

    const list = readConsultations();
    res.json({ success: true, count: list.length, data: list });
});

// ---------- تحديث حالة حجز معين (تمت المتابعة / ملغي...) ----------
app.patch("/api/consultations/:id", (req, res) => {
    const key = req.query.key;
    if (key !== ADMIN_KEY) {
        return res.status(401).json({ success: false, error: "غير مصرح لك بالدخول" });
    }

    const { status } = req.body;
    const list = readConsultations();
    const entry = list.find((item) => item.id === Number(req.params.id));

    if (!entry) {
        return res.status(404).json({ success: false, error: "الطلب غير موجود" });
    }

    entry.status = status || entry.status;
    saveConsultations(list);

    res.json({ success: true, data: entry });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
