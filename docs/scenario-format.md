# シナリオJSON仕様

「JSONエディタ」に貼り付けるJSONで、都市名、災害条件、施設の位置と依存関係を定義できます。

```json
{
  "name": "台風「白波」強化版",
  "start": 360,
  "rain": 480,
  "flood": 600,
  "peak": 0.92,
  "budget": 680,
  "facilities": [
    {
      "id": "power",
      "name": "中央変電所",
      "icon": "ϟ",
      "x": 4.1,
      "y": 5.7,
      "type": "電力",
      "base": 96,
      "deps": ["road"]
    }
  ]
}
```

## 災害・都市パラメータ

- `name`: シナリオ名
- `start`: 開始時刻（分。午前6時は360）
- `rain`: 降雨開始時刻（分）
- `flood`: 浸水開始時刻（分）
- `peak`: 台風・浸水の最大強度（0〜1）
- `budget`: 対策に使える予算ポイント

## 施設パラメータ

`facilities` は省略すると標準の新港市モデルを使います。指定する場合は、`hospital`、`power`、`water`、`fire`、`logistics` の5施設を含めてください。

- `id`: 施設の識別子
- `name` / `icon` / `type`: 地図・パネル表示
- `x` / `y`: 12×8グリッド上の位置
- `base`: 初期稼働率
- `deps`: `power`、`water`、`road` の依存先

電力低下は水道・医療・物流へ、道路寸断は消防・物流へ連鎖します。