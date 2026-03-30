# RMS Web

Bu uygulama statik olarak yayinlanabilen bir RMS arayuzudur. Veri kaynagi sunucu tarafinda degil, kullanicinin tarayicidan bagladigi yerel DivvySync klasorundeki `rms-data.json` dosyasidir.

## Mimari

- UI: static web app
- Veri dosyasi: `rms-data.json`
- Ilk kullanim: `Klasoru Bagla`
- Okuma / yazma: tarayicidan yerel dosya erisimi
- Sync: tamamen DivvySync tarafinda
- Durum gorunumu: son yerel kaydetme, son gozlenen dosya degisikligi, dis degisiklik uyarisi

Tarayici tam klasor yolunu vermez. Uygulama secilen klasorun adini ve `rms-data.json` dosyasini gosterir.

## Neden JSON

Bu repo icin JSON, SQLite'tan daha dogru secimdir:

- Tarayicidan tek dosya olarak okumasi ve yazmasi kolaydir.
- Static web app ile dogrudan uyumludur.
- DivvySync klasor senkronu ile daha basit calisir.
- SQLite `-wal` / `-shm` gibi ek dosya ve kilitleme davranislarindan kacilir.

## Gelistirme

```powershell
npm install
npm run dev
```

Varsayilan adres:

```text
http://127.0.0.1:3000
```

## Static Build

```powershell
npm run build
```

Build ciktisi `out/` klasorune yazilir. Bu klasor static hosting uzerinden yayinlanabilir.

## Kullanim

1. Uygulamayi acin.
2. Dashboard uzerinden `Klasoru Bagla` secin.
3. DivvySync klasorunu secin.
4. Uygulama `rms-data.json` dosyasini acsin veya yoksa olustursun.
5. Kayitlar artik yerel dosyaya yazilir; bulut esleme DivvySync tarafinda devam eder.
