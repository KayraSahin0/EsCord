# EsCord

Arkadaş grubu için P2P sesli ve görüntülü sohbet uygulaması.

## Geliştirme

```bash
npm install
npm run dev
```

Üretim derlemesi ve lint kontrolü:

```bash
npm run build
npm run lint
```

## Ortam değişkenleri

Vite istemci tarafında yalnızca `VITE_` ile başlayan değişkenleri sunar. Firebase Web App yapılandırması `.env.local` dosyasında saklanır; bu dosya Git tarafından yok sayılır. Web yapılandırma değerleri tarayıcıya gider; service account/private key bilgileri değildir ve bu dosyaya konulmamalıdır.

PHASE 02 Firebase değişkenleri: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID` ve `VITE_FIREBASE_APP_ID`.

Firebase Console’da **Project settings → General → Your apps → Web app → SDK setup and configuration → Config** alanındaki Web App değerlerini `.env.local` dosyasına aktarın. Anonim girişi **Authentication → Sign-in method → Anonymous** bölümünde etkinleştirin. Değişiklikten sonra geliştirme sunucusunu yeniden başlatın.
