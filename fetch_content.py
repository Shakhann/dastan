#!/usr/bin/env python3
"""
fetch_content.py — Қазақ Wikipedianың MediaWiki API-сі арқылы контент жинау.

Пайдалану:
  python3 fetch_content.py                # қорғалмаған тақырыптарды жүктеу
  python3 fetch_content.py --id abai      # бір ғана тақырыпты жүктеу
  python3 fetch_content.py --dry-run      # тақырыптарды тексеру ғана

Нәтиже: /data/<category>/<id>.json
Формат: {id, title, category, text, source_name, source_url, license, fetched_at}

Этикалық шек:
- Тек қоғамдық меншіктегі немесе CC BY-SA 4.0 лицензиялы мәтін алынады.
- Сұранымдар арасында 1 секунд үзіліс (API жүктемесін азайту).
- Авторлық құқықпен қорғалған мәтін көшірмейді.
"""
import json, sys, time, re, os, argparse, urllib.request, urllib.parse, datetime

USER_AGENT = "DastanApp/1.0 (Kazakhstan IT competition; contact: qazaqtilhack@gmail.com)"
WIKI = {
  "wikipedia": "https://kk.wikipedia.org/w/api.php",
  "wikisource": "https://kk.wikisource.org/w/api.php",
}
LICENSE = "CC BY-SA 4.0"
OUT = "data"

def api_get(base, params):
    url = base + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))

def fetch_page(source_key, title):
    base = WIKI[source_key]
    p = api_get(base, {
        "action": "query",
        "prop": "extracts|info",
        "explaintext": 1,
        "inprop": "url",
        "titles": title,
        "format": "json",
        "redirects": 1,
        "formatversion": 2,
        # exlimit жок — толық бет
    })
    pages = p.get("query", {}).get("pages", [])
    if not pages:
        return None
    pg = pages[0]
    if pg.get("missing"):
        return None
    return {
        "text": pg.get("extract", "").strip(),
        "url": pg.get("fullurl", ""),
        "title": pg.get("title", title),
    }

def save(rec):
    cat = rec["category"]
    d = os.path.join(OUT, cat)
    os.makedirs(d, exist_ok=True)
    path = os.path.join(d, rec["id"] + ".json")
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            current = json.load(f)
        if current.get("source_name") == "ДАСТАН редакциясы":
            raise ValueError(f"Редакциялық мақала қорғалған: {path}")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(rec, f, ensure_ascii=False, indent=2)
    return path

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--id", help="бір ғана тақырып id-si")
    ap.add_argument("--dry-run", action="store_true", help="тек тізімді көрсет")
    args = ap.parse_args()

    with open("content_topics.json", encoding="utf-8") as f:
        topics = json.load(f)

    if args.dry_run:
        for t in topics:
            print(f"  [{t['category']:10}] {t['id']:20}  ← {t['page']}")
        return

    ok = miss = 0
    for t in topics:
        if args.id and t["id"] != args.id:
            continue
        if t.get("preserve_local") or t.get("source") == "editorial":
            print(f"SKIP: {t['id']} — жергілікті редакция қорғалған")
            continue
        path = os.path.join(OUT, t["category"], t["id"] + ".json")
        if os.path.exists(path):
            with open(path, encoding="utf-8") as f:
                if json.load(f).get("source_name") == "ДАСТАН редакциясы":
                    print(f"SKIP: {t['id']} — редакциялық мақала қорғалған")
                    continue
        print(f"→ {t['id']}: {t['page']} ...", end=" ", flush=True)
        try:
            r = fetch_page(t["source"], t["page"])
            if not r or len(r["text"]) < 200:
                miss += 1
                print("MISS")
                continue
            rec = {
                "id": t["id"],
                "title": t["title"],
                "category": t["category"],
                "text": r["text"],
                "source_name": "Қазақ Уикипедиясы" if t["source"]=="wikipedia" else "Қазақ Уикиқайнар",
                "source_url": r["url"],
                "license": LICENSE,
                "fetched_at": datetime.datetime.now().isoformat(),
            }
            path = save(rec)
            ok += 1
            print(f"OK ({len(r['text'])} симв)")
        except Exception as e:
            miss += 1
            print(f"ERR: {e}")
        time.sleep(1)  # API-ге құрметпен

    print(f"\nНәтиже: {ok} табылды, {miss} табылмады. Файлдар: {OUT}/")

if __name__ == "__main__":
    main()
