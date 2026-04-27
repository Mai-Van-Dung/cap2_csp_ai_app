# AI Handoff Guide - Ket noi User App voi Camera Admin

Tai lieu nay de gui cho AI agent o project User App. Muc tieu: ket noi thanh cong camera stream tu backend admin (Python Flask) va tu dong phuc hoi khi IP LAN thay doi.

## 1. Muc tieu ky thuat

- User App hien thi duoc live camera.
- User App nhan duoc su kien realtime khi co alert.
- Khong hardcode mot IP duy nhat de tranh loi sau khi doi Wi-Fi.

## 2. API contract phai dung

Backend admin hien co cac endpoint sau:

- GET /api/connection-info
- GET /viewer/camera
- GET /video_feed
- GET /status
- Socket.IO path: /socket.io
- Socket event: new_alert

Connection-info tra ve cac truong quan trong:

- preferred_base_url
- base_candidates
- camera.viewer_url
- camera.video_feed_path
- socket.path
- socket.event

## 3. Yeu cau bat buoc cho AI ben User App

1. Khong hardcode URL camera co dinh nhu http://192.168.1.x:5000.
2. Phai co co che auto-probe theo danh sach base URL.
3. Camera va Socket phai dung cung mot base URL da probe thanh cong.
4. Khi mat ket noi, phai thu lai base tiep theo thay vi crash app.

## 4. Thuat toan ket noi de AI trien khai

Input dau vao:

- Seed URLs (co the tu env):
  - EXPO_PUBLIC_CAMERA_PUBLIC_BASE_URL (neu co)
  - EXPO_PUBLIC_CAMERA_BASE_URL (backward compatible)
  - http://10.0.2.2:5000 (Android emulator)
  - http://127.0.0.1:5000
  - http://localhost:5000
  - 1-2 LAN IP duoc nguoi dung cau hinh tay (neu co)

Thuat toan:

1. Tao danh sach candidates ban dau tu seed URLs (loai bo trung).
2. Voi tung seed URL:
   - Goi GET {seed}/api/connection-info.
   - Neu thanh cong, append preferred_base_url va base_candidates vao danh sach.
3. Probe danh sach tong hop theo thu tu:
   - Test GET {base}/status (timeout ngan, vi du 1200-2000ms).
   - Neu status OK, chon base nay la activeBase va dung cho:
     - camera: {activeBase}/viewer/camera hoac {activeBase}/video_feed
     - socket: connect activeBase voi path /socket.io
4. Neu stream loi hoac socket disconnect lien tuc:
   - danh dau base hien tai fail tam thoi,
   - quay lai buoc probe voi base tiep theo.

## 5. Cach render camera trong User App

Lua chon khuyen nghi:

- Dung WebView voi /viewer/camera de giam khac biet nen tang.

Lua chon thay the:

- Dung thang /video_feed neu app tu xu ly MJPEG on dinh.

## 6. Realtime alert contract cho User App

Lang nghe event new_alert qua Socket.IO.

Khi nhan payload:

- uu tien image_url de hien thi anh
- fallback sang image_path + activeBase neu image_url rong
- luu camera_id, zone_id, object_type, confidence, created_at cho lich su su kien

## 7. Tinh huong loi va cach xu ly

### Loi khong lay duoc video

Nguyen nhan thuong gap:

- User App dang dung IP cu (vi du 192.168.1.8) trong khi backend da doi IP.

Xu ly:

- goi lai /api/connection-info
- re-probe base_candidates
- switch sang activeBase moi

### Loi Telegram co gui nhung User App khong co anh

Nguyen nhan:

- image_url tro den base khong reachable tu device

Xu ly:

- mo image_url tren chinh thiet bi User App de test
- neu timeout, doi sang base co the truy cap tu thiet bi do

### Socket duoc, camera khong duoc (hoac nguoc lai)

Nguyen nhan:

- camera va socket dang dung 2 base URL khac nhau

Xu ly:

- ep ca hai dung cung activeBase da probe OK

## 8. Acceptance criteria de AI tu test

AI ben User App chi duoc xem la hoan tat khi dat du 4 dieu kien:

1. Mo app va hien thi duoc camera trong 3-5 giay.
2. Khi backend doi IP LAN, app tu ket noi lai ma khong can sua code.
3. Nhan duoc event new_alert realtime khi backend phat hien intrusion.
4. Hien thi duoc anh canh bao tu image_url hoac fallback image_path.

## 9. Prompt goi y de gui truc tiep cho AI ben project User App

Hay trien khai module ket noi camera admin theo hop dong sau:

- Luon bootstrap qua GET /api/connection-info
- Tu dong probe base_candidates va chon activeBase reachable
- Dung activeBase cho ca viewer camera va Socket.IO
- Lang nghe event new_alert, hien thi image_url neu co
- Neu ket noi fail, auto fallback sang base tiep theo
- Khong hardcode duy nhat mot LAN IP

Bao cao ket qua gom:

- base dang active
- thoi gian ket noi camera
- trang thai socket
- ket qua nhan su kien new_alert test
