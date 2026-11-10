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

Vite istemci tarafında yalnızca `VITE_` ile başlayan değişkenleri sunar. Bu değerler tarayıcıya gideceğinden gizli anahtarlar burada tutulmamalıdır. Yerel ayarlar `.env.local` dosyasında saklanır; `.env*` dosyaları Git tarafından yok sayılır. Gerçek servis ayarları ilgili aşamada eklenecektir.
