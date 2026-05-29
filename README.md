# World Cup 2026 LAN Predictor

Web app cho team (~50 nguoi) dang ky/dang nhap, dat cuoc bang diem noi bo.

## Tinh nang
- Dang ky / dang nhap tai khoan
- Moi user co `1000` diem khoi tao
- Dat cuoc 1 lan / tran (`HOME`, `DRAW`, `AWAY`)
- Tru diem khi dat, cong diem khi thang theo odds
- Bang xep hang theo tong diem
- Endpoint admin de nhap ket qua tran va settle
- Admin panel thu cong ngay tren web: them/xoa tran, settle ket qua
- Dong bo tran + kickoff + odds tu The Odds API (manual + auto)

## Chay local/LAN
1. Cai dependency:
   ```bash
   npm install
   ```
2. Chay server:
   ```powershell
   $env:SESSION_SECRET="your-secret"
   $env:ADMIN_USERNAME="admin"
   $env:ADMIN_PASSWORD="admin123"
   # optional: bat dong bo odds tu API
   $env:ODDS_PROVIDER="api-football" # hoac "the-odds-api"
   $env:ODDS_API_KEY="your-odds-api-key"
   $env:ODDS_SPORT="soccer_fifa_world_cup"
   $env:ODDS_REGIONS="eu"
   $env:ODDS_MARKETS="h2h"
   # API-Football mode:
   $env:APIFOOTBALL_KEY="your-api-football-key"
   $env:APIFOOTBALL_LEAGUE="1"
   $env:APIFOOTBALL_SEASON="2026"
   # optional:
   # $env:APIFOOTBALL_BOOKMAKER="6"
   $env:ODDS_SYNC_INTERVAL_MS="300000"
   npm start
   ```
3. Truy cap:
   - Tren may chu: `http://localhost:3000`
   - Tren may trong LAN: `http://<IP-LAN-cua-may-chu>:3000`

Server bind `0.0.0.0` nen may trong mang LAN co the vao duoc.

## Admin settle ket qua
Dang nhap bang tai khoan admin de dung trang Admin tren web.
Neu goi API truc tiep, can dang nhap truoc de co session.

```bash
curl -X POST http://<IP-LAN-cua-may-chu>:3000/api/admin/settle ^
  -H "Content-Type: application/json" ^
  -d "{\"matchId\":1,\"result\":\"HOME\"}"
```

`result` nhan 1 trong 3 gia tri: `HOME`, `DRAW`, `AWAY`.

## Admin sync odds
Dong bo ngay lap tuc tu The Odds API:

```bash
curl -X POST http://<IP-LAN-cua-may-chu>:3000/api/admin/sync-odds ^
  -b cookie.txt -c cookie.txt
```

Xem trang thai sync:

```bash
curl http://<IP-LAN-cua-may-chu>:3000/api/admin/sync-status ^
  -b cookie.txt -c cookie.txt
```

Neu co `ODDS_API_KEY`, server se tu sync theo chu ky `ODDS_SYNC_INTERVAL_MS` (mac dinh 5 phut).
Neu `ODDS_PROVIDER=api-football` thi server dung endpoint `https://v3.football.api-sports.io/odds` va can `APIFOOTBALL_LEAGUE`, `APIFOOTBALL_SEASON`.

## Luu y
- Day la app game vui noi bo, khong dung tien that.
- Odds seed mau van co san de test. Khi bat API, du lieu moi se duoc upsert vao file `data.json`.
- Nen dat `ADMIN_PASSWORD` manh truoc khi mo LAN.

