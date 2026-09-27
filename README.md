# Infinite Elevator

TypeScript + Next.js + Chakra UI で作成した「無限エレベーター」です。

## ローカル起動

```bash
npm install
npm run dev
```

`http://localhost:3000` を開いてください。

## GitHub Pages への公開

このプロジェクトは GitHub Actions から GitHub Pages に自動デプロイできるよう設定済みです。
リポジトリ名は Actions 実行時に自動検出されるため、通常は `next.config.mjs` の `basePath` を手動変更する必要はありません。

### 1. GitHubへpush

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_NAME/YOUR_REPOSITORY.git
git push -u origin main
```

### 2. GitHub Pagesを有効化

GitHubのリポジトリで:

1. `Settings`
2. `Pages`
3. `Build and deployment`
4. `Source` を **GitHub Actions** にする

その後、`Actions` タブの `Deploy Next.js to GitHub Pages` が成功すれば公開されます。

## 注意

- `node_modules`、`.next`、`out`、`.env*` はGit管理対象外です。
- Pages用ビルドでは `output: 'export'` を使用します。
- 通常のプロジェクトPages (`https://username.github.io/repository/`) ではリポジトリ名を自動で `basePath` に設定します。
- `username.github.io` リポジトリの場合はルート (`/`) として公開します。


## 効果音

この版では Web Audio API を使って外部音源ファイルなしで効果音を生成します。
通常クリック、ゲーム開始、エレベーター扉、上昇演出4段階、到着、アイテム、購入・売却、採掘、宝石、ブラックジャック、スロット、ジャックポット、ワープ、究極ルーレット、地獄、成功・失敗、ゲームオーバー等に個別の効果音を割り当てています。右上のスピーカーボタンで効果音をON/OFFできます。

## v7 changes
- Inventory cards now use high-contrast text and icons at all times.
- Blackjack HIT results show the drawn card and final hand total; bust explicitly shows that the total exceeded 21.
- Magic Forge can be used only once per visit. After one upgrade, the room shows that upgrading is complete.

## v12 updates
- ミステリーオークションの購入ボタンを中央配置。
- 落札後の結果に「当たり」ではなく、獲得した商品名を表示。

## v18 演出アップデート
- 地獄の門: 脱出条件・成功率・残り回数を表示し、サイコロの高速抽選→確定演出を追加。
- BGM: Web Audio APIで生成する軽量BGMを追加。通常Tier、カジノ、地下カードサロン、神秘系、地獄で曲調が切り替わります。
- エレベーター: 上昇階数の高速抽選、Tier別CHANCE演出、OVERDRIVE激熱表示、最終値ロック演出を追加。

## v19 changes
- 宝石はショップ系の部屋でのみ売却可能
- 2つの扉を6種類へ拡張
- エレベーター演出をNORMAL開始→昇格抽選方式へ変更
- 乱反射の鏡の「素の上昇値→倍率→最終値」専用演出を追加


## v20 updates
- 2つの扉は6候補から毎回ランダムで2種類のみ出現します。
- 右上の ×1 / ×2 で演出速度を切り替えられます。ブラックジャック、スロット、占い、ルーレット、地獄などの待ち時間にも反映されます。

## Firebase 全国ランキング設定

この版は Firebase Authentication（匿名ログイン）+ Cloud Firestore のオンラインランキングに対応しています。Firebase設定が無い場合だけローカルランキングへフォールバックします。

### 1. Firebaseプロジェクトを作る

Firebase Console でプロジェクトを作成し、Webアプリを追加してください。表示された `firebaseConfig` の値を使います。

### 2. Anonymous Authenticationを有効化

Firebase Console → Authentication → Sign-in method → Anonymous を有効にします。

### 3. Cloud Firestoreを作る

Firebase Console → Firestore Database → データベースを作成します。本番運用ではルールを開放したままにしないでください。

このプロジェクトの `firestore.rules` の内容を Firebase Console → Firestore Database → Rules に貼り付けて「公開」してください。

ランキングデータは次のコレクションへ保存されます。

```text
rankings/{auto-document-id}
```

### 4. GitHub Actions Variablesを登録

GitHubの対象リポジトリで

`Settings → Secrets and variables → Actions → Variables → New repository variable`

を開き、以下6つを登録します。

```text
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

値はFirebase Console → Project settings → Your apps → Web app の `firebaseConfig` からコピーします。

登録後、mainへpushするとGitHub ActionsがFirebase設定込みでNext.jsをビルドします。

### 5. ローカルで確認する場合

`.env.example` を `.env.local` にコピーしてFirebaseの値を入れます。

```bash
cp .env.example .env.local
npm install
npm run dev
```

`.env.local` は `.gitignore` 対象なのでGitHubへコミットしないでください。

### ランキング仕様

- Top 50をスコア（到達階）降順でリアルタイム表示
- ゲーム終了画面からニックネームとスコアを登録
- 匿名Firebase Authenticationで書き込みユーザーを識別
- 読み取りは公開、追加は認証済みユーザーのみ
- ランキングの更新は禁止。削除はTop 50整理のため匿名認証済みクライアントに許可
- Firebase未設定時はlocalStorageランキングへフォールバック

## v22 gameplay adjustments
- Inventory overflow now opens a 4-item discard chooser (3 held + newly acquired item).
- Mystery Auction rewards: Ruby x3 / Emerald x3 / Diamond x3 / Mirror ★5-8 / Lucky Ring ★5-15.
- Mining gem rate reduced to 55%; most finds are 1 gem, occasionally 2.
- Forge caps: Mirror ★8, Lucky Ring ★15, Money Tree ★3, Happiness Charm ★3.
- Barter exchange for +1 turn now costs 600 yen.

## v23: イベント変更

- 宝石採掘場: 2回掘り終えると、選ばなかった3つの岩の中身も薄く表示して公開します。入手できるのは実際に選んで掘った岩の宝石だけです。
- 運試しの祭壇: `運気 / 階数 / 金運 / 健康運` の4つから1回だけ祈れます。成功率は30%です。
- 占い師の小部屋: 「占ってもらう」を押すと演出後に `大吉〜大凶` の運勢とコメント、運気の増減が表示されます。

## ランキングを無料でTop 50だけに保つ仕組み

この版では Cloud Functions を使いません。Spark無料プランのまま、ランキング登録後にブラウザ側でFirestoreをスコア順に読み直し、51位以下を削除します。

### 必須: Firestore Rulesを更新

`firestore.rules` を Firebase Console → Firestore Database → Rules に貼り付けて公開してください。

この無料方式では、匿名認証済みユーザーに `rankings` の削除権限を与える必要があります。そのため Cloud Functions版より改ざん耐性は低くなります。まず無料で運用したい場合向けの構成です。

### Cloud Functionsは不要

`functions/` フォルダは削除済みです。Blazeプランへの変更や `firebase deploy --only functions` は不要です。

Firestore Rulesだけデプロイする場合は次でOKです。

```bash
firebase deploy --only firestore:rules
```

GitHub Pages側はこれまで通り `git push` で更新できます。


## v25: 旧 Cloud Functions フォルダの削除

無料 Top 50 版では `functions/` は不要です。以前の版からGitHubリポジトリを更新している場合、古い `functions/` が追跡されたまま残ることがあります。

```bash
git rm -r functions
git add tsconfig.json
git commit -m "Remove old Firebase Functions"
git push origin main
```

`tsconfig.json` でも `functions` を型チェック対象外にしてあるため、旧フォルダがローカルに残っていても Next.js のビルド対象にはなりません。

## v26 visual update
- Removed the Time Capsule room from Tier 4.
- Slower slot reel stopping and a dedicated REACH animation when the first two symbols match.
- Richer Tier 5 / God Home BGM generated with Web Audio.
- Tier 4/5 arrival effects.
- Event-specific room backgrounds (casino, mining, fortune, altar, warp, forge, shops, God Home, hell, etc.).

## v29 changes
- ルーレット絵柄3つ揃い時、10〜50倍の倍率ルーレット演出を追加。
- 3つ揃いの実確率は従来のまま維持しつつ、ハズレの一部を2リール同柄にしてリーチ演出を少し増加。
- 運試しの祭壇「階数」の成功報酬を +20〜50階 に変更。

## v33: スタート画面専用BGM

- `public/autumnbell.mp3` をスタートメニュー専用BGMとして追加しました。
- メニューを開いている間だけループ再生します。
- ゲーム開始時に停止し、ゲーム内では従来の部屋別BGMへ切り替わります。
- ブラウザの自動再生制限により、初回は画面内をタップまたはクリックした時点で再生が始まる場合があります。
- メニュー右上のスピーカーボタンでON/OFFできます。

## v34 UI redesign
- スタート画面に `public/title-visual.jpg` を使用
- 黒い金属・銀の罫線・白い光・深い赤の差し色へ全体UIを統一
- ゲーム中のヘッダー、部屋表示、扉、アイテム欄、操作ボタン、モーダルも同じ世界観へ変更
- ゲームロジック・Firebaseランキング・BGM仕様は従来版を維持

## v35 UI / guide update
- プレイ中BGMの音量をスタート画面BGMに近い大きさへ調整
- タイトル画面を新しい縦長キービジュアル基準で再構成
- ルール説明を手順・ステータス・アイテム整理の観点で詳しく改稿
- ステージ図鑑を Tier ごとの特徴と出現内容つきで整理
- アイテム図鑑を消費 / 常時 / 宝石の3分類で読みやすく改稿

## v36 menu/bgm tweak
- タイトル画面の「ゲームを始める」ボタンを中央配置
- ボタン上の説明文を削除
- プレイ中BGMの音量をさらに上げて調整

## v37 BGM loudness matching
- プレイ中BGMを一律倍率ではなく、部屋BGMごとの補正値で音量調整
- 静かなBGMは強め、Tier5 / 神の故郷のような音数が多いBGMは控えめに補正
- スタート画面BGMに近い体感音量を狙う設定へ変更

## v38: 乱反射の鏡 / state競合修正
- 乱反射の鏡で大きく上昇した直後に、階段などの即時イベントが古い階数を基準にstateを書き戻す問題を修正。
- 階数・回数・運気・所持金の加減算を、常に最新stateを基準にするfunctional updateへ変更。
- 鏡の最終上昇値は表示された値を必ず1回だけ現在階へ加算し、その後の部屋効果はその到着階を基準に追加されます。

## v39 stage gallery
- ステージ図鑑を文字一覧から背景ギャラリー形式へ変更
- 全ステージをTier別にサムネイル表示
- 背景をタップすると大きなプレビューを表示
- エレベーターホールには専用背景画像を追加

## v40 gameplay / presentation update
- 採掘場: 宝石出現率を55%→60%へ、1〜3個まで出るように調整
- スロット3揃い確率: ルビー10% / エメラルド7% / ダイヤ3% / ルーレット1%
- 究極のルーレット: 出現内容の説明欄と豪華な回転・発光演出を追加
- 地獄の門: サイコロ演出を強化（振動、波紋、最終判定演出）
- 小さな宝箱をTier2へ移動。500〜1000円または宝石1個
- 落ちている財布: 100〜500円
- 温泉 / 階段 / ラッキー / 財布 / 小さな宝箱を即結果ではなく専用確認演出へ変更
- 自動販売機: 20%で半額セール
- ワープ範囲: 小 0〜100 / 大 -30〜200 / 巨大 -100〜1000
- 温泉Tier: 健康Tier2 / 無病Tier3 / 不老不死Tier4
- 階段: 短い+5〜20 / 長い+20〜50 / 果てしなく長い+50〜100

## v41 stage catalog play buttons
- ステージ図鑑の各カードに「このステージをプレイ」ボタンを追加
- 拡大プレビューにも同じ試遊ボタンを追加
- 選択したステージを新規ゲーム状態で直接開始
- エレベーターホール、地獄の門、Tier 1〜5 の特殊ステージにも対応

## v42 新ステージ / 神器 / 演出アップデート
- Tier4「ATM」を追加。好きな金額を預け、次回ATM遭遇時に2倍で受取。ゲーム終了で預金リセット。
- Tier3「アンケート娘」を追加。日常・恋愛・旅行などの2択を、現実の一般的傾向を参考にしたゲーム内重みで得票抽選。多数派なら運気+5〜10、少数派なら-3〜6。
- Tier5「伝説の神器商店」を追加。1訪問1個のみ購入可能。
  - 乱反射の八咫鏡 5000円: 常時上昇階数2倍
  - 天叢雲剣 3000円: 毎ターン運気+2 / 所持金+400円
  - 不老の八尺瓊勾玉 3000円: Tier4以上出現まで残り回数を消費せず、到着時に消失
- 神の故郷からパーティーセットを削除。
- ワープ範囲: 小 0〜100 / 大 -30〜200 / 巨大 -300〜800。ワープ中の座標抽選・発光演出を追加。
- スロット3揃い確率: ルビー8% / エメラルド5% / ダイヤ2% / ルーレット1%。
- BOOSTER以降のエレベーター昇格演出に長めの溜めを追加。

## v43 start visual swap
- スタート画面の画像を新しい bright anime-style title visual に差し替え

## v44 startup BGM
- スタート画面表示直後にBGMの自動再生を試行
- 自動再生がブラウザにブロックされた場合は最初の pointer/touch/key 操作で即再生
- audio要素にも autoPlay を設定し、起動直後の再生開始を優先

## v45 start image hard replacement
- Removed old dark title images
- Uses public/start-screen-v45.png exclusively for the start screen

## v46 BGM / event polish
- スタートBGMを起動時に `new Audio()` で常駐生成し、即時再生を試行。自動再生が拒否された環境では pointer/touch/key/click ごとに再試行。
- 究極のルーレットは当選内容で停止した後、約2秒その結果を表示してから報酬・地獄遷移へ進む。
- アンケート娘の重み表示を削除し、女の子の会話 → 集計 → 票数発表 → 勝敗の段階演出を追加。
- 天叢雲剣を「強運の天叢雲剣」へ改名。
- ATMをTier 4からTier 2へ移動。
- お店チケットのショップ価格を0円に変更。

## v47 startup BGM controller
- スタートBGM管理を InfiniteElevator 本体から分離
- `components/BgmController.tsx` を追加し `app/layout.tsx` に常駐
- ページ起動直後に `new Audio()` → `play()` を試行
- autoplay拒否時は pointerdown / touchstart / keydown / click で再試行
- ゲーム開始時はカスタムイベントでメニューBGM停止、メニュー復帰時は再開

## v48 stage image integration
- 36枚の番号付きステージ画像を正式ステージ名にリネームして `public/stages/` に格納
- ステージ図鑑の各カード・拡大表示に専用画像を適用
- 実際のプレイ画面でも現在ステージの専用背景画像を表示
- ATM / アンケート娘 / 伝説の神器商店は画像素材未収録のため従来の専用グラデーション背景を維持

## v49 stage image lightweight
- 36枚のステージ背景を PNG から WebP へ変換
- 最大幅1280pxへ縮小して軽量化
- アプリ内参照を stages/*.webp へ変更

## v50 stage background fix
- ステージ画像ファイル名を日本語名から stage-01.webp〜stage-36.webp へ変更
- GitHub PagesでのURLエンコード問題を避ける構成へ変更
- プレイ画面の親背景へ画像を直接指定し、確実に表示されるよう修正

## v51 gameplay chain update
- ATMの満期倍率を2倍から5倍へ変更
- 階段・ワープ・祭壇の階数加護・究極ルーレットの階数1.5倍で、階数移動後に新しいイベントが発生するよう変更
- 階数移動時にFLOOR TRANSITION演出を追加
- アンケート娘に多数派/少数派時の運気変化説明を追加
- 祭壇報酬を運気+7〜10 / 階数+50〜100 / 金運+1000〜1500 / 残り回数+5〜7へ強化
- 伝説の神器商店でも宝石を売却可能に変更

## v52 additional stage backgrounds
- 追加3ステージ背景を正式ステージに組み込み
- ATM: `public/stages/ATM.webp`
- アンケート娘: `public/stages/survey-girl.webp`
- 伝説の神器商店: `public/stages/legendary-relic-shop.webp`
- 3枚とも最大幅1280px / WebP quality 82で軽量化
- ステージ図鑑とプレイ中背景の両方で使用

## v53 PC responsive UI
- スマホの縦長UIは維持
- md/lg以上ではゲーム画面を最大1180pxまで拡張
- PCではステージ背景をより広く表示
- 中央イベントUI、タイトル、アイコン、説明文をPC向けに拡大
- スタート画面の操作パネルを中央寄せ・ワイド化
- ステージ図鑑はPCで2〜3列グリッド表示
- ステージ背景プレビュー、ルール/図鑑モーダルをPC向けに拡大
- アイテム/ログ欄と下部アクションボタンもPCサイズへ最適化

## v55 compact HUD + visual novel room intro
- 上部ステータスを左上のコンパクトHUDへ統合
- アイテム / ログは常設領域を廃止し、HUDボタンからモーダル表示
- 中央表示領域を大幅に拡張し、スクロール発生を削減
- 部屋到着時は選択肢を即表示せず、画面下部のノベルゲーム風会話ボックスを先に表示
- 会話中は「ボタンを押す」を非表示
- 「選択肢へ」後に部屋固有UIを表示し、イベント完了後のみエレベーターボタンを再表示
- 部屋に応じて話者名（アンケート娘、占い師、店員、ディーラー等）を表示

## v56 UI adjustment
- 「ボタンを押す」を常時表示（会話・未解決イベント中は表示したまま無効化）
- ノベル会話をボタンの上へ移動
- 左上HUDを横長コンパクトバーへ変更

## v59 button behavior
- 部屋到着直後のノベル風セリフ表示中は「ボタンを押す」を無効化
- セリフ終了後に選択肢が表示された時点で「ボタンを押す」を有効化
- イベント演出中・階数遷移中・上昇演出中は誤操作防止のため無効化

## v60 UI overlap fix
- 左上HUDの高さ分を中央イベント領域から除外
- 下部アクションボタンの高さ分も安全領域として確保
- ノベル会話ボックスもHUDと重ならない範囲に制限

## v63 narration spacing fix
- ナレーション中は下部ボタン分の予約余白を解除
- 会話ボックスを画面下端近くまで下げて空白を解消
- 通常時は従来のボタン用安全余白を維持

## v64 full viewport background
- PC版の最大幅/最大高さ制限を撤廃
- ゲーム画面を100vw × 100dvhで表示
- ステージ背景はcoverで画面全体を埋める
- 余った領域に黒帯が出ないよう外枠余白・角丸・PC用paddingを撤廃

## v65 status detail popup
- 残り回数・運気・所持金のHUDカードをタップ可能に変更
- タップ時に大きな数値表示のポップアップを追加
- 所持金は3桁区切りで表示

## v66 item HUD row
- アイテム/ログ行を左寄せ
- 所持アイテムを改行した3段目に横並び表示
- アイテムは横スクロール可能、タップで詳細/使用
- HUD増高に合わせ中央UIの安全上余白を拡張

## v67 HUD / warp visibility
- ワープホールをコンパクト化し、PCでは3択横並び、スマホでは小さい縦並びに変更
- ステータスカードを大型化
- 所持金をHUD上でも3桁区切り表示

## v68 Firebaseランキング省read化
- アプリ起動時のTop50リアルタイム購読を廃止。
- 「ランキング」を開いた時だけTop50を1回取得。
- `rankingMeta/top50` に件数・50位スコア・50位document IDを保持。
- Top50圏外のスコアはFirestoreへ書き込まない。
- Top50満杯時の登録は通常、meta 1read + 下位2件 2reads程度で判定・入れ替え。
- 既存プロジェクトでmetaが未作成の場合のみ、初回登録時にTop50を1回読んで自動初期化。
- `firestore.rules` に `rankingMeta/top50` 用ルールを追加。Firebase Console側のルールもこの内容へ更新してください。

## v69: Top50表示 + 自分の順位 + Top1000保存
- Firestoreには匿名ユーザーごとの自己ベストを最大1000件保存します。
- ランキング画面ではTop50だけを取得・表示します。
- 自分の順位は `rankings/{uid}` 1件と `count()` 集計で算出し、51〜1000位の本文データを一覧取得しません。
- 1000位圏外の新規スコアは保存しません。
- 同じユーザーは自己ベストを更新した場合だけ書き換えます。
- メタ情報は `rankingMeta/top1000` を使用します。
- Firebase Console の Firestore Rules を、このZIP内の `firestore.rules` に必ず更新してください。
- v68以前のランダムIDランキングはTop50一覧には残りますが、自分の順位カードはv69以降に自己ベスト登録した匿名UIDベースのデータを対象にします。

## v70 ranking redesign
- 週間ランキング / 総合ランキングを分離
- 両方とも上位1000人までFirestoreに保存
- UIは各ランキングTop50 + 自分の順位だけ表示
- 週間ランキングは日本時間の月曜0:00で新しい週に切り替え
- ランキング画面は週間だけ先に取得し、総合はタブを押した時だけ取得
- 取得結果は5分間メモリキャッシュし、同じセッションでの再読込を削減
- スコア登録時は週間・総合の自己ベストのみ更新
- firestore.rules をv70用に更新する必要あり


## v72 ranking multi-name fix
- 同一ブラウザでもニックネームが違えば別ランキング行として保存。
- 同じニックネームは同じ行を自己ベスト更新。
- 自分の順位は同一Firebase UIDに紐づく記録の最高スコアを表示。
- v71以前のUID直下レコードは同名なら引き続き更新。
- firestore.rulesを更新。
