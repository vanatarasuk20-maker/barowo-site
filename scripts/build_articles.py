#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from datetime import datetime
from html import escape
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = ROOT / "content" / "articles"
TEMPLATES_DIR = ROOT / "templates"
BLOG_DIR = ROOT / "aktualnosci"
PRIVACY_URL = "https://barowo.com/polityka-prywatnosci/"
HOME_URL = "https://barowo.com/"
BLOG_URL = "https://barowo.com/aktualnosci/"
YEAR = "2026"


def slug_url(slug: str) -> str:
    return f"https://barowo.com/aktualnosci/{slug}/"


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_file(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def load_articles() -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for path in sorted(CONTENT_DIR.glob("*.json")):
        if path.stem.startswith("_"):
            continue
        item = read_json(path)
        if not item.get("published", True):
            continue
        item.setdefault("slug", path.stem)
        item.setdefault("published_at", datetime.now().strftime("%Y-%m-%d"))
        item.setdefault("title_plain", path.stem.replace("-", " ").capitalize())
        item.setdefault("description", item.get("intro", ""))
        item["_path"] = path
        items.append(item)
    items.sort(key=lambda x: x.get("published_at", ""), reverse=True)
    return items


def format_inline(text: str) -> str:
    text = escape(text)
    text = re.sub(r"`([^`]+)`", r"<code>\1</code>", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"\*([^*]+)\*", r"<em>\1</em>", text)
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', text)
    return text


def markdown_to_html(source: str) -> str:
    if re.search(r"<\s*(p|h2|h3|ul|ol|li|figure|div|blockquote|img)\b", source):
        return source.strip()

    lines = source.replace("\r\n", "\n").split("\n")
    out: list[str] = []
    i = 0
    while i < len(lines):
        line = lines[i].rstrip()
        stripped = line.strip()
        if not stripped:
            i += 1
            continue

        if stripped.startswith("### "):
            out.append(f"<h3>{format_inline(stripped[4:])}</h3>")
            i += 1
            continue
        if stripped.startswith("## "):
            out.append(f"<h2>{format_inline(stripped[3:])}</h2>")
            i += 1
            continue
        if stripped.startswith("> "):
            quote_lines = []
            while i < len(lines) and lines[i].strip().startswith("> "):
                quote_lines.append(lines[i].strip()[2:])
                i += 1
            out.append(f'<div class="article-quote">{format_inline(" ".join(quote_lines))}</div>')
            continue
        if re.match(r"^[-*]\s+", stripped):
            items = []
            while i < len(lines) and re.match(r"^[-*]\s+", lines[i].strip()):
                items.append(format_inline(re.sub(r"^[-*]\s+", "", lines[i].strip())))
                i += 1
            out.append("<ul>" + "".join(f"<li>{item}</li>" for item in items) + "</ul>")
            continue
        if re.match(r"^\d+\.\s+", stripped):
            items = []
            while i < len(lines) and re.match(r"^\d+\.\s+", lines[i].strip()):
                items.append(format_inline(re.sub(r"^\d+\.\s+", "", lines[i].strip())))
                i += 1
            out.append("<ol>" + "".join(f"<li>{item}</li>" for item in items) + "</ol>")
            continue

        para = [stripped]
        i += 1
        while i < len(lines) and lines[i].strip() and not re.match(r"^(##|###|[-*]|\d+\.|> )", lines[i].strip()):
            para.append(lines[i].strip())
            i += 1
        out.append(f"<p>{format_inline(' '.join(para))}</p>")
    return "\n          ".join(out)


def render_meta_spans(article: dict[str, Any]) -> str:
    vals = [article.get("read_time", ""), article.get("category", ""), article.get("tag", "")]
    return "\n        ".join(f"<span>{escape(v)}</span>" for v in vals if v)


def render_cover(article: dict[str, Any]) -> str:
    src = article.get("cover_image", "")
    alt = article.get("cover_alt", "")
    if not src:
        return ""
    return f'<img src="{escape(src)}" alt="{escape(alt)}" width="1200" height="1600">'


def render_summary(article: dict[str, Any]) -> str:
    summary = article.get("summary") or []
    if not summary:
        return ""
    items = "\n            ".join(f"<li>{escape(item)}</li>" for item in summary)
    return f'<ul class="article-summary">\n            {items}\n          </ul>\n\n          '


def render_article_body(article: dict[str, Any]) -> str:
    return render_summary(article) + markdown_to_html(article.get("body", ""))


def render_jsonld(article: dict[str, Any]) -> str:
    payload = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": article.get("title_plain", ""),
        "description": article.get("description", ""),
        "author": {"@type": "Organization", "name": "BAROWO"},
        "publisher": {
            "@type": "Organization",
            "name": "BAROWO",
            "logo": {"@type": "ImageObject", "url": "https://barowo.com/assets/favicon.png"},
        },
        "mainEntityOfPage": slug_url(article["slug"]),
        "image": f"https://barowo.com{article.get('cover_image', '')}",
        "articleSection": article.get("category", "Aktualności"),
        "inLanguage": "pl-PL",
    }
    return json.dumps(payload, ensure_ascii=False, indent=2)


def article_footer_copy(article: dict[str, Any]) -> str:
    return article.get("footer_copy") or (
        f"© {YEAR} BAROWO — Mobilny Bar Trójmiasto. Artykuł z sekcji Aktualności BAROWO."
    )


def render_article_page(template: str, article: dict[str, Any]) -> str:
    replacements = {
        "{{PAGE_TITLE}}": escape(f"{article['title_plain']} | BAROWO"),
        "{{META_DESCRIPTION}}": escape(article.get("description", "")),
        "{{OG_TITLE}}": escape(article.get("title_plain", "")),
        "{{OG_DESCRIPTION}}": escape(article.get("description", "")),
        "{{OG_URL}}": slug_url(article["slug"]),
        "{{CANONICAL_URL}}": slug_url(article["slug"]),
        "{{JSONLD}}": render_jsonld(article),
        "{{H1_HTML}}": article.get("title_html", escape(article.get("title_plain", ""))),
        "{{INTRO}}": escape(article.get("intro", "")),
        "{{ARTICLE_META}}": render_meta_spans(article),
        "{{ARTICLE_COVER}}": render_cover(article),
        "{{ARTICLE_BODY}}": render_article_body(article),
        "{{CTA_TITLE_HTML}}": article.get(
            "cta_title_html", 'SPRAWDŹ,<br><span class="red">CZY MAMY TERMIN</span>'
        ),
        "{{CTA_TEXT}}": escape(
            article.get("cta_text", "Napisz do nas, a wrócimy z konkretną odpowiedzią i propozycją pakietu.")
        ),
        "{{FOOTER_COPY}}": escape(article_footer_copy(article)),
    }
    output = template
    for key, value in replacements.items():
        output = output.replace(key, value)
    return output


def card_html(article: dict[str, Any]) -> str:
    card_image = escape(article.get("card_image", article.get("cover_image", "")))
    card_alt = escape(article.get("card_alt", article.get("cover_alt", "")))
    card_title = article.get("card_title_html", article.get("title_html", escape(article.get("title_plain", ""))))
    card_excerpt = escape(article.get("card_excerpt", article.get("intro", "")))
    return f"""        <article class="post-card">
          <a class="post-card-media" href="/aktualnosci/{article['slug']}/" aria-label="Czytaj artykuł">
            <img src="{card_image}" alt="{card_alt}" width="1200" height="1600" loading="lazy">
          </a>
          <div class="post-card-copy">
            <div>
              <div class="label">Nowy artykuł</div>
              <h2>{card_title}</h2>
            </div>
            <div class="post-meta">
              <span>{escape(article.get('read_time', ''))}</span>
              <span>{escape(article.get('category', ''))}</span>
              <span>{escape(article.get('tag', ''))}</span>
            </div>
            <p>{card_excerpt}</p>
            <div class="actions">
              <a class="btn-red" href="/aktualnosci/{article['slug']}/">Czytaj artykuł</a>
              <a class="btn-ghost" href="/#contact">Zapytaj o termin</a>
            </div>
          </div>
        </article>"""


def render_blog_index(template: str, articles: list[dict[str, Any]]) -> str:
    cards = "\n\n".join(card_html(article) for article in articles)
    return template.replace("{{POST_CARDS}}", cards)


def write_article_pages(articles: list[dict[str, Any]]) -> None:
    template = (TEMPLATES_DIR / "article-template.html").read_text(encoding="utf-8")
    for article in articles:
        out_dir = BLOG_DIR / article["slug"]
        write_file(out_dir / "index.html", render_article_page(template, article))


def write_blog_index(articles: list[dict[str, Any]]) -> None:
    template = (TEMPLATES_DIR / "blog-template.html").read_text(encoding="utf-8")
    write_file(BLOG_DIR / "index.html", render_blog_index(template, articles))


def write_sitemap(articles: list[dict[str, Any]]) -> None:
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    urls = [
        (HOME_URL, datetime.now().strftime("%Y-%m-%d")),
        (BLOG_URL, datetime.now().strftime("%Y-%m-%d")),
    ]
    urls.extend(
        (slug_url(article["slug"]), article.get("published_at", datetime.now().strftime("%Y-%m-%d")))
        for article in articles
    )
    urls.append((PRIVACY_URL, datetime.now().strftime("%Y-%m-%d")))
    for loc, lastmod in urls:
        lines.extend(["  <url>", f"    <loc>{loc}</loc>", f"    <lastmod>{lastmod}</lastmod>", "  </url>"])
    lines.append("</urlset>")
    write_file(ROOT / "sitemap.xml", "\n".join(lines) + "\n")


def write_redirects(articles: list[dict[str, Any]]) -> None:
    lines = [
        "/index.html / 301!",
        "/aktualnosci.html /aktualnosci/ 301!",
        "/aktualnosci/index.html /aktualnosci/ 301!",
    ]
    for article in articles:
        lines.append(f"/aktualnosci/{article['slug']}/index.html /aktualnosci/{article['slug']}/ 301!")
    lines.extend(
        [
            "/polityka-prywatnosci.html /polityka-prywatnosci/ 301!",
            "/polityka-prywatnosci/index.html /polityka-prywatnosci/ 301!",
        ]
    )
    write_file(ROOT / "_redirects", "\n".join(lines) + "\n")


def main() -> None:
    articles = load_articles()
    write_article_pages(articles)
    write_blog_index(articles)
    write_sitemap(articles)
    write_redirects(articles)
    print(f"built {len(articles)} articles")


if __name__ == "__main__":
    main()
