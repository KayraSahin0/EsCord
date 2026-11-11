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

Giriş ekranında e-posta/şifreyle hesap oluşturma ve giriş seçenekleri bulunur; anonim giriş altta ayrı düğmedir. Firebase Console’da **Authentication → Sign-in method → Email/Password** etkin olmalıdır. E-posta/şifre hesabı sabit oda oluşturabilir. Anonim kullanıcı yalnızca geçici oda oluşturabilir; kurallar bu ayrımı hem Firestore hem RTDB tarafında uygular. Önceki sürümden kalma anonim oturumunuz açık kalırsa Ayarlar’dan çıkış yaparak yeni giriş ekranına dönün.

## Firebase Rules

Firestore erişimi `fixedRooms/{roomId}/members/{uid}` kayıtlarıyla doğrulanır. RTDB kuralları Firestore belgelerini sorgulayamadığı için oda sahibi, üyelik listesinin bir aynasını `roomAccess/{roomId}` altında tutar. Firestore üyelik kaydı ile RTDB aynası atomik güncellenemez; yeni üyeye RTDB erişimi ancak ayna yazıldıktan sonra açılır. Erişim kaldırırken önce RTDB aynası güncellenmelidir. İstemci/sunucu kesintisi iki tarafta geçici farklılık bırakabilir; işlemler tekrar denenmelidir.

RTDB aynasının ilk kaydını oturum açmış bir istemci kendi UID'sini host olarak yazar. Firebase Rules, bu UID'nin Firestore'daki host UID ile aynı olduğunu doğrulayamaz. Bu Spark planı tercihi nedeniyle, RTDB oda kimliğini bilen oturum açmış bir istemci aynayı ilk oluşturan kişi olabilir. Sabit oda verisi Firestore kurallarıyla ayrıca korunur; RTDB verisi için bu kabul edilmiş sınırlama geçerlidir.

## Oda yaşam döngüsü (PHASE 04)

Oda kodu 32 karakterli rastgele kimliktir; oda bağlantısı `/rooms/{oda-kodu}` biçimindedir. Geçici odalar oda sahibi uygulamadan ayrıldığında RTDB oturumu ve erişim aynası silinerek kapatılır. Sabit odalarda host oturumu kapanır, Firestore oda ve geçmiş yetkili üyeler korunur; host tekrar katıldığında yeni RTDB oturumu açılır. Sabit oda erişimi Firebase UID'sine bağlıdır; anonim oturum farklı tarayıcıda veya tarayıcı verileri silindiğinde farklı UID alabilir.

Kapasite, `activeMembers/0..3` altındaki dört RTDB yuvasıyla sınırlandırılır. Her katılım bir yuvada atomik transaction kullanır; aynı UID tekrar katılırsa kendi yuvası güncellenir. Bağlantı kesilince `onDisconnect` yuva ve presence kayıtlarını temizlemeyi dener. Spark planında istemci temizliği beklenmedik kapanma ve ağ kesintilerinde garanti değildir; bu nedenle eski aktif kayıtlar kalabilir. Host oda ekranından ayrılma temizliğini başlatır.

Geçici odayı sabitlemek Firestore sabit oda kaydını oluşturur, o anki aktif UID'leri kalıcı yetkili üye olarak ekler ve ardından RTDB aynası ile oturum türünü günceller. Firestore ve RTDB işlemleri tek transaction değildir; arada hata olursa sabit oda kaydı ile RTDB aynası geçici olarak farklı kalabilir. İşlem hata gösterirse durumu Firebase Console'da kontrol edip tekrar deneyin.

## Yazılı sohbet (PHASE 05)

Geçici oda mesajları açık RTDB oturumunun altında saklanır ve oda kapanınca oturumla birlikte silinir. Sabit oda sohbeti Firestore'da 100 belge yuvası kullanır; her yeni mesaj sayaç ve yuva değişikliğini tek transaction içinde günceller, böylece en eski mesajı döngüsel olarak yenisiyle değiştirir. Eşzamanlı sayaca çakışan gönderimler sınırlı sayıda yeniden denenir. Her mesajda oturum UID'si doğrulanır, metin 1–1000 karakterle sınırlıdır ve arayüz metni HTML olarak çalıştırmaz.

Rules testlerini Firebase Emulator Suite ile çalıştırın: `npm run test:rules`. Emulator kuralları `firestore.rules` ve `database.rules.json` dosyalarından yüklenir; testler `demo-escord` sahte proje kimliğini kullanır ve Firebase projesine bağlanmaz.

Rules dosyalarını gerçek Firebase projesine yüklemeden önce testler geçmelidir. Doğrulama sonrası proje kökünde `firebase deploy --project escord-7ab3b --only firestore:rules,database` komutu kullanılabilir. Bu komut gerçek Firebase güvenlik kurallarını değiştirir; yayınlamadan önce dosyaları gözden geçirin.
