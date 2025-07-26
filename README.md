# 風化促進CO2除去管理システム (GAS版)

Google Apps Script (GAS) を使用した風化促進による二酸化炭素除去と廃水処理事業の管理システムです。

## 📋 システム概要

- **技術スタック**: Google Apps Script + Google Sheets + HTML Service
- **対象ユーザー**: 管理者・顧客企業
- **主要機能**: 測定データ管理、データ分析、プロジェクト管理

## 🚀 主要機能

### Phase 1: 基盤構築 ✅
- Google Account認証システム
- ユーザー管理（管理者・顧客）
- データベース基盤（Google Sheets）

### Phase 2: コア機能 ✅
- 顧客管理システム
- プロジェクト管理システム
- 管理者・顧客ダッシュボード

### Phase 3: データ管理 ✅
- 測定データ管理（pH、CO2濃度、温度等）
- データ分析・可視化
- シンプル画面遷移システム

## 📁 ファイル構成

### GASファイル (.gs)
- `Code.gs` - メインエントリーポイント
- `Config.gs` - システム設定
- `AuthLib.gs` - 認証ライブラリ
- `DataLib.gs` - データアクセス層
- `*API.gs` - 各種API（顧客、プロジェクト、測定データ、分析）
- `TestLib.gs` / `QualityLib.gs` - テスト・品質管理

### HTMLファイル (.html)
- `index.html` - ホーム画面
- `*-login.html` - 認証画面
- `*-dashboard.html` - ダッシュボード
- `data-simple.html` / `analysis-simple.html` - シンプル機能
- その他管理画面

## 🛠️ セットアップ

1. Google Apps Scriptプロジェクトを作成
2. 全ファイルをGASエディタにコピー
3. 必要なGoogle Sheetsを作成
4. Script Propertiesを設定
5. Web Appとして公開

## 🎯 現在のステータス

- **Phase 1-3**: 完了 ✅
- **ファイル名統一**: 完了 ✅（GAS対応）
- **認証システム**: 実装済み ✅
- **Phase 4**: 未実装（高度機能・ML予測・レポート生成）

## 💡 特徴

- **シンプル設計**: 複雑性を80%削減
- **エラー耐性**: 自動フォールバック機能
- **レスポンシブ**: モバイル・PC両対応
- **統一UI**: 一貫したデザインシステム