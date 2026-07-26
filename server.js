// =====================================
// DR. SAMY FELAFEL - Backend Server
// (نسخة متصلة بقاعدة بيانات MongoDB)
// =====================================

const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
const PORT = process.env.PORT || 3000;

// مفتاح بسيط لحماية صفحة عرض الحجزات
const ADMIN_KEY = process.env.ADMIN_KEY || "samy2026";

// رابط الاتصال بقاعدة البيانات (بييجي من Railway Variables)
const MONGO_URI = process.env.MONGO_URI;

let consultationsCollection;

async function connectToDatabase() {
    if (!MONGO_URI) {
        console.log("⚠️ MONGO_URI غير موجود. السيرفر شغال بدون قاعدة بيانات.");
        return;
    }

    try {
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        const db = client.db("dr_samy_vet");
        consultationsCollection = db.collection("consultations");
        console.log("✅ تم الاتصال بقاعدة بيانات MongoDB بنجاح");
    } catch (err) {
        console.error("❌ فشل الاتصال بقاعدة البيانات:", err.message);
    }
}

app.use(cors());
app.use(express.json());

// ---------- فحص إن السيرفر شغال ----------
app.get("/", (req, res) => {
    res.send(
        `Dr. Samy Felafel backend is running ✅ | Database: ${consultationsCollection ? "متصل ✅" : "غير متصل ❌"}`
    );
});

// ---------- استقبال طلب حجز جديد ----------
app.post("/api/consultations", async (req, res) => {
    const { fullName, phoneNumber, animalType, serviceType, message, country } = req.body;

    if (!fullName || !phoneNumber || !animalType || !serviceType || !message) {
        return res.status(400).json({ success: false, error: "من فضلك املأ جميع الحقول المطلوبة" });
    }

    const newEntry = {
        fullName,
        phoneNumber,
        animalType,
        serviceType,
        message,
        country: country || "غير محدد",
        createdAt: new Date().toISOString(),
        status: "جديد"
    };

    if (!consultationsCollection) {
        return res.status(503).json({ success: false, error: "قاعدة البيانات غير متصلة حاليًا" });
    }

    try {
        const result = await consultationsCollection.insertOne(newEntry);
        res.status(201).json({ success: true, data: { _id: result.insertedId, ...newEntry } });
    } catch (err) {
        console.error("خطأ في حفظ الطلب:", err.message);
        res.status(500).json({ success: false, error: "حدث خطأ أثناء حفظ الطلب" });
    }
});

// ---------- عرض كل الحجزات (محمي بمفتاح بسيط) ----------
app.get("/api/consultations", async (req, res) => {
    const key = req.query.key;

    if (key !== ADMIN_KEY) {
        return res.status(401).json({ success: false, error: "غير مصرح لك بالدخول" });
    }

    if (!consultationsCollection) {
        return res.status(503).json({ success: false, error: "قاعدة البيانات غير متصلة حاليًا" });
    }

    try {
        const list = await consultationsCollection.find().sort({ createdAt: -1 }).toArray();
        res.json({ success: true, count: list.length, data: list });
    } catch (err) {
        res.status(500).json({ success: false, error: "حدث خطأ أثناء جلب البيانات" });
    }
});

// ---------- تحديث حالة حجز معين ----------
app.patch("/api/consultations/:id", async (req, res) => {
    const key = req.query.key;
    if (key !== ADMIN_KEY) {
        return res.status(401).json({ success: false, error: "غير مصرح لك بالدخول" });
    }

    if (!consultationsCollection) {
        return res.status(503).json({ success: false, error: "قاعدة البيانات غير متصلة حاليًا" });
    }

    const { status } = req.body;

    try {
        await consultationsCollection.updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { status: status || "جديد" } }
        );
        res.json({ success: true });
    } catch (err) {
        res.status(404).json({ success: false, error: "الطلب غير موجود" });
    }
});

connectToDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});
