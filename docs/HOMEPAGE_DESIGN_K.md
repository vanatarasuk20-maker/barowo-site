# BAROWO — главная, дизайн K (утверждён 2026-10-02)

Референс: odpstudio.pl (выбран владельцем). Цвета BAROWO: тёмно-синий + красный #e8000d.

## Система
- Шрифты (self-hosted, OFL-1.1, `assets/fonts/`): Big Shoulders Display (заголовки), Manrope (текст), JetBrains Mono (подписи).
- Сетка: контейнер 1280 + поля 80 px; 4 колонки; все вертикальные разделители на 1/4, 2/4, 3/4.
- Ритм: секции 184 px, заголовок → контент 80 px, отступ в колонке 48 px.
- Межстрочный интервал заголовков ≥ 1.1 — польские диакритики не наезжают.
- Стили: `assets/barowo.css` (один файл, старые слои главной не подключаются).

## Что сохранено
- `<head>`: title, meta, canonical, OG/Twitter, JSON-LD — без изменений относительно 4f4f816 (кроме подключения шрифтов/стилей).
- Форма: те же 44 поля, тот же action (relay worker → CRM), согласие, honeypot `company`, UTM, page_url/referrer.
- Callback-попап, мобильная липкая кнопка, все внутренние ссылки (включая SEO-ссылки в hero и подвале).

## Проверено (локально, headless Chromium)
- Отправка формы на подставном ответе: без согласия не уходит; с согласием уходит с UTM, package, honeypot; статус успеха.
- «Wybierz Standard» → поле «Pakiet» = Standard и прокрутка к форме.
- FAQ открывается; мобильное меню открывается/закрывается; липкая кнопка появляется после первого экрана.
- Нет горизонтальной прокрутки на 360/390/768/1024/1280/1440/1920.

## Не проверено
- Реальная заявка в CRM (не отправлялась), карта Google, настоящие Safari/iOS.
- Подстраницы (/oferta/, /cennik/, …) пока в старом стиле.

## Подстраницы в дизайне K (2026-10-02)

- Все 22 подстраницы используют `assets/barowo.css` и `assets/sub.css`. Шапка, верхняя полоса, футер и мобильный CTA взяты с главной.
- Страницы услуг и статей, `/oferta/` и `/aktualnosci/` генерирует `scripts/build_articles.py` (его запускает Netlify при сборке). Поэтому правились шаблоны в `templates/`, а не только готовые HTML. `cennik`, `realizacje`, `planer`, `polityka` — ручные страницы, правились напрямую.
- Удалены inline-`<style>`, `ui-polish.css`, `subpage-nav.css`, `callback-popup.css` и Google Fonts. Стили callback-модалки теперь в `barowo.css`.
- Классы `hero`, `facts`, `fact`, `cta` на подстраницах переименованы в `s-*`, чтобы не конфликтовать с главной.
- Тексты, meta, canonical, JSON-LD и h1 не тронуты: проверено скриптом на всех 22 страницах. Внутренние ссылки не потеряны (кроме пункта меню `/#team` на странице политики).
- На `/realizacje/` фото `bar-evening` (владелец не уверен, что это их мероприятие) заменено на `photo2` (деревянный бар BAROWO).

## Подготовка к деплою, шаг 3 из 5 (2026-10-03)

- **Планшет 721–1080 px:** исправлена сетка.
  - карточки «Dla kogo», «Zespół» и доп. услуги стоят в 2 колонки;
  - процесс — в 3 колонки;
  - блок контакта больше не налезает на форму.
- **Доступность (axe-core, 23 страницы × 2 ширины):** 0 нарушений.
  - заголовки футера стали `p.fh`;
  - у верхней полосы и мобильного CTA появились роли landmark;
  - контраст `--dim` поднят до 0.56.
- **Удалены неиспользуемые файлы (~11 МБ):** vid1–4, bar-evening, photo5, Artem/Ivan-opt, ui-polish.css, subpage-nav.css, callback-popup.css.
- **JPG пережаты** до ≤1400 px, качество 78. Ссылки те же, вес меньше на 35–60%.
- **Добавлен `404.html`** в дизайне K, с noindex.
- **Закрыты служебные папки.** `/docs`, `/tools`, `/scripts`, `/templates`, `/content`, `/_concepts`, `netlify.toml` и `.gitignore` теперь отдают 404. Правило в `scripts/build_articles.py`, потому что `_redirects` генерируется. Раньше они были доступны публично (publish = "."), в том числе URL вебхука Apps Script.
- **Заголовки:** добавлены `X-Frame-Options: SAMEORIGIN` и `X-Robots-Tag: noindex` для 404.
- **CSS:** версии `barowo.css` и `sub.css` подняты до `?v=20261003a` (у `/assets/*` кэш immutable).

## Шаг 4 — SEO/GEO (2026-10-03)

- **Пакеты (владелец):** дегустация бесплатна только в Standard и Premium. Wieża z kieliszków и welcome drink — только в Premium.
- **Title и description:** уникальные на всех страницах, title ≤72 символов, description 110–155. На главной в title добавлено «od 3000 zł».
- **Превью-картинки:** `assets/og/` — отдельная картинка 1200×630 на каждую страницу. Скрипт сборки берёт `/assets/og/<имя фото страницы>`. Добавлены `og:image:width` и `og:image:height`.
- **JSON-LD:**
  - `LocalBusiness` на главной: `priceRange`, адрес, `employee`, `knowsAbout`, `makesOffer` с тремя пакетами;
  - у `Service` — `minPrice` 3000 PLN (кроме фонтана).
- **Cennik:**
  - новая секция «Pakiety»;
  - ответ про алкохол исправлен на «Tak, w cenie każdego pakietu»;
  - новый вопрос «Ile godzin trwa obsługa?».
- **Внутренние ссылки:** в футере ссылки на Gdynia, Gdańsk, Sopot, Trójmiasto, Drink bar na wesele и na urodziny; на главной города в тексте стали ссылками.
- **Прочее:**
  - `llms.txt` переписан: факты, пакеты, часы, зона работы, контакты;
  - `robots.txt` — `Disallow: /admin/`;
  - h1 на `/realizacje/` — «Realizacje mobilnego baru».

## Юр. правки + фокус на eventy firmowe (2026-10-03)

- **Алкоголь, закон о трезвости:** убраны названия алкогольных брендов (Aperol, Cointreau, Campari, Jameson, Bombay, Ostoya). Фото `aperol-spritz` переименовано в `koktajle-spritz`.
- **Политика конфиденциальности переписана по RODO:**
  - полный список данных;
  - цели и основания;
  - сроки хранения;
  - получатели: Netlify, Cloudflare, Google, Telegram;
  - передача данных вне ЕЭЗ;
  - все права, включая жалобу в UODO;
  - cookies и localStorage;
  - пункт про 18+.
- **Google Maps:** загружается только по клику (click-to-load), без cookies до клика.
- **Футер:** данные исполнителя и 18+.
- **SEO/GEO под корпоративные события:**
  - на главной title, h1, lead и блок «Dla kogo» начинаются с firm; в FAQ новый вопрос; в LocalBusiness новые description, knowsAbout и serviceType;
  - в меню «Dla firm» вместо «Planer»;
  - новые страницы `/oferta/bar-na-wigilie-firmowa/` и `/oferta/bar-na-integracje-firmowa/`;
  - страница `/oferta/mobilny-bar-na-event-firmowy/` переписана как главная страница направления, priority 0;
  - у корпоративных `Service` — `BusinessAudience`;
  - `llms.txt` — акцент на корпоративные события.
