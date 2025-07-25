# 部署到 GitHub Pages 指南

## 步驟 1: 建立 GitHub 存儲庫

1. 登入您的 GitHub 帳戶
2. 點擊右上角的 "+" 號，選擇 "New repository"
3. 存儲庫名稱設為 `my-gemini-pdf-app`
4. 確保存儲庫為 Public
5. 不要勾選 "Initialize this repository with a README"
6. 點擊 "Create repository"

## 步驟 2: 初始化本地 Git 存儲庫並推送代碼

在您的專案目錄中執行以下命令（請替換 YOUR_USERNAME 為您的 GitHub 用戶名）：

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/my-gemini-pdf-app.git
git push -u origin main
```

## 步驟 3: 設定 Gemini API Key

1. 在 GitHub 存儲庫頁面，點擊 "Settings" 標籤
2. 在左側選單中選擇 "Secrets and variables" > "Actions"
3. 點擊 "New repository secret"
4. 名稱設為 `GEMINI_API_KEY`
5. 值設為您的 Gemini API 金鑰
6. 點擊 "Add secret"

## 步驟 4: 啟用 GitHub Pages

1. 在存儲庫設定中，向下滾動到 "Pages" 部分
2. 在 "Source" 下拉選單中選擇 "GitHub Actions"
3. 系統會自動檢測到您的 workflow 檔案

## 步驟 5: 等待部署完成

1. 前往 "Actions" 標籤查看部署狀態
2. 部署完成後，您的應用程式將可在以下網址訪問：
   `https://YOUR_USERNAME.github.io/my-gemini-pdf-app/`

## 自動部署

每當您推送更新到 `main` 分支時，GitHub Actions 會自動重新部署您的應用程式。

## 手動部署（替代方案）

如果您偏好手動部署，可以使用以下命令：

```bash
npm install
npm run deploy
```

這會使用 gh-pages 套件直接部署到 GitHub Pages。
