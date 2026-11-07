"""Build and validate the Chrome Web Store package.

Usage (from the repo root): python tools/build-zip.py
Writes dist/tab-audio-recorder-<version>.zip, or exits with the list of problems.
"""
import json
import re
import struct
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUBLISHED_VERSION = '1.0'  # current version on the Chrome Web Store; the new one must be higher
FILES = [
    'manifest.json', 'background.js', 'offscreen.html', 'offscreen.js',
    'popup.html', 'popup.js', 'styles.css', 'lame.min.js',
    'LICENSE', 'THIRD_PARTY_NOTICES.md',
]
TEXT = ('.json', '.js', '.html', '.css', '.md', '')
problems = []


def check(cond, msg):
    if not cond:
        problems.append(msg)


def version_tuple(v):
    return tuple(int(x) for x in v.split('.'))


def png_size(path):
    data = path.read_bytes()[:24]
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        return None
    return struct.unpack('>II', data[16:24])


manifest = json.loads((ROOT / 'manifest.json').read_text(encoding='utf-8'))
version = manifest['version']
check(manifest.get('manifest_version') == 3, 'manifest_version must be 3')
check('key' not in manifest and 'update_url' not in manifest, 'remove "key"/"update_url" from manifest.json')
check(version_tuple(version) > version_tuple(PUBLISHED_VERSION), f'version {version} must be higher than {PUBLISHED_VERSION}')

# Icons: real PNGs with the declared size.
icons = {**manifest.get('icons', {}), **manifest.get('action', {}).get('default_icon', {})}
for size, rel in sorted(icons.items()):
    dims = png_size(ROOT / rel) if (ROOT / rel).exists() else None
    check(dims == (int(size), int(size)), f'{rel}: expected a {size}x{size} PNG, got {dims}')
    if rel not in FILES:
        FILES.append(rel)

# Locales: same keys everywhere, and every key used in the code exists.
locales = {p.parent.name: json.loads(p.read_text(encoding='utf-8')) for p in sorted((ROOT / '_locales').glob('*/messages.json'))}
default = manifest.get('default_locale')
check(default in locales, f'default_locale {default!r} has no messages.json')
keys = set(locales.get(default, {}))
for lang, msgs in locales.items():
    check(set(msgs) == keys, f'_locales/{lang}: keys differ from {default}: {sorted(set(msgs) ^ keys)}')
    FILES.append(f'_locales/{lang}/messages.json')
used = set(re.findall(r'__MSG_(\w+)__', json.dumps(manifest)))
used |= set(re.findall(r'data-i18n="(\w+)"', (ROOT / 'popup.html').read_text(encoding='utf-8')))
for js in ('background.js', 'popup.js'):
    src = (ROOT / js).read_text(encoding='utf-8')
    used |= set(re.findall(r"\bt\('(\w+)'", src))
    used |= set(re.findall(r"title: '(badge\w+)'", src))
    used |= set(re.findall(r"'(status\w+)'", src))
check(not (used - keys), f'i18n keys used but missing: {sorted(used - keys)}')
check(len(manifest['description']) <= 132 and all(len(m.get('extDescription', {}).get('message', '')) <= 132 for m in locales.values()),
      'description must be 132 characters or fewer')

# Files: present, UTF-8 without BOM, LF line endings.
for rel in FILES:
    path = ROOT / rel
    if not path.exists():
        problems.append(f'missing file: {rel}')
        continue
    if path.suffix in TEXT:
        raw = path.read_bytes()
        check(not raw.startswith(b'\xef\xbb\xbf'), f'{rel}: remove the UTF-8 BOM')
        check(b'\r\n' not in raw, f'{rel}: use LF line endings')
        try:
            raw.decode('utf-8')
        except UnicodeDecodeError:
            problems.append(f'{rel}: not UTF-8')

if problems:
    print('Package NOT built:\n- ' + '\n- '.join(problems))
    sys.exit(1)

out = ROOT / 'dist' / f'tab-audio-recorder-{version}.zip'
out.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for rel in sorted(FILES):
        z.write(ROOT / rel, rel)  # POSIX names, manifest.json at the zip root

# Re-open and verify what the store will see.
with zipfile.ZipFile(out) as z:
    names = z.namelist()
    assert z.testzip() is None, 'corrupt zip'
    assert 'manifest.json' in names and all('\\' not in n for n in names), names
    assert json.loads(z.read('manifest.json'))['version'] == version

print(f'OK {out.relative_to(ROOT)}  version {version}  {len(names)} files  {out.stat().st_size // 1024} KB')
for n in names:
    print('  ' + n)
