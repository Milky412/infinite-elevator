# Infinite Elevator


> メインメニューの「ランキング」は階数ランキング専用です。トロフィーランキングは「コンピュータ戦」を開き、「ランキング」タブから確認します。

Next.js + TypeScript + Chakra UI で作られた、ランダムイベント型の「無限エレベーター」ゲームです。  
GitHub Pages へ静的サイトとして公開でき、Firebase を設定した場合はオンラインランキングと2人対戦機能を利用できます。

起動方法は [`setup/README.md`](setup/README.md) を参照してください。

## システム全体の流れ

```text
[ブラウザ]
   |
   v
app/page.tsx
   |
   v
components/InfiniteElevator.tsx
   |-- ゲーム状態をReact stateで管理
   |-- ボタン押下 → 上昇階数抽選 → 到着Tier抽選 → イベント部屋決定
   |-- 部屋ごとの操作 → お金/運気/残り回数/アイテム/階数を更新
   |-- ゲーム終了 → プレイ履歴保存 → ランキング登録
   |
   |-- components/gameConfig.ts
   |     └─ ステージ定義、アイテム生成、共通定数、乱数ヘルパー
   |
   |-- components/gameAudio.ts
   |     └─ Web Audio API の効果音・ゲーム内BGM
   |
   |-- components/GameModals.tsx
   |     └─ ヘルプ、ステージ図鑑、共通操作UI
   |
   |-- components/BgmController.tsx
   |     └─ スタート画面BGM
   |
   |-- lib/localProfile.ts
   |     └─ localStorage のプレイヤーID・プレイ履歴
   |
   |-- lib/leaderboard.ts
   |     └─ Firebaseランキング / 未設定時のローカルフォールバック
   |
   |-- lib/battle.ts
   |     └─ Firestore を使った2人対戦ルーム同期
   |
   └-- lib/firebase.ts
         └─ Firebase設定の有無を判定して初期化
```

## ゲーム進行

1. メインメニューからゲームを開始します。
2. 「ボタンを押す」で上昇階数を抽選します。
3. 運気、アイテム、特殊効果を反映して最終上昇階数を決定します。
4. 到着時に Tier 1〜5 のいずれかを抽選します。
5. Tier に応じてショップ、採掘、カジノ、回復、特殊イベントなどの部屋を生成します。
6. 部屋内の操作結果をゲーム状態へ反映します。
7. 残り回数がなくなるまで 2〜6 を繰り返します。
8. 終了時に端末内履歴を保存し、Firebase設定済みならランキング登録候補を確認します。
9. 対戦モードでは両プレイヤーの進捗を Firestore に同期し、双方の終了後に結果を確定します。

## ディレクトリ構成

```text
app/
  layout.tsx              Next.js レイアウト
  page.tsx                ゲーム画面の入口
  providers.tsx           Chakra UI Provider
  globals.css             全体CSS

components/
  InfiniteElevator.tsx    ゲーム本体・状態遷移・イベント処理
  gameConfig.ts           ステージ/アイテム/共通定数
  gameAudio.ts            効果音・ゲーム内BGM
  GameModals.tsx          共通UI・説明モーダル
  BgmController.tsx       スタート画面BGM

lib/
  firebase.ts             Firebase初期化
  leaderboard.ts          ランキング処理
  battle.ts               2人対戦同期
  localProfile.ts         端末内履歴
  types.ts                共通型

public/
  stages/                  ステージ背景画像
  autumnbell.mp3           スタート画面BGM

setup/
  README.md                起動・セットアップ手順
```

## データ保存

### ローカル

`localStorage` にプレイヤー識別用ID、ハイスコア、プレイ履歴などを保存します。プレイ履歴は端末内で最大100件です。

### Firebase

Firebase の環境変数が揃っている場合のみ Firebase を使用します。

- Anonymous Authentication: ランキング書き込みユーザー識別
- Cloud Firestore: ランキング、対戦ルーム
- Firebase未設定時: ランキングはローカル動作へフォールバック

ランキングは `rankings` コレクションを利用します。Firestore Rules は `firestore.rules` を参照してください。

## GitHub Pages

`main` ブランチへの push で `.github/workflows/deploy-pages.yml` が実行されます。

1. Node.js 20 を準備
2. `npm install`
3. `npm run build`
4. Next.js の静的出力 `out/` を GitHub Pages へデプロイ

`next.config.mjs` が GitHub Actions 実行時のリポジトリ名から `basePath` / `assetPrefix` を自動設定します。

## コード整理方針

巨大化していた `InfiniteElevator.tsx` から、静的データ・音響・共通モーダルを分離しています。ゲーム本体は「状態遷移とイベント処理」に集中させ、各ファイルの先頭や主要処理には役割が分かるコメントを残しています。

ビルド時に自動生成されるファイルや、一時的なコード断片はリポジトリへ含めない方針です。`.gitignore` に従い `node_modules/`, `.next/`, `out/`, `*.tsbuildinfo`, `next-env.d.ts`, `.env.local` などは管理対象外です。

### 開発者モード専用のプレイ補助

開発者設定から開始したプレイでは、画面上部に次の補助操作が表示されます。

- **AUTO**: 選択肢のない場面で会話送りとエレベーターボタン操作を自動化します。ショップ、扉、地獄など判断が必要なイベントでは自動で待機します。
- **×3**: 演出や待ち時間を3倍速で確認できます。開発者プレイを終了すると通常速度へ戻ります。

通常プレイでは従来どおり最大2倍速で、AUTOと3倍速は使用できません。



## コンピュータ戦

メインメニューの「コンピュータ戦」では、プレイヤー1人 + CPU3人の4人戦を行います。

- プレイヤーが「ボタンを押す」たび、残り回数があるCPUも同じタイミングで1部屋進みます。
- プレイヤーの残り回数が0になった後、CPUに残り回数があれば3秒ごとに1部屋ずつ進みます。
- CPUはアイテムを獲得・使用します。
- CPUごとに「運気 / 残り回数 / 階数 / お金+アイテム / バランス」の5方針から1つが内部でランダム選択されます。方針はプレイヤーには表示されません。
- 順位報酬は 1位 +3、2位 +1、3位 -1、4位 -2 トロフィーです。
- 同階の場合は運気、その次に所持金で順位を決定します。

トロフィーは毎週月曜日 0:00 (JST) に0へリセットされます。前週の最終トロフィーは総合トロフィーランキングの自己ベスト候補として保存されます。トロフィーランキングはメインメニューではなく「コンピュータ戦」内の「ランキング」タブにあり、「週間 / 総合」を切り替えられます。「対戦する」タブの下部には現在のトロフィー数を表示します。
