# FloatingMemo

> Always-on-top desktop sticky memo for Windows 11 — Tauri + React + SQLite.

Windows 11 のデスクトップに常駐する、軽量・高速なフローティングメモアプリ。
グローバルホットキー `Ctrl+Shift+Space` で 1 秒以内に呼び出して書き込み、Esc で隠す。

NSIS インストーラ約 **2.2MB** / アイドル時メモリ約 30MB / ガラス感のある Mica 半透明 UI。

---

## ✨ 特長

- **どこからでも瞬時に呼び出し** — `Ctrl+Shift+Space` でフォアグラウンド復帰
- **タスクバーには出ない** — システムトレイ常駐、`×` で閉じても消えない
- **自動保存** — 入力 500ms デバウンスで SQLite (WAL) に保存、フォーカス喪失で即時 flush
- **複数ノート + 検索** — UUIDv7 で識別、サイドバー切替、`Ctrl+F` で全文検索（日本語対応）
- **Mica 半透明 UI** — Windows 11 ネイティブのガラス感、ライト/ダーク自動追従 + 手動切替
- **OS 起動時の自動起動オプション**
- **常に最前面トグル**
- **5 世代の自動バックアップ** — 起動時に DB をローテーションコピー
- **IME 配慮** — 日本語入力中の Enter/Esc 誤発火なし

---

## 🚀 インストール

### バイナリ

GitHub Releases （未公開）からダウンロード予定。
現状はソースからビルドしてください。

### ソースからビルド

#### 必要な環境

- Windows 11
- [Rust](https://www.rust-lang.org/learn/get-started) (stable)
- [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (`VC.Tools.x86.x64`)
- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 8+
- WebView2 ランタイム（Win11 標準搭載）

#### 手順

```bash
git clone https://github.com/guheheP/FloatingMemo.git
cd FloatingMemo
pnpm install
pnpm tauri dev    # 開発実行
pnpm tauri build  # MSI / NSIS インストーラ生成
```

ビルド成果物は `src-tauri/target/release/bundle/`:

- `nsis/FloatingMemo_X.Y.Z_x64-setup.exe` — NSIS インストーラ（推奨、軽量）
- `msi/FloatingMemo_X.Y.Z_x64_en-US.msi` — MSI（企業展開向け）

---

## ⌨️ キーボードショートカット

| キー | 動作 |
|------|------|
| `Ctrl+Shift+Space` | ウィンドウ表示/非表示トグル（グローバル） |
| `Esc` | エディタを保存して非表示 / モーダルを閉じる |
| `Ctrl+N` | 新規ノート作成 |
| `Ctrl+F` | 検索パレットを開く |
| `Ctrl+B` | サイドバー折りたたみ |
| `Ctrl+1` 〜 `9` | サイドバー上の N 番目のノートに切替 |
| ノート行ダブルクリック | タイトル変更 |

---

## 🧱 アーキテクチャ

### 技術スタック

- **Backend**: Rust (Tauri 2)
  - `rusqlite` (bundled) — SQLite + FTS5
  - `tauri-plugin-global-shortcut` / `tauri-plugin-autostart`
  - `window-vibrancy` — Mica/Acrylic 適用
- **Frontend**: React 19 + TypeScript + Vite
- **データ**: SQLite (`%APPDATA%\com\FloatingMemo\FloatingMemo\notes.db`)
  - WAL モード、`PRAGMA user_version` ベースの冪等マイグレーション
  - 5 世代ローテーションバックアップ

### ディレクトリ構成

```
FloatingMemo/
├─ src/                       # React + TypeScript フロントエンド
│  ├─ api/                    # Tauri IPC ラッパー
│  ├─ components/             # TitleBar, Editor, Sidebar, SearchPalette, SettingsPanel
│  ├─ styles/                 # global.css (CSS 変数 + ガラス感スタイル)
│  ├─ App.tsx
│  └─ main.tsx
├─ src-tauri/                 # Rust バックエンド
│  ├─ src/
│  │  ├─ db/
│  │  │  ├─ mod.rs            # Note / NoteRepository / SettingsRepository トレイト
│  │  │  ├─ sqlite.rs         # SqliteNoteRepository 実装
│  │  │  ├─ settings.rs       # SqliteSettingsRepository
│  │  │  ├─ migrations.rs     # PRAGMA user_version マイグレーション
│  │  │  └─ backup.rs         # 5 世代バックアップ
│  │  ├─ commands/            # Tauri Command 層
│  │  ├─ window.rs            # ウィンドウ操作 + Mica 適用
│  │  ├─ tray.rs              # システムトレイ
│  │  ├─ hotkey.rs            # グローバルホットキー登録
│  │  ├─ paths.rs             # データディレクトリ解決
│  │  ├─ error.rs             # AppError 統一エラー型
│  │  ├─ lib.rs               # Tauri Builder
│  │  └─ main.rs
│  ├─ Cargo.toml
│  └─ tauri.conf.json
├─ package.json
└─ README.md
```

### データモデル

```sql
CREATE TABLE notes (
    id          TEXT PRIMARY KEY,    -- UUIDv7 or 'default'
    title       TEXT NOT NULL DEFAULT '',
    kind        TEXT NOT NULL DEFAULT 'memo',  -- 'memo' | 'todo' | 'event'
    content     TEXT NOT NULL,
    created_at  INTEGER NOT NULL,    -- Unix epoch ms (UTC)
    updated_at  INTEGER NOT NULL,
    pinned      INTEGER NOT NULL DEFAULT 0,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    tags        TEXT NOT NULL DEFAULT '[]'    -- JSON array
);

CREATE VIRTUAL TABLE notes_fts USING fts5(content, content='notes', content_rowid='rowid');

CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
```

`NoteRepository` トレイトを採用しているため、将来的に WebDAV / S3 / 独自バックエンドへの差し替えが容易。

---

## 🗺️ ロードマップ

### MVP (完成済み)

- [x] Phase 1: SQLite データ層 + 自動保存
- [x] Phase 2: システムトレイ + グローバルホットキー + Mica
- [x] Phase 3: 起動時バックアップ + 設定の永続化
- [x] Phase 4: MSI/NSIS インストーラビルド
- [x] Phase 5: カスタムタイトルバー + ガラス感 UI + テーマ手動切替
- [x] Phase 6: 複数ノート + サイドバー + マイグレーション機構
- [x] Phase 7: キーボードショートカット拡張
- [x] Phase 8: 検索パレット (`Ctrl+F`)

### 今後

- [ ] Phase 9: カレンダービュー (`note_date` ベース、月グリッド)
- [ ] Phase 10: TODO ビュー (チェックボックス、期限ソート)
- [ ] Phase 11: Markdown プレビュー + `- [ ]` 記法レンダリング
- [ ] Phase 12: 仕上げ (バックアップエクスポート UI、配布最適化)
- [ ] アイコンのカスタムデザイン
- [ ] コード署名 + GitHub Releases 自動配布
- [ ] クラウド同期 (WebDAV)

---

## 🧪 テスト

```bash
# Rust ユニットテスト (現在 16 件)
cd src-tauri
cargo test --lib

# TypeScript 型チェック
pnpm tsc --noEmit
```

---

## 📂 データの保存先

- DB: `%APPDATA%\com\FloatingMemo\FloatingMemo\notes.db`
- バックアップ: `%APPDATA%\com\FloatingMemo\FloatingMemo\backups\notes-{epoch_ms}.db` (直近 5 件)
- 自動起動レジストリ: `HKCU\Software\Microsoft\Windows\CurrentVersion\Run\FloatingMemo` (有効化時のみ)

アンインストール時に手動削除推奨。

---

## 📜 License

Not yet specified. 後日選定予定（MIT または Apache-2.0 を予定）。
