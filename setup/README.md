# Infinite Elevator セットアップ / 起動手順

## 依存関係のインストール（Bash）

このプロジェクトは **Node.js / npm** を使います。以下は Bash / zsh 系ターミナルで、そのまま上から実行できるセットアップ手順です。

### 0-1. Node.js 20 と npm を用意する

Ubuntu / Debian 系で `curl` や `git` がまだ入っていない場合は、先に次を実行します。

```bash
sudo apt update
sudo apt install -y curl git
```

すでに Node.js 20 以上が入っている場合は、この項目を飛ばして構いません。まず確認します。

```bash
node -v
npm -v
```

Node.js が入っていない、または古い場合は `nvm` を使って Node.js 20 を入れます。

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
```

`nvm` を現在のシェルへ読み込みます。

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

Node.js 20 をインストールして使用します。

```bash
nvm install 20
nvm use 20
```

npm 10 系へ更新する場合は次を実行します。

```bash
npm install -g npm@10
```

最後に確認します。

```bash
node -v
npm -v
```

### 0-2. アプリに必要なパッケージを一括インストールする

プロジェクトのルート（`package.json` がある場所）へ移動して実行します。

```bash
cd /path/to/infinite-elevator
npm install
```

通常は **この `npm install` だけでアプリに必要なパッケージがすべて入ります**。`package.json` に登録されている本番用・開発用依存関係をまとめて `node_modules/` にインストールします。

### 0-3. 個別に入れ直す場合のコマンド

`package.json` を作り直した場合など、依存関係を個別に登録する必要がある場合は次を実行します。通常のセットアップでは不要です。

```bash
npm install next@14.2.31 react@18.3.1 react-dom@18.3.1 firebase@^12.3.0 @chakra-ui/react@^2.10.9 @emotion/react@^11.14.0 @emotion/styled@^11.14.0 framer-motion@^11.18.2 react-icons@^5.5.0
```

開発用の TypeScript と型定義は次です。

```bash
npm install -D typescript@^5.8.3 @types/node@^22.15.3 @types/react@^18.3.20 @types/react-dom@^18.3.6
```

### 0-4. Firebase CLI を使う場合

Firestore のルールをコマンドから反映する場合だけ必要です。

```bash
npm install -g firebase-tools
```

インストール確認:

```bash
firebase --version
```

Firebaseへログインする場合:

```bash
firebase login
```

### 0-5. 依存関係を完全に入れ直す場合

インストール状態がおかしい場合は `node_modules` を削除して再インストールします。

```bash
rm -rf node_modules
npm install
```

`package-lock.json` が存在する環境で、ロックされたバージョンを完全に入れ直したい場合は次の方法も使えます。

```bash
rm -rf node_modules
npm ci
```

> `npm ci` は `package-lock.json` が存在する場合に使用してください。この配布ZIPに `package-lock.json` がない場合は `npm install` を使用します。

---

## 1. ローカル起動

上の「依存関係のインストール」が完了したら、プロジェクトのルートで実行します。

```bash
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


## ランク戦ランキング用 Firestore Rules

ランク戦では次のコレクションを使用します。

```text
trophyRankingsWeekly/{weekKey}/entries/{playerId}
trophyRankingsAlltime/{playerId}
```

このプロジェクト同梱の `firestore.rules` には上記コレクション用ルールも含まれています。Firebase CLI を使う場合は、プロジェクトルートで次を実行して反映してください。

```bash
firebase login
firebase use --add
firebase deploy --only firestore:rules
```

ルールを反映しない場合、トロフィーランキングの読み書きが `permission-denied` になることがあります。
