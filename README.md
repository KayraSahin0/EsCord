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

Firebase değişkenleri `.env.local` içinde tutulur: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` ve `VITE_FIREBASE_DATABASE_URL`. Bu yerel dosya Git'e gönderilmez.

Firebase Console’da **Project settings → General → Your apps → Web app → SDK setup and configuration → Config** alanındaki Web App değerlerini `.env.local` dosyasına aktarın. RTDB adresini **Build → Realtime Database** sayfasından alın. Anonim girişi **Authentication → Sign-in method → Anonymous** bölümünde etkinleştirin. Değişiklikten sonra geliştirme sunucusunu yeniden başlatın.

## Firebase Rules

Firestore erişimi `fixedRooms/{roomId}/members/{uid}` kayıtlarıyla doğrulanır. RTDB kuralları Firestore belgelerini sorgulayamadığı için oda sahibi, üyelik listesinin bir aynasını `roomAccess/{roomId}` altında tutar. Firestore üyelik kaydı ile RTDB aynası atomik güncellenemez; yeni üyeye RTDB erişimi ancak ayna yazıldıktan sonra açılır. Erişim kaldırırken önce RTDB aynası güncellenmelidir. İstemci/sunucu kesintisi iki tarafta geçici farklılık bırakabilir; işlemler tekrar denenmelidir.

RTDB aynasının ilk kaydını oturum açmış bir istemci kendi UID'sini host olarak yazar. Firebase Rules, bu UID'nin Firestore'daki host UID ile aynı olduğunu doğrulayamaz. Bu Spark planı tercihi nedeniyle, RTDB oda kimliğini bilen oturum açmış bir istemci aynayı ilk oluşturan kişi olabilir. Sabit oda verisi Firestore kurallarıyla ayrıca korunur; RTDB verisi için bu kabul edilmiş sınırlama geçerlidir.

Rules testlerini Firebase Emulator Suite ile çalıştırın: `npm run test:rules`. Emulator kuralları `firestore.rules` ve `database.rules.json` dosyalarından yüklenir; testler `demo-escord` sahte proje kimliğini kullanır ve Firebase projesine bağlanmaz.

Rules dosyalarını gerçek Firebase projesine yüklemeden önce testler geçmelidir. Doğrulama sonrası proje kökünde `firebase deploy --project escord-7ab3b --only firestore:rules,database` komutu kullanılabilir. Bu komut gerçek Firebase güvenlik kurallarını değiştirir; yayınlamadan önce dosyaları gözden geçirin.
