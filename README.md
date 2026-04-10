# CAPS AI App - Expo React Native + Node.js Backend

Ứng dụng được xây dựng với React Native Expo, Tailwind CSS, Node.js và MySQL.

## User App AI Integration Guide

Frontend và backend phải dùng cùng một host/IP LAN thật khi chạy trên điện thoại. Không hard-code `localhost` trong app mobile.

### Biến môi trường khuyến nghị

Frontend Expo/React Native có thể đọc các biến sau:

```env
EXPO_PUBLIC_BACKEND_BASE_URL=http://192.168.1.8:5003
EXPO_PUBLIC_CAMERA_BASE_URL=http://192.168.1.8:5000
EXPO_PUBLIC_VIDEO_FEED_URL=http://192.168.1.8:5000/video_feed
EXPO_PUBLIC_ALERTS_API_URL=http://192.168.1.8:5003/api/alerts
```

Nếu dự án web đang dùng Vite, các key `VITE_*` tương ứng cũng được hỗ trợ.

### Luồng camera live

Màn hình Home dùng WebView để nhúng `GET /viewer/camera?label=...`. URL phải được dựng từ base URL cấu hình, không hard-code `localhost`.

### Ảnh cảnh báo

Backend trả về cả `image_url` và `image_urls`. UI phải thử lần lượt từng URL trong `image_urls`, sau đó mới fallback sang `image_url` hoặc ảnh mặc định.

### Checklist

- Dùng host/IP LAN hoặc domain thật của máy chạy backend.
- Không phụ thuộc vào `localhost` trên điện thoại.
- Khi ảnh cảnh báo không hiện, kiểm tra trước `PUBLIC_BASE_URL` và URL trong `image_urls`.
- Nếu backend đổi cổng, cập nhật đồng thời URL WebView, API alerts, và image URLs.

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
