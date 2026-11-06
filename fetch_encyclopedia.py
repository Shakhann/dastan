#!/usr/bin/env python3
"""Қазақ Уикипедиясынан бөлімдерге арналған толық мәтіндерді data/full ішіне жүктейді.

Пайдалану: python3 fetch_encyclopedia.py
Нәтиже: Тарих жолы үшін data/full/tl_<жыл>.json, Тіл үшін data/full/lang_<id>.json,
Мәдениет үшін data/oner/<id>.json және data/full/art_<id>.json.
Мәтін лицензиясы: CC BY-SA 4.0.
"""
import json, re, time, urllib.parse, urllib.request

API = "https://kk.wikipedia.org/w/api.php"
UA = {"User-Agent": "DastanHeritageSite/1.0 (encyclopedia text import)"}
SKIP = re.compile(r"^(дереккөз|сілтеме|сыртқы сілтеме|тағы қара|әдебиет|пайдаланылған|ескертпе|галерея|сурет|түсініктеме)", re.I)
LANGUAGE = {"kazakh-language": "Қазақ тілі", "kazakh-alphabet": "Қазақ әліпбиі", "proverbs": "Мақал-мәтелдер", "tongue-twisters": "Жаңылтпаш", "orkhon-script": "Орхон-Енисей жазбалары"}
ARTS = {"dombyra": "Домбыра", "qobyz": "Қобыз", "kui": "Күй", "aitys": "Айтыс", "kiiz-ui": "Киіз үй"}
TRADITIONS = {"konakasy": "Қонақасы", "kymyzmuryndyk": "Қымызмұрындық"}


def query(title):
    params = {"format": "json", "formatversion": 2, "action": "query", "prop": "extracts|info", "inprop": "url", "explaintext": 1, "exsectionformat": "wiki", "redirects": 1, "titles": title}
    url = API + "?" + urllib.parse.urlencode(params)
    for attempt in range(5):
        try:
            time.sleep(3)
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as response:
                page = json.load(response)["query"]["pages"][0]
            return None if page.get("missing") or not page.get("extract") else page
        except OSError:
            time.sleep(15)
    raise RuntimeError("Жүктелмеді: " + title)


def sections(text):
    result, current, skipping = [], {"heading": "", "level": 2, "paragraphs": []}, False
    for line in (x.strip() for x in text.splitlines()):
        match = re.match(r"^(={2,})\s*(.*?)\s*\1$", line)
        if match:
            if current["paragraphs"]:
                result.append(current)
            level = len(match[1])
            if level == 2:
                skipping = bool(SKIP.match(match[2]))
            current = {"heading": match[2], "level": level, "paragraphs": []}
        elif line and not skipping:
            current["paragraphs"].append(line)
    if current["paragraphs"]:
        result.append(current)
    return result


def record(key, page):
    return {"key": key, "title": page["title"], "source_url": page["fullurl"], "source_name": "Қазақ Уикипедиясы", "license": "CC BY-SA 4.0", "sections": sections(page["extract"])}


def write(path, value):
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(value, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


def report(key, wanted, page):
    size = sum(len(" ".join(s["paragraphs"])) for s in sections(page["extract"])) if page else 0
    print(key, "|", wanted, "->", page["title"] if page else "ЖОҚ", "|", size)


def main():
    heritage = json.load(open("data/heritage.json", encoding="utf-8"))
    for event in heritage["timeline"]:
        title = urllib.parse.unquote(event["source_url"].rsplit("/wiki/", 1)[1]).replace("_", " ")
        page = query(title)
        report(f"tl_{event['year']}", title, page)
        if page:
            write(f"data/full/tl_{event['year']}.json", record(f"tl_{event['year']}", page))
    for key, title in LANGUAGE.items():
        page = query(title)
        report("lang_" + key, title, page)
        if page:
            write(f"data/full/lang_{key}.json", record("lang_" + key, page))
    for key, title in TRADITIONS.items():
        page = query(title)
        report("trad_" + key, title, page)
        if page:
            write(f"data/full/trad_{key}.json", record("trad_" + key, page))
    import os
    os.makedirs("data/oner", exist_ok=True)
    for key, title in ARTS.items():
        page = query(title)
        report("art_" + key, title, page)
        if page:
            full = record("art_" + key, page)
            write(f"data/full/art_{key}.json", full)
            lead = "\n".join(full["sections"][0]["paragraphs"]) if full["sections"] else ""
            write(f"data/oner/{key}.json", {"id": key, "title": page["title"], "category": "oner", "text": lead, "source_name": "Қазақ Уикипедиясы", "source_url": page["fullurl"], "license": "CC BY-SA 4.0"})


if __name__ == "__main__":
    main()
