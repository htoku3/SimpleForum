# SimpleForum

基本的な機能のみを備えた掲示板

# 使い方

## フロントエンド
static/board.js が js モジュールの本体です。内部に Board クラスが定義されています。
CSSを [Bootstrap](https://getbootstrap.jp/) 、テキスト入力を [Quill](https://quilljs.com/) に依存しているため、両者を使えるようにしてください。

Bord クラスを生成し、 **init_container()** に掲示板にしたい要素を渡します。
```html
<body onload="main()">
  <div id="board"></div>
<body>

<script type="module" src="static/board.js"></script>

<script type="module">
  import Board from "./static/board.js"

  window.main = function () {
      var board = new Board(null, {
        get_data_url: "/forum/get_data",
        submit_url: "/forum/append_comment",
      })
      board.init_container(document.getElementById("board"))
  }
</script>
```

## バックエンド

最低限、２つのエンドポイントURLを定義してください。 このサンプルとして、Flaskのバックエンド **app.py** を用意しています。

### データ取得エンドポイント (**get_data_url**)

空のPOSTをすることで、掲示板のJSONデータを取得できるエンドポイントです。上記の例の **/forum/get_data** です。
JSONデータ形式は以下のとおりです。

```javascritp
{
  id: 1,                                    // 各テキスト固有のID
  writer: "Bob",                            // ユーザー名
  title: "An example topic",                // タイトル
  content: "Example text of Topics",        // テキスト (HTML形式)
  date: "Sun, 11 Aug 2024 17:04:44 GMT",    // 記入時刻
  parent_id: null,                          // 親の id (ルートでは null)
  children: [                               // 子供のデータ (同一フォーマット)
    {
      id: 2,
      writer: "Mary",
      title: null,
      content: "Example reply text1",
      date: "Sun, 11 Aug 2024 18:03:10 GMT",
      parent_id: 1,
      children: []
    }
  ],
}
```

掲示板は再帰的な構造によって、スレッドとリプライを表現しています。
一番トップのノードは親IDが null となっており、話題とするトピックを記述します。

トピックには以下の２種類が存在します。ダミートピックは、トップにタイトルと本文が無く、はじめからコメントをしたい場合に使用します。

* タイトル・本文を持つ通常のトピック
* タイトルが null のダミートピック

通常のコメントはこのトピックに対するリプライとして処理されます。リプライはデータ内部では children で表されています。
children も同様の形式で記述されるため、再帰的にリプライが表現されます。

### トピック・コメント・リプライ追加のエンドポイント (**submit_url**)

次に、新たなトピックやコメントのデータを追加するためのエンドポイントが必要です。上記の例の **/forum/submit_url** です。

Bord クラスからは以下の形式のデータが送信されます。

#### 通常のコメント

通常のコメント・リプライでは、トピックやリプライ先の固有IDを **parent_id** に指定したデータが渡されます。

content にコメントの本文が記述されますが、Quill から得られる HTML には画像等も含まれます。
全文検索などで使いやすくするため、純粋なテキスト部のみを返す plain_text も同時に渡されます。

```javascritp
{
  parent_id: 2,                            // トピック・リプライ先の ID
  writer: "John",                          // ユーザー名
  title: null,                             // タイトル
  content: "Example reply text2.",         // テキスト (画像等込のHTML形式)
  plain_text: "Example reply text2.",      // プレーンテキスト　(テキストのみのHTML)
}
```

#### 新規トピック

新規トピックでは、**parent_id** が null となっています。 ダミートピックの場合、**title** は null になります。

```javascritp
{
  parent_id: null,
  writer: "John",                           // ユーザー名
  title: "New topic",                       // タイトル
  content: "Sample text of Topics",         // テキスト (HTML形式)
  plain_text: "Sample text of Topics",      // プレーンテキスト　(テキストのみのHTML)
}
```

#### 戻り値
これらのエンドポイントは、新規に追加されたノードの data を "get_data_url" と同様の形式で返す必要があります。

# オプション

