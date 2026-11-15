# 小组协作

## 本地启动

安装 Node.js 22.20 或更新版本，然后：

```sh
npm ci
npm run dev -- --port 5174
```

在浏览器访问 http://127.0.0.1:5174/ 。`node_modules` 不入库，请勿依赖作者电脑上的依赖软链接。

## 提交修改

从最新 main 创建分支，例如 `feature/building-combos`、`fix/mobile-layout`，完成后提 Pull Request。PR 中说明改了什么、如何试玩、测试结果；界面改动附上桌面和手机截图。涉及玩法时更新 DESIGN.md，涉及指令数值时更新 CARD-CATALOG.md。

提交前执行：

```sh
npm test
npm run build
```

涉及交互或画面时，启动开发服务器，在安装了 Google Chrome 的环境中执行浏览器测试。先查看 tests/ 中的脚本及其 GAME_URL 配置，确保指向本地服务。自动化测试不能替代真人平衡性试玩。

## 建议分工

- 规则与平衡：src/rules.js、cards.js、buildings.js、voyage.js。
- 界面与交互：src/main.js 与 CSS；保持默认主界面简洁，细节按需展开。
- 场景与美术：src/sea.js、water.js、art.js、assets/；保留生成提示词和素材来源。
- 测试：tests/；尤其关注牌区守恒、非法操作不改状态、相同种子可复现。

不要提交账号凭证、浏览器存档或个人配置。不要无故覆盖其他成员的改动。大改动先开 Issue 对齐范围。
