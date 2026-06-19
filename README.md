# World Cup 2026 Predictor

Web app dự đoán World Cup 2026 cho team nội bộ.

Người chơi có thể:
- đăng ký / đăng nhập
- nhận điểm khởi tạo
- đặt cược theo kèo `1X2` hoặc `kèo chấp`
- xem bảng xếp hạng
- xem lịch sử cược
- tham gia các dự đoán vui

Admin / operator có thể:
- thêm / sửa / xóa trận
- set kèo
- chốt kết quả
- export lịch sử
- cộng / trừ / reset điểm
- bật bảo trì
- chuẩn hóa tên đội

## Công nghệ
- Node.js
- Express
- express-session
- Supabase (tùy chọn, để lưu dữ liệu online)
- Render (tùy chọn, để deploy)

## Cấu trúc thư mục
- `server/`: backend Express
- `public/`: frontend tĩnh
- `public/team-catalog.js`: catalog đội tuyển + alias + cờ
- `data.json`: dữ liệu local fallback
- `.env.example`: mẫu biến môi trường
- `HANDOVER.md`: tài liệu bàn giao cho dev khác

## Yêu cầu
- Node.js 20+ hoặc 22+
- npm

## Chạy local
1. Cài package:
   ```bash
   npm install
   ```
2. Tạo file `.env` từ `.env.example`
3. Chạy app:
   ```bash
   npm start
   ```
4. Mở:
   - local: [http://localhost:3000](http://localhost:3000)
   - LAN: `http://<ip-máy-chủ>:3000`

## Biến môi trường
Các biến chính:
- `SESSION_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Các biến tùy chọn cho odds API:
- `ODDS_PROVIDER`
- `ODDS_API_KEY`
- `ODDS_SPORT`
- `ODDS_REGIONS`
- `ODDS_MARKETS`
- `ODDS_BOOKMAKERS`
- `ODDS_SYNC_INTERVAL_MS`
- `APIFOOTBALL_KEY`
- `APIFOOTBALL_LEAGUE`
- `APIFOOTBALL_SEASON`
- `APIFOOTBALL_BOOKMAKER`

Xem mẫu đầy đủ ở `D:\AI\FC Online\Project 4\.env.example`

## Supabase
Nếu muốn dữ liệu online thay vì lưu local:

1. Tạo project Supabase
2. Chạy SQL:
   ```sql
   create table if not exists public.app_state (
     id bigint primary key,
     state jsonb not null,
     updated_at timestamptz not null default now()
   );
   ```
3. Lấy:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Set vào env

Khi có đủ 2 biến trên, app sẽ ưu tiên lưu dữ liệu trên Supabase.

## Render
Nếu deploy lên Render:
- Build command: `npm install`
- Start command: `npm start`
- nhớ set env giống trong `.env.example`

## Gợi ý bàn giao cho dev khác
1. Gửi repo GitHub
2. Gửi file zip sạch
3. Gửi `HANDOVER.md`
4. Gửi `.env.example`
5. Không gửi `.env` thật hoặc secret key thật qua chat công khai

## Lưu ý
- `node_modules/`, `.env`, `data.json` không nên commit để bàn giao
- nếu đổi catalog đội tuyển, có thể vào admin và bấm `Chuẩn hóa tên đội`
- nếu dữ liệu live đang dùng Supabase, dev mới cần được cấp quyền vào Supabase và Render
