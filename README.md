# SimpleForum

基本的な機能のみを備えた掲示板

既存のWEBアプリに、簡単に導入できそうな掲示板ライブラリがすぐ見つからなかったので自分で作りました。
メインはフロントエンドの board.js で、プロジェクト全体はそれを用いた簡単な掲示板アプリを例示しています。

テキスト入力は Quill に依存しているため、リッチテキストとして画像の貼付けやコードの貼り付け、表示が自由にできます。

# 使い方

## フロントエンド
static/board.js が js モジュールの本体です。内部に Board クラスが定義されています。
CSSを [Bootstrap](https://getbootstrap.jp/) 、テキスト入力を [Quill](https://quilljs.com/) に依存しているため、両者を使えるようにしてください。

Bord クラスを生成し、 **init_container()** に掲示板にしたい要素を渡します。
```html
<body onload="main()">
  <div id="board"></div>
</body>

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

新規トピックでは、**parent_id** が存在せず、ダミートピックの場合は **title** も存在しません。

```javascritp
{
  writer: "John",                           // ユーザー名
  title: "New topic",                       // タイトル
  content: "Sample text of Topics",         // テキスト (HTML形式)
  plain_text: "Sample text of Topics",      // プレーンテキスト　(テキストのみのHTML)
}
```

#### 戻り値
これらのエンドポイントは、新規に追加されたノードの data を "get_data_url" と同様の形式で返す必要があります。

# Board コンストラクタ

Board のコンストラクタ引数は以下のとおりです。
```javascript
board = new Board(init_data, settings, parent=null)
```
* init_data:  
  初期のデータ (JSON)、または、データ取得エンドポイントからそれを得られる固有IDを指定します。
  null を指定すると新規トピックの作成、トピック ID を指定するとそれを開く動作となります。  
* settings:  
  設定を記述します。最低限 **get_data_url** と **submit_url** を含む必要があります。
* parent:  
  通常は指定しません。クラス内部で再帰的に展開する際に使用する引数です。

### settings

**settings** にはエンドポイント以外にもオプション設定を渡します。

```javascript
let settings = {
  get_data_url: "/forum/get_data",
  submit_url: "/forum/append_comment",
  disable_topics: false,
  quill_settings: { theme: 'snow', modules: {toolbar:true} }
  submit_params: {}
}
```
#### disable_topics
これを true にすると、新規トピック作成がダミートピックになります。
ダミートピックではトップにタイトル・本文が表示されず、入力も求められません。

初回コメントの送信時にサーバーには parent_id, title が共に存在しない submit が実行されます。

#### quill_settings
Quill に与える設定を指定します。入力欄のツールバーなどの設定に使用します。

#### submit_params
submit_url に submit 時に渡したい追加のパラメータです。
そのまま、 submit_params というキーを通してサーバーサイドに送信されます。
