"""Build the illustrated, offline catalogue and its Markdown table of contents."""
from pathlib import Path
import base64
import json

root = Path(__file__).resolve().parents[1]
data = json.loads((root / 'src/catalog.json').read_text())
ids = [item['id'] for item in data['items']]
assert len(ids) == len(set(ids))
assert sorted(item['icon'] for item in data['items'] if item.get('iconSheet') != 'adventure') == list(range(30))
assert all(len(item['levels']) == 3 for item in data['items'])
assert all(item['group'] in {g['id'] for g in data['groups']} for item in data['items'])
atlas = base64.b64encode((root / 'assets/catalog/puzzle-icons.png').read_bytes()).decode()
shell = (root / 'src/catalog-shell.html').read_text()
html = shell.replace('@@ATLAS@@', 'data:image/png;base64,' + atlas).replace('@@ADATLAS@@', 'data:image/png;base64,' + base64.b64encode((root / 'assets/adventures/adventure-icons.png').read_bytes()).decode())
html = html.replace('@@DATA@@', json.dumps(data, ensure_ascii=False).replace('</', '<\\/'))
(root / 'catalog.html').write_text(html)

lines = [
    '# Оглавление головоломок', '',
    f"{len(data['items'])} задач в шести разделах: {sum(i['status']=='playable' for i in data['items'])} реализованы, {sum(i['status']=='proposed' for i in data['items'])} предложены. У предложенных задач правила и уровни — проектный замысел, не обещание готовой игры.", '',
    '[Иллюстрированное оглавление](../catalog.html) · [Открыть игру](../index.html)', '',
    '![Исходный набор иконок ImageGen](../assets/catalog/puzzle-icons.png)', '',
    '![Новые пиксельные иконки игровых сцен](../assets/adventures/adventure-icons.png)', '',
    '## Разделы', ''
]
for g in data['groups']:
    items = [i for i in data['items'] if i['group'] == g['id']]
    lines += [f"- [{g['title']}](#{g['id']}) — {len(items)} задач."]
lines += ['', '## Первая очередь развития', '',
          'В игре 25 мест и 75 уровней. Ближайшие кандидаты — лазерная мастерская, острова и мастерская мозаики: направление луча, построение связей и заполнение рисунка.', '']
for g in data['groups']:
    lines += [f'<a id="{g["id"]}"></a>', f"## {g['title']}", '', g['description'], '']
    for i in (i for i in data['items'] if i['group'] == g['id']):
        live = i['status'] == 'playable'
        lines += [f'<a id="{i["id"]}"></a>', f"### {i['title']} · {i['classic']}", '',
                  '**Уже в игре: 3 уровня.**' if live else '**Предложено: ещё не реализовано.**', '',
                  i['summary'], '', '**Цель:** ' + i['goal'], '', '**Правила:**', '']
        lines += [f'{n}. {r}' for n, r in enumerate(i['rules'], 1)]
        lines += ['', '**Управление:** ' + i['controls'], '',
                  '**Уровни:**' if live else '**Предлагаемые уровни:**', '']
        lines += [f'{n}. {l}' for n, l in enumerate(i['levels'], 1)]
        lines += ['', '**Что тренирует:** ' + i['thinking'], '', '**Подсказка:** ' + i['hint'], '']
        if live:
            lines += [f"![{i['title']}](../assets/locations/{i['id']}.png)", '']
        if i.get('note'):
            lines += [i['note'], '']
lines += ['## Основания и графика', '', '16 новых иконок нарисованы программно теми же пиксельными примитивами, что здания на карте; атлас в `assets/adventures/`. Исходные 30 иконок ImageGen сохранены без изменений.', '',
          'Классические механики сверялись с [коллекцией Саймона Тэтэма](https://www.chiark.greenend.org.uk/~sgtatham/puzzles/), [правилами Sokoban](https://www.sokoban.jp/rule.html) и [правилами Slitherlink от Nikoli](https://www.nikoli.co.jp/en/puzzles/slitherlink/). Названия локаций, наборы уровней для предложенных задач и их оформление — проектные предложения.', '',
          'Иконки созданы встроенным ImageGen как один атлас 6×5. Исходный набор и полный промпт сохранены в `assets/catalog/`. В интерфейсе используется CSS-позиционирование исходного атласа, отдельные изображения не вырезались.', '']
(root / 'docs/CATALOG.md').write_text('\n'.join(lines))
print(f"Built catalog.html and docs/CATALOG.md: {len(data['items'])} tasks.")

# Keep the public README table aligned with the catalogue's playable entries.
readme = root / 'README.md'
text = readme.read_text()
start, end = '<!-- LOCATIONS:START -->', '<!-- LOCATIONS:END -->'
assert text.count(start) == text.count(end) == 1
rows = ['| | Место | Задача | Три уровня |', '|---|---|---|---|']
for item in data['items']:
    if item['status'] != 'playable':
        continue
    icon = f"<img src=\"assets/locations/{item['id']}.png\" width=\"40\" height=\"40\" alt=\"\">"
    title = f"[{item['title']}](docs/CATALOG.md#{item['id']})"
    rows.append(f"| {icon} | {title} | {item['summary']} | {' → '.join(item['levels'])} |")
readme.write_text(text.split(start)[0] + start + '\n' + '\n'.join(rows) + '\n' + end + text.split(end)[1])
