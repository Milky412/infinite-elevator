# Infinite Elevator セットアップ / 起動手順

## 必要なもの

- Node.js 20 推奨
- npm
- Git（GitHubへ公開する場合）
- Firebaseプロジェクト（オンラインランキング・2人対戦を使う場合のみ）

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

Node.js のバージョンを確認してください。

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
