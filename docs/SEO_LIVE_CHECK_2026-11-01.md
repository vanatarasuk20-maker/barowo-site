# SEO live check — 2026-11-01

Etap 1 (commit `1b33bd0`) jest na produkcji: zmergowany do `main` przez PR #1 (merge `f6f1b41`).
Sprawdzone `curl` na https://barowo.com.

## Nowe strony — 200, canonical = własny adres

| URL | Status | Canonical |
|---|---|---|
| /oferta/mobilny-bar-pomorskie/ | 200 | ok |
| /oferta/barman-na-wesele-gdansk/ | 200 | ok |
| /aktualnosci/ile-kosztuje-barman-na-wesele/ | 200 | ok |
| /aktualnosci/jak-zorganizowac-firmowke-z-barem/ | 200 | ok |

## Przekierowania 301 (warianty `/`, bez `/`, `/index.html`) — jeden skok do celu

| Stary URL | Cel |
|---|---|
| /oferta/drink-bar-na-wesele/ | /oferta/mobilny-bar-na-wesele/ |
| /aktualnosci/drink-bar-na-urodziny-gdansk/ | /oferta/drink-bar-na-urodziny-gdansk/ |
| /aktualnosci/ile-kosztuje-mobilny-bar-trojmiasto/ | /aktualnosci/ile-kosztuje-barman-na-wesele/ |
| /aktualnosci/mobilny-bar-na-event-firmowy/ | /aktualnosci/jak-zorganizowac-firmowke-z-barem/ |

Wszystkie 12 wariantów: 301 bezpośrednio na cel.

## Host

| Z | Wynik |
|---|---|
| http://barowo.com/ | 301 → https://barowo.com/ |
| https://www.barowo.com/ | 301 → https://barowo.com/ |
| http://www.barowo.com/ | 301 → https://www.barowo.com/ → 301 → https://barowo.com/ (2 skoki, standard Netlify; nieistotne) |

## Sitemap i robots

- `sitemap.xml`: 28 URL, identyczny z `origin/main`; zawiera 4 nowe strony, nie zawiera 4 przekierowanych.
- Każdy URL z sitemap odpowiada 200.
- `robots.txt`: `Allow: /`, `Disallow: /admin/`, wskazuje sitemap.
- Żadna strona z sitemap nie linkuje do przekierowanych adresów.

## Pliki służbowe

`/docs/`, `/content/`, `/docs/SEO_REPORT_2026-10-26.md`, `/content/redirects.json` → 404.

## Lokalnie

- Gałąź `claude/seo-pomorskie-2026-10-26` przesunięta (fast-forward) do `origin/main` (`f6f1b41`).
- `python3 scripts/build_articles.py`: 6 artykułów, 15 stron usług, brak zmian po ponownym uruchomieniu.
- `node --test test/analytics.test.mjs`: 31 pass, 0 fail.

**Wynik: etap 1 działa na produkcji bez błędów.**
