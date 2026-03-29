# CAPS AI App - Expo React Native + Node.js Backend

Ứng dụng được xây dựng với React Native Expo, Tailwind CSS, Node.js và MySQL.

## Cấu trúc thư mục

```
cap2_csp_ai_app/
├── frontend/                 # React Native Expo + Tailwind CSS
│   ├── src/
│   │   ├── components/      # Các component tái sử dụng
│   │   ├── screens/         # Các màn hình ứng dụng
│   │   ├── services/        # API services và helpers
│   │   ├── utils/           # Hàm tiện ích
│   │   ├── assets/          # Hình ảnh, font, media
│   │   ├── hooks/           # Custom React hooks
│   │   ├── context/         # React Context
│   │   └── styles/          # CSS styles
│   ├── App.js
│   ├── index.js
│   ├── app.json
│   ├── tailwind.config.js
│   └── package.json
│
├── backend/                  # Node.js Express + MySQL
│   ├── src/
│   │   ├── routes/          # API routes
│   │   ├── controllers/     # Logic xử lý các routes
│   │   ├── models/          # Database models
│   │   ├── middleware/      # Middleware (auth, validation...)
│   │   ├── utils/           # Hàm tiện ích
│   │   ├── config/          # Cấu hình (database, env...)
│   │   ├── database/        # Database migrations, seeds
│   │   └── index.js         # Entry point
│   ├── .env.example
│   └── package.json
│
├── .gitignore
└── README.md
```

## Hướng dẫn sử dụng

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env  # Cập nhật thông tin database
npm install
npm run dev
```

## Công nghệ sử dụng

- **Frontend**: React Native, Expo, Tailwind CSS, NativeWind
- **Backend**: Node.js, Express.js, MySQL2
- **Database**: MySQL

## Liên hệ & Hỗ trợ

Để biết thêm chi tiết, vui lòng tham khảo tài liệu trong từng thư mục.
