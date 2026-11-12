# ROADMAP --- Arkadaş Grubu İçin P2P Sesli ve Görüntülü Sohbet

## 1. Proje amacı

Yalnızca arkadaş grubunun kullanacağı, ücretsiz servislerin ücretsiz
katmanlarıyla çalışan, masaüstü öncelikli bir web uygulaması
geliştirmek.

### Temel özellikler

-   Kullanıcılar takma adla giriş yapar.
-   Kullanıcılar oda oluşturabilir ve odaya katılabilir.
-   Bir odada aynı anda en fazla 4 aktif katılımcı bulunabilir.
-   Sesli sohbet, kamera ve ekran paylaşımı WebRTC Mesh P2P ile çalışır.
-   Yazılı sohbet bulunur.
-   YouTube bağlantısı girilerek odadaki katılımcılar aynı videoyu
    senkronize izleyebilir.
-   Host oda adını belirleyebilir ve odayı sabitleyebilir.
-   Geçici odaların oturum mesajları oda kapandığında temizlenir.
-   Sabit odalar korunur ve davet koduna sahip oturum açmış kullanıcılar
    katılabilir.
-   Sabit odalarda en fazla 100 mesaj tutulur; yeni mesaj geldiğinde en
    eski mesaj çıkarılır.

## 2. Sabit teknoloji kararları

  -----------------------------------------------------------------------
  Alan                    Teknoloji               Sorumluluk
  ----------------------- ----------------------- -----------------------
  UI                      React                   Arayüz bileşenleri

  Dil                     TypeScript              Tip güvenliği

  Geliştirme/build        Vite                    Yerel geliştirme ve
                                                  üretim çıktısı

  Stil                    Tailwind CSS            Tasarım

  Routing                 React Router            Sayfa yönlendirme

  State                   Zustand                 Paylaşılan istemci
                                                  durumu

  Kimlik                  Firebase Anonymous      Kullanıcı UID'si
                          Authentication          

  Geçici gerçek zamanlı   Firebase Realtime       Presence, signaling,
  veri                    Database                geçici mesajlar,
                                                  YouTube durumu

  Kalıcı veri             Cloud Firestore         Sabit oda metaverisi ve
                                                  mesajları

  Medya                   Native WebRTC API       P2P ses, kamera ve
                                                  ekran paylaşımı

  YouTube                 YouTube IFrame Player   Her istemcide video
                          API                     oynatma

  Test                    Vitest                  Birim testleri

  Versiyon kontrolü       Git/GitHub              Kaynak kodu ve commit
                                                  geçmişi

  Yayınlama               GitHub Actions + GitHub Statik frontend yayını
                          Pages                   
  -----------------------------------------------------------------------

### Ücretsiz kullanım sınırları

-   Firebase Spark planında kalınacak; ücretli plana geçilmeyecek.
-   Cloud Functions, ücretli TURN hizmeti veya ücretli medya hizmeti
    kullanılmayacak.
-   GitHub Pages yalnızca statik frontend barındırır; backend
    çalıştırmaz.
-   WebRTC doğrudan bağlantısı her ağda garanti değildir. STUN ile
    başlanacak. TURN gerektiren ağlarda bağlantı başarısız olabilir; bu
    sınırlama kullanıcıya açıkça gösterilecek.
-   Ücretsiz STUN sunucularının sürekliliği veya kapasitesi garanti
    kabul edilmeyecek.
-   Firebase ücretsiz kotaları değişebilir. Geliştirme başında ve yayın
    öncesinde güncel Firebase Spark kotaları doğrulanacak.
-   GitHub Pages ücretsiz kullanım koşulları, repository görünürlüğü ve
    kullanım limitleri yayınlama aşamasında doğrulanacak.

## 3. Mimari ilkeler

1.  Host, medya sunucusu değildir. Host yalnızca oda
    sahibi/yöneticisidir.
2.  Ses ve görüntü Firebase üzerinden taşınmaz; WebRTC peer bağlantıları
    üzerinden aktarılır.
3.  Firebase RTDB signaling ve gerçek zamanlı oda verileri içindir.
4.  Firestore sabit oda verileri ve sabit oda mesajları içindir.
5.  Geçici ve sabit oda akışları açıkça ayrılır.
6.  UI bileşenleri doğrudan Firebase veya WebRTC ayrıntılarını yönetmez;
    servis katmanlarını çağırır.
7.  Her peer bağlantısının ve medya track'inin yaşam döngüsü merkezi
    şekilde yönetilir.
8.  Oda üyeliği, aktif bağlantı/presence durumundan ayrı modellenir.
9.  Oda kapasitesi kontrolü eşzamanlı katılım yarışlarını önleyecek
    atomik bir işlemle yapılır.
10. Firebase Security Rules istemci tarafındaki kontrollerin yerine
    değil, güvenlik sınırı olarak uygulanır.

## 4. Hedef klasör yapısı

Bu yapı başlangıç hedefidir. PHASE 00 sırasında gerçek proje yapısı
oluşturulacak ve onaylanacaktır. Sonraki aşamalarda bu yapıyı
değiştirmek gerekirse önce kullanıcıdan izin alınır.

``` text
friend-chat/
├── public/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── router.tsx
│   │   └── providers.tsx
│   ├── components/
│   │   ├── common/
│   │   ├── layout/
│   │   ├── modals/
│   │   └── ui/
│   ├── features/
│   │   ├── authentication/
│   │   ├── profile/
│   │   ├── rooms/
│   │   ├── chat/
│   │   ├── voice/
│   │   ├── video/
│   │   ├── screen-share/
│   │   └── youtube/
│   ├── services/
│   │   ├── firebase/
│   │   ├── webrtc/
│   │   └── youtube/
│   ├── stores/
│   ├── hooks/
│   ├── types/
│   ├── utils/
│   └── styles/
├── tests/
├── .github/
│   └── workflows/
├── index.html
├── vite.config.ts
├── package.json
└── tsconfig.json
```

## 5. Aşama tamamlama protokolü

Her PHASE için şu döngü zorunludur:

1.  Yalnızca mevcut PHASE'in kapsamını analiz et.
2.  Mevcut kodu ve dosya yapısını incele.
3.  Belirsiz veya erişilemeyen bilgi varsa kullanıcıya sor; tahmin
    ederek ilerleme.
4.  Değişiklik planını ve etkilenecek dosyaları açıkla.
5.  Yalnızca onaylanan kapsamda kod yaz.
6.  Build, lint ve ilgili testleri çalıştır.
7.  Kullanıcının bilgisayarında yapması gereken ayarları, Firebase
    Console işlemlerini, izinleri ve manuel testleri adım adım anlat.
8.  Test senaryolarını ve beklenen sonuçları listele.
9.  Bilinen hataları, kısıtları ve sonraki aşamayla ilgili
    bağımlılıkları belirt.
10. Kullanıcı testleri tamamlayıp **"Diğer aşamaya geç"** demeden
    sonraki PHASE'e başlama.

Bir aşamanın doğrulanması için sonraki aşamadan bir parçanın geçici
olarak gerekli olması durumunda: - Neden gerekli olduğunu açıkla. -
Hangi sonraki aşama bileşeninin test amacıyla gerektiğini belirt. -
Mümkünse geçici test düzeneği kullan. - Kullanıcıdan izin almadan
sonraki aşamanın gerçek özelliklerini geliştirme. - Test düzeneğinin
geçici mi kalıcı mı olduğunu açıkça belirt.

------------------------------------------------------------------------

# PHASE 00 --- Teknik hazırlık ve proje kurulumu

**Amaç:** Geliştirme ortamını, repository'yi ve temel Vite uygulamasını
kurmak.

### Görevler

-   [ ] Node.js LTS sürümünü doğrula.
-   [ ] Git kurulumunu doğrula.
-   [ ] Editör ve terminal ortamını kontrol et.
-   [ ] React + TypeScript + Vite projesini oluştur.
-   [ ] Gerekli temel paketleri kur.
-   [ ] Git repository oluştur ve ilk commit'i al.
-   [ ] `.gitignore` dosyasını kontrol et.
-   [ ] Ortam değişkenleri yaklaşımını belirle.
-   [ ] Projeyi yerel ortamda çalıştır.
-   [ ] TypeScript ve Vite build kontrolü yap.

### Başlangıç paketleri

Gerektiğinde şu paketler kullanılabilir: - `firebase` -
`react-router-dom` - `zustand` - `lucide-react` - `zod` -
`tailwindcss` - `@tailwindcss/vite` - Geliştirme bağımlılığı olarak
`vitest`

Paket sürümleri kurulum anında uyumlu ve kararlı sürümlerden seçilmeli;
sürüm numarası uydurulmamalı.

### Test ve kabul kriterleri

-   [ ] `npm run dev` çalışıyor.
-   [ ] Uygulama tarayıcıda açılıyor.
-   [ ] `npm run build` başarılı.
-   [ ] GitHub repository'ye commit gönderildi.
-   [ ] Console'da başlangıç kaynaklı hata yok.

### Kullanıcıya teslim edilecek açıklama

-   Kurulum komutları.
-   Oluşturulan dosyalar.
-   Gerekli kullanıcı ayarları.
-   Yerel test adımları.
-   Beklenen ekran ve sonuç.
-   Bilinen eksikler.

**PHASE 00 tamamlanmadan PHASE 01'e geçme.**

------------------------------------------------------------------------

# PHASE 01 --- Arayüz ve tasarım altyapısı

**Amaç:** Uygulamanın statik arayüzünü oluşturmak. Bu aşamada gerçek
Firebase ve WebRTC işlevleri eklenmez.

### Sayfalar

-   [ ] Ana sayfa / oda listesi.
-   [ ] Oda ekranı.
-   [ ] Profil/ayarlar alanı.
-   [ ] Oda oluşturma modalı.
-   [ ] Odaya katılma modalı.
-   [ ] Genel hata ve bildirim bileşenleri.

### Bileşenler

-   [ ] Sidebar.
-   [ ] Header.
-   [ ] Profil alanı.
-   [ ] Oda kartı.
-   [ ] Katılımcı kartı.
-   [ ] Sohbet paneli.
-   [ ] Mesaj yazma alanı.
-   [ ] Mikrofon/kamera/ekran paylaşımı kontrolleri.
-   [ ] YouTube paneli.
-   [ ] Modal, toast ve loading bileşenleri.

### Tasarım ilkeleri

-   Masaüstü öncelikli, responsive tasarım.
-   Koyu tema.
-   Tutarlı renk, boşluk, radius ve tipografi sistemi.
-   Erişilebilir buton ve form etiketleri.
-   İşlevi olmayan sahte buton bırakma; henüz bağlanmamış kontroller
    açıkça devre dışı veya taslak durumda olmalı.

### Test ve kabul kriterleri

-   [ ] Ana sayfa ve oda ekranı açılıyor.
-   [ ] Modal açılıp kapanıyor.
-   [ ] Temel ekran boyutlarında taşma yok.
-   [ ] Tarayıcı console hatası yok.
-   [ ] Tasarım bileşenleri tekrar kullanılabilir.

**PHASE 01 tamamlanmadan PHASE 02'ye geçme.**

------------------------------------------------------------------------

# PHASE 02 --- Kullanıcı kimliği ve profil

**Amaç:** Firebase Anonymous Authentication ile kalıcı UID tabanlı
kullanıcı kimliği oluşturmak.

### Görevler

-   [ ] Firebase web uygulaması yapılandırmasını ekle.
-   [ ] Anonymous Authentication etkinleştir.
-   [ ] Oturum açma ve oturumu geri yükleme.
-   [ ] UID bilgisini uygulama state'ine aktar.
-   [ ] İlk girişte takma ad belirleme.
-   [ ] Takma ad değiştirme.
-   [ ] Profil verisini kaydetme ve okuma.
-   [ ] Çıkış işlemi.
-   [ ] Kimlik doğrulama yüklenirken ekran durumunu yönet.

### Önemli karar

Anonim hesap, tarayıcı verileri temizlenirse kaybedilebilir. Aynı UID
ile sabit odalara erişimin devam etmesi gerekiyorsa ileride hesap
bağlama/yedekleme seçeneği ele alınmalıdır. Bu aşamada Google girişini
kendiliğinden ekleme.

### Test ve kabul kriterleri

-   [ ] İlk girişte anonim kullanıcı oluşuyor.
-   [ ] UID tekrar girişte korunuyor.
-   [ ] Takma ad kaydediliyor ve yükleniyor.
-   [ ] Başka tarayıcıda farklı anonim UID oluşuyor.
-   [ ] Auth hataları kullanıcıya anlaşılır gösteriliyor.

**PHASE 02 tamamlanmadan PHASE 03'e geçme.**

------------------------------------------------------------------------

# PHASE 03 --- Firebase servis katmanı ve güvenlik

**Amaç:** Firebase erişimini tek bir servis katmanında toplamak ve
güvenlik kurallarını kurmak.

### Görevler

-   [ ] Realtime Database oluştur.
-   [ ] Cloud Firestore oluştur.
-   [ ] Firebase yapılandırmasını ortam değişkenlerinden oku.
-   [ ] RTDB servis katmanı oluştur.
-   [ ] Firestore servis katmanı oluştur.
-   [ ] Auth servis katmanını ayır.
-   [ ] Veri modellerini TypeScript tipleriyle tanımla.
-   [ ] Firebase Security Rules yaz ve test et.
-   [ ] Hata ve bağlantı durumlarını merkezi yönet.

### Veri alanlarının sorumluluğu

**Realtime Database** - Presence. - Oda oturum durumu. - WebRTC
signaling. - Geçici oda mesajları. - YouTube senkronizasyon durumu.

**Cloud Firestore** - Kullanıcı profilleri (gereken alanlar). - Sabit
oda metadata. - Sabit oda mesajları.

### Güvenlik kabul kriterleri

-   [ ] Giriş yapmamış kullanıcı özel verileri okuyamıyor.
-   [ ] Oda kodunu bilmeyen kullanıcı oda verisini okuyamıyor.
-   [ ] Host olmayan kullanıcı yönetim alanlarını değiştiremiyor.
-   [ ] Kullanıcı başka UID adına işlem yapamıyor.
-   [ ] Rules testleri başarılı.

**PHASE 03 tamamlanmadan PHASE 04'e geçme.**

------------------------------------------------------------------------

# PHASE 04 --- Oda yönetimi

**Amaç:** Medya bağlantısı olmadan oda yaşam döngüsünü tamamlamak.

### Oda oluşturma

-   [ ] Benzersiz oda kimliği üret.
-   [ ] Oda adı al.
-   [ ] Host UID ata.
-   [ ] Geçici/sabit oda türünü belirle.
-   [ ] Oda durumunu oluştur.
-   [ ] Host'u aktif üye olarak ekle.

### Odaya katılma

-   [ ] Oda ID ile katılma.
-   [ ] Davet linki ile katılma.
-   [ ] Sabit oda listesinden katılma.
-   [ ] Oda var mı kontrol et.
-   [ ] Oda aktif mi kontrol et.
-   [ ] Maksimum 4 aktif kullanıcı kontrolü.
-   [ ] Eşzamanlı katılım için atomik kapasite kontrolü.
-   [ ] Aynı UID'nin tekrar katılma davranışını belirle.
-   [ ] Başarılı katılımda üyelik/presence kaydı oluştur.

### Sabit oda üyeliği

-   [ ] Sabit oda metadata'sını Firestore'da tut.
-   [ ] Oda kodunu sabit odanın davet anahtarı olarak kullan.
-   [ ] Aktif katılımcıları geçmişteki oda oturumlarından ayır.
-   [ ] Oda kodunu bilmeyen kullanıcıların erişimini engelle.
-   [ ] Geçici odayı sabit odaya dönüştürmeyi e-posta hesabı olan host'a
    sınırla; sabit odalar oluşturulunca otomatik kalıcıdır.

### Host yaşam döngüsü

-   [ ] Host ayrılmasını algıla.
-   [ ] Geçici odada kapanış/temizlik akışını başlat.
-   [ ] Sabit odada kalıcı veriyi koru.
-   [ ] Sabit oda aktif oturumunu kapat.
-   [ ] Host tekrar katıldığında oturumu yeniden aç.

### Temizlik kısıtı

Spark planında güvenilir sunucu tarafı Cloud Functions kullanılmayacak.
RTDB `onDisconnect` ve istemci temizliği tek başına tüm beklenmedik
durumlarda kusursuz garanti vermez. Eski oda kayıtları için güvenli,
tekrar çalıştırılabilir temizlik akışı tasarla; bu sınırlamayı
kullanıcıya açıkla. İstemciye güvenerek güvenlik kuralı gevşetme.

### Test ve kabul kriterleri

-   [ ] Dört farklı kullanıcı katılabiliyor.
-   [ ] Beşinci kullanıcı reddediliyor.
-   [ ] Aynı anda katılma yarışı kapasiteyi aşmıyor.
-   [ ] Host ayrılma davranışı oda türüne göre doğru.
-   [ ] Aktif sabit odaya davet koduna sahip oturum açmış kullanıcılar katılabiliyor.
-   [ ] Davet kodu olmadan sabit oda ID'si keşfedilemiyor; oda listesi yalnızca sahibine açık.

**PHASE 04 tamamlanmadan PHASE 05'e geçme.**

------------------------------------------------------------------------

# PHASE 05 --- Yazılı sohbet

**Amaç:** Geçici ve sabit odalarda farklı saklama politikalarıyla gerçek
zamanlı mesajlaşma.

### Geçici odalar

-   [ ] RTDB'ye mesaj yaz.
-   [ ] Mesajları gerçek zamanlı dinle.
-   [ ] Gönderen UID, takma ad, metin ve timestamp tut.
-   [ ] Odaya yeni katılan kullanıcıya mevcut oturum mesajlarını yükle.
-   [ ] Mesaj uzunluğu sınırı koy.
-   [ ] Boş mesajı reddet.
-   [ ] Oda kapanışında mesajları temizle.

### Sabit odalar

-   [ ] Firestore'a mesaj yaz.
-   [ ] Odaya girildiğinde son 100 mesajı yükle.
-   [ ] Yeni mesajları gerçek zamanlı dinle.
-   [ ] Mesajları kronolojik sırala.
-   [ ] Yeni mesaj geldiğinde en eski mesajı sil.
-   [ ] Eşzamanlı mesajlarda sıra/limit tutarlılığını transaction ile
    sağla.

### Güvenlik ve doğrulama

-   [ ] Yalnızca oda üyeleri mesaj okuyabilir.
-   [ ] Yalnızca oda üyeleri mesaj yazabilir.
-   [ ] Gönderen UID doğrulanır.
-   [ ] Mesaj metni güvenli biçimde render edilir.
-   [ ] HTML/script çalıştırılmaz.
-   [ ] İstemcinin gönderdiği kullanıcı adı tek başına güvenilir kabul
    edilmez.

### Test ve kabul kriterleri

-   [ ] İki istemci arasında mesaj anlık görünür.
-   [ ] Geçici oda kapanınca mesajlar temizlenir.
-   [ ] Sabit oda yeniden açılınca geçmiş mesajlar görünür.
-   [ ] 101. mesajdan sonra yalnızca en yeni 100 mesaj kalır.
-   [ ] Eşzamanlı mesaj testinde sınır bozulmaz.

**PHASE 05 tamamlanmadan PHASE 06'ya geçme.**

------------------------------------------------------------------------

# PHASE 06 --- WebRTC signaling ve P2P bağlantı yöneticisi

**Amaç:** Medya eklemeden önce dört katılımcının WebRTC Mesh
bağlantılarını kurmak.

### Görevler

-   [ ] RTCPeerConnection yaşam döngüsünü yönet.
-   [ ] Her peer çifti için tek bağlantı oluştur.
-   [ ] Offer/answer signaling akışını kur.
-   [ ] ICE candidate gönder/al.
-   [ ] Remote description gelmeden gelen candidate'leri sıraya al.
-   [ ] Offer çakışması (glare) durumunu önle.
-   [ ] Deterministik offer başlatma kuralı belirle.
-   [ ] Bağlantı durumlarını izle.
-   [ ] Peer ayrılınca bağlantıyı kapat.
-   [ ] Signaling verisini temizle.
-   [ ] Yeniden bağlanma davranışını belirle.
-   [ ] RTDB listener'larını doğru zamanda kaldır.

### Bağlantı sayısı

-   2 katılımcı: 1 peer bağlantısı.
-   3 katılımcı: 3 peer bağlantısı.
-   4 katılımcı: 6 peer bağlantısı.

### Offer ve signaling düzeni

Her katılımda istemci yeni bir `connectionId` üretir. Signaling kayıtları
oda `sessionId`'si, sıralanmış UID çifti ve gönderen bağlantı kimliği
altında tutulur. UID'si sıralamada önce gelen taraf offer başlatır;
diğer taraf answer verir. Böylece başlangıçta aynı çift için iki offer
oluşmaz. Eski oturum veya bağlantı kimliğiyle gelen signaling yok sayılır.
DataChannel ping/pong testi medya eklemeden P2P veri aktarımını doğrular.

### Test yaklaşımı

İlk testte gerçek medya yerine `RTCDataChannel` ile basit ping/pong veya
test metni gönder. Bu, signaling ve peer bağlantısını medya
sorunlarından ayırır.

### Test ve kabul kriterleri

-   [ ] İki kullanıcı P2P bağlantı kuruyor.
-   [ ] Üç kullanıcıda 3 bağlantı kuruluyor.
-   [ ] Dört kullanıcıda 6 bağlantı kuruluyor.
-   [ ] Her peer bağlantısı doğru UID ile eşleşiyor.
-   [ ] Bir kullanıcı ayrıldığında diğer peer bağlantıları bozulmuyor.
-   [ ] Yeniden katılımda eski bağlantı nesneleri sızmıyor.
-   [ ] Farklı internetlerde STUN bağlantısı test edildi.

### Ağ kısıtı

STUN, TURN'un yerine her ağda geçmez. TURN olmadan bazı NAT/firewall
koşullarında bağlantı kurulamayabilir. Bu durumda kullanıcıya bağlantı
kurulamadığını göster; başarılıymış gibi davranma.

**PHASE 06 tamamlanmadan PHASE 07'ye geçme.**

------------------------------------------------------------------------

# PHASE 07 --- Sesli sohbet

**Amaç:** Mikrofon sesini WebRTC peer bağlantıları üzerinden aktarmak.

### Görevler

-   [ ] Mikrofon izni al.
-   [ ] getUserMedia ile ses track'i al.
-   [ ] Yeni peer bağlantılarına ses track'i ekle.
-   [ ] Mevcut peer bağlantılarında track değişimini yönet.
-   [ ] Gelen ses track'lerini oynat.
-   [ ] Mikrofon aç/kapat.
-   [ ] Mikrofon cihazı seç.
-   [ ] Ses çıkış cihazı seçimini desteklenen tarayıcılarda ele al.
-   [ ] Kullanıcı bazında ses seviyesi ayarı.
-   [ ] Konuşan kullanıcı algılama.
-   [ ] Oda çıkışında mikrofon track'lerini durdur.
-   [ ] İzin reddi ve cihaz bulunamaması hatalarını yönet.

### Test ve kabul kriterleri

-   [ ] İki kullanıcı karşılıklı ses duyuyor.
-   [ ] Dört kullanıcı birbirini duyuyor.
-   [ ] Mikrofon kapatıldığında ses gitmiyor.
-   [ ] Kullanıcı ses seviyesi yalnızca ilgili kişiyi etkiliyor.
-   [ ] Oda çıkışında mikrofon kullanımı bırakılıyor.
-   [ ] Mikrofon izni reddedilince anlaşılır hata gösteriliyor.

### Ses track düzeni

Her peer bağlantısında ilk WebRTC offer'ından itibaren çift yönlü bir
audio transceiver ayrılır. Mikrofon açma, kapatma ve cihaz değiştirme
işlemleri bu transceiver'ın sender track'ini değiştirir; ses verisi
Realtime Database veya Firestore'a yazılmaz. Mikrofon ve çıkış cihazı
tercihleri tarayıcıda saklanır.

**PHASE 07 tamamlanmadan PHASE 08'e geçme.**

------------------------------------------------------------------------

# PHASE 08 --- Kamera ve görüntülü sohbet

**Amaç:** Kamera görüntüsünü mevcut P2P bağlantılarına eklemek.

### Görevler

-   [ ] Kamera izni al.
-   [ ] getUserMedia ile video track al.
-   [ ] Video track'lerini peer bağlantılarına ekle.
-   [ ] Gelen video track'lerini doğru kullanıcıya bağla.
-   [ ] Kamera aç/kapat.
-   [ ] Kamera cihazı seçimi.
-   [ ] Kamera değişiminde track replacement.
-   [ ] Kamera kapalı avatar görünümü.
-   [ ] Yerel önizleme.
-   [ ] Video alanı düzeni.
-   [ ] Oda çıkışında kamera track'lerini durdur.

### Test ve kabul kriterleri

-   [ ] İki kullanıcı karşılıklı görüntü görüyor.
-   [ ] Dört kullanıcı aynı anda kamera açabiliyor.
-   [ ] Kamera kapatıldığında diğerleri doğru durum görüyor.
-   [ ] Mikrofon çalışması bozulmuyor.
-   [ ] Cihaz değiştirme doğru çalışıyor.
-   [ ] Video kaynakları oda çıkışında serbest bırakılıyor.

**PHASE 08 tamamlanmadan PHASE 09'a geçme.**

------------------------------------------------------------------------

# PHASE 09 --- Ekran paylaşımı

**Amaç:** Ekran/pencere/tarayıcı sekmesini P2P ile paylaşmak.

### Görevler

-   [ ] getDisplayMedia ile ekran akışı al.
-   [ ] Ekran track'ini peer bağlantılarına gönder.
-   [ ] Ekran paylaşımını durdur.
-   [ ] Tarayıcının yerleşik paylaşım durdurma olayını yakala.
-   [ ] Kamera track'i ile ekran track'ini birbirinden bağımsız yönet.
-   [ ] Ekran paylaşan kullanıcıyı arayüzde belirt.
-   [ ] Ekran paylaşımı bittiğinde normal görünüme dön.

### Önemli

Ekran paylaşımı ve kamera aynı anda çalışabilmeli. Birini durdurmak
diğerinin track'ini kapatmamalı.

### Test ve kabul kriterleri

-   [ ] Ekran görüntüsü diğer kullanıcılara ulaşıyor.
-   [ ] Paylaşım durdurulabiliyor.
-   [ ] Tarayıcı üstünden durdurma algılanıyor.
-   [ ] Kamera ve mikrofon etkilenmiyor.
-   [ ] Dört kişilik odada paylaşım test edildi.

**PHASE 09 tamamlanmadan PHASE 10'a geçme.**

------------------------------------------------------------------------

# PHASE 10 --- Senkronize YouTube izleme

**Amaç:** Her kullanıcının kendi tarayıcısında aynı YouTube videosunu
ortak kontrol durumuyla oynatması.

### Görevler

-   [ ] YouTube URL doğrulama.
-   [ ] Video ID çıkarma.
-   [ ] IFrame Player API yükleme.
-   [ ] Video oynatıcı oluşturma.
-   [ ] Host kontrol yetkisi.
-   [ ] Video değiştirme.
-   [ ] Oynat/duraklat senkronizasyonu.
-   [ ] Seek/ileri-geri sarma senkronizasyonu.
-   [ ] Oynatma hızı senkronizasyonu.
-   [ ] Periyodik zaman farkı kontrolü.
-   [ ] Geri bildirim döngüsü/sonsuz event tetiklenmesini önleme.
-   [ ] Video yüklenme ve hata durumlarını gösterme.

### Senkronizasyon verisi

RTDB'de video ID, oynatma durumu, hedef zaman, oynatma hızı, güncelleme
zamanı ve kontrol eden UID saklanabilir.

Her saniye gereksiz yazma yapma. Oynatma olayları ve sınırlı aralıklarla
yapılan senkronizasyon kontrollerini kullan.

### Sınırlamalar

-   Bazı videolar embed oynatmaya izin vermez.
-   Reklamlar ve bölgesel kısıtlamalar farklı zamanlamaya neden
    olabilir.
-   Tarayıcı autoplay politikaları nedeniyle kullanıcı etkileşimi
    gerekebilir.
-   Kusursuz kare-kare eşzamanlılık garanti edilemez.

### Test ve kabul kriterleri

-   [ ] Host link girebiliyor.
-   [ ] Dört istemci aynı videoyu açabiliyor.
-   [ ] Host play/pause işlemi diğerlerine yansıyor.
-   [ ] Host seek işlemi diğerlerine yansıyor.
-   [ ] Zaman farkı makul eşikte tutuluyor.
-   [ ] Desteklenmeyen video hatası gösteriliyor.

**PHASE 10 tamamlanmadan PHASE 11'e geçme.**

------------------------------------------------------------------------

# PHASE 11 --- Entegrasyon, güvenlik ve dayanıklılık testleri

**Amaç:** Tüm sistemleri birlikte test etmek ve yayın öncesi hataları
gidermek.

### Oda testleri

-   [ ] Geçici oda oluşturma/katılma/kapatma.
-   [ ] Sabit oda oluşturma/katılma/koruma.
-   [ ] 4 kişi kapasite sınırı.
-   [ ] Eşzamanlı katılım.
-   [ ] Host kapanması.
-   [ ] Host tekrar katılması.
-   [ ] Üye ayrılması.
-   [ ] Eski oturum temizliği.

### Medya testleri

-   [ ] 4 kişi sesli görüşme.
-   [ ] 4 kişi kameralı görüşme.
-   [ ] Kamera + mikrofon.
-   [ ] Ekran + kamera + mikrofon.
-   [ ] Medya cihazı değiştirme.
-   [ ] İzin reddi.
-   [ ] Sekme kapanması.
-   [ ] Ağ kopması ve geri gelmesi.

### Ağ testleri

En az şu farklı ağ kombinasyonlarını dene: - Aynı Wi-Fi. - Farklı ev
internetleri. - Ev interneti + mobil hotspot. - Farklı NAT/firewall
koşulları.

### Firebase testleri

-   [ ] Rules Emulator veya uygun test ortamında test edildi.
-   [ ] Yetkisiz okuma/yazma engellendi.
-   [ ] Listener temizliği doğrulandı.
-   [ ] Mesaj sınırı doğrulandı.
-   [ ] Gereksiz RTDB indirme ve Firestore okuma/yazmaları azaltıldı.
-   [ ] Kota kullanımının nasıl izleneceği belirlendi.

### Dayanıklılık

-   [ ] En az 30--60 dakika dört kullanıcı testi.
-   [ ] CPU/RAM/ağ kullanımı kontrolü.
-   [ ] Yeniden bağlanma testi.
-   [ ] Hata mesajları kontrolü.
-   [ ] Kaynak sızıntısı kontrolü.

**PHASE 11 tamamlanmadan PHASE 12'ye geçme.**

------------------------------------------------------------------------

# PHASE 12 --- GitHub Pages yayınlama

**Amaç:** Statik frontend uygulamasını GitHub Pages üzerinden
yayınlamak.

### Görevler

-   [ ] Vite `base` ayarını repository yoluna göre yapılandır.
-   [ ] React Router için HashRouter kullan veya Pages uyumlu alternatif
    belirle.
-   [ ] Üretim build'i al.
-   [ ] GitHub Actions deployment workflow oluştur.
-   [ ] Repository Pages ayarını GitHub Actions olarak seç.
-   [ ] Gerekli environment variable değerlerini GitHub Actions
    secrets/variables üzerinden build'e aktar.
-   [ ] Firebase Authorized Domains ayarına yayın alan adını ekle.
-   [ ] HTTPS ve medya izinlerini test et.
-   [ ] Yayındaki uygulamayı iki ve dört istemciyle test et.

### Güvenlik kontrolü

Frontend Firebase config gizli değildir. Ancak service account private
key, Admin SDK anahtarı veya özel sunucu sırrı frontend'e kesinlikle
konulmaz.

### Test ve kabul kriterleri

-   [ ] GitHub Pages URL'si açılıyor.
-   [ ] Sayfa yenileme/yönlendirme çalışıyor.
-   [ ] Firebase Auth çalışıyor.
-   [ ] Firebase veritabanları çalışıyor.
-   [ ] WebRTC bağlantısı HTTPS üzerinde kuruluyor.
-   [ ] Kamera/mikrofon izinleri çalışıyor.
-   [ ] Production build hatasız.

**PHASE 12 tamamlanınca ilk sürüm tamamlanmış kabul edilir.**

------------------------------------------------------------------------

## 6. İlk sürüm dışında bırakılan özellikler

Bu özellikler ilk sürüm kapsamına dahil değildir. Kullanıcı açıkça yeni
kapsam belirlemeden eklenmeyecek:

-   Arkadaş listesi ve özel mesajlar.
-   Dosya paylaşımı.
-   Ekran görüntüsü alma/kayıt.
-   Oda şifresi.
-   Host devri.
-   Gelişmiş moderasyon.
-   Gürültü engelleme.
-   Bas-konuş.
-   Mobil uygulama.
-   SFU/medya sunucusu.
-   Ücretli TURN veya ücretli backend.

## 7. Sürümleme ve commit düzeni

Her tamamlanan PHASE için ayrı commit oluştur.

Örnek: - `phase-00: initialize project` -
`phase-01: add UI foundation` -
`phase-02: implement anonymous authentication`

Çalışmayan veya test edilmemiş bir aşamayı tamamlandı olarak işaretleme.

## 8. Proje bitiş kriterleri

-   [ ] Kullanıcı anonim giriş yapabiliyor.
-   [ ] Oda oluşturabiliyor ve katılabiliyor.
-   [ ] Aynı anda en fazla 4 kullanıcı bulunuyor.
-   [ ] Geçici oda mesajları oda kapandığında temizleniyor.
-   [ ] Sabit oda ve son 100 mesaj korunuyor.
-   [ ] Dört kullanıcı Mesh P2P ile sesli görüşebiliyor.
-   [ ] Kamera çalışıyor.
-   [ ] Ekran paylaşımı çalışıyor.
-   [ ] YouTube senkronizasyonu çalışıyor.
-   [ ] Güvenlik kuralları test edildi.
-   [ ] GitHub Pages üzerinde yayınlandı.
-   [ ] Ücretsiz servis kotaları ve ağ sınırlamaları belgelendi.
