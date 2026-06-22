/**
 * constants - 全局常量集中管理(Stack Miner 奇妙寻宝)
 * 严格遵循 UI_ART_STANDARDS.md + DEV_STANDARDS.md
 * - 所有魔法数字必须在此定义,场景文件禁止硬编码
 * - 仅允许基础常量、颜色、尺寸、动画时长;不允许业务逻辑
 *
 * **变更说明**(符合 UI_ART_STANDARDS V2.0 Final):
 *   - 配色改为寻宝金 + 治愈浅米色背景(原为深蓝 + 浅蓝)
 *   - 字号层级 40/28/22/18
 *   - 阴影色统一 rgba(0,0,0,0.15),offsetY 4, blur 8
 *   - 卡片 88x88,圆角 16
 *   - 背包高度 96,圆角 20
 *   - 顶部状态栏 90
 *   - 删去 daily 场景相关常量
 *   - 颜色变量集中到 COLORS,避免散落字符串
 *
 * **变更说明**(对标参考图):
 *   - 麻將卡牌:白底 + 细绿边 + 加厚底部立体阴影
 *   - 黑白线条图案统一(移除彩色 emoji)
 *   - 顶层 100% 实色 / 被压下层 0.45 alpha 发灰
 *   - 上层移除后下层自动恢复实色
 */
var constants = {
    // === 屏幕(逻辑分辨率)===
    LOGICAL_WIDTH: 750,
    LOGICAL_HEIGHT: 1334,
    MARGIN_X: 30,
    MARGIN_TOP: 60,
    MARGIN_BOTTOM: 40,

    // === 关卡 ===
    PRESET_LEVEL_COUNT: 9,         // 前 9 关固定(level 0-8)
    INFINITE_MODE_START: 9,        // 第 10 关(level 9)开始无限模式

    // === 通用尺寸 ===
    NAV_HEIGHT: 90,                // 顶部信息区高度
    BUTTON_HEIGHT: 56,
    FAB_DIAMETER: 56,
    MODAL_RADIUS: 24,
    // **变更**: 卡牌圆角增大,对标参考图扁平化白底风格
    CARD_RADIUS: 14,               // 卡牌圆角
    PILL_RADIUS: 18,
    CELL_RADIUS: 12,               // 宝物格圆角
    BACKPACK_RADIUS: 20,           // 背包圆角(规范 §12)

    // === 卡片 ===
    CARD_SIZE: 88,                 // 宝物卡片边长(规范 §11)
    CARD_GAP: 12,                  // 卡片间距
    PILL_GAP: 12,
    BUTTON_GAP: 16,
    BACKPACK_HEIGHT: 96,           // 背包区域高度(规范 §12)
    // === 麻將卡牌专属样式(对标参考图:白底+细绿边+底部立体阴影+黑白线条图案)===
    MAHJONG_BG: '#FFFFFF',          // 麻將卡牌底色(纯白)
    MAHJONG_BORDER_GREEN: '#5BC25B', // 麻將卡牌细绿边
    MAHJONG_BORDER_GREEN_BOTTOM: 'rgba(91,194,91,0.45)', // 底层淡绿边
    MAHJONG_BORDER_WIDTH: 1.5,       // 顶层细绿边线宽
    MAHJONG_BORDER_WIDTH_BOTTOM: 1,   // 底层更细绿边线宽
    MAHJONG_TOP_ALPHA: 1.0,          // 顶层 100% 实色
    MAHJONG_BOTTOM_ALPHA: 0.45,      // 被压下层透明度(变浅发灰)
    // **变更**: 底部立体阴影加厚(对标参考图)
    MAHJONG_SHADOW_TOP: {
        color: 'rgba(0,0,0,0.30)',
        blur: 10,
        offsetY: 8
    },
    MAHJONG_SHADOW_BOTTOM: {
        color: 'rgba(0,0,0,0.12)',
        blur: 4,
        offsetY: 3
    },
    // 黑白线条图案颜色
    MAHJONG_ICON_COLOR: '#2A2A2A',

    // === 动画时长(ms)===
    ANIM_FAST: 100,                // 点击反馈(规范 §9)
    ANIM_NORMAL: 200,
    ANIM_SLOW: 300,
    ANIM_MODAL: 400,
    ANIM_FLY: 250,                 // 飞入背包(规范 §13)
    ANIM_MATCH: 200,               // 三消(规范 §13)
    ANIM_VICTORY: 800,             // 通关(规范 §13)
    ANIM_FAIL: 300,                // 失败(规范 §13)
    HINT_FLASH: 2000,

    // === 层叠布局(规范 GAME_DESIGN §7 V2)===
    // 透明度递减规则(规范 §7.3)
    LAYER_ALPHA: {
        1: 1.00,   // 顶层 100%
        2: 0.85,   // 第二层 85%
        3: 0.70,   // 第三层 70%
        4: 0.55    // 第四层及以下 55%(规范 V2)
    },
    LAYER_ALPHA_MIN: 0.55,
    // 视觉偏移(每层 X/Y 偏移像素,规范 §7.5:6~12px)
    LAYER_OFFSET_X: 10,
    LAYER_OFFSET_Y: 10,
    // 遮挡阈值(规范 §7.5 V2:上层覆盖下层面积 ≥ 25% 不可点击)
    CLICK_BLOCK_RATIO: 0.25,
    // 完全遮挡阈值(被覆盖 ≥ 90% 时隐藏,但数据保留)
    HIDDEN_OVERLAP_RATIO: 0.90,
    // 卡堆占比 10~30%(规范 §7.8 / §7.10)
    PILE_RATIO_MIN: 0.10,
    PILE_RATIO_MAX: 0.30,

    // === 层叠卡片视觉(GAME_DESIGN §7)===
    // 顶层强阴影(悬浮感)
    TOP_CARD_SHADOW: { color: 'rgba(0,0,0,0.25)', blur: 12, offsetY: 6 },
    // 顶层高光 alpha
    TOP_CARD_HIGHLIGHT: 0.40,
    // 卡堆 edge 层数(规范 §7.8:卡堆 5~20 张,edge 可见 5~6 层)
    PILE_EDGE_LAYERS: 5,
    // 卡堆 edge 颜色(从里到外渐深)
    PILE_EDGE_COLORS: [
        'rgba(140,100,70,0.85)',
        'rgba(125,90,60,0.75)',
        'rgba(110,80,55,0.65)',
        'rgba(95,70,45,0.55)',
        'rgba(80,55,35,0.45)'
    ],
    // 飞入动画旋转(0~360°)
    FLY_ROTATION_DEG: 360,

    // === 品牌色(规范 UI_ART_STANDARDS §4)===
    COLORS: {
        // 主色
        BRAND: '#F5B942',          // 寻宝金(主按钮/重点信息/奖励)
        BRAND_DARK: '#D89A2A',
        // 辅助色
        BLUE: '#5AA9FF',           // 宝石蓝(关卡信息/辅助按钮)
        BLUE_DARK: '#3D8FDC',
        // 成功色
        SUCCESS: '#42C96F',
        SUCCESS_DARK: '#2DA856',
        // 失败色
        DANGER: '#FF6B6B',
        DANGER_DARK: '#E04F4F',
        // 中性
        WHITE: '#FFFFFF',
        TEXT_TITLE: '#333333',     // 标题
        TEXT_BODY: '#555555',      // 正文
        TEXT_HINT: '#888888',      // 辅助说明
        BG_TOP: '#FFF7E7',         // 页面背景顶
        BG_BOTTOM: '#FCEBC5',      // 页面背景底
        SHADOW: 'rgba(0,0,0,0.15)',// 阴影色(规范 §11)
        MODAL_MASK: 'rgba(50,40,20,0.45)',
        BUTTON_DISABLED: '#D4C8B8',
        BUTTON_DISABLED_TEXT: '#A89882'
    },

    // === 阴影(规范 §11:0 4 8)===
    SHADOW_CARD:   { color: 'rgba(0,0,0,0.15)', blur: 8,  offsetY: 4 },
    SHADOW_BUTTON: { color: 'rgba(0,0,0,0.18)', blur: 8,  offsetY: 4 },
    SHADOW_FAB:    { color: 'rgba(0,0,0,0.15)', blur: 8,  offsetY: 2 },
    SHADOW_MODAL:  { color: 'rgba(0,0,0,0.25)', blur: 16, offsetY: 8 },

    // === 字号(规范 §5)===
    FONT_SIZE_TITLE: 40,            // 页面标题
    FONT_SIZE_SECTION: 28,         // 区域标题
    FONT_SIZE_BODY: 22,            // 普通文字
    FONT_SIZE_HINT: 18,            // 辅助说明

    // === 宝物(规范 §3:10 种;现有 15 种扩展)===
    TREASURE_NONE: 0,
    TREASURE_TYPE_COUNT: 15,

    // === 背包(规范 §4)===
    BACKPACK_CAPACITY: 7,
    MATCH_COUNT: 3,

    // === 性能上限(规范 §19)===
    MAX_PARTICLES: 100,
    MAX_BACKGROUND_PARTICLES: 20,
    MAX_CELEBRATION_PARTICLES: 40,
    MAX_BURST_PARTICLES: 20,
    MAX_FLY_PARTICLES: 12,
    MAX_ANIMATIONS: 50,

    // === 触摸 ===
    TOUCH_THROTTLE_MS: 50,          // 50ms 节流(规范 §11)

    // === 存档 Key(规范 §12)===
    SAVE_KEY: 'stack_miner_save',

    // === 场景枚举 ===
    SCENE_HOME: 'home',
    SCENE_GAME: 'game',

    // === 弹窗枚举 ===
    MODAL_NONE: null,
    MODAL_WIN: 'win',
    MODAL_FAIL: 'fail'
};

// 兼容旧字段引用(灰度迁移)
constants.COLOR_BRAND = constants.COLORS.BRAND;
constants.COLOR_BRAND_DARK = constants.COLORS.BRAND_DARK;
constants.COLOR_MINT = constants.COLORS.SUCCESS;
constants.COLOR_PINK = '#FF7EB6';
constants.COLOR_BLUE = constants.COLORS.BLUE;
constants.COLOR_PURPLE = '#B07CD0';
constants.COLOR_GOLD = constants.COLORS.BRAND;
constants.COLOR_HEART = constants.COLORS.DANGER;
constants.COLOR_WHITE = constants.COLORS.WHITE;
constants.COLOR_TEXT_TITLE = constants.COLORS.TEXT_TITLE;
constants.COLOR_TEXT_BODY = constants.COLORS.TEXT_BODY;
constants.COLOR_TEXT_SUB = constants.COLORS.TEXT_HINT;
constants.COLOR_TEXT_HINT = constants.COLORS.TEXT_HINT;
constants.COLOR_TEXT_WEAK = '#CCCCCC';
constants.COLOR_BG_LIGHT_TOP = constants.COLORS.BG_TOP;
constants.COLOR_BG_LIGHT_BOTTOM = constants.COLORS.BG_BOTTOM;
constants.COLOR_CARD_LIGHT = constants.COLORS.WHITE;
constants.COLOR_CELL_BG = constants.COLORS.WHITE;
constants.COLOR_MODAL_MASK = constants.COLORS.MODAL_MASK;
constants.BACKPACK_RADIUS_NUM = constants.BACKPACK_RADIUS;
constants.PILL_HEIGHT = 32;
constants.CELL_SIZE = constants.CARD_SIZE;
constants.BACKPACK_RADIUS = constants.BACKPACK_RADIUS;
constants.NAVBAR_HEIGHT = constants.NAV_HEIGHT;
constants.CARD_RADIUS_VAL = constants.CARD_RADIUS;
// 兼容旧阴影字段(指向加厚版顶部阴影)
constants.TOP_CARD_BORDER = constants.MAHJONG_BORDER_GREEN;
constants.TOP_CARD_BORDER_WIDTH = constants.MAHJONG_BORDER_WIDTH;
constants.BOTTOM_CARD_BORDER = constants.MAHJONG_BORDER_GREEN_BOTTOM;
constants.BOTTOM_CARD_BORDER_WIDTH = constants.MAHJONG_BORDER_WIDTH_BOTTOM;
constants.BOTTOM_CARD_SHADOW = constants.MAHJONG_SHADOW_BOTTOM;
constants.BOTTOM_CARD_HIGHLIGHT = 0;
constants.MAIJONG_TOP_ALPHA = constants.MAHJONG_TOP_ALPHA;

module.exports = constants;