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

Sabit odanın 32 karakterli oda kodu erişim anahtarıdır. Oturum açmış ve kodu bilen kullanıcı sabit oda verisini ve sohbeti okuyabilir; oda listesi yalnızca oda sahibinin `hostUid` sorgusuna açıktır. RTDB oda oturumunu ve signaling verisini `sessionId` ile ayırır. Signaling yazıları gönderen UID ve aktif bağlantı kimliğine bağlanır; eski bağlantı kimliğinden kalan sinyaller yeni bağlantıda kullanılmaz. Canlı Firebase’de kurallar değiştiğinde hem Firestore hem RTDB Rules yayımlanmalıdır.

Oda kodunu bilen oturum açmış bir kullanıcı, oda aktifken katılabilir. Sabit oda oturumu host uygulamadan ayrılınca kapanır; host tekrar katılarak oturumu açar. RTDB `onDisconnect` temizliği beklenmedik kapanma ve ağ kesintilerinde garanti değildir.

## Oda yaşam döngüsü (PHASE 04)

Oda kodu 32 karakterli rastgele kimliktir; oda bağlantısı `/rooms/{oda-kodu}` biçimindedir. Geçici odalar oda sahibi uygulamadan ayrıldığında RTDB oturumu ve erişim aynası silinerek kapatılır. Sabit odalarda host oturumu kapanır, Firestore oda ve geçmiş yetkili üyeler korunur; host tekrar katıldığında yeni RTDB oturumu açılır. Sabit oda erişimi Firebase UID'sine bağlıdır; anonim oturum farklı tarayıcıda veya tarayıcı verileri silindiğinde farklı UID alabilir.

Kapasite, `activeMembers/0..3` altındaki dört RTDB yuvasıyla sınırlandırılır. Her katılım bir yuvada atomik transaction kullanır; aynı UID tekrar katılırsa kendi yuvası güncellenir. Bağlantı kesilince `onDisconnect` yuva ve presence kayıtlarını temizlemeyi dener. Spark planında istemci temizliği beklenmedik kapanma ve ağ kesintilerinde garanti değildir; bu nedenle eski aktif kayıtlar kalabilir. Host oda ekranından ayrılma temizliğini başlatır.

Geçici odayı sabitlemek Firestore sabit oda kaydını oluşturur; ardından RTDB oturumunun türünü günceller. Firestore ve RTDB işlemleri tek transaction değildir; arada hata olursa kayıtlar geçici olarak farklı kalabilir. İşlem hata gösterirse Firebase Console'daki kayıtları kontrol edip tekrar deneyin.

## Yazılı sohbet (PHASE 05)

Geçici oda mesajları açık RTDB oturumunun altında saklanır ve oda kapanınca oturumla birlikte silinir. Sabit oda sohbeti Firestore'da 100 belge yuvası kullanır; her yeni mesaj sayaç ve yuva değişikliğini tek transaction içinde günceller, böylece en eski mesajı döngüsel olarak yenisiyle değiştirir. Eşzamanlı sayaca çakışan gönderimler sınırlı sayıda yeniden denenir. Her mesajda oturum UID'si doğrulanır, metin 1–1000 karakterle sınırlıdır ve arayüz metni HTML olarak çalıştırmaz.

Rules testlerini Firebase Emulator Suite ile çalıştırın: `npm run test:rules`. Emulator kuralları `firestore.rules` ve `database.rules.json` dosyalarından yüklenir; testler `demo-escord` sahte proje kimliğini kullanır ve Firebase projesine bağlanmaz.

Rules dosyalarını gerçek Firebase projesine yüklemeden önce testler geçmelidir. Doğrulama sonrası proje kökünde `firebase deploy --project escord-7ab3b --only firestore:rules,database` komutu kullanılabilir. Bu komut gerçek Firebase güvenlik kurallarını değiştirir; yayınlamadan önce dosyaları gözden geçirin.

## WebRTC bağlantı testi (PHASE 06)

Odaya katılan her istemci bir `connectionId` üretir. Her katılımcı çifti için UID'si alfabetik olarak önce gelen taraf offer başlatır; diğer taraf answer verir. Offer/answer ve ICE candidate kayıtları Firebase RTDB'de oda oturum kimliği, katılımcı çifti ve bağlantı kimlikleriyle tutulur. Bağlantı kaydı kapanınca istemci kendi sinyal dalını temizler; kopma durumunda RTDB `onDisconnect` yedek temizlik sağlar.

Bu aşamada medya gönderilmez. `escord-connectivity-test` DataChannel'ı otomatik ping/pong mesajıyla doğrulanır; oda kartında bağlantı durumu ve yaklaşık RTT gösterilir. ICE restart bir kez denenir. Testte Google'ın halka açık `stun.l.google.com:19302` ve `stun1.l.google.com:19302` adresleri kullanılır. STUN bağlantı yolunu bulmaya yardımcı olur; TURN olmadığı için bazı NAT/firewall koşullarında P2P bağlantısı yine kurulamayabilir.

## GitHub Pages yayını (PHASE 12)

Vite base yolu GitHub repository adı `EsCord` olarak ayarlanmıştır; uygulama `HashRouter` kullanır, bu yüzden sayfa yenileme ve `/rooms/...` davetleri Pages üzerinde çalışır. GitHub Pages adresi `https://kayrasahin0.github.io/EsCord/` biçimindedir.

1. GitHub repository **KayraSahin0/EsCord → Settings → Secrets and variables → Actions → Variables** sayfasına şu değişkenleri ekleyin: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_DATABASE_URL`. Değerleri Firebase Project settings → General → Web App yapılandırmasından alın; RTDB URL’sini Realtime Database sayfasından alın. Web Firebase config tarayıcıya dahil edilir; service account/private key eklemeyin.
2. Repository **Settings → Pages → Build and deployment → Source** bölümünde **GitHub Actions** seçin.
3. Firebase Console’da **Authentication → Settings → Authorized domains → Add domain** alanına `kayrasahin0.github.io` ekleyin.
4. `.github/workflows/deploy.yml` dosyasını `main` dalına gönderin veya Actions sekmesinden **Deploy EsCord to GitHub Pages → Run workflow** çalıştırın. Build ve deploy başarılı olunca Actions deployment URL’sini açın.

Yayın kontrolü: ana sayfayı ve `#/rooms/{oda-kodu}` yönlendirmesini yenileyin; anonim/e-posta girişi, veritabanları, kamera/mikrofon izinleri ve HTTPS P2P bağlantısını iki ve dört istemciyle test edin. Ekran paylaşımı bilinen açık sorundur ve bu doğrulama kapsamı dışında bırakılmıştır.
