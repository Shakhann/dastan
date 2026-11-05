#!/usr/bin/env python3
"""
generate_audio.py — edge-tts (kk-KZ-AigulNeural) арқылы MP3 дауыс генерация.

Пайдалану:
  python3 -m edge_tts --voice kk-KZ-AigulNeural --text "Сәлем" --write-media out.mp3

JavaScript массивтерін оқу үшін Node.js қажет (қосымша npm пакеттері қажет емес).

Бұл скрипт:
1) /data JSON файлдарынан мәтіндерді оқиды
2) Әр тақырыптың басын (алғашқы ~500 символ) MP3-ке жазады
3) Сөздік сөздерін + мақалдарды + жаңылтпаштарды MP3-ке жазады
4) audio/manifest.json жасайды: {key: "filename.mp3"}

Нәтиже: /audio/*.mp3 + /audio/manifest.json
"""
import asyncio, json, os, re, glob, sys, subprocess
from pathlib import Path

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

    # Parse JavaScript with Node, including multiline arrays and trailing commas.
    # A parse failure aborts collection before any audio or manifest is written.
    parser = r"""
const fs = require('node:fs');
const vm = require('node:vm');
const src = fs.readFileSync('js/content.js', 'utf8');
const arrays = vm.runInNewContext(src + '\n;({DICT, PROVERBS, TWISTERS})', {}, {timeout: 1000});
process.stdout.write(JSON.stringify(arrays));
"""
    result = subprocess.run(["node", "-e", parser], check=True, capture_output=True, text=True)
    arrays = json.loads(result.stdout)
    for name, prefix in [("DICT", "d"), ("PROVERBS", "p"), ("TWISTERS", "tw")]:
        entries = arrays[name]
        if not isinstance(entries, list) or not entries:
            raise ValueError(f"Empty or invalid content array: {name}")
        for entry in entries:
            text = entry.get("kk") or entry.get("text")
            if not entry.get("id") or not isinstance(text, str) or not text.strip():
                raise ValueError(f"Invalid audio item in {name}")
            items.append((f"{prefix}_{entry['id']}", text[:MAX_LEN]))

    # 2) /data JSON файлдары
    for f in sorted(glob.glob("data/*/*.json")):
        with open(f, encoding="utf-8") as source:
            d = json.load(source)
        key = d["id"]
        text = (d.get("text") or "")[:MAX_LEN]
        if not text.strip():
            raise ValueError(f"Empty audio text: {f}")
        items.append((key, text))

    keys = [key for key, _ in items]
    if len(keys) != len(set(keys)):
        raise ValueError("Duplicate audio keys")
    manifest_path = Path(OUT) / "manifest.json"
    if manifest_path.exists():
        previous = json.loads(manifest_path.read_text(encoding="utf-8"))
        missing = set(previous) - set(keys)
        if missing:
            raise ValueError(f"Refusing incomplete collection; missing keys: {sorted(missing)}")

    return items

async def main():
    items = collect_items()
    os.makedirs(OUT, exist_ok=True)
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

    if len(manifest) != len(items):
        raise RuntimeError("Audio generation incomplete; existing manifest preserved")
    temporary = Path(OUT) / "manifest.json.tmp"
    temporary.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(temporary, Path(OUT) / "manifest.json")
    print(f"\nНәтиже: {ok} MP3 файл, manifest.json жасалды")

if __name__ == "__main__":
    asyncio.run(main())
