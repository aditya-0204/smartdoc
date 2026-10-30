# 📄 SmartDoc

SmartDoc is a **cloud-based document expiry reminder system** built using AWS serverless services. The platform automatically tracks document expiry dates and sends timely reminder notifications to users, helping them avoid missing important renewals.

---

## 🚀 Features

### ⏰ Automated Expiry Reminders
- Automatically schedules reminders for document expiry.
- Sends alerts at multiple intervals:
  - 30 days
  - 15 days
  - 7 days
  - 3 days
  - 1 day before expiry

### ☁️ Serverless Architecture
- Built entirely using AWS serverless services.
- Scalable and cost-efficient workflow.
- Handles daily automated processing without manual intervention.

### 🔐 Secure Authentication
- Integrated **Google OAuth 2.0** for secure login.
- Standardized user identity and access control.

### 📬 Email Notification System
- Sends expiry alerts using SendGrid + NodeMailer.
- Verified end-to-end reminder delivery.
- Successfully delivered **70+ automated alerts** during testing.

### 🗂️ Document Metadata Management
- Stores document details like:
  - Document type
  - Document number
  - Expiry date
- Uses DynamoDB for fast and scalable storage.

---

## 🛠️ Tech Stack

- **Cloud Platform:** AWS
- **Compute:** AWS Lambda
- **Scheduling:** AWS EventBridge (Cron Rules)
- **Database:** DynamoDB
- **Monitoring:** CloudWatch
- **Secrets Management:** AWS Secrets Manager
- **Authentication:** Google OAuth 2.0
- **Email Service:** SendGrid + NodeMailer
- **Runtime:** Node.js

---

## 🧠 System Architecture

1. User adds document details.
2. Metadata stored in DynamoDB.
3. EventBridge triggers scheduled Lambda functions.
4. Lambda checks upcoming expiries.
5. Email reminders sent via SendGrid.
6. Logs and monitoring handled by CloudWatch.

---

## 📊 Impact

- Processed **15+ official documents** in testing.
- Sent **70+ automated expiry alerts** successfully.
- Built a scalable, modular workflow using 3 AWS Lambda functions.

---
## Screenshots
<img width="1889" height="850" alt="image" src="https://github.com/user-attachments/assets/35cc1824-5700-420c-8e9b-5cd368b2e690" />
<img width="1897" height="870" alt="image" src="https://github.com/user-attachments/assets/74184076-5e9b-4073-a06f-7e4ddeae1b98" />


## ⚙️ Installation & Setup
testing
$env:K6_WEB_DASHBOARD="true"; k6 run loadtest.js

### 1️⃣ Clone the repository
```bash
git clone https://github.com/aditya-0204/smartdoc.git
cd smartdoc
Install dependencies
npm install

create .env file
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
SENDGRID_API_KEY=your_sendgrid_key
AWS_REGION=your_region

