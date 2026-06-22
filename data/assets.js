/**
 * assets - 资源索引表(Stack Miner 奇妙寻宝)
 * 命名遵循 DEV_STANDARDS.md §8.3:{prefix}_{category}_{name}_{index}.{ext}
 * 业务代码只能 import 索引里的 key,不许硬编码路径
 */
var ASSETS = {
    // ===== UI 图标(emoji 替代,系统自带)=====
    iconHome: '🏠',
    iconSettings: '⚙',
    iconHelp: '❓',
    iconAchievement: '🏆',
    iconClose: '✕',
    iconCheck: '✓',
    iconArrow: '→',
    iconLock: '🔒',
    iconPlay: '▶',
    iconRetry: '🔄',
    iconWin: '🎉',
    iconLose: '💔',
    iconFire: '🔥',
    iconSparkle: '✨',
    iconBack: '↩',

    // ===== 宝物(emoji 替代)=====
    // 7 种宝物:铜币/银币/金币/宝箱/陶罐/皇冠/钻石
    // 详情参考 utils/treasures.js
    treasureCoin: '🪙',         // 铜币/银币
    treasureGold: '🟡',          // 金币
    treasureChest: '📦',         // 宝箱
    treasurePot: '🏺',           // 陶罐
    treasureCrown: '👑',         // 皇冠
    treasureDiamond: '💎',       // 钻石

    // ===== 音频(参考实际文件)=====
    sfxClick: 'audio/sfx_click_01.mp3',
    sfxCorrect: 'audio/sfx_correct_01.mp3',
    sfxSpecial: 'audio/sfx_special_01.mp3',
    sfxError: 'audio/sfx_error_01.mp3',
    sfxFail: 'audio/sfx_fail_01.mp3',
    bgmMain: 'audio/bgm_main_01.mp3'
};

module.exports = ASSETS;
