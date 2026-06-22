/**
 * constants - 全局常量集中管理(Stack Miner 奇妙寻宝)
 * 严格遵循 UI_ART_STANDARDS.md + DEV_STANDARDS.md
 * - 所有魔法数字必须在此定义,场景文件禁止硬编码
 * - 仅允许基础常量、颜色、尺寸、动画时长;不允许业务逻辑
 *
 * **变更说明**(符合 UI_ART_STANDARDS V2.0 Final):
 *   - 配色改为寻宝金 + 治愈浅米色背景
 *   - 字号层级 40/28/22/18
 *   - 阴影色统一 rgba(0,0,0,0.15),offsetY 4, blur 8
 *   - 卡片 88x88,圆角 16
 *   - 背包高度 96,圆角 20
 *   - 顶部状态栏 90
 *   - 颜色变量集中到 COLORS,避免散落字符串
 *
 * **变更说明**(UI 优化提示词 V2):
 *   - 新增按钮规格常量:BUTTON_WIDTH/BUTTON_HEIGHT/ROUND_RADIUS
 *   - 新增弹窗按钮间距 MODAL_BUTTON_GAP
 *   - 新增背景纹理色 BG_TEXTURE
 *   - 新增可点击高亮描边色 CLICKABLE_HIGHLIGHT(寻宝金)
 *   - 新增不可点击降亮参数 DIM_ALPHA
 *   - 新增层级透明度规则(layer→alpha)
 *   - 新增缓动函数名(EASE_OUT_QUAD)
 *   - 新增震屏时长 FAIL_SHAKE_MS
 *   - 新增背包满闪烁间隔 BACKPACK_FLASH_MS
 *   - 新增解锁反馈时长 UNLOCK_FLASH_MS
 *   - 新增悬浮上浮量 HOVER_LIFT_PX
 *   - 新增胜利/失败弹窗配色胜利绿/失败红
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
    BUTTON_HEIGHT: 64,             // **变更**: 56→64(底部操作按钮规格)
    BUTTON_WIDTH: 280,             // **新增**: 底部操作按钮宽度
    BUTTON_RADIUS: 32,             // **新增**: 按钮圆角(规范)
    BUTTON_GAP: 20,                // **变更**: 16→20(按钮间距≥20)
    MODAL_BUTTON_GAP: 30,          // **新增**: 弹窗按钮间距
    FAB_DIAMETER: 56,
    MODAL_RADIUS: 24,
    CARD_RADIUS: 16,               // **变更**: 14→16(规范要求卡片圆角16)
    PILL_RADIUS: 18,
    CELL_RADIUS: 16,               // **变更**: 12→16(与卡片一致)
    BACKPACK_RADIUS: 20,           // 背包圆角(规范 §12)

    // === 卡片 ===
    CARD_SIZE: 88,                 // 宝物卡片边长(规范 §11)
    CARD_GAP: 12,                  // 卡片间距
    PILL_GAP: 12,
    BACKPACK_HEIGHT: 96,           // 背包区域高度(规范 §12)
    BACKPACK_CONTAINER_RADIUS: 20, // **新增**: 背包容器圆角

    // === 麻將卡牌专属样式(对标参考图:白底+细绿边+底部立体阴影)===
    MAHJONG_BG: '#FFFFFF',          // 麻將卡牌底色(纯白)
    MAHJONG_BORDER_GREEN: '#5BC25B', // 麻將卡牌细绿边
    MAHJONG_BORDER_GREEN_BOTTOM: 'rgba(91,194,91,0.45)', // 底层淡绿边
    MAHJONG_BORDER_WIDTH: 1.5,       // 顶层细绿边线宽
    MAHJONG_BORDER_WIDTH_BOTTOM: 1,   // 底层更细绿边线宽
    MAHJONG_TOP_ALPHA: 1.0,          // 顶层 100% 实色
    MAHJONG_BOTTOM_ALPHA: 0.70,      // **变更**: 0.45→0.70(不可点击降亮30%,规范要求)

    // **变更**: 底部立体阴影加厚
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
    MAHJONG_ICON_COLOR: '#2A2A2A',

    // === 动画时长(ms)===
    ANIM_FAST: 120,                // **变更**: 100→120(规范点击反馈120ms)
    ANIM_NORMAL: 200,
    ANIM_SLOW: 300,
    ANIM_MODAL: 400,
    ANIM_FLY: 250,                 // 飞入背包(规范 §13)
    ANIM_MATCH: 200,               // 三消(规范 §13)
    ANIM_VICTORY: 800,             // 通关(规范 §13)
    ANIM_FAIL: 300,                // 失败(规范 §13)
    ANIM_UNLOCK_FLASH: 150,        // **新增**: 解锁闪烁反馈 150ms
    ANIM_FAIL_SHAKE_MS: 300,       // **新增**: 失败震屏 300ms
    ANIM_BACKPACK_FLASH_MS: 400,   // **新增**: 背包满闪烁周期
    ANIM_PILE_FADE_IN: 100,        // **新增**: 卡堆顶牌淡入 100ms
    ANIM_HOVER_LIFT_PX: 2,         // **新增**: 可点击卡片悬浮上浮 2px
    HINT_FLASH: 2000,

    // === 缓动函数名(用于动画模块)===
    EASE_OUT_QUAD: 'easeOutQuad',  // **新增**: 飞入背包缓动

    // === 层叠布局(规范 GAME_DESIGN §7 V2)===
    // 透明度递减规则(规范 §7.3) - 按 layer 区分
    LAYER_ALPHA: {
        1: 1.00,   // 顶层 100%
        2: 0.85,   // 第二层 85%
        3: 0.70,   // 第三层 70%
        4: 0.55    // 第四层及以下 55%(规范 V2)
    },
    LAYER_ALPHA_MIN: 0.55,
    LAYER_OFFSET_X: 10,
    LAYER_OFFSET_Y: 10,
    CLICK_BLOCK_RATIO: 0.25,
    HIDDEN_OVERLAP_RATIO: 0.90,
    PILE_RATIO_MIN: 0.10,
    PILE_RATIO_MAX: 0.30,

    // === 层叠卡片视觉(GAME_DESIGN §7)===
    TOP_CARD_SHADOW: { color: 'rgba(0,0,0,0.25)', blur: 12, offsetY: 6 },
    TOP_CARD_HIGHLIGHT: 0.40,
    PILE_EDGE_LAYERS: 5,
    PILE_EDGE_COLORS: [
        'rgba(140,100,70,0.85)',
        'rgba(125,90,60,0.75)',
        'rgba(110,80,55,0.65)',
        'rgba(95,70,45,0.55)',
        'rgba(80,55,35,0.45)'
    ],
    FLY_ROTATION_DEG: 360,
    // **新增**: 可点击卡片高亮描边色 + 描边宽度
    CLICKABLE_BORDER_COLOR: '#F5B942',   // 寻宝金
    CLICKABLE_BORDER_WIDTH: 2.5,         // 高亮描边宽度
    CLICKABLE_GLOW_ALPHA: 0.35,          // 高亮光晕透明度
    // **新增**: 不可点击降亮参数(规范:降低亮度30%)
    DIM_ALPHA: 0.70,

    // === 品牌色(规范 UI_ART_STANDARDS §4)===
    COLORS: {
        BRAND: '#F5B942',          // 寻宝金(主按钮/重点信息/奖励)
        BRAND_DARK: '#D89A2A',
        BLUE: '#5AA9FF',           // 宝石蓝(关卡信息/辅助按钮)
        BLUE_DARK: '#3D8FDC',
        SUCCESS: '#42C96F',        // 成功绿(三消/胜利)
        SUCCESS_DARK: '#2DA856',
        DANGER: '#FF6B6B',         // 失败红(危险提示/失败弹窗)
        DANGER_DARK: '#E04F4F',
        WHITE: '#FFFFFF',
        TEXT_TITLE: '#333333',     // 标题
        TEXT_BODY: '#555555',      // 正文
        TEXT_HINT: '#888888',      // 辅助说明
        BG_TOP: '#FFF7E7',         // 页面背景顶
        BG_BOTTOM: '#FCEBC5',      // 页面背景底
        BG_TEXTURE: 'rgba(220,180,120,0.10)', // **新增**: 低透明度藏宝图纹理
        SHADOW: 'rgba(0,0,0,0.15)',// 阴影色(规范 §11)
        MODAL_MASK: 'rgba(50,40,20,0.45)',
        MODAL_WIN_GRADIENT_TOP: '#42C96F',   // **新增**: 胜利弹窗主色(成功绿)
        MODAL_WIN_GRADIENT_MID: '#7FE5A0',
        MODAL_WIN_GRADIENT_BOTTOM: '#2DA856',
        MODAL_FAIL_GRADIENT_TOP: '#FF6B6B',  // **新增**: 失败弹窗主色(失败红)
        MODAL_FAIL_GRADIENT_MID: '#FFB0B0',
        MODAL_FAIL_GRADIENT_BOTTOM: '#E04F4F',
        MODAL_BTN_TEXT: '#FFFFFF',
        BACKPACK_BG: '#FFFFFF',
        BUTTON_DISABLED: '#D4C8B8',
        BUTTON_DISABLED_TEXT: '#A89882',
        CARD_STROKE: '#333333',    // **新增**: 数字描边色(1px 提升辨识度)
        // 顶部信息区色
        NAV_LEVEL_TEXT: '#333333', // 数字主色
        NAV_LEVEL_SUBTEXT: '#888888', // 辅助色
        // 按钮规格色
        BTN_PRIMARY_BG: '#F5B942',
        BTN_PRIMARY_TEXT: '#FFFFFF',
        BTN_SECONDARY_BG: '#FFFFFF',
        BTN_SECONDARY_TEXT: '#5AA9FF',
        BTN_SECONDARY_STROKE: '#5AA9FF'
    },

    // === 阴影(规范 §11:0 4 8)===
    SHADOW_CARD:   { color: 'rgba(0,0,0,0.15)', blur: 8,  offsetY: 4 },
    SHADOW_BUTTON: { color: 'rgba(0,0,0,0.18)', blur: 8,  offsetY: 4 },
    SHADOW_FAB:    { color: 'rgba(0,0,0,0.15)', blur: 8,  offsetY: 2 },
    SHADOW_MODAL:  { color: 'rgba(0,0,0,0.25)', blur: 16, offsetY: 8 },
    SHADOW_NAV:    { color: 'rgba(0,0,0,0.08)', blur: 4,  offsetY: 2 }, // **新增**: 顶部信息区阴影
    SHADOW_BACKPACK_CONTAINER: { color: 'rgba(0,0,0,0.12)', blur: 6, offsetY: 3 }, // **新增**

    // === 字号(规范 §5)===
    FONT_SIZE_TITLE: 40,            // 页面标题
    FONT_SIZE_SECTION: 28,         // 区域标题
    FONT_SIZE_BODY: 22,            // 普通文字
    FONT_SIZE_HINT: 18,            // 辅助说明
    FONT_SIZE_NAV_VALUE: 28,       // **新增**: 顶部信息区数字
    FONT_SIZE_NAV_LABEL: 14,       // **新增**: 顶部信息区标签

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
    MAX_VICTORY_PARTICLES: 50,    // **新增**: 胜利彩带/金币/星星粒子上限
    MAX_MATCH_PARTICLES: 12,      // **新增**: 三消绿色粒子上限

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
    MODAL_FAIL: 'fail',

    // === 顶层信息区三栏(规范 §9)===
    NAV_SECTION_GAP: 16,           // **新增**: 三栏间距
    NAV_VALUE_GAP: 4,              // **新增**: 数字与标签间距

    // === 弹窗相关(规范 §14)===
    MODAL_WIDTH_WIN: 480,           // 胜利弹窗宽
    MODAL_HEIGHT_WIN: 400,
    MODAL_WIDTH_FAIL: 420,          // 失败弹窗宽
    MODAL_HEIGHT_FAIL: 360,
    MODAL_HEADER_HEIGHT: 110,
    MODAL_HEADER_HEIGHT_FAIL: 90,
    MODAL_BTN_HEIGHT: 64,           // 弹窗按钮高(规范按钮规格)
    MODAL_BTN_WIDTH: 180,           // 弹窗按钮宽(2 按钮 + 间距后适配 480 宽)
    MODAL_BTN_FONT: 'bold 28px sans-serif',  // 规范文字 28px bold

    // === 背景纹理(藏宝图)===
    BG_TEXTURE_PATTERN_SIZE: 64,   // **新增**: 纹理图块大小
    BG_TEXTURE_LINE_COLOR: 'rgba(200,160,100,0.12)', // **新增**: 纹理线条色
    BG_TEXTURE_DOT_COLOR: 'rgba(180,140,80,0.10)',    // **新增**: 纹理点缀色

    // === 隐藏升级字段(寻宝金纹理)===
    NAV_GOLD_TINT: 'rgba(245,185,66,0.10)' // **新增**: 顶部信息区轻微金币纹理背景
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