#!/usr/bin/env python3
"""
generate_audio.py — edge-tts (kk-KZ-AigulNeural) арқылы MP3 дауыс генерация.

Пайдалану:
  python3 -m edge_tts --voice kk-KZ-AigulNeural --text "Сәлем" --write-media out.mp3

Бұл скрипт:
1) /data JSON файлдарынан мәтіндерді оқиды
2) Әр тақырыптың басын (алғашқы ~500 символ) MP3-ке жазады
3) Сөздік сөздерін + мақалдарды + жаңылтпаштарды MP3-ке жазады
4) audio/manifest.json жасайды: {key: "filename.mp3"}

Нәтиже: /audio/*.mp3 + /audio/manifest.json
"""
import asyncio, json, os, re, glob, sys

VOICE = "kk-KZ-AigulNeural"
OUT = "audio"
MAX_LEN = 500  # ұзақ мәтіннің басын ғана дауыстатамыз

def safe_key(s):
    return re.sub(r'[^\w\-]', '_', s)[:60]

async def tts(text, path):
    import edge_tts
    communicate = edge_tts.Communicate(text, VOICE)
    await communicate.save(path)

def collect_items():
    """Барлық дауысталады контентты жинайды: (key, text)"""
    items = []

    # 1) Сөздік (content.js-тен DICT)
    try:
        src = open("js/content.js", encoding="utf-8").read()
        # DICT, PROVERBS, TWISTERS, GRAMMAR массивтерін табу
        for arr_name in ["DICT","PROVERBS","TWISTERS"]:
            m = re.search(rf'const {arr_name}\s*=\s*\[(.*?)\];', src, re.S)
            if not m: continue
            # JSON-ға айналдыру үшін object literal → JSON
            block = m.group(1)
            # кавычка мен virgula реттеу
            try:
                # object literal-дан JSON жасау: key: value → "key":"value"
                cleaned = re.sub(r'(\w+):', r'"\1":', block)
                cleaned = re.sub(r'"(.*?)":\s*"([^"]*)"', r'"\1": "\2"', cleaned)
                arr = json.loads("[" + cleaned + "]")
            except Exception:
                continue
            for it in arr:
                if "kk" in it:
                    items.append((f"{arr_name[0].lower()}_{it.get('id','x')}", it["kk"]))
                if "text" in it:
                    items.append((f"{arr_name[0].lower()}_{it.get('id','x')}", it["text"][:MAX_LEN]))
    except Exception as e:
        print(f"content.js parse: {e}")

    # 2) /data JSON файлдары
    for f in glob.glob("data/*/*.json"):
        try:
            d = json.load(open(f, encoding="utf-8"))
            key = d["id"]
            text = (d.get("text") or "")[:MAX_LEN]
            if text.strip():
                items.append((key, text))
        except Exception as e:
            print(f"skip {f}: {e}")

    return items

async def main():
    os.makedirs(OUT, exist_ok=True)
    items = collect_items()
    print(f"Барлығы {len(items)} дауысталады тақырып")

    manifest = {}
    ok = 0
    for i, (key, text) in enumerate(items):
        if not text.strip():
            continue
        fname = f"{safe_key(key)}.mp3"
        path = os.path.join(OUT, fname)
        if os.path.exists(path) and os.path.getsize(path) > 1000:
            manifest[key] = fname
            ok += 1
            continue
        print(f"  [{i+1}/{len(items)}] {key} ...", end=" ", flush=True)
        try:
            await tts(text, path)
            manifest[key] = fname
            ok += 1
            print(f"OK ({os.path.getsize(path)//1024}KB)")
        except Exception as e:
            print(f"ERR: {e}")
        # rate limit
        if i % 5 == 4:
            await asyncio.sleep(1)

    with open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"\nНәтиже: {ok} MP3 файл, manifest.json жасалды")

if __name__ == "__main__":
    asyncio.run(main())
