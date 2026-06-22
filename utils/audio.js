/**
 * audio - 音频管理
 * 负责 SFX / BGM 的加载与播放,所有平台 API 包裹 try/catch
 *
 * 调用约定:
 *   - 业务层只能通过 key 调用:click / correct / special / error / victory / fail
 *   - 实际路径以 data/assets.js 为准,victory 因实际文件命名例外,此处单独映射
 *   - 音量遵循 GAME_DESIGN.md:BGM 0.5,SFX 1.0
 *   - 失败/静音/资源缺失一律静默,不阻塞游戏
 */
var ASSETS = require('../data/assets.js');

var SaveSystem = null; // 延迟注入,避免循环依赖
var _hasWxAudio = (typeof wx !== 'undefined') && !!wx.createInnerAudioContext;

/** key -> 资源路径(victory 命名例外,单独指向 _0.mp3) */
var SFX_PATHS = {
    click: ASSETS.sfxClick,
    correct: ASSETS.sfxCorrect,
    special: ASSETS.sfxSpecial,
    error: ASSETS.sfxError,
    victory: 'audio/sfx_victory_0.mp3',
    fail: ASSETS.sfxFail
};

/** SFX 音量 */
var SFX_VOLUME = 1.0;
/** BGM 音量(GAME_DESIGN.md 要求) */
var BGM_VOLUME = 0.5;

var AudioManager = {
    _sounds: {},
    _bgm: null,
    _bgmPlaying: false,
    _ready: false,

    /**
     * 初始化(预加载所有 SFX + 准备 BGM)
     * 资源加载失败不抛错,仅静默
     */
    init: function () {
        if (this._ready) return;
        var self = this;
        var keys = ['click', 'correct', 'special', 'error', 'victory', 'fail'];
        for (var i = 0; i < keys.length; i++) {
            self._sounds[keys[i]] = self._createSound(SFX_PATHS[keys[i]], SFX_VOLUME, false);
        }
        self._bgm = self._createSound(ASSETS.bgmMain, BGM_VOLUME, true);
        self._ready = true;
    },

    /**
     * 创建一个音频上下文
     * @param {string} src 资源路径
     * @param {number} volume 音量 0~1
     * @param {boolean} loop 是否循环(BGM 用)
     * @returns {Object|null}
     */
    _createSound: function (src, volume, loop) {
        if (!_hasWxAudio) return null;
        var ctx = null;
        try {
            ctx = wx.createInnerAudioContext();
            ctx.src = src;
            ctx.obeyMuteSwitch = false; // 不跟随系统静音
            ctx.volume = volume;
            ctx.loop = !!loop;
            // onError 静默:不阻塞游戏
            ctx.onError(function (err) {
                try { console.warn('[Audio] 加载失败:', src, err && err.errMsg); } catch (e) { /* ignore */ }
            });
        } catch (e) {
            ctx = null;
        }
        return ctx;
    },

    /**
     * 播放一次性 SFX
     * 同名连播时先 stop 再 play,避免叠加
     * @param {string} name click / correct / special / error / victory / fail
     */
    play: function (name) {
        if (SaveSystem && !SaveSystem.getSetting('sound')) return;
        var sound = this._sounds[name];
        if (!sound) return;
        try {
            sound.stop();
            // 某些平台 stop 后立即 play 会丢音,延迟 10ms 启动
            setTimeout(function () {
                try { sound.play(); } catch (e2) { /* 静默 */ }
            }, 10);
        } catch (e) { /* 静默 */ }
    },

    /**
     * 播放 BGM(循环)
     * 默认关闭,需玩家在设置中开启
     */
    playBgm: function () {
        if (SaveSystem && !SaveSystem.getSetting('music')) return;
        if (this._bgmPlaying) return;
        if (!this._bgm) return;
        try {
            this._bgm.stop();
            this._bgm.play();
            this._bgmPlaying = true;
        } catch (e) { /* 静默 */ }
    },

    /**
     * 停止 BGM
     */
    stopBgm: function () {
        if (!this._bgm) return;
        try {
            this._bgm.stop();
        } catch (e) { /* 静默 */ }
        this._bgmPlaying = false;
    },

    /**
     * 切换 BGM 状态(开关)
     */
    toggleBgm: function () {
        if (this._bgmPlaying) {
            this.stopBgm();
        } else {
            this.playBgm();
        }
    },

    /**
     * 短震动(挖掘成功/失败等)
     */
    vibrate: function () {
        if (SaveSystem && !SaveSystem.getSetting('vibration')) return;
        try {
            if (typeof wx !== 'undefined' && wx.vibrateShort) {
                wx.vibrateShort({ success: function () { } });
            }
        } catch (e) { /* 静默 */ }
    }
};

module.exports = {
    AudioManager: AudioManager,
    setSaveSystem: function (s) { SaveSystem = s; }
};
