# BAROWO — SEO, 26.10.2026

Рабочая ветка: `claude/seo-pomorskie-2026-10-26`. Основа: `origin/main`, `d58277b99945c8b50d64db34db6c705e63ac907a`. Совпадение с удалённым main проверено через git ls-remote. Push, merge, deploy и внешние публикации не выполнялись.

## Фаза 1 — тексты и быстрые улучшения

- `/`: title и H1 с Trójmiasto и Pomorskie, eventy firmowe и wesela; цена от 3300 zł в первом абзаце. Добавлена ссылка на региональную страницу. Существующая ссылка на wigilia сохранена.
- `/cennik/`: новый сниппет с ценой, полной услугой, 1 или 2+ барменами и временем до 6/8 часов. Удалены неподтверждённые цены чужих предложений.
- `/oferta/bar-na-wigilie-firmowa/`: сезонный title, блок terminy grudniowe, подтверждение доступности конкретной даты без обещаний свободных мест.
- `/oferta/mobilny-bar-na-event-firmowy/`: firmówka в title/H1/H2 и двух вопросах FAQ, раздел о targi i konferencje.
- `/oferta/drink-bar-na-urodziny/`: видимые 18-stka/osiemnastka и раздел «Ile kosztuje barman na 18?».
- `/oferta/drink-bar-na-urodziny-gdansk/`: сохранён URL, title и основной текст теперь только про Gdańsk; полезное содержание старой статьи включено в оффер.
- На всех 15 страницах услуг добавлен одинаковый блок: 100+ мероприятий, 5 лет опыта команды, 5 звёзд в Google, подтверждённые типы корпоративных клиентов.
- Title основных страниц и статей до 60 знаков, description до 155. Для самостоятельной fontanna и szkolenie не добавлена ложная цена бара.
- HTTP → HTTPS уже работает: curl получил 301 и Location https://barowo.com/. Настройки Netlify не менялись.
- Canonical главной и услуг указывает на чистый URL, включая варианты с ?service=… и chocolateFountainInterest=…; работа параметров формы сохранена.

## Фаза 2 — объединение и структура

| Старый URL | 301 → целевой URL |
|---|---|
| `/oferta/drink-bar-na-wesele/` | `/oferta/mobilny-bar-na-wesele/` |
| `/aktualnosci/drink-bar-na-urodziny-gdansk/` | `/oferta/drink-bar-na-urodziny-gdansk/` |
| `/aktualnosci/ile-kosztuje-mobilny-bar-trojmiasto/` | `/aktualnosci/ile-kosztuje-barman-na-wesele/` |
| `/aktualnosci/mobilny-bar-na-event-firmowy/` | `/aktualnosci/jak-zorganizowac-firmowke-z-barem/` |

Для каждого переноса предусмотрены также варианты без завершающего слэша и с /index.html. Все ведут сразу к конечному адресу. Источник правил — `content/redirects.json`; сборка сохраняет их в `_redirects`. Старые HTML удаляются сборкой и не попадают в sitemap. Обычный Python preview не исполняет правила Netlify: проверить реальные HTTP-301 нужно после публикации Иваном.

Хаб `/oferta/mobilny-bar-trojmiasto/` теперь помогает выбрать Gdańsk, Gdynia, Sopot или Pomorskie. Внутренние ссылки на четыре перенесённых адреса обновлены. Кнопки каталога услуг получили короткие анкоры по теме вместо «Zobacz ofertę».

LocalBusiness содержит подтверждённый регион и города. У каждой услуги есть Service с areaServed, FAQPage, соответствующий видимым вопросам и ответам, и BreadcrumbList. Некорректное свойство serviceType убрано из LocalBusiness; оно сохранено у Service. AggregateRating и Review не добавлялись.

Даты статических страниц хранятся в `content/page-updates.json`; сборка не обновляет lastmod только из-за повторного запуска. Для услуг используется updated_at, для статей modified_at.

## Фаза 3 — выполненная часть по ответам Ивана

Новые страницы:

- `/oferta/mobilny-bar-pomorskie/`: всё Pomorskie, примеры городов, условия доезда в индивидуальной оферте, логистика за пределами Trójmiasta, реальные места работы.
- `/oferta/barman-na-wesele-gdansk/`: команда, menu, часы, подготовка места и местный факт работы в Gdańsku. Подтверждённый корпоратив на Kortach Tenisowych Lechia Gdańsk не выдан за свадьбу.
- `/aktualnosci/ile-kosztuje-barman-na-wesele/`: прямой ответ от 3300 zł, различия работы бармена и полной услуги, состав цены, пакеты, FAQ и ссылки.
- `/aktualnosci/jak-zorganizowac-firmowke-z-barem/`: информационная checklista для HR вместо дублирования коммерческого оффера.

Страницы Gdynia, Gdańsk и Sopot переписаны отдельно. Их основной текст с FAQ/CTA содержит 1000–1400 слов. Доля совпадающих последовательностей из 5 слов относительно меньшего текста: Gdańsk/Gdynia 14,14%, Gdańsk/Sopot 14,94%, Gdynia/Sopot 13,86%. Это локальный способ сравнения текста, не метрика Google.

На `/realizacje/` добавлены названия подтверждённых площадок 2026 года и два события: корпоратив на Kortach Tenisowych Lechia Gdańsk и день рождения в Stacji Smaku в Bytowie. Доступные фотографии остаются общими материалами BAROWO, без неподтверждённой привязки к площадкам.

Для полноценных карточек кейсов ещё нужны месяц, число гостей, пакет и конкретное фото для каждого события. Отдельный подтверждённый кейс из Sopotu пока отсутствует. Данные не выдуманы; актуальные подтверждения сохранены в `docs/SEO_FACTS_2026-10-26.md`.

## Внешние профили

Готовый пакет: `docs/SEO_OFFSITE_PACK.md`. Внутри — описание Google (669/750 знаков), услуги, 5 Q&A, 8 еженедельных постов, план реальных фото, нейтральные просьбы об отзыве, короткие/длинные описания для каталогов с UTM и NAP, письма партнёрам и три темы для медиа. Ничего не отправлено.

Публично в Google Maps подтверждены категория «Usługi barmańskie», 5 звёзд, адрес базы и телефон. Зону и полный список услуг публично проверить не удалось. Найден существующий Event Atlas с устаревшими 12 часами работы и 150 км; текст исправления включён в пакет. Przystanek Bar — сайт другого бара, поэтому не рекомендован как каталог.

## Проверки

- `python3 scripts/build_articles.py`: 6 статей, 15 услуг, без ошибок. Два повторных запуска дали одинаковые HTML, sitemap и redirects.
- Проверено 28 URL sitemap: один H1, уникальные title/description, self-canonical, корректный JSON-LD, отсутствие битых внутренних ссылок/ресурсов и ссылок на перенесённые адреса.
- Все 4 переноса и их 12 вариантов есть в `_redirects`; перенесённых и noindex URL в sitemap нет.
- Сравнение с origin/main: формы и исполняемые script-блоки существующих HTML не изменились. Diff assets, tools, test пустой: consent, GA4, Google Ads и CRM не менялись.
- `node --test test/analytics.test.mjs`: 31/31 проходят.
- Schema.org Validator, вставка локального кода главной, cennik и 15 услуг: 0 ошибок, 0 предупреждений, 49 элементов. Полный JSON-LD всех страниц дополнительно разобран локально; FAQ сопоставлен с видимым текстом.
- Нет новых изображений; нет цены 3000 zł, добавленных брендов алкоголя, вымышленных отзывов и rating-разметки.
- `git diff --check`: без замечаний.

Проверка адаптивности и скриншотов: результат ниже добавляется после завершения браузерного прохода.

### Lighthouse 12.8.2, локальный preview

| Страница / режим | LCP, с | CLS | SEO | Performance |
|---|---:|---:|---:|---:|
| Главная до изменений, mobile | 3,471 | 0,015744 | 100 | 86 |
| Главная после изменений, mobile | 3,543 | 0 | 100 | 86 |
| Главная до изменений, desktop | 0,777 | 0,022685 | 100 | 99 |
| Главная после изменений, desktop | 0,788 | 0,026624 | 100 | 99 |
| Event firmowy после, mobile | 4,069 | 0,000177 | 100 | 83 |
| Wesele после, mobile | 3,770 | 0,000177 | 100 | 85 |

Это одиночные лабораторные прогоны на компьютере Ивана с эмуляцией мобильной сети, не полевые Core Web Vitals. Убедительного улучшения LCP не установлено. Мобильный LCP 3,5–4,1 с остаётся задачей производительности; desktop главной около 0,8 с. В текущем production-коде главной hero-видео уже нет, LCP определяется текстом. SEO 100/100 не означает позицию в Google и не гарантирует рост.

## Что делает Иван — по одному действию

1. Открой http://127.0.0.1:4173/ и проверь тексты. Если сервер остановлен: `python3 preview.py` из source-and-history.
2. После проверки отправь подготовленную ветку: `git push -u origin claude/seo-pomorskie-2026-10-26` из site. Эту команду агент не выполняет.
3. На GitHub создай Pull Request из этой ветки в main.
4. Проверь diff и выполни merge сам. Netlify автоматически опубликует main.
5. После публикации открой новые страницы и проверь четыре старых URL на 301 к указанным целям.
6. Отправь https://barowo.com/sitemap.xml в Google Search Console.
7. Через «Проверка URL» запроси индексацию сначала для wigilia, event firmowy, Pomorskie, barman na wesele Gdańsk и двух новых статей; затем главной, cennik и городов.
8. Заполни Google/каталоги по SEO_OFFSITE_PACK.md, начиная с проверки зоны Google и исправления Event Atlas.
9. Через 14 дней после фактической публикации выгрузи GSC за последние 28 дней: Запросы, Страницы и Устройства. Сравни с данными от 26.10.2026; затем повторяй раз в две недели.

Индексация и позиции зависят от Google. Внешние ссылки, профили и реальные подробные кейсы остаются отдельной частью продвижения; автоматической публикации или гарантии топ-1 нет.

## Метаданные проверенных страниц

| URL | Title, знаков | Description, знаков | Слов в main |
|---|---:|---:|---:|
| `/` | 59 | 141 | 1196 |
| `/oferta/` | 69 | 141 | 399 |
| `/cennik/` | 55 | 130 | 965 |
| `/realizacje/` | 45 | 142 | 359 |
| `/aktualnosci/` | 63 | 132 | 290 |
| `/planer-baru-weselnego/` | 62 | 143 | 180 |
| `/oferta/mobilny-bar-na-event-firmowy/` | 49 | 117 | 965 |
| `/oferta/mobilny-bar-na-wesele/` | 55 | 122 | 1144 |
| `/oferta/bar-na-wigilie-firmowa/` | 56 | 127 | 811 |
| `/oferta/bar-na-integracje-firmowa/` | 47 | 128 | 838 |
| `/oferta/barman-na-wesele-trojmiasto/` | 50 | 119 | 663 |
| `/oferta/szkolenie-barmanskie-dla-firm/` | 51 | 139 | 492 |
| `/oferta/drink-bar-na-urodziny/` | 52 | 129 | 815 |
| `/oferta/drink-bar-na-urodziny-gdansk/` | 47 | 123 | 732 |
| `/oferta/fontanna-czekoladowa/` | 54 | 133 | 753 |
| `/oferta/mobilny-bar-trojmiasto/` | 56 | 134 | 587 |
| `/oferta/mobilny-bar-gdynia/` | 51 | 129 | 1013 |
| `/oferta/mobilny-bar-gdansk/` | 54 | 134 | 1009 |
| `/oferta/mobilny-bar-sopot/` | 53 | 132 | 1012 |
| `/oferta/mobilny-bar-pomorskie/` | 55 | 133 | 856 |
| `/oferta/barman-na-wesele-gdansk/` | 48 | 132 | 813 |
| `/aktualnosci/najlepsze-drinki-na-wesele/` | 52 | 149 | 1195 |
| `/aktualnosci/mobilny-bar-czy-alkohol-samemu/` | 56 | 132 | 754 |
| `/aktualnosci/jak-zorganizowac-firmowke-z-barem/` | 57 | 137 | 605 |
| `/aktualnosci/garden-party-z-barem-mobilnym/` | 50 | 129 | 456 |
| `/aktualnosci/ile-kosztuje-barman-na-wesele/` | 51 | 137 | 949 |
| `/aktualnosci/mobilny-bar-na-poprawiny/` | 50 | 140 | 415 |
| `/polityka-prywatnosci/` | 29 | 154 | 1109 |
