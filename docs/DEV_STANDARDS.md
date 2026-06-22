# DEV_STANDARDS.md

# 奇妙寻宝（Stack Miner）开发规范 V2

> 本文件定义项目工程结构、编码规范、模块职责、性能要求及 AI 开发约束。
>
> AI 在生成任何代码前，必须完整阅读：
>
> 1. AI_DEV_PROMPT.md
> 2. GAME_DESIGN.md
> 3. UI_ART_STANDARDS.md
> 4. DEV_STANDARDS.md

---

# 1. 项目定位

## 1.1 项目类型

轻量级叠层三消小游戏

参考产品：

* 羊了个羊
* Match Triple
* Tile Master

核心玩法：

点击可见宝物

↓

进入背包

↓

三个相同自动消除

↓

清空全部宝物

↓

通关

---

# 2. 技术栈

## 2.1 目标平台

首发平台：

* 微信小游戏

兼容平台：

* 抖音小游戏
* H5 Web

---

## 2.2 技术要求

必须：

* Canvas 2D
* ES5
* require
* module.exports

禁止：

* React
* Vue
* Phaser
* Pixi
* Cocos
* Three.js
* npm运行时依赖

---

# 3. 项目目录结构

StackMiner/

├── game.js
├── game.json

├── audio/
├── images/

├── data/
│
├── levels.js
└── assets.js

├── utils/
│
├── constants.js
├── storage.js
├── audio.js
├── drawing.js
├── animations.js
├── particles.js
├── validator.js
├── board.js
├── backpack.js
├── level-generator.js
├── treasures.js
├── ui.js
│
└── scenes/
├── home.js
├── game.js
└── modal.js

└── docs/

---

# 4. 模块职责

## constants.js

职责：

* 全局常量
* 颜色配置
* 尺寸配置

仅允许：

LOGICAL_WIDTH

LOGICAL_HEIGHT

CARD_WIDTH

CARD_HEIGHT

BACKPACK_SIZE

MAX_PARTICLES

COLORS

禁止：

* 业务逻辑
* 状态数据

---

## storage.js

职责：

* 初始化存档
* 读取存档
* 写入存档
* 存档升级

暴露：

init()

load()

save()

reset()

---

## audio.js

职责：

* 音效加载
* 播放
* 停止
* 静音

禁止：

* 业务逻辑

---

## board.js

职责：

* 矿区数据管理
* 卡片状态管理
* 可见性管理
* 遮挡管理

---

## backpack.js

职责：

* 背包管理
* 三消检测
* 自动消除
* 失败检测

---

## validator.js

职责：

* 校验关卡
* 检测死局
* 检测可通关性

---

## level-generator.js

职责：

* 随机关卡生成
* 叠层布局生成
* 难度控制

---

## scenes/

每个场景仅允许导出：

render()

handleTouch()

禁止：

* 存档逻辑
* 复杂业务逻辑

---

# 5. 命名规范

## 文件命名

统一：

小写

示例：

board.js

backpack.js

storage.js

禁止：

Board.js

BoardManager.js

board_manager.js

---

## 变量命名

统一：

camelCase

示例：

cardWidth

visibleCards

backpackSlots

---

## 常量命名

统一：

UPPER_SNAKE_CASE

示例：

MAX_PARTICLES

CARD_WIDTH

BACKPACK_SIZE

---

## 布尔变量

统一：

isVisible

isBlocked

isMatched

isAnimating

---

# 6. 数据结构规范

## 卡片结构

{
id: 1,

```
type: 'coin',

layer: 0,

x: 100,
y: 200,

visible: true,

removed: false,

selected: false
```

}

禁止超过两层嵌套。

---

## 背包结构

{
slots: [],

```
maxSize: 7
```

}

---

# 7. 层级规则

## 可点击条件

必须同时满足：

visible === true

removed === false

---

## 遮挡规则

上层卡片覆盖面积 ≥25%

则：

下层卡片不可点击

---

## 层级顺序

Layer 5

Layer 4

Layer 3

Layer 2

Layer 1

Layer 0

渲染：

从底到顶

点击检测：

从顶到底

---

# 8. 背包规则

## 容量

固定：

7格

禁止修改

---

## 添加流程

点击

↓

飞入动画

↓

进入背包

↓

检测三消

↓

执行消除

---

## 三消规则

数量 ≥3

立即触发消除

禁止延迟触发

---

## 失败规则

当：

背包数量 ≥7

且

不存在三消组合

立即失败

---

# 9. 动画规范

## 点击反馈

缩放：

100%

↓

95%

↓

100%

时长：

100ms

---

## 飞入背包

时长：

250ms

---

## 三消爆炸

时长：

300ms

---

## 通关动画

时长：

800ms

包含：

* 粒子
* 彩带
* 胜利音效

---

# 10. Canvas规范

## 渲染顺序

背景

↓

粒子

↓

矿区

↓

背包

↓

按钮

↓

弹窗

↓

特效

---

## 文本规范

统一：

ctx.textAlign = 'center'

ctx.textBaseline = 'middle'

---

## 圆角矩形

必须使用：

UI.roundRect()

禁止重复实现

---

# 11. 触摸规范

## 支持手势

仅支持：

* 单击

禁止：

* 双击
* 长按
* 拖拽
* 缩放

---

## 节流

统一：

50ms

---

## 点击优先级

弹窗

↓

顶部按钮

↓

底部按钮

↓

背包

↓

矿区

---

# 12. 存档规范

## KEY

stack_miner_save

---

## 数据结构

{
currentLevel: 1,

```
unlockedLevel: 1,

bestLevels: {},

totalPlays: 0,

tutorialCompleted: false,

settings: {
    music: false,
    sound: true,
    vibration: true
},

schemaVersion: 2
```

}

---

# 13. 性能规范

## 帧率

目标：

60 FPS

最低：

30 FPS

---

## 粒子数量

最大：

100

---

## 动画数量

最大：

50

---

## 启动时间

目标：

3秒以内

---

# 14. 日志规范

统一：

console.log('[Board]', msg)

console.log('[Backpack]', msg)

console.log('[Game]', msg)

禁止：

console.log('123')

console.log('test')

---

# 15. AI编码强约束

生成代码前必须确认：

已阅读 AI_DEV_PROMPT.md

已阅读 GAME_DESIGN.md

已阅读 UI_ART_STANDARDS.md

已阅读 DEV_STANDARDS.md

---

AI禁止：

* 引入第三方库
* 修改目录结构
* 修改存档字段
* 修改背包容量
* 修改三消规则
* 修改层级规则
* 使用ES6 Class
* 使用import/export
* 使用async/await

---

AI必须：

* 使用ES5
* 使用Canvas
* 使用require
* 使用module.exports
* 使用JSDoc注释
* 使用单引号
* 使用4空格缩进
* 完整错误处理
* 完整存档兼容
* 完整触摸映射

---

# 16. 发布检查

## 功能

□ 首页正常

□ 游戏正常

□ 通关正常

□ 失败正常

□ 解锁正常

□ 重开正常

---

## 存档

□ 自动读取

□ 自动保存

□ 设置保存

---

## 动画

□ 飞入动画

□ 三消动画

□ 通关动画

---

## 性能

□ FPS ≥30

□ 无明显掉帧

□ 内存正常

---

## 文档

□ AI_DEV_PROMPT.md

□ GAME_DESIGN.md

□ UI_ART_STANDARDS.md

□ DEV_STANDARDS.md

保持同步更新

---

# END