# Infinite Elevator セットアップ / 起動手順

## 依存関係

このアプリは **Next.js / React / TypeScript** で構成されています。Python の `requirements.txt` ではなく、実際の依存関係はプロジェクト直下の `package.json` で管理します。`requirement.txt` は人が確認しやすい一覧です。

### 必要な実行環境

- Node.js 20.x 以上推奨
- npm 10.x 以上推奨
- Git（GitHub Pagesへ公開する場合）
- Firebaseプロジェクト（ランキング・2人対戦を使う場合のみ）

バージョン確認:

```bash
node -v
npm -v
```

### アプリ本体の依存パッケージ

| パッケージ | バージョン | 主な用途 |
| --- | --- | --- |
| `next` | `14.2.31` | Next.js本体・ルーティング・ビルド |
| `react` | `18.3.1` | UI描画 |
| `react-dom` | `18.3.1` | ブラウザDOMへのReact描画 |
| `@chakra-ui/react` | `^2.10.9` | UIコンポーネント |
| `@emotion/react` | `^11.14.0` | Chakra UIのスタイル基盤 |
| `@emotion/styled` | `^11.14.0` | スタイル付きコンポーネント |
| `framer-motion` | `^11.18.2` | アニメーション |
| `react-icons` | `^5.5.0` | アイコン |
| `firebase` | `^12.3.0` | Firestore・匿名認証など |

### 開発時の依存パッケージ

| パッケージ | バージョン | 主な用途 |
| --- | --- | --- |
| `typescript` | `^5.8.3` | TypeScriptコンパイル・型チェック |
| `@types/node` | `^22.15.3` | Node.js型定義 |
| `@types/react` | `^18.3.20` | React型定義 |
| `@types/react-dom` | `^18.3.6` | React DOM型定義 |

### 依存関係のインストール

プロジェクト直下で次を実行します。

```bash
npm install
```

`npm install` は `package.json` を読み、必要なライブラリを `node_modules/` にインストールします。`node_modules/` は容量が大きく環境ごとに再生成できるため、ZIPやGitへ含める必要はありません。

依存関係を入れ直したい場合:

```bash
rm -rf node_modules
npm install
```

Windows PowerShellの場合:

```powershell
Remove-Item -Recurse -Force node_modules
npm install
```

依存関係の詳細一覧は、プロジェクト直下の `requirement.txt` と `package.json` も参照してください。

---

## 1. ローカル起動

プロジェクトのルートで実行します。

```bash
npm install
npm run dev
```

ブラウザで次を開きます。

```text
http://localhost:3000
```

Firebase を設定しなくてもゲーム本体は起動できます。

## 2. Firebase を使う場合

### Firebase側

1. Firebase Console でプロジェクトを作成します。
2. Webアプリを追加します。
3. Authentication → Sign-in method で **Anonymous** を有効にします。
4. Cloud Firestore を作成します。
5. このリポジトリの `firestore.rules` を Firestore Rules に反映します。

Firebase CLI を使う場合は、プロジェクト設定後に次でも反映できます。

```bash
firebase deploy --only firestore:rules
```

### ローカル環境変数

`.env.example` を `.env.local` にコピーします。

```bash
cp .env.example .env.local
```

`.env.local` に Firebase Web App の値を設定します。

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

設定後、開発サーバーを再起動してください。

```bash
npm run dev
```

## 3. 本番ビルド確認

```bash
npm run build
```

このプロジェクトは `output: 'export'` を使うため、成功すると静的サイトが `out/` に生成されます。

## 4. GitHub Pages へ公開

### GitHubへpush

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_NAME/YOUR_REPOSITORY.git
git push -u origin main
```

### Pagesを有効化

GitHubリポジトリで次を設定します。

```text
Settings
  → Pages
  → Build and deployment
  → Source: GitHub Actions
```

### Firebase環境変数をGitHub Actionsへ渡す場合

次を開きます。

```text
Settings
  → Secrets and variables
  → Actions
  → Variables
  → New repository variable
```

以下の6個を Repository Variables として登録します。

```text
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

`main` へ push すると `Deploy Next.js to GitHub Pages` ワークフローが自動実行されます。

## 5. 更新時の基本手順

```bash
npm install
npm run dev
npm run build
git add .
git commit -m "Update app"
git push origin main
```

## トラブルシューティング

### `npm run dev` が起動しない

まず依存関係がインストール済みか確認してください。

```bash
npm install
```

その後、Node.js / npm のバージョンを確認してください。

```bash
node -v
npm -v
```

Node.js 20 を推奨します。

### Firebaseランキングがオンラインにならない

`.env.local` の6項目、Anonymous Authentication、Firestore作成済みかを確認してください。環境変数を変更した場合は開発サーバーを再起動します。

### GitHub Pagesで画像や音声が404になる

GitHub Actions 経由でビルドしてください。`next.config.mjs` が Actions 環境でリポジトリ名を検出し、GitHub Pages用の `basePath` を設定します。

### GitHub PagesのActionsが失敗する

Actionsログの `Install dependencies` と `Build static site` を確認してください。Firebaseを使わない場合、Firebase用Repository Variablesは空でもゲーム本体はビルド可能です。
