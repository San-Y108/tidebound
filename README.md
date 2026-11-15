# 余潮 · 逐浪牌组 v0.4

木筏空间构筑与单人 Roguelike 牌组的可玩版本。你用牌下令，木筏上的设备和邻接决定结果。

双击 **余潮.html** 即可离线游玩。开发试玩入口为 http://127.0.0.1:5174/ 。

## 核心玩法

- 3×3 木筏起步，一格一建筑，整备阶段免费重排，花木材扩建至最大 5×5。
- 18 种永久建筑、40 种原创指令、6 件遗物，炮击、壁垒与异变可以分别成长或混搭。
- 每回合抽 5 张、3 点指令；按敌人预告决定输出、格挡、装填与连锁，随后结束回合。
- 战后选牌可以跳过，商店可以删牌，礁湾可在升级与修复中二选一。
- 三幕共 24 个主线节点；击败每幕霸主后可继续航行，第 24 节点可结算或进入无尽深海。没有七日硬截止。

详细机制、流派和具体出牌例子见 [DESIGN.md](DESIGN.md)。全部指令与建筑数值见 [CARD-CATALOG.md](CARD-CATALOG.md)。

## 操作

「建造」打开建筑舱，选择工程图后点空船板部署。点击船上建筑，再点击空格可移动，或者收回建筑舱。「航线」选择当前可达节点；「牌组」查看永久牌组和全部指令图鉴。战斗中点击手牌出牌，点击「结束回合」结算设备与敌人行动。空格可出航或结束回合，Esc 收起面板，? 打开玩法。

所有航程保存在当前浏览器的 `tidebound.spire.v4` 存档中。刷新后可以继续当前战斗，抽牌堆状态会保留。卡牌版使用独立存档。

## 开发与检查

```sh
npm ci
npm run dev -- --port 5174
npm test
npm run build
npm run test:browser
npm run test:visual
```

构建生成 `dist/` 和自包含的 `余潮.html`。浏览器测试需要 Google Chrome，并先运行开发服务；可用 `GAME_URL` 指向离线文件，`OFFLINE=1` 验证无网运行，`SCREENSHOT_DIR` 指定截图目录。

## 实现

- `src/rules.js`：整备、建筑联动、回合顺序、成长、商店、事件、奖励和存档。
- `src/cards.js`：数据驱动卡牌与统一效果解释器、五个牌区、种子洗牌、费用、升级、连锁上限。
- `src/buildings.js`：18 种设备和 6 件遗物。
- `src/voyage.js`：三路航线、8 节点一幕、意图和持续远征。
- `src/main.js`、`src/spire.css`：手牌、牌库、工程图、奖励、航图、商店与升级操作。
- `src/sea.js`、`src/art.js`、`src/water.js`：Phaser 等距场景、已生成美术与动态水面，所有资源内联进入离线文件。

按 [awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills) 的 `router`、`phaser-core` 与 `card-game` 方法推进；牌区守恒、非法操作原子性、确定性洗牌和真实浏览器试玩是验收重点。参考《杀戮尖塔》的局内构筑原则，卡牌、设备与海域名称和效果为本项目原创。原有美术的来源与生成提示词保留在 `assets/`。

## 小组协作

请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。使用独立功能分支和 Pull Request 合入，main 的推送及 PR 会自动检查规则测试与构建。浏览器试玩仍需在目标设备上进行。


### 上传时的已知测试状态

构建通过；规则测试 36 项中 29 项通过、7 项失败。详细输出见 [TEST-BASELINE.txt](TEST-BASELINE.txt)。这些失败作为当前协作基线保留，CI 会如实显示失败，不应将本版本视为全部测试通过。

## 在线试玩

公开试玩地址：https://san-y108.github.io/tidebound/

每次向 main 推送后，Deploy playable game 工作流会构建并更新 GitHub Pages。网页版存档保存在每位玩家自己的浏览器，不共享本机存档。
