// server.js
import express from "express";
import multer from "multer";
import cors from "cors";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

// Load env vars
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer for file upload (store in memory)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail", // can be replaced with SMTP config
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ===== ROUTES =====
app.get("/", (req, res) => {
  res.send("🚀 StarVonis server is running!");
});

// ---------------------
// 📩 Contact Form
// ---------------------
app.post("/contact", upload.single("resume"), async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    const resumeFile = req.file;

    // 1️⃣ Email to HR
    const hrMail = {
      from: process.env.EMAIL_USER,
      to: process.env.HR_EMAIL,
      subject: `📩 New Contact from ${name}`,
      text: `
Name: ${name}
Email: ${email}
Phone: ${phone}
Message: ${message}
      `,
      attachments: resumeFile
        ? [
            {
              filename: resumeFile.originalname,
              content: resumeFile.buffer,
              contentType: resumeFile.mimetype,
            },
          ]
        : [],
    };
    await transporter.sendMail(hrMail);

    // 2️⃣ Confirmation email to candidate
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "✅ Thank you for contacting StarVonis",
      text: `Hello ${name},\n\nThank you for reaching out to StarVonis Software Solutions. We will get back to you shortly.\n\nBest regards,\nStarVonis HR Team`,
    });

    // 3️⃣ Save to Supabase
    await supabase.from("contacts").insert([
      {
        name,
        email,
        phone,
        message,
        resume_filename: resumeFile ? resumeFile.originalname : null,
      },
    ]);

    res.json({ success: true, message: "Message saved and emails sent." });
  } catch (err) {
    console.error("❌ Contact error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ---------------------
// 👩‍💻 Job Application
// ---------------------
app.post("/apply", upload.array("resumes", 5), async (req, res) => {
  try {
    const { name, email, phone, position } = req.body;
    const resumeFiles = req.files;

    // 1️⃣ Insert application record in Supabase
    const applicationId = uuidv4();
    const { error: insertError } = await supabase.from("applications").insert([
      {
        id: applicationId,
        name,
        email,
        phone,
        position,
      },
    ]);
    if (insertError) {
      console.error("❌ Supabase insert error:", insertError);
      return res.status(500).json({ success: false, error: "Database insert failed" });
    }

    // 2️⃣ Upload resumes to Supabase Storage
    const uploadedFiles = [];
    for (const file of resumeFiles) {
      const uniqueFileName = `${applicationId}/${uuidv4()}_${file.originalname}`;
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(uniqueFileName, file.buffer, {
          contentType: file.mimetype,
        });

      if (uploadError) {
        console.error("❌ File upload error:", uploadError);
      } else {
        uploadedFiles.push(uniqueFileName);
      }
    }

    // 3️⃣ Send email to HR
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.HR_EMAIL,
      subject: `📝 New Application: ${name}`,
      text: `New application received for ${position}.\n\nCandidate: ${name}\nEmail: ${email}\nPhone: ${phone}\nResumes: ${uploadedFiles.join(", ")}`,
    });

    // 4️⃣ Confirmation email to applicant
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "✅ Application Received",
      text: `Hi ${name},\n\nThank you for applying for ${position}. We have received your application and will review it shortly.\n\nBest regards,\nStarVonis HR Team`,
    });

    res.json({ success: true, message: "Application submitted successfully." });
  } catch (err) {
    console.error("❌ Apply error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Start server
app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
