from flask import Flask, request, jsonify
import requests
import uuid
import smtplib
from email.message import EmailMessage

app = Flask(__name__)

# Supabase settings
SUPABASE_URL = "https://fltpjevomkaxlqywirhi.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsdHBqZXZvbWtheGxxeXdpcmhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjgzNDY0NCwiZXhwIjoyMDcyNDEwNjQ0fQ.Un9TXCIcMNK8yQI0drSdxCFSEdWZ1mH6QN9BXw9sQfQ"  # replace with your key
APPLICATIONS_TABLE = "applications"
RESUMES_BUCKET = "resumes"

# Email settings
EMAIL_USER = "starvonis@gmail.com"
EMAIL_PASS = "maoa qkxo sjoj shne"
HR_EMAIL = "starvonis@gmail.com"

# Allowed file types and max size
ALLOWED_EXTENSIONS = {"pdf", "doc", "docx"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


# ------------------------------
# Helper functions
# ------------------------------
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def insert_application(name, email, phone, position):
    url = f"{SUPABASE_URL}/rest/v1/{APPLICATIONS_TABLE}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    data = {
        "id": str(uuid.uuid4()),
        "name": name,
        "email": email,
        "phone": phone,
        "position": position
    }
    response = requests.post(url, headers=headers, json=data)
    if response.status_code in [200, 201]:
        return response.json()[0]["id"]
    else:
        print("Error inserting application:", response.text)
        return None


def upload_resume(file, filename):
    url = f"{SUPABASE_URL}/storage/v1/object/{RESUMES_BUCKET}/{filename}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}"
    }
    response = requests.put(url, headers=headers, data=file.read())
    if response.status_code in [200, 201]:
        return f"{SUPABASE_URL}/storage/v1/object/public/{RESUMES_BUCKET}/{filename}"
    else:
        print("Upload Error:", response.text)
        return None


# ------------------------------
# Flask route
# ------------------------------
@app.route('/apply', methods=['POST'])
def apply():
    try:
        # 1️⃣ Get form data
        name = request.form['name']
        email = request.form['email']
        phone = request.form['phone']
        position = request.form['position']
        files = request.files.getlist('resumes')

        # 2️⃣ Validate files
        for file in files:
            if not allowed_file(file.filename):
                return jsonify({"status": "error", "message": f"Invalid file type: {file.filename}"}), 400
            file.seek(0, 2)  # move to end to get size
            size = file.tell()
            file.seek(0)  # reset pointer
            if size > MAX_FILE_SIZE:
                return jsonify({"status": "error", "message": f"File too large: {file.filename}"}), 400

        # 3️⃣ Insert applicant into Supabase
        application_id = insert_application(name, email, phone, position)
        if not application_id:
            return jsonify({"status": "error", "message": "Failed to save application"}), 500

        # 4️⃣ Upload resumes
        uploaded_files = []
        for file in files:
            unique_file_name = f"{uuid.uuid4()}_{file.filename}"
            file_url = upload_resume(file, unique_file_name)
            if file_url:
                uploaded_files.append(file.filename)

        # 5️⃣ Send email to HR
        hr_msg = EmailMessage()
        hr_msg['Subject'] = f"New Application: {name}"
        hr_msg['From'] = EMAIL_USER
        hr_msg['To'] = HR_EMAIL
        hr_msg.set_content(
            f"New application received for {position} from {name} ({email}, {phone}).\n"
            f"Resumes: {', '.join(uploaded_files)}"
        )
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(EMAIL_USER, EMAIL_PASS)
            smtp.send_message(hr_msg)

        # 6️⃣ Send confirmation to applicant
        applicant_msg = EmailMessage()
        applicant_msg['Subject'] = "Application Received"
        applicant_msg['From'] = EMAIL_USER
        applicant_msg['To'] = email
        applicant_msg.set_content(
            f"Hi {name},\n\nThank you for applying for {position}. We have received your application and will review it shortly.\n\nBest regards,\nStarVonis Team"
        )
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(EMAIL_USER, EMAIL_PASS)
            smtp.send_message(applicant_msg)

        return jsonify({"status": "success", "message": "Application submitted!"})

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True)
