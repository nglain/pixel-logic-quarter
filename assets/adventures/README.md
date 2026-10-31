# Новые иконки

`adventure-icons.png` — атлас 4×4, 384×384. Индексы соответствуют порядку идентификаторов в `src/adventures.json`. Это оригинальные программные пиксельные рисунки, не ImageGen: они воспроизводят здания игровой карты через `adMapArt` из `quarter-adventures.js`. Исходный ImageGen-атлас предыдущих 30 задач находится отдельно в `assets/catalog/` и не изменён.

Воспроизведение из корня репозитория:

```sh
PLAYWRIGHT_EXECUTABLE_PATH='/path/to/chrome' node scripts/build-adventure-icons.cjs
python3 scripts/build-catalog.py
```

Готовая игра рисует здания сама, не загружая атлас; он нужен только автономному оглавлению.
