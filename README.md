# Gold Robot XAU/USD (PWA)

Isi paket: index.html, manifest.webmanifest, sw.js, icon-192.png, icon-512.png (aplikasi),
signal.js dan .github/workflows/signal.yml (notifikasi otomatis saat aplikasi tertutup).

## A. Pasang aplikasi (GitHub Pages)
1. Upload semua file ke repo (ganti index.html lama). Folder .github/workflows/signal.yml dibuat lewat
   "Add file > Create new file", ketik nama: .github/workflows/signal.yml lalu tempel isinya.
2. Settings > Pages > Deploy from branch > main > Save.
3. Buka link Pages di Chrome HP > menu titik tiga > "Tambahkan ke layar utama" / "Instal aplikasi".
4. Buka aplikasi, masukkan API key Twelve Data (sekali), tekan "Aktifkan notifikasi", lalu START BOT.

## B. Notifikasi saat aplikasi tertutup (gratis, via GitHub Actions + ntfy)
1. Pasang aplikasi ntfy di HP, subscribe ke topic rahasia buatanmu (misal gold-robot-xxxx-9f3k).
2. Repo > Settings > Secrets and variables > Actions > New secret:
   TD_KEY = API key Twelve Data, NTFY_TOPIC = nama topic tadi.
3. Tab Actions > "Sinyal XAUUSD" > Run workflow (isi test = 1) untuk tes notifikasi.
4. Berhenti: tab Actions > Sinyal XAUUSD > menu titik tiga > Disable workflow.

JANGAN taruh API key di index.html jika repo publik. Ganti key lama di dashboard Twelve Data.
