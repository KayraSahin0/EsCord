# KURALLAR --- AI ile Proje Geliştirme Talimatları

Bu dosyadaki kurallar proje boyunca zorunludur. ROADMAP.md geliştirme
sırasını ve kapsamı belirler. Bu dosya ise AI'ın çalışma biçimini
belirler.

## 1. İletişim ve token kullanımı

1.  Gereksiz sohbet, övgü, selamlaşma, motivasyon cümleleri ve benzeri
    ifadeler kullanma.
2.  Kısa, doğrudan ve teknik olarak açıklayıcı cevap ver.
3.  Aynı bilgiyi tekrar etme.
4.  Konuyla ilgisiz öneriler veya özellikler ekleme.
5.  Kullanıcı istemedikçe uzun teorik açıklamalar yapma. Ancak kurulum,
    test ve kullanıcı işlemleri için gerekli ayrıntıları eksik bırakma.
6.  Hata bulduğunda doğrudan hatayı, nedenini, etkisini ve çözümünü
    açıkla.

## 2. Placeholder ve bilgi doğruluğu

1.  Placeholder kullanma.
2.  Bilmediğin, doğrulayamadığın veya erişemediğin bir bilgi için değer,
    dosya yolu, API anahtarı, Firebase yapılandırması, URL, UID, sürüm
    veya kod uydurma.
3.  Gerçek proje bilgisi gerekiyorsa kullanıcıya sor.
4.  Kullanıcıdan istenen her bilginin neden gerektiğini ve hangi işlemi
    etkileyeceğini açıkla.
5.  Gerçek değer henüz sağlanmadıysa sahte değerle çalışanmış gibi
    gösterme.
6.  Eksik konfigürasyonu açıkça belirt ve kullanıcıdan gerekli değeri
    iste.
7.  Örnek kod gerekiyorsa bunun örnek olduğunu açıkça belirt; örnek
    değerleri gerçek proje ayarı gibi sunma.
8.  Harici servis dokümantasyonu veya güncel kota gibi değişebilen
    bilgilerde doğrulamadan kesin konuşma.

## 3. Roadmap sırasına uyma

1.  Geliştirme yalnızca ROADMAP.md sırasına göre yapılacak.
2.  Her seferinde yalnızca mevcut PHASE üzerinde çalış.
3.  Kullanıcı açıkça **"Diğer aşamaya geç"** yazmadan sonraki PHASE'e
    geçme.
4.  Kullanıcının "devam et", "tamam", "çalışıyor" gibi ifadelerini
    otomatik olarak sonraki aşamaya geçme izni sayma. Geçiş için tam
    olarak "Diğer aşamaya geç" ifadesini bekle.
5.  Mevcut aşamada eksik veya başarısız test varsa sonraki aşamaya
    geçme.
6.  Kullanıcı sonraki aşamayı açıkça istese bile mevcut aşamanın
    tamamlanmadığını ve risklerini önce bildir.
7.  Roadmap'te olmayan yeni özellikleri kendiliğinden ekleme.
8.  Roadmap sırası teknik olarak sorunlu görünüyorsa sessizce
    değiştirme. Nedenini ve etkisini açıkla, kullanıcıdan onay al.

## 4. Her aşama sonunda zorunlu teslimat

Her PHASE tamamlandığında aşağıdaki başlıklarla cevap ver:

### A. Yapılan işlemler

-   Hangi özelliklerin tamamlandığını yaz.
-   Hangi dosyaların oluşturulduğunu/değiştirildiğini/silindiğini
    belirt.
-   Tamamlanmayan işleri açıkça listele.

### B. Kurulum ve kullanıcı işlemleri

-   Kullanıcının terminalde çalıştıracağı komutları tek tek ver.
-   Firebase Console, GitHub veya tarayıcı ayarı gerekiyorsa menü yolunu
    açıkça yaz.
-   Hangi alana hangi gerçek değerin girileceğini anlat.
-   Gizli bilgilerin nerede tutulacağını açıkla.
-   Kullanıcının yapması gereken manuel işlemleri atlama.

### C. Test talimatları

Her test için: 1. Test ön koşulu. 2. Uygulanacak adımlar. 3. Beklenen
sonuç. 4. Başarısız olursa kontrol edilecek yer.

Testleri mümkün olduğunca adım adım ve başlangıç seviyesindeki birinin
uygulayabileceği açıklıkta yaz.

### D. Test sonuçları

-   AI'ın gerçekten çalıştırdığı testleri belirt.
-   Çalıştırılmayan testleri çalıştırılmış gibi gösterme.
-   Kullanıcının kendi bilgisayarında yapması gereken testleri ayrı
    belirt.
-   Build, lint, test ve tarayıcı console sonuçlarını doğru aktar.

### E. Bilinen sorunlar ve sınırlar

-   Açık hataları listele.
-   Ücretsiz plan veya tarayıcı kaynaklı sınırlamaları belirt.
-   Sonraki PHASE'e geçişi engelleyen bağımlılıkları belirt.

### F. Aşama durumu

Şu durumlardan birini kullan: -
`TAMAMLANDI — Kullanıcı testi bekleniyor` -
`TEST BAŞARISIZ — Düzeltme gerekiyor` -
`EKSİK — Mevcut aşamada geliştirmeye devam edilmeli`

Kullanıcı testleri tamamlayıp **"Diğer aşamaya geç"** demeden sonraki
aşamayı başlatma.

## 5. Kod değişikliği ve proje bütünlüğü

1.  Değişiklik yapmadan önce ilgili dosyaları ve mevcut mimariyi incele.
2.  Yalnızca istenen özellik için gerekli dosyalara müdahale et.
3.  İlgisiz dosyaları biçimlendirme, yeniden adlandırma, taşıma veya
    silme.
4.  Projenin genel klasör yapısını, mimarisini, state yönetimini veya
    servis sınırlarını izinsiz değiştirme.
5.  Genel mimari değişikliği gerekiyorsa önce:
    -   Neden gerektiğini,
    -   Hangi dosyaları etkileyeceğini,
    -   Hangi mevcut özelliklere risk oluşturduğunu,
    -   Alternatifleri,
    -   Değişiklik yapılmazsa oluşacak sonucu açıkla ve kullanıcıdan
        onay al.
6.  Var olan çalışan özellikleri koru.
7.  Bir bug düzeltirken kapsam dışı refactor yapma.
8.  Dosya silmeden önce kullanım yerlerini kontrol et.
9.  Paket kaldırmadan önce bağımlılıklarını kontrol et.
10. Mevcut API, veri modeli veya dosya isimlerini değiştirmek
    gerekiyorsa etkisini açıkla ve onay al.
11. Değişiklik sonrasında ilgili testleri ve build işlemini çalıştır.
12. Çalışmayan kodu tamamlanmış olarak sunma.

## 6. Soru sorma zorunluluğu

Kullanıcıya soru sorman gerektiğinde:

1.  Soruyu kısa ve net sor.
2.  Önce kararın neden gerekli olduğunu açıkla.
3.  Her seçeneğin sistemi nasıl etkileyeceğini belirt.
4.  Performans, güvenlik, maliyet, veri kaybı veya mimari etkilerini
    anlat.
5.  Bir seçenek öneriyorsan nedenini belirt; ancak kullanıcı adına karar
    verme.
6.  Birden fazla bağımsız karar varsa hepsini tek mesajda, anlaşılır
    biçimde sorabilirsin.
7.  Gerekli bilgi olmadan tahminle ilerleme.

Örnek soru biçimi:

**Karar gerekli: ...**

-   Seçenek A: ... --- Sisteme etkisi: ...
-   Seçenek B: ... --- Sisteme etkisi: ...

**Önerim:** ... Çünkü ...

**Hangi seçeneği tercih ediyorsun?**

## 7. Güvenlik kuralları

1.  Firebase Security Rules'u devre dışı bırakma.
2.  Herkese açık read/write kuralı ekleme.
3.  Firebase Admin SDK veya service account private key bilgilerini
    frontend'e koyma.
4.  `.env` dosyalarını Git'e gönderme.
5.  Kullanıcı UID'sini istemciden gelen bir metne güvenerek doğrulanmış
    kabul etme.
6.  Host yetkisini yalnızca UI kontrolüyle koruma; Firebase Rules ile de
    doğrula.
7.  Oda üyeliği ve aktif bağlantı durumunu birbirine karıştırma.
8.  Mesaj, oda ve signaling erişiminde yetki kontrolü uygula.
9.  Kullanıcıdan gereksiz kişisel veri isteme.
10. Güvenlik açığı fark edersen özelliği tamamlanmış gösterme; önce
    kullanıcıyı bilgilendir.

## 8. WebRTC kuralları

1.  Ses ve görüntüyü Firebase üzerinden taşımaya çalışma.
2.  Firebase yalnızca signaling ve uygulama verileri için kullanılmalı.
3.  Her peer bağlantısının tek sahibi ve net yaşam döngüsü olmalı.
4.  Oda çıkışında peer bağlantıları, event listener'ları ve medya
    track'leri temizlenmeli.
5.  ICE candidate, offer/answer ve bağlantı durumları ayrı yönetilmeli.
6.  Signaling verisi eski oturumlarla karışmamalı; oturum/bağlantı
    kimliği kullanılmalı.
7.  Bağlantı başarısızlığını başarılı gibi gösterme.
8.  STUN'un her ağda bağlantı garantisi vermediğini unutma.
9.  TURN gereksinimi ortaya çıkarsa ücretli çözüm ekleme. Önce ücretsiz
    seçeneklerin gerçek sınırlamalarını kullanıcıya anlat ve onay al.
10. Dört kişilik Mesh topolojisinin upload ve cihaz kaynaklarına
    etkisini göz önünde bulundur.

## 9. Firebase ve ücretsiz plan kuralları

1.  Firebase Spark planından çıkma.
2.  Kullanıcı onayı olmadan Blaze planına geçiş önermeyi uygulama.
3.  Cloud Functions, ücretli hosting, ücretli TURN veya ücretli API
    ekleme.
4.  Ücretsiz kota sınırlarını varsayma; gerektiğinde güncel resmi
    dokümantasyondan doğrula.
5.  RTDB listener'larını ihtiyaç bitince kapat.
6.  Gereksiz Firestore okuma/yazma ve RTDB indirme oluşturma.
7.  Firestore 100 mesaj sınırını eşzamanlı yazmalarda da test et.
8.  İstemci tarafı temizlik işlemlerinin güvenilir sunucu temizliğiyle
    aynı olmadığını açıkça belirt.
9.  Ücretsiz planla garanti edilemeyen özellikleri garanti edilmiş gibi
    anlatma.

## 10. Git ve sürüm kontrolü

1.  Her tamamlanan PHASE sonunda ayrı commit öner.
2.  Kullanıcı onayı olmadan uzak repository'ye push yapma.
3.  Commit mesajları kısa ve aşama numarası içersin.
4.  Çalışmayan kodu tamamlanmış aşama commit'i olarak işaretleme.
5.  Büyük mimari değişikliklerden önce mevcut çalışan durumu koruyacak
    commit veya branch öner.
6.  Kullanıcının mevcut değişikliklerini kontrol etmeden üzerine yazma.

## 11. Hata çözme yöntemi

Bir hata bildirildiğinde:

1.  Hatanın tekrar üretilebilir olup olmadığını belirle.
2.  Hata mesajını ve ilgili dosyaları incele.
3.  Tahminle rastgele değişiklik yapma.
4.  Olası nedeni ve doğrulamak için gereken bilgiyi belirt.
5.  Yalnızca hatayla ilişkili en küçük değişikliği yap.
6.  Düzeltmenin mevcut özelliklere etkisini test et.
7.  Test sonucu ve kalan riskleri açıkla.

## 12. Öncelik sırası

Çakışma olduğunda şu öncelik sırasını kullan:

1.  Kullanıcı verisinin ve güvenliğin korunması.
2.  Mevcut çalışan özelliklerin bozulmaması.
3.  ROADMAP sırasına uyulması.
4.  Kullanıcının açık talimatları ve onayı.
5.  Ücretsiz teknoloji sınırlarına uyulması.
6.  Kod sadeliği ve genişletilebilirlik.
7.  Görsel iyileştirme.

## 13. Her yeni oturumun başlangıcı

Yeni bir geliştirme oturumunda:

1.  `KURALLAR.md` dosyasını oku.
2.  `ROADMAP.md` dosyasını oku.
3.  Projenin mevcut dosya yapısını incele.
4.  Git durumunu ve son commit'i kontrol et.
5.  Kullanıcının en son tamamladığı PHASE'i belirle.
6.  Kullanıcı açıkça "Diğer aşamaya geç" demediyse yeni PHASE başlatma.
7.  Mevcut PHASE'in durumunu kısa biçimde belirt ve yalnızca o aşamadaki
    işe devam et.

**Temel kural: Kullanıcının açık onayı olmadan aşama atlama, kapsam
büyütme veya genel mimariyi değiştirme.**
