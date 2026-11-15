# 《余潮》X 开源画面参考（2026-11-15）

研究方法：通过 `agent-reach twitter search`，后端 `opencli`，实际读取推文正文与媒体元数据；再通过 `agent-reach github read/search` 验证仓库、README 和许可证。以下未把 `has_media`、视频 URL 或封面 URL 当作实际观看视频的证据。本次未解码/播放推文视频，视觉建议是从 README 技术特征推导的设计建议。

| 作品 | X 来源 | 作者/项目身份 | 开源依据 | 对《余潮》的适用点 |
|---|---|---|---|---|
| Godot Water Shader | https://x.com/LesusX/status/1890836315043713352 | LesusX，作者发布 | https://github.com/LesusX/Water-Shader ，MIT；README 有 Gerstner、深度颜色、泡沫、波峰高光 | 深海与浅色浪沫分层；船边接触泡沫；高光保持方向统一，降低海面噪声以突出建筑 |
| NVJOB Simple Water Shaders | https://x.com/nvjob/status/1207038737420562433 | nvjob / Nicholas Veselov，作者发布 | https://github.com/nvjob/nvjob-water-shader-simple-and-fast ，MIT | 多层不同方向的小波纹；低成本法线/视差思路；当前 2D 版本可用慢速不规则高光和漂移尾迹表达，不必上重型水面模拟 |
| IsoCity | https://x.com/TokenGremlin/status/2088808231904637348 | TokenGremlin 的介绍；项目作者 amilich（X 中为 milichab） | https://github.com/amilich/isometric-city ，MIT；短链 https://t.co/uj9cgVQFZd 已解析到该库 | 带透明通道的完整建筑精灵、等距格子、深度排序、清晰图层和触屏控件；最贴近《余潮》的素材落地方式 |
| ABYSSAL | https://x.com/TokenGremlin/status/2093462768271716749 | TokenGremlin，作者正式开源；该正文也由搜索结果的 quoted_tweet 返回 | https://github.com/Token-Gremlin/natural-disasters ，MIT | 统一夕照和冷色海面；泡沫有积累/消退；按设备分级效果。只提炼视觉规律，不把整套 FFT/体积云搬进 Phaser |
| WaterThreeJS | https://x.com/chirovisuals/status/2080314576122388677 | chirovisuals 发布；仓库 owner achrefelouafi，短链确认 | https://github.com/achrefelouafi/WaterThreeJS ，MIT；短链 https://t.co/v99HuZSOoG 已解析到该库 | 船体轻微起伏和倾斜、接触水花与顺流尾迹；泡沫边缘柔化；光照/反射色温同源；叠加接触阴影，避免木筏悬浮 |

## 可运行入口（README/短链确认，未运行）

- IsoCity：https://iso-city.com
- NVJOB：https://nvjob.github.io/web-demo/nvjob-simple-water-shaders/
- ABYSSAL：https://token-gremlin.github.io/natural-disasters/

## 排除与边界

- SenFineco 有已发布 GitHub 的真实推文 https://x.com/senfinecogames/status/1730933629411291491 ，但这轮尚未核实具体仓库，未列入已验证参考。
- `will open source`、只声称可能未来公开代码、或纯 AI 工作流展示，没有仓库证据的不当作开源作品。
- 并非五个都是完整游戏；IsoCity 是可玩建造游戏，其他四个是开源海洋/水面渲染示例。对当前美术目标，这样的组合比泛找五个海洋游戏更准确。
- 未下载或复用第三方美术，也未复制 shader。当前素材应继续记录为项目自己的 AI 生成素材。
