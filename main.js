const {
    app,
    BrowserWindow,
    Menu,
    Tray,
    Notification,
    shell,
    dialog,
    globalShortcut,
    ipcMain,
    crashReporter,
    clipboard,
    safeStorage
} = require('electron');
const electronLocalshortcut = require('electron-localshortcut');
const qIsOnline = require('qiao-is-online');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

let autoUpdater;
try {
    ({ autoUpdater } = require('electron-updater'));
} catch (error) {
    autoUpdater = null;
}

let tray;
let mainWindow;
let settingsWindow;
let aboutWindow;
let logsWindow;
let notificationsWindow;
let downloadsWindow;
let onboardingWindow;
let healthWindow;
let announcementWindow;
let updateWindow;
let quickActionsWindow;
let feedbackWindow;
let remoteConfigWindow;
let licenseWindow;
let releaseNotesWindow;
let safeModeWindow;
let networkTimer;
let reportTimer;
let loadWatchdogTimer;
let isQuitting = false;
let wasOnline = true;
let lastOnlineAt = null;
let hasActiveDownload = false;
let updateAvailable = false;
let currentShortcut = null;
let downloadSeq = 0;
let pageStatus = 'loading';
let safeModeReason = '';
let pageLoadStartedAt = Date.now();
let appStartedAt = Date.now();
const loadMetrics = [];

const DEFAULT_APP_NAME = 'WebShell Desktop';
let APP_NAME = getArgValue('--name') || process.env.APP_NAME || DEFAULT_APP_NAME;
app.setName(APP_NAME);
const DEFAULT_URLS = {
    prod: 'https://ai.boxrom.com/',
    test: 'https://ai.boxrom.com/',
    dev: 'https://ai.boxrom.com/'
};
const ICON_PATH = path.join(__dirname, 'favicon.png');
const PRELOAD_PATH = path.join(__dirname, 'preload.js');
const LOADING_PAGE_PATH = path.join(__dirname, 'loading.html');
const ERROR_PAGE_PATH = path.join(__dirname, 'offline.html');
const ABOUT_PAGE_PATH = path.join(__dirname, 'about.html');
const SETTINGS_PAGE_PATH = path.join(__dirname, 'settings.html');
const LOGS_PAGE_PATH = path.join(__dirname, 'logs.html');
const NOTIFICATIONS_PAGE_PATH = path.join(__dirname, 'notifications.html');
const DOWNLOADS_PAGE_PATH = path.join(__dirname, 'downloads.html');
const ONBOARDING_PAGE_PATH = path.join(__dirname, 'onboarding.html');
const HEALTH_PAGE_PATH = path.join(__dirname, 'health.html');
const ANNOUNCEMENT_PAGE_PATH = path.join(__dirname, 'announcement.html');
const UPDATE_PAGE_PATH = path.join(__dirname, 'update.html');
const QUICK_ACTIONS_PAGE_PATH = path.join(__dirname, 'quick-actions.html');
const FEEDBACK_PAGE_PATH = path.join(__dirname, 'feedback.html');
const REMOTE_CONFIG_PAGE_PATH = path.join(__dirname, 'remote-config.html');
const LICENSE_PAGE_PATH = path.join(__dirname, 'license.html');
const RELEASE_NOTES_PAGE_PATH = path.join(__dirname, 'release-notes.html');
const MAINTENANCE_PAGE_PATH = path.join(__dirname, 'maintenance.html');
const SAFE_MODE_PAGE_PATH = path.join(__dirname, 'safe-mode.html');
const DEFAULT_LICENSE_PATH = path.join(__dirname, 'default.license');
const USER_DATA = app.getPath('userData');
const SETTINGS_PATH = path.join(USER_DATA, 'settings.json');
const WINDOW_STATE_PATH = path.join(USER_DATA, 'window-state.json');
const CLOSE_TIP_PATH = path.join(USER_DATA, 'close-tip-shown');
const ONBOARDING_DONE_PATH = path.join(USER_DATA, 'onboarding-done');
const LAST_CRASH_PATH = path.join(USER_DATA, 'last-crash.json');
const ANNOUNCEMENT_READ_PATH = path.join(USER_DATA, 'announcement-read.json');
const DEVICE_STATE_PATH = path.join(USER_DATA, 'device-state.json');
const LOCAL_LICENSE_PATH = path.join(USER_DATA, 'local-license.json');
const REMOTE_CONFIG_CACHE_PATH = path.join(USER_DATA, 'remote-config-cache.json');
const REMOTE_CONFIG_BACKUP_PATH = path.join(USER_DATA, 'remote-config-backup.json');
const REMOTE_COMMANDS_PATH = path.join(USER_DATA, 'remote-commands.json');
const LICENSE_REMINDERS_PATH = path.join(USER_DATA, 'license-reminders.json');
const REMOTE_CONFIG_AUDIT_PATH = path.join(USER_DATA, 'remote-config-audit.log');
const COMMAND_RECEIPTS_PATH = path.join(USER_DATA, 'command-receipts.log');
const LICENSE_STATUS_REPORT_PATH = path.join(USER_DATA, 'license-status-report.log');
const STARTUP_STATE_PATH = path.join(USER_DATA, 'startup-state.json');
const MANIFEST_PATH = path.join(__dirname, 'manifest.json');
const DIAGNOSTICS_DIR = path.join(USER_DATA, 'diagnostics');
const LOG_PATH = path.join(USER_DATA, 'app.log');
const MAX_LOG_SIZE = 5 * 1024 * 1024;
const NETWORK_CHECK_INTERVAL = 10000;
const LOAD_WATCHDOG_TIMEOUT = 30000;
const TRUSTED_PUBLIC_KEY = process.env.APP_TRUSTED_PUBLIC_KEY || '';
const REQUIRE_SIGNATURE = process.env.APP_REQUIRE_SIGNATURE === 'true';
const DEFAULT_SETTINGS = {
    env: 'prod',
    appName: '',
    urls: DEFAULT_URLS,
    appUrl: '',
    allowedOrigins: [],
    startMinimized: false,
    closeBehavior: 'tray',
    shortcut: 'CommandOrControl+Alt+A',
    alwaysOnTop: false,
    autoLaunch: false,
    muted: false,
    zoomFactor: 1,
    allowDevTools: false,
    downloadCompleteAction: 'notify',
    permissions: ['notifications'],
    logLevel: 'info',
    remoteConfigUrl: '',
    remoteConfigEnabled: false,
    licenseKey: '',
    licenseExpiresAt: '',
    licenseServerUrl: '',
    licenseOfflineGraceDays: 7,
    rolloutGroup: 'stable',
    updateChannel: 'stable'
};
const DEFAULT_REMOTE_FEATURES = {
    downloads: true,
    diagnostics: true,
    notifications: true,
    health: true,
    quickActions: true,
    feedback: true,
    updates: true,
    logs: true,
    settings: true,
    trayMaintenance: true,
    announcement: true,
    autoRepairPrompt: true
};
const notifications = [];
const downloads = [];
const permissionEvents = [];
const updateState = {
    status: 'idle',
    version: '',
    percent: 0,
    message: '尚未检查更新',
    error: ''
};
let remoteConfig = null;
let remoteConfigMeta = safeReadJson(REMOTE_CONFIG_CACHE_PATH, null)?.meta || { source: 'none', syncedAt: null, error: '' };
let licenseServerState = null;
let deviceState = loadDeviceState();
let localLicense = loadLocalLicense();
let settings = loadSettings();
applyAppName();
let lastLicenseRequestPath = '';

function remoteFeatures() {
    const baseFeatures = {
        ...DEFAULT_REMOTE_FEATURES,
        ...(remoteConfig?.features && typeof remoteConfig.features === 'object' ? remoteConfig.features : {})
    };
    const licenseFeatures = effectiveLicenseFeatures();

    if (matchesRollout(remoteConfig?.rollout)) {
        return {
            ...baseFeatures,
            ...(remoteConfig?.rollout?.features && typeof remoteConfig.rollout.features === 'object' ? remoteConfig.rollout.features : {}),
            ...licenseFeatures
        };
    }

    return {
        ...baseFeatures,
        ...(remoteConfig?.rollout?.disabledFeatures && typeof remoteConfig.rollout.disabledFeatures === 'object' ? remoteConfig.rollout.disabledFeatures : {}),
        ...licenseFeatures
    };
}

function isFeatureEnabled(name) {
    return remoteFeatures()[name] !== false;
}

function effectiveLicenseFeatures() {
    if (!localLicense?.features || typeof localLicense.features !== 'object') return {};
    const now = Date.now();
    const expiresAt = localLicense.expiresAt || localLicense.licenseExpiresAt || '';
    const notBefore = localLicense.notBefore || '';
    if (notBefore && new Date(notBefore).getTime() > now) return {};
    if (expiresAt && new Date(expiresAt).getTime() < now) return {};
    if (localLicense.minAppVersion && compareVersions(app.getVersion(), localLicense.minAppVersion) < 0) return {};
    if (localLicense.maxAppVersion && compareVersions(app.getVersion(), localLicense.maxAppVersion) > 0) return {};
    return localLicense.features;
}

function featureDisabledMessage(name) {
    const text = `功能已被远程配置关闭：${name}`;
    writeLog('warn', text);
    dialog.showMessageBox(mainWindow || undefined, {
        type: 'info',
        buttons: ['确定'],
        message: text
    }).catch(error => log('Show feature disabled message failed:', error));
    return { ok: false, reason: text };
}

function requireFeature(name, work) {
    if (!isFeatureEnabled(name)) return featureDisabledMessage(name);
    return work();
}

function safeReadJson(filePath, fallback) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        return fallback;
    }
}

function safeWriteJson(filePath, value) {
    try {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
    } catch (error) {
        console.error(`Write json failed: ${filePath}`, error);
    }
}

function stableStringify(value) {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    if (value && typeof value === 'object') {
        return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
    }
    return JSON.stringify(value);
}

function verifySignedPayload(envelope, label) {
    if (!envelope?.payload || !envelope?.signature) {
        if (REQUIRE_SIGNATURE) return { ok: false, reason: `${label} 缺少签名` };
        return { ok: true, payload: envelope };
    }
    if (!TRUSTED_PUBLIC_KEY) {
        if (REQUIRE_SIGNATURE) return { ok: false, reason: `${label} 已启用强制签名但未配置公钥` };
        console.warn(`${label} has signature but APP_TRUSTED_PUBLIC_KEY is not configured; signature skipped`);
        return { ok: true, payload: envelope.payload };
    }

    try {
        const verifier = crypto.createVerify('RSA-SHA256');
        verifier.update(stableStringify(envelope.payload));
        verifier.end();
        const ok = verifier.verify(TRUSTED_PUBLIC_KEY.replace(/\\n/g, '\n'), envelope.signature, 'base64');
        if (!ok) return { ok: false, reason: `${label} 签名校验失败` };
        return { ok: true, payload: envelope.payload };
    } catch (error) {
        return { ok: false, reason: `${label} 签名校验异常：${error.message || error}` };
    }
}

function redactValue(key, value) {
    if (/licenseKey|signature|token|password|secret/i.test(key)) return value ? '***REDACTED***' : value;
    if (typeof value === 'string') return value.replace(/[?&](token|key|secret|password)=[^&]+/gi, '$1=***REDACTED***');
    return value;
}

function redactObject(value) {
    if (Array.isArray(value)) return value.map(redactObject);
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redactObject(redactValue(key, item))]));
    }
    return value;
}

function appendJsonLine(filePath, value) {
    try {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.appendFileSync(filePath, `${JSON.stringify({ time: new Date().toISOString(), ...value })}\n`);
    } catch (error) {
        console.error(`Append log failed: ${filePath}`, error);
    }
}

function auditRemoteConfig(event, detail = {}) {
    appendJsonLine(REMOTE_CONFIG_AUDIT_PATH, { event, ...redactObject(detail) });
}

function readJsonLines(filePath, limit = 50) {
    if (!fs.existsSync(filePath)) return [];
    return fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean).slice(-limit).map(line => {
        try { return JSON.parse(line); } catch (error) { return { raw: line }; }
    });
}

function sha256File(filePath) {
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function checkIntegrity() {
    const manifest = safeReadJson(MANIFEST_PATH, null);
    if (!manifest?.files) return { ok: true, skipped: true, reason: '未找到 manifest.json' };
    const changed = [];
    Object.entries(manifest.files).forEach(([relativePath, expected]) => {
        const filePath = path.join(__dirname, relativePath);
        if (!fs.existsSync(filePath)) changed.push({ file: relativePath, reason: 'missing' });
        else {
            const actual = sha256File(filePath);
            if (actual !== expected) changed.push({ file: relativePath, expected, actual });
        }
    });
    if (changed.length) {
        safeModeReason = `完整性检测失败：${changed.map(item => item.file).join(', ')}`;
        writeLog('error', safeModeReason);
        return { ok: false, changed };
    }
    return { ok: true, changed: [] };
}

function markStartupSuccess() {
    safeWriteJson(STARTUP_STATE_PATH, { failures: 0, lastSuccessAt: new Date().toISOString() });
}

function recordStartupAttempt() {
    const state = safeReadJson(STARTUP_STATE_PATH, { failures: 0 });
    state.failures = (state.failures || 0) + 1;
    state.lastAttemptAt = new Date().toISOString();
    safeWriteJson(STARTUP_STATE_PATH, state);
    if (state.failures >= 3) safeModeReason = `连续启动失败 ${state.failures} 次`;
}

function encryptLicenseKey(value) {
    if (!value || !safeStorage?.isEncryptionAvailable?.()) return value;
    return `enc:${safeStorage.encryptString(value).toString('base64')}`;
}

function decryptLicenseKey(value) {
    if (!value || typeof value !== 'string' || !value.startsWith('enc:')) return value;
    try {
        return safeStorage.decryptString(Buffer.from(value.slice(4), 'base64'));
    } catch (error) {
        log('Decrypt license key failed:', error);
        return '';
    }
}

function simpleHash(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    return Math.abs(hash);
}

function loadDeviceState() {
    const existing = safeReadJson(DEVICE_STATE_PATH, null);
    if (existing?.deviceId) return existing;

    const state = {
        deviceId: `${process.platform}-${os.hostname()}-${simpleHash(os.userInfo().username + USER_DATA)}`,
        deviceName: os.hostname(),
        firstSeenAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString()
    };
    safeWriteJson(DEVICE_STATE_PATH, state);
    return state;
}

function updateDeviceState(extra = {}) {
    deviceState = {
        ...deviceState,
        deviceName: os.hostname(),
        lastSeenAt: new Date().toISOString(),
        appVersion: app.getVersion(),
        platform: process.platform,
        arch: process.arch,
        ...extra
    };
    safeWriteJson(DEVICE_STATE_PATH, deviceState);
    return deviceState;
}

function rolloutBucket() {
    return simpleHash(deviceState.deviceId) % 100;
}

function matchesVersionRange(range = {}) {
    if (range.min && compareVersions(app.getVersion(), range.min) < 0) return false;
    if (range.max && compareVersions(app.getVersion(), range.max) > 0) return false;
    return true;
}

function matchesRollout(rollout = {}) {
    if (!rollout || typeof rollout !== 'object') return true;
    const percentage = Number.isFinite(Number(rollout.percentage)) ? Number(rollout.percentage) : 100;
    const groups = Array.isArray(rollout.groups) ? rollout.groups : [];
    const platforms = Array.isArray(rollout.platforms) ? rollout.platforms : [];

    if (groups.length && !groups.includes(settings.rolloutGroup)) return false;
    if (platforms.length && !platforms.includes(process.platform)) return false;
    if (rollout.versions && !matchesVersionRange(rollout.versions)) return false;
    return rolloutBucket() < Math.max(0, Math.min(100, percentage));
}

function readAnnouncementState() {
    return safeReadJson(ANNOUNCEMENT_READ_PATH, { readIds: [] });
}

function announcementId(announcement) {
    return announcement?.id || `${announcement?.version || app.getVersion()}-${simpleHash(`${announcement?.title || ''}${announcement?.body || ''}`)}`;
}

function shouldShowAnnouncement(announcement) {
    if (!announcement || !isFeatureEnabled('announcement')) return false;
    if (announcement.force) return true;
    const state = readAnnouncementState();
    return !state.readIds.includes(announcementId(announcement));
}

function markAnnouncementRead(id) {
    if (!id) return;
    const state = readAnnouncementState();
    if (!state.readIds.includes(id)) state.readIds.unshift(id);
    state.readIds.splice(100);
    safeWriteJson(ANNOUNCEMENT_READ_PATH, state);
}

function loadLocalLicense() {
    const value = safeReadJson(LOCAL_LICENSE_PATH, null);
    if (value?.licenseKey) value.licenseKey = decryptLicenseKey(value.licenseKey);
    return value;
}

function localLicenseStatus(applyFeatureLimits = true) {
    if (!localLicense) return { valid: false, reason: '未导入本地授权', source: 'local', deviceId: deviceState.deviceId };
    const licenseId = localLicense.licenseId || localLicense.id || '';
    const isUniversal = Boolean(localLicense.universal || localLicense.scope === 'universal');
    if (isUniversal && remoteConfig?.revokeUniversalLicense) {
        return { valid: false, reason: '通用授权已被远程一键吊销', source: 'local', ...localLicensePublicInfo() };
    }
    if (licenseId && Array.isArray(remoteConfig?.revokedLicenses) && remoteConfig.revokedLicenses.includes(licenseId)) {
        return { valid: false, reason: '本地授权已被远程撤销', source: 'local', ...localLicensePublicInfo() };
    }
    if (!isUniversal && localLicense.deviceId && localLicense.deviceId !== deviceState.deviceId) {
        return { valid: false, reason: '本地授权不属于当前设备', source: 'local', deviceId: deviceState.deviceId, licenseDeviceId: localLicense.deviceId };
    }

    const now = Date.now();
    const expiresAt = localLicense.expiresAt || localLicense.licenseExpiresAt || '';
    const notBefore = localLicense.notBefore || '';
    if (notBefore && new Date(notBefore).getTime() > now) return { valid: false, reason: '本地授权尚未生效', source: 'local', ...localLicensePublicInfo() };
    if (expiresAt && new Date(expiresAt).getTime() < now) return { valid: false, reason: '本地授权已过期', source: 'local', ...localLicensePublicInfo() };
    if (localLicense.minAppVersion && compareVersions(app.getVersion(), localLicense.minAppVersion) < 0) return { valid: false, reason: '当前版本低于授权允许版本', source: 'local', ...localLicensePublicInfo() };
    if (localLicense.maxAppVersion && compareVersions(app.getVersion(), localLicense.maxAppVersion) > 0) return { valid: false, reason: '当前版本高于授权允许版本', source: 'local', ...localLicensePublicInfo() };
    if (localLicense.channels && Array.isArray(localLicense.channels) && !localLicense.channels.includes(settings.updateChannel)) return { valid: false, reason: '当前更新渠道不在授权范围内', source: 'local', ...localLicensePublicInfo() };
    if (applyFeatureLimits && localLicense.features && typeof localLicense.features === 'object') writeLog('debug', `License feature limits active: ${JSON.stringify(localLicense.features)}`);

    const daysLeft = expiresAt ? Math.ceil((new Date(expiresAt).getTime() - now) / 86400000) : null;
    return {
        valid: true,
        reason: isUniversal ? (daysLeft !== null && daysLeft <= 7 ? '通用授权即将过期' : '通用授权有效') : (daysLeft !== null && daysLeft <= 7 ? '本地授权即将过期' : '本地授权有效'),
        source: 'local',
        daysLeft,
        ...localLicensePublicInfo()
    };
}

function localLicensePublicInfo() {
    if (!localLicense) return { deviceId: deviceState.deviceId };
    return {
        licenseId: localLicense.licenseId || localLicense.id || '',
        subject: localLicense.subject || localLicense.name || '',
        universal: Boolean(localLicense.universal || localLicense.scope === 'universal'),
        scope: localLicense.scope || (localLicense.universal ? 'universal' : 'device'),
        channel: localLicense.channel || '',
        minAppVersion: localLicense.minAppVersion || '',
        maxAppVersion: localLicense.maxAppVersion || '',
        features: localLicense.features || null,
        deviceId: deviceState.deviceId,
        licenseDeviceId: localLicense.deviceId || '',
        expiresAt: localLicense.expiresAt || localLicense.licenseExpiresAt || '',
        importedAt: localLicense.importedAt || ''
    };
}

function importLocalLicense() {
    const files = dialog.showOpenDialogSync(mainWindow || undefined, {
        title: '导入本地授权',
        filters: [{ name: '授权文件', extensions: ['json', 'license'] }],
        properties: ['openFile']
    });

    if (!files?.[0]) return localLicenseStatus();
    return importLocalLicenseFile(files[0]);
}

function importLocalLicenseFile(filePath, options = {}) {
    try {
        const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const verified = verifySignedPayload(raw, '本地授权');
        if (!verified.ok) throw new Error(verified.reason);
        const next = verified.payload;
        if (!next.licenseKey && !next.licenseId && !next.id) throw new Error('授权文件缺少 licenseKey、licenseId 或 id');
        const isUniversal = Boolean(next.universal || next.scope === 'universal');
        if (!isUniversal && next.deviceId && next.deviceId !== deviceState.deviceId) throw new Error(`授权文件绑定设备 ${next.deviceId}，当前设备 ${deviceState.deviceId}`);

        localLicense = {
            ...next,
            signatureVerified: Boolean(raw.signature),
            importedAt: new Date().toISOString(),
            importedFrom: filePath
        };
        safeWriteJson(LOCAL_LICENSE_PATH, { ...localLicense, licenseKey: encryptLicenseKey(localLicense.licenseKey) });
        if (localLicense.licenseKey) settings = saveSettings({ ...settings, licenseKey: localLicense.licenseKey, licenseExpiresAt: localLicense.expiresAt || localLicense.licenseExpiresAt || settings.licenseExpiresAt });
        if (!options.silent) addNotification('success', APP_NAME, '本地授权已导入。');
        return localLicenseStatus();
    } catch (error) {
        log('Import local license failed:', error);
        if (!options.silent) addNotification('error', APP_NAME, `本地授权导入失败：${error.message || error}`);
        return { valid: false, reason: error.message || String(error), source: 'local', deviceId: deviceState.deviceId };
    }
}

function importDefaultLicenseIfNeeded() {
    if (localLicense || !fs.existsSync(DEFAULT_LICENSE_PATH)) return;
    const result = importLocalLicenseFile(DEFAULT_LICENSE_PATH, { silent: true });
    if (result.valid) addNotification('success', APP_NAME, '已自动导入内置通用授权。', { system: false });
}

function clearUniversalLicense() {
    if (!(localLicense?.universal || localLicense?.scope === 'universal')) return localLicenseStatus();
    localLicense = null;
    removeFile(LOCAL_LICENSE_PATH);
    addNotification('success', APP_NAME, '通用授权已清除。');
    return localLicenseStatus();
}

function clearLocalLicense() {
    localLicense = null;
    removeFile(LOCAL_LICENSE_PATH);
    addNotification('success', APP_NAME, '本地授权已清除。');
    return localLicenseStatus();
}

function exportLicenseRequest() {
    const savePath = dialog.showSaveDialogSync(mainWindow || undefined, {
        title: '导出授权申请文件',
        defaultPath: path.join(app.getPath('desktop'), `license-request-${deviceState.deviceId}.json`),
        filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (!savePath) return null;

    const data = {
        appName: APP_NAME,
        appVersion: app.getVersion(),
        deviceId: deviceState.deviceId,
        deviceName: deviceState.deviceName,
        platform: process.platform,
        arch: process.arch,
        release: os.release(),
        group: settings.rolloutGroup,
        requestedAt: new Date().toISOString()
    };
    fs.writeFileSync(savePath, JSON.stringify(data, null, 2));
    lastLicenseRequestPath = savePath;
    addNotification('success', APP_NAME, '授权申请文件已导出。');
    shell.showItemInFolder(savePath);
    return savePath;
}

function copyDeviceId() {
    clipboard.writeText(deviceState.deviceId);
    addNotification('success', APP_NAME, '设备 ID 已复制。', { system: false });
    return deviceState.deviceId;
}

function copyLicenseStatus() {
    const text = JSON.stringify(getLicenseCenterInfo(), null, 2);
    clipboard.writeText(text);
    addNotification('success', APP_NAME, '授权状态已复制。', { system: false });
    return text;
}

function openLocalLicenseFolder() {
    if (fs.existsSync(LOCAL_LICENSE_PATH)) shell.showItemInFolder(LOCAL_LICENSE_PATH);
    else shell.openPath(USER_DATA);
}

function openLicenseRequestFolder() {
    if (lastLicenseRequestPath && fs.existsSync(lastLicenseRequestPath)) shell.showItemInFolder(lastLicenseRequestPath);
    else shell.openPath(app.getPath('desktop'));
}

function getArgValue(name) {
    const prefix = `${name}=`;
    const arg = process.argv.find(item => item.startsWith(prefix));
    return arg ? arg.slice(prefix.length) : null;
}

function mergeSettings(value) {
    return {
        ...DEFAULT_SETTINGS,
        ...value,
        urls: { ...DEFAULT_SETTINGS.urls, ...(value?.urls || {}) },
        allowedOrigins: Array.isArray(value?.allowedOrigins) ? value.allowedOrigins : [],
        permissions: Array.isArray(value?.permissions) ? value.permissions : DEFAULT_SETTINGS.permissions
    };
}

function loadSettings() {
    try {
        return mergeSettings(JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8')));
    } catch (error) {
        return mergeSettings(null);
    }
}

function saveSettings(nextSettings) {
    settings = mergeSettings(nextSettings);
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
    applyAppName();
    app.setLoginItemSettings({ openAtLogin: settings.autoLaunch, path: process.execPath });
    if (autoUpdater) autoUpdater.channel = settings.updateChannel || 'stable';
    applyRuntimeSettings();
    updateTrayMenu();
    sendToAllLocalWindows('settings-updated', settings);
    return settings;
}

function currentAppUrl() {
    return getArgValue('--url') || process.env.APP_URL || settings.appUrl || settings.urls[getArgValue('--env') || process.env.APP_ENV || settings.env] || settings.urls.prod;
}

function currentAppName() {
    return getArgValue('--name') || process.env.APP_NAME || settings.appName || DEFAULT_APP_NAME;
}

function applyAppName() {
    APP_NAME = currentAppName();
    app.setName(APP_NAME);
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setTitle(APP_NAME);
    updateTrayMenu();
}

function appOrigin() {
    return new URL(currentAppUrl()).origin;
}

function allowedOrigins() {
    return new Set([appOrigin(), ...settings.allowedOrigins.filter(Boolean)]);
}

function log(message, error) {
    rotateLogIfNeeded();
    const detail = error ? ` ${error.stack || error.message || error}` : '';
    const text = `[${new Date().toISOString()}] ${message}${detail}\n`;

    try {
        fs.appendFileSync(LOG_PATH, text);
    } catch (writeError) {
        console.error('Write log failed:', writeError);
    }

    if (error) console.error(message, error);
    else console.log(message);
}

function shouldLog(level) {
    const order = { error: 0, warn: 1, info: 2, debug: 3 };
    return order[level] <= order[settings.logLevel || 'info'];
}

function writeLog(level, message, error) {
    if (shouldLog(level)) log(`[${level}] ${message}`, error);
}

function rotateLogIfNeeded() {
    try {
        if (!fs.existsSync(LOG_PATH) || fs.statSync(LOG_PATH).size < MAX_LOG_SIZE) return;

        const archived = path.join(USER_DATA, `app-${Date.now()}.log`);
        fs.renameSync(LOG_PATH, archived);
    } catch (error) {
        console.error('Rotate log failed:', error);
    }
}

function addNotification(type, title, body, options = {}) {
    if (!isFeatureEnabled('notifications')) {
        writeLog('debug', `Notification suppressed by remote feature: ${title} ${body}`);
        return;
    }

    const item = {
        id: Date.now() + Math.random(),
        time: new Date().toISOString(),
        type,
        title,
        body
    };
    notifications.unshift(item);
    notifications.splice(200);
    sendToAllLocalWindows('notifications-updated', notifications);

    if (options.system !== false) {
        new Notification({ title, body, icon: ICON_PATH }).show();
    }

    if (type === 'error' || type === 'warning' || type === 'success') {
        flashMainWindow();
    }
}

function setUpdateState(patch) {
    Object.assign(updateState, patch);
    sendToAllLocalWindows('update-state-updated', updateState);
    updateTrayMenu();
}

function recordCrash(reason, detail = {}) {
    const data = {
        time: new Date().toISOString(),
        reason,
        detail
    };

    try {
        fs.writeFileSync(LAST_CRASH_PATH, JSON.stringify(data, null, 2));
    } catch (error) {
        log('Save last crash failed:', error);
    }
}

async function captureDiagnosticScreenshot(reason) {
    if (!mainWindow || mainWindow.isDestroyed()) return null;

    try {
        fs.mkdirSync(DIAGNOSTICS_DIR, { recursive: true });
        const image = await mainWindow.webContents.capturePage();
        const filePath = path.join(DIAGNOSTICS_DIR, `screenshot-${Date.now()}.png`);
        fs.writeFileSync(filePath, image.toPNG());
        const lastCrash = readLastCrash() || {};
        recordCrash(lastCrash.reason || reason, { ...(lastCrash.detail || {}), screenshot: filePath, screenshotReason: reason });
        writeLog('info', `Diagnostic screenshot saved: ${filePath}`);
        return filePath;
    } catch (error) {
        log('Capture diagnostic screenshot failed:', error);
        return null;
    }
}

function readLastCrash() {
    try {
        return JSON.parse(fs.readFileSync(LAST_CRASH_PATH, 'utf8'));
    } catch (error) {
        return null;
    }
}

function clearLastCrash() {
    removeFile(LAST_CRASH_PATH);
}

function showCrashRecoveryPrompt() {
    if (!isFeatureEnabled('autoRepairPrompt')) return;

    const lastCrash = readLastCrash();
    if (!lastCrash) return;

    const choice = dialog.showMessageBoxSync(mainWindow, {
        type: 'warning',
        buttons: ['一键修复并重启', '重新加载', '忽略'],
        defaultId: 1,
        cancelId: 2,
        title: '检测到上次异常',
        message: '上次运行时页面出现异常，是否现在修复？',
        detail: `${lastCrash.reason}\n${lastCrash.time || ''}`
    });

    clearLastCrash();
    if (choice === 0) repairAndRestart(true);
    if (choice === 1) loadAppUrl();
}

function updateLoadMetrics(success, extra = {}) {
    loadMetrics.unshift({
        time: new Date().toISOString(),
        success,
        durationMs: Date.now() - pageLoadStartedAt,
        ...extra
    });
    loadMetrics.splice(10);
}

function startLoadWatchdog() {
    if (loadWatchdogTimer) clearTimeout(loadWatchdogTimer);
    loadWatchdogTimer = setTimeout(() => {
        if (!mainWindow || mainWindow.isDestroyed() || pageStatus !== 'loading') return;

        pageStatus = 'unresponsive';
        recordCrash('页面加载超时', { url: mainWindow.webContents.getURL(), timeoutMs: LOAD_WATCHDOG_TIMEOUT });
        captureDiagnosticScreenshot('页面加载超时');
        addNotification('warning', APP_NAME, '页面长时间未响应，可尝试重新加载或一键修复。');
        showErrorPage('页面长时间未响应');
        updateTrayMenu();
    }, LOAD_WATCHDOG_TIMEOUT);
}

function stopLoadWatchdog() {
    if (loadWatchdogTimer) clearTimeout(loadWatchdogTimer);
    loadWatchdogTimer = null;
}

function flashMainWindow() {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.flashFrame(true);
        setTimeout(() => {
            if (mainWindow && !mainWindow.isDestroyed()) mainWindow.flashFrame(false);
        }, 5000);
    }
}

function removeFile(filePath) {
    try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (error) {
        log(`Remove file failed: ${filePath}`, error);
    }
}

function readWindowState() {
    try {
        return JSON.parse(fs.readFileSync(WINDOW_STATE_PATH, 'utf8'));
    } catch (error) {
        return null;
    }
}

function saveWindowState() {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    try {
        fs.writeFileSync(WINDOW_STATE_PATH, JSON.stringify({
            ...mainWindow.getBounds(),
            isMaximized: mainWindow.isMaximized()
        }, null, 2));
    } catch (error) {
        log('Save window state failed:', error);
    }
}

function isAppUrl(url) {
    try {
        return allowedOrigins().has(new URL(url).origin);
    } catch (error) {
        return false;
    }
}

function isAllowedNavigationUrl(url) {
    try {
        const { protocol } = new URL(url);
        return protocol === 'https:' || protocol === 'file:';
    } catch (error) {
        return false;
    }
}

function isLocalPage(url) {
    return url.startsWith('file://');
}

function loadAppUrl() {
    if (safeModeReason) {
        showSafeModeWindow();
        return;
    }
    const lock = isAppLocked();
    if (lock.locked) {
        showLockPage(lock.title, lock.message);
        return;
    }
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.loadURL(currentAppUrl());
}

function showCloseTip() {
    if (fs.existsSync(CLOSE_TIP_PATH)) return;

    try {
        fs.writeFileSync(CLOSE_TIP_PATH, '1');
    } catch (error) {
        log('Save close tip state failed:', error);
    }

    addNotification('info', APP_NAME, '程序已最小化到托盘，可右键托盘图标退出。');
}

function createLocalWindow(existingWindow, filePath, options = {}, query = {}) {
    if (existingWindow && !existingWindow.isDestroyed()) {
        existingWindow.show();
        existingWindow.focus();
        return existingWindow;
    }

    const win = new BrowserWindow({
        width: 760,
        height: 640,
        icon: ICON_PATH,
        title: APP_NAME,
        ...options,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            preload: PRELOAD_PATH,
            ...(options.webPreferences || {})
        }
    });

    win.setMenu(null);
    win.loadFile(filePath, { query });
    return win;
}

function showOnboardingWindow() {
    onboardingWindow = createLocalWindow(onboardingWindow, ONBOARDING_PAGE_PATH, { title: '首次使用引导', width: 720, height: 560 });
    onboardingWindow.on('closed', () => { onboardingWindow = null; });
}

function showHealthWindow() {
    healthWindow = createLocalWindow(healthWindow, HEALTH_PAGE_PATH, { title: '健康检查', width: 820, height: 640 });
    healthWindow.on('closed', () => { healthWindow = null; });
}

function showAnnouncementWindow(announcement) {
    if (!shouldShowAnnouncement(announcement)) return;

    const id = announcementId(announcement);

    announcementWindow = createLocalWindow(announcementWindow, ANNOUNCEMENT_PAGE_PATH, { title: '版本公告', width: 720, height: 560 }, {
        id,
        title: announcement?.title || '版本公告',
        body: announcement?.body || '',
        version: announcement?.version || app.getVersion(),
        force: announcement?.force ? '1' : '',
        actionText: announcement?.actionText || '',
        actionUrl: announcement?.actionUrl || ''
    });
    if (announcement?.force) announcementWindow.setClosable(false);
    announcementWindow.on('closed', () => { announcementWindow = null; });
}

function showUpdateWindow() {
    if (!isFeatureEnabled('updates')) return;

    updateWindow = createLocalWindow(updateWindow, UPDATE_PAGE_PATH, { title: '自动更新', width: 560, height: 460, resizable: false });
    updateWindow.on('closed', () => { updateWindow = null; });
}

function showQuickActionsWindow() {
    if (!isFeatureEnabled('quickActions')) return;

    quickActionsWindow = createLocalWindow(quickActionsWindow, QUICK_ACTIONS_PAGE_PATH, { title: '快捷操作', width: 520, height: 520, resizable: false });
    quickActionsWindow.on('closed', () => { quickActionsWindow = null; });
}

function showFeedbackWindow() {
    if (!isFeatureEnabled('feedback')) return;

    feedbackWindow = createLocalWindow(feedbackWindow, FEEDBACK_PAGE_PATH, { title: '问题反馈', width: 720, height: 640 });
    feedbackWindow.on('closed', () => { feedbackWindow = null; });
}

function showRemoteConfigWindow() {
    remoteConfigWindow = createLocalWindow(remoteConfigWindow, REMOTE_CONFIG_PAGE_PATH, { title: '配置中心', width: 820, height: 680 });
    remoteConfigWindow.on('closed', () => { remoteConfigWindow = null; });
}

function showLicenseWindow() {
    licenseWindow = createLocalWindow(licenseWindow, LICENSE_PAGE_PATH, { title: '授权中心', width: 760, height: 640 });
    licenseWindow.on('closed', () => { licenseWindow = null; });
}

function showReleaseNotesWindow(notes = remoteConfig?.releaseNotes) {
    releaseNotesWindow = createLocalWindow(releaseNotesWindow, RELEASE_NOTES_PAGE_PATH, { title: '更新说明', width: 720, height: 560 }, {
        title: notes?.title || '更新说明',
        version: notes?.version || app.getVersion(),
        body: notes?.body || '暂无更新说明。'
    });
    releaseNotesWindow.on('closed', () => { releaseNotesWindow = null; });
}

function showSafeModeWindow() {
    safeModeWindow = createLocalWindow(safeModeWindow, SAFE_MODE_PAGE_PATH, { title: '安全模式', width: 760, height: 620 }, { reason: safeModeReason || '手动进入安全模式' });
    safeModeWindow.on('closed', () => { safeModeWindow = null; });
}

function showSettingsWindow() {
    if (!isFeatureEnabled('settings')) return;

    settingsWindow = createLocalWindow(settingsWindow, SETTINGS_PAGE_PATH, { title: '设置' });
    settingsWindow.on('closed', () => { settingsWindow = null; });
}

function showLogsWindow() {
    if (!isFeatureEnabled('logs')) return;

    logsWindow = createLocalWindow(logsWindow, LOGS_PAGE_PATH, { title: '日志查看器' });
    logsWindow.on('closed', () => { logsWindow = null; });
}

function showNotificationsWindow() {
    if (!isFeatureEnabled('notifications')) return;

    notificationsWindow = createLocalWindow(notificationsWindow, NOTIFICATIONS_PAGE_PATH, { title: '通知中心' });
    notificationsWindow.on('closed', () => { notificationsWindow = null; });
}

function showDownloadsWindow() {
    if (!isFeatureEnabled('downloads')) return;

    downloadsWindow = createLocalWindow(downloadsWindow, DOWNLOADS_PAGE_PATH, { title: '下载管理器' });
    downloadsWindow.on('closed', () => { downloadsWindow = null; });
}

function showAboutWindow() {
    aboutWindow = createLocalWindow(aboutWindow, ABOUT_PAGE_PATH, {
        width: 520,
        height: 520,
        resizable: false,
        title: `关于 ${APP_NAME}`
    }, {
        name: APP_NAME,
        version: app.getVersion(),
        homepage: currentAppUrl(),
        electron: process.versions.electron,
        chrome: process.versions.chrome,
        node: process.versions.node
    });
    aboutWindow.on('closed', () => { aboutWindow = null; });
}

function sendToAllLocalWindows(channel, payload) {
    [settingsWindow, logsWindow, notificationsWindow, downloadsWindow, healthWindow, updateWindow, quickActionsWindow, feedbackWindow].forEach(win => {
        if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
    });
}

function applyRuntimeSettings() {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setAlwaysOnTop(Boolean(settings.alwaysOnTop));
        mainWindow.webContents.setAudioMuted(Boolean(settings.muted));
        mainWindow.webContents.setZoomFactor(Number(settings.zoomFactor) || 1);
    }

    registerWindowShortcut();
}

function registerWindowShortcut() {
    if (currentShortcut) globalShortcut.unregister(currentShortcut);

    currentShortcut = settings.shortcut || DEFAULT_SETTINGS.shortcut;
    const ok = globalShortcut.register(currentShortcut, toggleMainWindow);
    if (!ok) {
        log(`Register shortcut failed: ${currentShortcut}`);
        addNotification('warning', APP_NAME, `快捷键注册失败：${currentShortcut}`);
    }

    globalShortcut.unregister('CommandOrControl+Alt+Space');
    globalShortcut.register('CommandOrControl+Alt+Space', showQuickActionsWindow);
}

function toggleMainWindow() {
    if (!mainWindow || mainWindow.isDestroyed()) {
        createWindow();
        return;
    }

    if (mainWindow.isVisible()) {
        mainWindow.hide();
        showCloseTip();
    } else {
        showMainWindow();
    }
}

function showMainWindow() {
    if (!mainWindow || mainWindow.isDestroyed()) {
        createWindow();
        return;
    }

    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
}

function showErrorPage(error) {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    mainWindow.loadFile(ERROR_PAGE_PATH, {
        query: { url: currentAppUrl(), error: error || '页面加载失败' }
    });
}

function showLockPage(title, message) {
    if (remoteConfig?.maintenance?.enabled && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadFile(MAINTENANCE_PAGE_PATH, {
            query: {
                title,
                message,
                eta: remoteConfig.maintenance.eta || '',
                contact: remoteConfig.maintenance.contact || ''
            }
        });
        return;
    }
    showErrorPage(`${title}：${message}`);
}

function isAppLocked() {
    if (remoteConfig?.killSwitch?.enabled) return { locked: true, title: '当前版本已停止服务', message: remoteConfig.killSwitch.message || '请更新或联系管理员。' };
    if (remoteConfig?.maintenance?.enabled) return { locked: true, title: '服务维护中', message: remoteConfig.maintenance.message || '服务维护中，请稍后再试。' };
    return { locked: false };
}

function injectPageProgressBar() {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    mainWindow.webContents.executeJavaScript(`
        (() => {
            if (document.getElementById('__desktop_loading_bar__')) return;
            const style = document.createElement('style');
            style.textContent = '#__desktop_loading_bar__{position:fixed;top:0;left:0;width:100%;height:3px;z-index:2147483647;pointer-events:none;opacity:0;transition:opacity .18s ease;background:linear-gradient(90deg,#2563eb,#06b6d4,#2563eb);background-size:200% 100%;animation:__desktop_loading_bar_move__ .9s linear infinite}@keyframes __desktop_loading_bar_move__{from{background-position:200% 0}to{background-position:0 0}}';
            const bar = document.createElement('div');
            bar.id = '__desktop_loading_bar__';
            document.documentElement.appendChild(style);
            document.documentElement.appendChild(bar);
        })();
    `).catch(error => log('Inject progress bar failed:', error));
}

function setPageProgressVisible(visible) {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    mainWindow.webContents.executeJavaScript(`
        (() => {
            const bar = document.getElementById('__desktop_loading_bar__');
            if (bar) bar.style.opacity = '${visible ? '1' : '0'}';
        })();
    `).catch(() => {});
}

function setupPermissionPolicy() {
    const session = mainWindow.webContents.session;

    session.setPermissionRequestHandler((webContents, permission, callback) => {
        const url = webContents.getURL();
        const allowed = isAppUrl(url) && settings.permissions.includes(permission);
        permissionEvents.unshift({ time: new Date().toISOString(), permission, url, allowed, mode: 'request' });
        permissionEvents.splice(100);
        callback(allowed);
    });

    session.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
        const allowed = allowedOrigins().has(requestingOrigin) && settings.permissions.includes(permission);
        permissionEvents.unshift({ time: new Date().toISOString(), permission, url: requestingOrigin, allowed, mode: 'check' });
        permissionEvents.splice(100);
        return allowed;
    });
}

function setupDownloads() {
    const session = mainWindow.webContents.session;

    session.on('will-download', (event, item, webContents) => {
        if (!isFeatureEnabled('downloads')) {
            item.cancel();
            featureDisabledMessage('downloads');
            return;
        }

        const fileName = item.getFilename();
        const sourceUrl = item.getURL();
        log(`Download requested: ${sourceUrl}`);

        const savePath = dialog.showSaveDialogSync(mainWindow, {
            title: '保存下载文件',
            defaultPath: path.join(app.getPath('downloads'), fileName)
        });

        if (!savePath) {
            item.cancel();
            return;
        }

        const id = ++downloadSeq;
        const record = {
            id,
            fileName,
            sourceUrl,
            savePath,
            receivedBytes: 0,
            totalBytes: item.getTotalBytes(),
            progress: 0,
            state: 'progressing',
            startedAt: Date.now(),
            speed: 0
        };
        hasActiveDownload = true;
        updateTrayMenu();
        downloads.unshift(record);
        sendToAllLocalWindows('downloads-updated', downloads);
        item.setSavePath(savePath);

        item.on('updated', () => {
            const elapsed = Math.max((Date.now() - record.startedAt) / 1000, 1);
            record.receivedBytes = item.getReceivedBytes();
            record.totalBytes = item.getTotalBytes();
            record.progress = record.totalBytes ? Math.round((record.receivedBytes / record.totalBytes) * 100) : 0;
            record.speed = Math.round(record.receivedBytes / elapsed);
            sendToAllLocalWindows('downloads-updated', downloads);
        });

        item.once('done', (doneEvent, state) => {
            record.state = state;
            record.progress = state === 'completed' ? 100 : record.progress;
            hasActiveDownload = downloads.some(item => item.state === 'progressing');
            updateTrayMenu();
            sendToAllLocalWindows('downloads-updated', downloads);

            if (settings.downloadCompleteAction !== 'none' || state !== 'completed') {
                addNotification(state === 'completed' ? 'success' : 'error', APP_NAME, state === 'completed' ? `下载完成：${fileName}` : `下载失败：${fileName}`);
            }

            if (state === 'completed') {
                if (settings.downloadCompleteAction === 'openFile') shell.openPath(savePath);
                if (settings.downloadCompleteAction === 'openFolder') shell.showItemInFolder(savePath);
            }
        });
    });
}

function createWindow() {
    Menu.setApplicationMenu(null);
    const windowState = readWindowState();
    mainWindow = new BrowserWindow({
        width: windowState?.width || 1200,
        height: windowState?.height || 800,
        x: windowState?.x,
        y: windowState?.y,
        show: false,
        icon: ICON_PATH,
        title: APP_NAME,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            nodeIntegrationInWorker: false,
            sandbox: false,
            preload: PRELOAD_PATH
        }
    });

    setupPermissionPolicy();
    setupDownloads();
    applyRuntimeSettings();
    mainWindow.loadFile(LOADING_PAGE_PATH, { query: { url: currentAppUrl() } });

    if (windowState?.isMaximized || !windowState) mainWindow.maximize();
    if (!settings.startMinimized) mainWindow.show();

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (!isAllowedNavigationUrl(url)) {
            log(`Blocked unsafe window URL: ${url}`);
            return { action: 'deny' };
        }

        if (isAppUrl(url)) return { action: 'allow' };

        log(`External window URL: ${url}`);
        shell.openExternal(url);
        return { action: 'deny' };
    });

    mainWindow.webContents.on('will-navigate', (event, url) => {
        if (isLocalPage(url)) return;

        if (!isAllowedNavigationUrl(url)) {
            event.preventDefault();
            log(`Blocked unsafe navigation URL: ${url}`);
            return;
        }

        if (!isAppUrl(url)) {
            event.preventDefault();
            log(`External navigation URL: ${url}`);
            shell.openExternal(url);
        }
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
        if (!isMainFrame || validatedURL.startsWith('file://')) return;

        pageStatus = 'error';
        updateLoadMetrics(false, { errorCode, errorDescription });
        stopLoadWatchdog();
        log(`Page load failed: ${validatedURL} ${errorCode} ${errorDescription}`);
        addNotification('error', APP_NAME, `页面加载失败：${errorDescription}`, { system: false });
        showErrorPage(errorDescription || String(errorCode));
        updateTrayMenu();
    });

    mainWindow.webContents.on('did-start-loading', () => {
        pageStatus = 'loading';
        pageLoadStartedAt = Date.now();
        startLoadWatchdog();
        updateTrayMenu();
        mainWindow.setProgressBar(0.35);
        setPageProgressVisible(true);
    });

    mainWindow.webContents.on('did-stop-loading', () => {
        stopLoadWatchdog();
        if (pageStatus === 'loading') {
            pageStatus = isLocalPage(mainWindow.webContents.getURL()) ? 'local' : 'ready';
            updateLoadMetrics(pageStatus === 'ready');
        }
        updateTrayMenu();
        mainWindow.setProgressBar(-1);
        setPageProgressVisible(false);
    });

    mainWindow.webContents.on('dom-ready', injectPageProgressBar);

    mainWindow.webContents.on('render-process-gone', (event, details) => {
        pageStatus = 'crashed';
        recordCrash(`页面进程异常退出：${details.reason}`, details);
        captureDiagnosticScreenshot(`页面进程异常退出：${details.reason}`);
        log('Render process gone:', details.reason);
        addNotification('error', APP_NAME, `页面进程异常退出：${details.reason}`);
        showErrorPage(`页面进程异常退出：${details.reason}`);
        updateTrayMenu();
    });

    mainWindow.on('unresponsive', () => {
        pageStatus = 'unresponsive';
        recordCrash('窗口无响应', { url: mainWindow.webContents.getURL() });
        captureDiagnosticScreenshot('窗口无响应');
        addNotification('warning', APP_NAME, '窗口无响应，可通过快捷操作面板重新加载或修复。');
        updateTrayMenu();
    });

    mainWindow.on('responsive', () => {
        if (pageStatus === 'unresponsive') pageStatus = 'ready';
        updateTrayMenu();
    });

    mainWindow.on('resize', saveWindowState);
    mainWindow.on('move', saveWindowState);
    mainWindow.on('close', event => {
        if (isQuitting || settings.closeBehavior === 'quit') {
            saveWindowState();
            return;
        }

        if (settings.closeBehavior === 'ask') {
            const choice = dialog.showMessageBoxSync(mainWindow, {
                type: 'question',
                buttons: ['最小化到托盘', '直接退出', '取消'],
                defaultId: 0,
                cancelId: 2,
                message: '关闭窗口时要执行什么操作？'
            });

            if (choice === 1) {
                isQuitting = true;
                saveWindowState();
                return;
            }

            event.preventDefault();
            if (choice === 0) {
                mainWindow.hide();
                showCloseTip();
            }
            return;
        }

        event.preventDefault();
        mainWindow.hide();
        showCloseTip();
    });

    const currentWindow = mainWindow;
    currentWindow.on('closed', () => {
        electronLocalshortcut.unregisterAll(currentWindow);
        mainWindow = null;
    });

    if (!app.isPackaged || settings.allowDevTools || process.argv.includes('--devtools')) {
        electronLocalshortcut.register(currentWindow, 'Ctrl+Shift+I', () => currentWindow.webContents.openDevTools());
    }
    electronLocalshortcut.register(currentWindow, 'F5', () => currentWindow.reload());
}

function updateTrayMenu() {
    if (!tray) return;

    const license = checkLicense();
    const features = remoteFeatures();
    const hasAnnouncement = Boolean(remoteConfig?.announcement) && features.announcement;
    const statusText = hasActiveDownload ? '下载中'
        : updateState.status === 'downloading' ? '更新下载中'
        : updateAvailable ? '有更新'
        : pageStatus === 'loading' ? '正在加载'
        : pageStatus === 'error' || pageStatus === 'crashed' || pageStatus === 'unresponsive' ? '网页异常'
        : !license.valid && settings.licenseKey ? '授权异常'
        : hasAnnouncement ? '有重要公告'
        : !mainWindow?.isVisible() ? '后台运行中'
        : wasOnline ? '在线'
        : '离线';
    tray.setToolTip(`${APP_NAME}（${statusText}）`);
    tray.setContextMenu(Menu.buildFromTemplate([
        { label: `状态：${statusText}`, enabled: false },
        { label: '显示', click: showMainWindow },
        { label: `显示/隐藏快捷键：${settings.shortcut}`, enabled: false },
        ...(features.quickActions ? [{ label: '快捷操作面板：Ctrl+Alt+Space', enabled: false }] : []),
        ...(features.settings ? [{ label: '设置', click: showSettingsWindow }] : []),
        { type: 'separator' },
        { label: '刷新页面', click: loadAppUrl },
        { label: '打开官网', click: () => shell.openExternal(currentAppUrl()) },
        { label: '窗口置顶', type: 'checkbox', checked: Boolean(settings.alwaysOnTop), click: () => saveSettings({ ...settings, alwaysOnTop: !settings.alwaysOnTop }) },
        { label: '静音', type: 'checkbox', checked: Boolean(settings.muted), click: () => saveSettings({ ...settings, muted: !settings.muted }) },
        { label: '页面放大', click: () => saveSettings({ ...settings, zoomFactor: Math.min((settings.zoomFactor || 1) + 0.1, 3) }) },
        { label: '页面缩小', click: () => saveSettings({ ...settings, zoomFactor: Math.max((settings.zoomFactor || 1) - 0.1, 0.5) }) },
        { label: '恢复默认缩放', click: () => saveSettings({ ...settings, zoomFactor: 1 }) },
        { type: 'separator' },
        { label: '开机自动启动', type: 'checkbox', checked: Boolean(settings.autoLaunch), click: () => saveSettings({ ...settings, autoLaunch: !settings.autoLaunch }) },
        { label: '打开开机启动设置', click: () => shell.openExternal('ms-settings:startupapps').catch(error => log('Open startup settings failed:', error)) },
        ...(features.trayMaintenance ? [
            { type: 'separator' },
            { label: '清理缓存并重启', click: clearCacheAndRestart },
            { label: '清理 Cookie', click: clearCookies },
            { label: '清理 LocalStorage', click: clearLocalStorage },
            { label: '清理全部站点数据', click: clearAllSiteData }
        ] : []),
        { type: 'separator' },
        ...(features.notifications ? [{ label: '通知中心', click: showNotificationsWindow }] : []),
        ...(features.downloads ? [{ label: '下载管理器', click: showDownloadsWindow }] : []),
        ...(features.logs ? [{ label: '日志查看器', click: showLogsWindow }] : []),
        ...(features.health ? [{ label: '健康检查', click: showHealthWindow }] : []),
        { label: '配置中心', click: showRemoteConfigWindow },
        { label: '授权中心', click: showLicenseWindow },
        { label: '更新说明', click: () => showReleaseNotesWindow() },
        ...(features.quickActions ? [{ label: '快捷操作面板', click: showQuickActionsWindow }] : []),
        ...(features.feedback ? [{ label: '问题反馈', click: showFeedbackWindow }] : []),
        ...(features.trayMaintenance ? [{ label: '一键修复并重启', click: repairAndRestart }] : []),
        ...(features.diagnostics ? [{ label: '导出诊断信息', click: exportDiagnostics }] : []),
        ...(features.updates ? [{ label: '自动更新', click: showUpdateWindow }, { label: '检查更新', click: checkForUpdates }] : []),
        { type: 'separator' },
        { label: `关于 ${APP_NAME}`, click: showAboutWindow },
        { label: '退出', click: () => app.quit() }
    ]));
}

function clearCacheAndRestart(skipConfirm = false) {
    if (!isFeatureEnabled('trayMaintenance')) return featureDisabledMessage('trayMaintenance');
    if (!skipConfirm && !confirmSensitiveAction('清理缓存并重启', '此操作会清理缓存并重启应用，是否继续？')) return;
    const session = mainWindow?.webContents.session;
    const work = session ? session.clearCache() : Promise.resolve();
    work.then(() => {
        addNotification('success', APP_NAME, '缓存已清理，正在重启。');
        app.relaunch();
        app.quit();
    }).catch(error => {
        log('Clear cache failed:', error);
        addNotification('error', APP_NAME, '缓存清理失败，请稍后重试。');
    });
}

function clearCookies() {
    if (!isFeatureEnabled('trayMaintenance')) return featureDisabledMessage('trayMaintenance');
    if (!confirmSensitiveAction('清理 Cookie', '此操作会清理当前站点 Cookie，可能需要重新登录，是否继续？')) return;
    mainWindow?.webContents.session.clearStorageData({ storages: ['cookies'] }).then(() => addNotification('success', APP_NAME, 'Cookie 已清理。'));
}

function clearLocalStorage() {
    if (!isFeatureEnabled('trayMaintenance')) return featureDisabledMessage('trayMaintenance');
    if (!confirmSensitiveAction('清理 LocalStorage', '此操作会清理当前站点本地存储，是否继续？')) return;
    mainWindow?.webContents.session.clearStorageData({ storages: ['localstorage'] }).then(() => addNotification('success', APP_NAME, 'LocalStorage 已清理。'));
}

function clearAllSiteData() {
    if (!isFeatureEnabled('trayMaintenance')) return featureDisabledMessage('trayMaintenance');
    if (!confirmSensitiveAction('清理全部站点数据', '此操作会清理 Cookie、缓存和本地站点数据，可能需要重新登录，是否继续？')) return;
    mainWindow?.webContents.session.clearStorageData().then(() => addNotification('success', APP_NAME, '全部站点数据已清理。'));
}

function repairAndRestart(skipConfirm = false) {
    if (!isFeatureEnabled('trayMaintenance')) return featureDisabledMessage('trayMaintenance');
    if (!skipConfirm && !confirmSensitiveAction('一键修复并重启', '此操作会清理缓存、站点数据并重置窗口状态，是否继续？')) return;
    removeFile(WINDOW_STATE_PATH);
    const session = mainWindow?.webContents.session;
    const work = session ? Promise.all([session.clearCache(), session.clearStorageData()]) : Promise.resolve();
    work.finally(() => {
        addNotification('success', APP_NAME, '一键修复完成，正在重启。');
        app.relaunch();
        app.quit();
    });
}

function confirmSensitiveAction(title, message) {
    const choice = dialog.showMessageBoxSync(mainWindow || undefined, {
        type: 'warning',
        buttons: ['继续', '取消'],
        defaultId: 1,
        cancelId: 1,
        title,
        message
    });
    return choice === 0;
}

function importSettings() {
    const files = dialog.showOpenDialogSync({
        title: '导入设置',
        filters: [{ name: 'JSON', extensions: ['json'] }],
        properties: ['openFile']
    });

    if (!files?.[0]) return settings;

    const next = JSON.parse(fs.readFileSync(files[0], 'utf8'));
    addNotification('success', APP_NAME, '设置已导入并应用。');
    return saveSettings(next);
}

function exportSettings() {
    const savePath = dialog.showSaveDialogSync({
        title: '导出设置',
        defaultPath: path.join(app.getPath('desktop'), 'settings.json'),
        filters: [{ name: 'JSON', extensions: ['json'] }]
    });

    if (!savePath) return;

    fs.writeFileSync(savePath, JSON.stringify(settings, null, 2));
    addNotification('success', APP_NAME, '设置已导出。');
    shell.showItemInFolder(savePath);
}

function checkForUpdates() {
    if (!isFeatureEnabled('updates')) return featureDisabledMessage('updates');

    if (!autoUpdater || !app.isPackaged) {
        const message = app.isPackaged ? '自动更新模块不可用。' : '开发模式下跳过自动更新检查。';
        setUpdateState({ status: 'unavailable', message, error: '' });
        addNotification('info', APP_NAME, message);
        return;
    }

    showUpdateWindow();
    setUpdateState({ status: 'checking', percent: 0, message: `正在检查 ${settings.updateChannel || 'stable'} 渠道更新...`, error: '' });
    addNotification('info', APP_NAME, '正在检查更新...');
    autoUpdater.checkForUpdates().catch(error => {
        log('Check updates failed:', error);
        setUpdateState({ status: 'error', message: '检查更新失败', error: error.message || String(error) });
        addNotification('error', APP_NAME, `检查更新失败：${error.message || error}`);
    });
}

function setupAutoUpdater() {
    if (!autoUpdater) return;

    autoUpdater.channel = settings.updateChannel || 'stable';

    autoUpdater.on('update-available', info => {
        updateAvailable = true;
        setUpdateState({ status: 'available', version: info.version || '', percent: 0, message: `发现新版本：${info.version || '-'}`, error: '' });
        updateTrayMenu();
        showUpdateWindow();
        addNotification('info', APP_NAME, `发现新版本：${info.version}`);
    });
    autoUpdater.on('update-not-available', () => {
        setUpdateState({ status: 'latest', percent: 0, message: '当前已是最新版本。', error: '' });
        addNotification('success', APP_NAME, '当前已是最新版本。');
    });
    autoUpdater.on('download-progress', progress => {
        setUpdateState({ status: 'downloading', percent: Math.round(progress.percent || 0), message: `更新下载中：${Math.round(progress.percent || 0)}%`, error: '' });
    });
    autoUpdater.on('update-downloaded', info => {
        setUpdateState({ status: 'downloaded', version: info?.version || updateState.version, percent: 100, message: '更新已下载完成，等待安装。', error: '' });
        const choice = dialog.showMessageBoxSync({
            type: 'question',
            buttons: ['立即重启', '稍后更新'],
            defaultId: 0,
            message: '更新已下载完成，是否立即重启安装？'
        });

        if (choice === 0) autoUpdater.quitAndInstall();
    });
    autoUpdater.on('error', error => {
        setUpdateState({ status: 'error', message: '自动更新异常', error: error.message || String(error) });
        log('Auto updater error:', error);
        addNotification('error', APP_NAME, `自动更新异常：${error.message || error}`);
    });
}

function installDownloadedUpdate() {
    if (!isFeatureEnabled('updates')) return featureDisabledMessage('updates');
    if (autoUpdater && updateState.status === 'downloaded') autoUpdater.quitAndInstall();
}

function buildDiagnosticsData() {
    const crashDir = app.getPath('crashDumps');
    const crashDumps = fs.existsSync(crashDir) ? fs.readdirSync(crashDir).map(name => path.join(crashDir, name)) : [];
    return {
        app: { name: APP_NAME, version: app.getVersion(), electron: process.versions.electron, chrome: process.versions.chrome, node: process.versions.node },
        system: { platform: process.platform, arch: process.arch, release: os.release(), cpus: os.cpus().length, memory: os.totalmem() },
        settings: redactObject(settings),
        remoteConfig: redactObject(remoteConfig),
        remoteConfigMeta,
        license: checkLicense(),
        localLicense: redactObject(localLicensePublicInfo()),
        licenseServerState: redactObject(licenseServerState),
        deviceState,
        windowState: readWindowState(),
        log: fs.existsSync(LOG_PATH) ? fs.readFileSync(LOG_PATH, 'utf8') : '',
        crashDumps,
        lastCrash: readLastCrash(),
        permissionEvents,
        loadMetrics,
        updateState,
        rollout: { group: settings.rolloutGroup, bucket: rolloutBucket(), matched: matchesRollout(remoteConfig?.rollout), features: remoteFeatures() },
        notifications,
        downloads
    };
}

function getRemoteConfigStatus() {
    return {
        url: settings.remoteConfigUrl,
        enabled: settings.remoteConfigEnabled,
        meta: remoteConfigMeta,
        config: redactObject(remoteConfig),
        features: remoteFeatures(),
        rollout: { group: settings.rolloutGroup, bucket: rolloutBucket(), matched: matchesRollout(remoteConfig?.rollout) },
        announcementId: remoteConfig?.announcement ? announcementId(remoteConfig.announcement) : '',
        logLevel: settings.logLevel,
        cacheExists: fs.existsSync(REMOTE_CONFIG_CACHE_PATH),
        backupExists: fs.existsSync(REMOTE_CONFIG_BACKUP_PATH),
        audit: readJsonLines(REMOTE_CONFIG_AUDIT_PATH, 40),
        commandReceipts: readJsonLines(COMMAND_RECEIPTS_PATH, 40)
    };
}

function getLicenseCenterInfo() {
    return {
        license: checkLicense(),
        localLicense: localLicenseStatus(),
        localLicenseInfo: redactObject(localLicensePublicInfo()),
        licenseServerState: redactObject(licenseServerState),
        deviceState: updateDeviceState(),
        settings: { licenseServerUrl: settings.licenseServerUrl, licenseOfflineGraceDays: settings.licenseOfflineGraceDays, rolloutGroup: settings.rolloutGroup },
        reports: readJsonLines(LICENSE_STATUS_REPORT_PATH, 20)
    };
}

function exportDiagnostics() {
    if (!isFeatureEnabled('diagnostics')) return featureDisabledMessage('diagnostics');

    const savePath = dialog.showSaveDialogSync({
        title: '导出诊断信息',
        defaultPath: path.join(app.getPath('desktop'), `diagnostics-${Date.now()}.json`),
        filters: [{ name: 'JSON', extensions: ['json'] }]
    });

    if (!savePath) return;

    const data = buildDiagnosticsData();

    fs.writeFileSync(savePath, JSON.stringify(data, null, 2));
    addNotification('success', APP_NAME, '诊断信息已导出。');
    shell.showItemInFolder(savePath);
}

function exportDiagnosticsPackage() {
    if (!isFeatureEnabled('diagnostics')) return featureDisabledMessage('diagnostics');

    const targetDir = dialog.showOpenDialogSync(mainWindow || undefined, {
        title: '选择诊断包保存目录',
        properties: ['openDirectory', 'createDirectory']
    })?.[0];
    if (!targetDir) return null;

    const packageDir = path.join(targetDir, `diagnostics-package-${Date.now()}`);
    fs.mkdirSync(packageDir, { recursive: true });
    fs.writeFileSync(path.join(packageDir, 'diagnostics.json'), JSON.stringify(buildDiagnosticsData(), null, 2));
    if (fs.existsSync(LOG_PATH)) fs.copyFileSync(LOG_PATH, path.join(packageDir, 'app.log'));
    const lastCrash = readLastCrash();
    if (lastCrash?.detail?.screenshot && fs.existsSync(lastCrash.detail.screenshot)) fs.copyFileSync(lastCrash.detail.screenshot, path.join(packageDir, path.basename(lastCrash.detail.screenshot)));
    safeWriteJson(path.join(packageDir, 'settings-redacted.json'), redactObject(settings));
    addNotification('success', APP_NAME, '诊断包目录已导出。');
    shell.showItemInFolder(packageDir);
    return packageDir;
}

function diagnosticsSummary() {
    const license = checkLicense();
    const logText = fs.existsSync(LOG_PATH) ? fs.readFileSync(LOG_PATH, 'utf8').slice(-4000) : '';
    return [
        `${APP_NAME} ${app.getVersion()}`,
        `系统：${process.platform} ${process.arch} ${os.release()}`,
        `设备：${os.hostname()} ${deviceState.deviceId}`,
        `主站：${currentAppUrl()}`,
        `网络：${wasOnline ? 'online' : 'offline'}`,
        `页面状态：${pageStatus}`,
        `许可证：${license.reason}`,
        `灰度：${settings.rolloutGroup} bucket=${rolloutBucket()} matched=${matchesRollout(remoteConfig?.rollout)}`,
        `最近异常：${JSON.stringify(readLastCrash() || {})}`,
        `最近日志：\n${logText}`
    ].join('\n');
}

function copyDiagnosticsSummary() {
    if (!isFeatureEnabled('diagnostics')) return featureDisabledMessage('diagnostics');
    clipboard.writeText(diagnosticsSummary());
    addNotification('success', APP_NAME, '诊断摘要已复制，可粘贴给客服。');
}

function submitFeedback(value = {}) {
    if (!isFeatureEnabled('feedback')) return featureDisabledMessage('feedback');

    const text = [
        '问题反馈',
        `联系方式：${value.contact || '-'}`,
        `问题描述：${value.message || '-'}`,
        '',
        diagnosticsSummary()
    ].join('\n');
    clipboard.writeText(text);
    addNotification('success', APP_NAME, '反馈内容和诊断摘要已复制，可发送给客服。');
    return { ok: true };
}

function executedRemoteCommands() {
    return safeReadJson(REMOTE_COMMANDS_PATH, { ids: [] });
}

function rememberRemoteCommand(id) {
    const state = executedRemoteCommands();
    if (!state.ids.includes(id)) state.ids.unshift(id);
    state.ids.splice(200);
    safeWriteJson(REMOTE_COMMANDS_PATH, state);
}

function executeRemoteCommands(commands) {
    if (!Array.isArray(commands)) return;
    const state = executedRemoteCommands();
    commands.forEach(command => {
        if (!command?.commandId || state.ids.includes(command.commandId)) return;
        writeLog('info', `Execute remote command: ${command.type} ${command.commandId}`);
        rememberRemoteCommand(command.commandId);
        const receipt = { commandId: command.commandId, type: command.type, ok: true, deviceId: deviceState.deviceId, appVersion: app.getVersion() };
        try {
            if (command.type === 'clearCache') clearCacheAndRestart(true);
            if (command.type === 'restart') { app.relaunch(); app.quit(); }
            if (command.type === 'announcement' && command.announcement) showAnnouncementWindow({ ...command.announcement, force: true });
            if (command.type === 'setLogLevel' && command.logLevel) settings = saveSettings({ ...settings, logLevel: command.logLevel });
            if (command.type === 'exportDiagnostics') exportDiagnostics();
            if (command.type === 'syncRemoteConfig') setTimeout(fetchRemoteConfig, 1000);
        } catch (error) {
            receipt.ok = false;
            receipt.error = error.message || String(error);
        }
        appendJsonLine(COMMAND_RECEIPTS_PATH, receipt);
        reportCommandReceipt(receipt);
    });
}

function reportCommandReceipt(receipt) {
    const url = remoteConfig?.commandReceiptUrl;
    if (!url) return;
    fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(receipt) }).catch(error => log('Report command receipt failed:', error));
}

function reportLicenseStatus() {
    const license = checkLicense();
    const payload = {
        deviceId: deviceState.deviceId,
        appVersion: app.getVersion(),
        licenseId: license.licenseId || '',
        valid: license.valid,
        reason: license.reason,
        daysLeft: license.daysLeft,
        universal: Boolean(license.universal),
        revoked: /撤销|吊销/.test(license.reason || ''),
        time: new Date().toISOString()
    };
    appendJsonLine(LICENSE_STATUS_REPORT_PATH, payload);
    const url = remoteConfig?.licenseStatusReportUrl;
    if (url) fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }).catch(error => log('Report license status failed:', error));
    return payload;
}

function checkLicenseReminder() {
    const license = checkLicense();
    const daysLeft = Number(license.daysLeft);
    if (!Number.isFinite(daysLeft)) return;
    const thresholds = [7, 3, 1, 0];
    const threshold = thresholds.find(item => daysLeft <= item);
    if (threshold === undefined) return;
    const today = new Date().toISOString().slice(0, 10);
    const state = safeReadJson(LICENSE_REMINDERS_PATH, {});
    const key = `${today}-${threshold}`;
    if (state[key]) return;
    state[key] = true;
    safeWriteJson(LICENSE_REMINDERS_PATH, state);
    addNotification(daysLeft < 0 ? 'error' : 'warning', APP_NAME, daysLeft < 0 ? '授权已过期。' : `授权将在 ${daysLeft} 天后过期。`);
}

async function netDect() {
    try {
        const status = await qIsOnline.isOnline();
        const isOnline = status === 'online';

        if (isOnline === wasOnline) return;

        wasOnline = isOnline;
        if (isOnline) lastOnlineAt = new Date().toISOString();
        updateTrayMenu();
        addNotification(isOnline ? 'success' : 'warning', `${APP_NAME} 网络提示`, isOnline ? '您的网络已连接!' : '您的网络已经断开!');

        if (isOnline && mainWindow && !mainWindow.isDestroyed() && isLocalPage(mainWindow.webContents.getURL())) loadAppUrl();
    } catch (error) {
        log('Network check failed:', error);
    }
}

function compareVersions(a, b) {
    const left = String(a).split('.').map(Number);
    const right = String(b).split('.').map(Number);
    for (let i = 0; i < Math.max(left.length, right.length); i++) {
        const x = left[i] || 0;
        const y = right[i] || 0;
        if (x > y) return 1;
        if (x < y) return -1;
    }
    return 0;
}

function checkLicense() {
    const device = os.hostname();
    const deviceId = deviceState.deviceId;
    if (licenseServerState?.valid === false) return { ...licenseServerState, valid: false, device, deviceId };
    if (licenseServerState?.valid === true) return { ...licenseServerState, valid: true, device, deviceId };
    const localStatus = localLicenseStatus();
    if (localStatus.valid) return { ...localStatus, device, deviceId };
    if (!settings.licenseKey) return { valid: false, reason: '未配置许可证', device, deviceId, daysLeft: null };
    if (settings.licenseExpiresAt) {
        const daysLeft = Math.ceil((new Date(settings.licenseExpiresAt).getTime() - Date.now()) / 86400000);
        if (daysLeft < 0) return { valid: false, reason: '许可证已过期', device, deviceId, daysLeft };
        if (daysLeft <= 7) return { valid: true, reason: '许可证即将过期', device, deviceId, daysLeft };
        return { valid: true, reason: '许可证有效', device, deviceId, daysLeft };
    }
    return { valid: true, reason: '许可证有效', device, deviceId, daysLeft: null };
}

async function validateLicenseWithServer() {
    if (!settings.licenseServerUrl || !settings.licenseKey) return checkLicense();

    const payload = {
        licenseKey: settings.licenseKey,
        deviceId: deviceState.deviceId,
        deviceName: deviceState.deviceName,
        appVersion: app.getVersion(),
        platform: process.platform,
        arch: process.arch,
        group: settings.rolloutGroup
    };

    try {
        const response = await fetch(settings.licenseServerUrl, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        licenseServerState = {
            valid: Boolean(result.valid),
            reason: result.reason || (result.valid ? '服务端授权有效' : '服务端授权无效'),
            daysLeft: result.daysLeft ?? null,
            expiresAt: result.expiresAt || '',
            serverCheckedAt: new Date().toISOString(),
            offline: false
        };
        updateDeviceState({ licenseServerCheckedAt: licenseServerState.serverCheckedAt, licenseValid: licenseServerState.valid });
        if (!licenseServerState.valid) addNotification('warning', APP_NAME, `授权校验失败：${licenseServerState.reason}`);
        return checkLicense();
    } catch (error) {
        const lastChecked = licenseServerState?.serverCheckedAt ? new Date(licenseServerState.serverCheckedAt).getTime() : 0;
        const graceMs = Math.max(Number(settings.licenseOfflineGraceDays) || 0, 0) * 86400000;
        const inGrace = licenseServerState?.valid && lastChecked && Date.now() - lastChecked <= graceMs;
        licenseServerState = {
            ...(licenseServerState || {}),
            valid: Boolean(inGrace),
            reason: inGrace ? '授权服务器不可用，处于离线宽限期' : '授权服务器不可用，离线宽限期已过',
            offline: true,
            lastError: error.message || String(error)
        };
        log('Validate license failed:', error);
        return checkLicense();
    }
}

async function fetchRemoteConfig() {
    if (!settings.remoteConfigEnabled || !settings.remoteConfigUrl) return null;

    try {
        auditRemoteConfig('fetch-start', { url: settings.remoteConfigUrl });
        const response = await fetch(settings.remoteConfigUrl);
        const rawConfig = await response.json();
        const verified = verifySignedPayload(rawConfig, '远程配置');
        auditRemoteConfig(verified.ok ? 'signature-ok' : 'signature-failed', { reason: verified.reason || '' });
        if (!verified.ok) throw new Error(verified.reason);
        applyRemoteConfig(verified.payload, { source: 'remote', url: settings.remoteConfigUrl });
        auditRemoteConfig('fetch-success', { configVersion: remoteConfig?.configVersion || '' });
        addNotification('success', APP_NAME, '远程配置已同步。', { system: false });
        return remoteConfig;
    } catch (error) {
        log('Fetch remote config failed:', error);
        auditRemoteConfig('fetch-failed', { error: error.message || String(error) });
        const cached = safeReadJson(REMOTE_CONFIG_CACHE_PATH, null);
        if (cached?.config) {
            try {
                applyRemoteConfig(cached.config, { source: 'cache', url: settings.remoteConfigUrl, error: error.message || String(error) });
                auditRemoteConfig('cache-used', { configVersion: cached.config.configVersion || '' });
                addNotification('warning', APP_NAME, '远程配置同步失败，已使用本地缓存。', { system: false });
                return remoteConfig;
            } catch (cacheError) {
                log('Apply cached remote config failed:', cacheError);
            }
        }
        remoteConfigMeta = { ...remoteConfigMeta, source: 'error', error: error.message || String(error), syncedAt: new Date().toISOString() };
        addNotification('warning', APP_NAME, '远程配置同步失败。', { system: false });
        return null;
    }
}

function applyRemoteConfig(nextConfig, meta = {}) {
    const previous = remoteConfig;
    try {
        if (nextConfig.expiresAt && new Date(nextConfig.expiresAt).getTime() < Date.now()) throw new Error('远程配置已过期');
        remoteConfig = nextConfig;
        if (previous?.configVersion !== nextConfig.configVersion) auditRemoteConfig('config-version-changed', { from: previous?.configVersion || '', to: nextConfig.configVersion || '' });
        if (JSON.stringify(previous?.features || {}) !== JSON.stringify(nextConfig.features || {})) auditRemoteConfig('features-changed', { from: previous?.features || {}, to: nextConfig.features || {} });
        remoteConfigMeta = {
            source: meta.source || 'remote',
            url: meta.url || settings.remoteConfigUrl,
            syncedAt: new Date().toISOString(),
            configVersion: nextConfig.configVersion || '',
            error: meta.error || ''
        };
        const features = remoteFeatures();
        const rolloutMatched = matchesRollout(remoteConfig.rollout);

        if (remoteConfig.defaultUrl && !settings.appUrl) settings = saveSettings({ ...settings, urls: { ...settings.urls, prod: remoteConfig.defaultUrl } });
        if (Array.isArray(remoteConfig.allowedOrigins)) settings = saveSettings({ ...settings, allowedOrigins: remoteConfig.allowedOrigins });
        if (remoteConfig.updateChannel) settings = saveSettings({ ...settings, updateChannel: remoteConfig.updateChannel });
        if (remoteConfig.logLevel && (!remoteConfig.logExpiresAt || new Date(remoteConfig.logExpiresAt).getTime() > Date.now())) settings = saveSettings({ ...settings, logLevel: remoteConfig.logLevel });
        if (remoteConfig.announcement && features.announcement) showAnnouncementWindow(remoteConfig.announcement);
        if (remoteConfig.releaseNotes?.show) showReleaseNotesWindow(remoteConfig.releaseNotes);
        const lock = isAppLocked();
        if (lock.locked) showLockPage(lock.title, lock.message);
        if (remoteConfig.killSwitch?.enabled) auditRemoteConfig('kill-switch-enabled', remoteConfig.killSwitch);
        if (remoteConfig.maintenance?.enabled) auditRemoteConfig('maintenance-enabled', remoteConfig.maintenance);
        if (remoteConfig.features) writeLog('info', `Remote features applied: ${JSON.stringify(features)}`);
        if (remoteConfig.rollout) writeLog('info', `Remote rollout ${rolloutMatched ? 'matched' : 'not matched'}: group=${settings.rolloutGroup} bucket=${rolloutBucket()}`);

        const minVersionRequired = remoteConfig.minVersion && compareVersions(app.getVersion(), remoteConfig.minVersion) < 0;
        const forceUpdateRequired = Boolean(remoteConfig.forceUpdate) || minVersionRequired;
        if (forceUpdateRequired) {
            const detail = remoteConfig.forceUpdateMessage || (minVersionRequired ? `当前版本 ${app.getVersion()} 低于最低要求版本 ${remoteConfig.minVersion}。` : '远程配置要求立即更新。');
            dialog.showMessageBoxSync(mainWindow || undefined, {
                type: 'warning',
                buttons: features.updates ? ['检查更新'] : ['确定'],
                defaultId: 0,
                cancelId: 0,
                title: '需要更新',
                message: '当前版本需要更新后才能继续使用。',
                detail
            });
            if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide();
            checkForUpdates();
        }

        executeRemoteCommands(remoteConfig.commands);
        checkLicenseReminder();
        safeWriteJson(REMOTE_CONFIG_BACKUP_PATH, { config: previous, meta: remoteConfigMeta });
        safeWriteJson(REMOTE_CONFIG_CACHE_PATH, { config: remoteConfig, meta: remoteConfigMeta });
        updateTrayMenu();
        sendToAllLocalWindows('remote-config-updated', remoteConfig);
        return remoteConfig;
    } catch (error) {
        remoteConfig = previous;
        throw error;
    }
}

async function getHealthInfo() {
    const started = Date.now();
    let siteReachable = false;
    let certificateStatus = '未检测';
    try {
        const response = await fetch(currentAppUrl(), { method: 'HEAD' });
        siteReachable = response.ok;
        certificateStatus = '正常';
    } catch (error) {
        certificateStatus = error.message || '异常';
    }

    return {
        appUrl: currentAppUrl(),
        network: wasOnline ? 'online' : 'offline',
        pageStatus,
        deviceState: updateDeviceState(),
        rollout: { group: settings.rolloutGroup, bucket: rolloutBucket(), matched: matchesRollout(remoteConfig?.rollout), features: remoteFeatures() },
        lastOnlineAt,
        siteReachable,
        certificateStatus,
        responseTimeMs: Date.now() - started,
        startupMs: Date.now() - appStartedAt,
        lastLoadMs: loadMetrics[0]?.durationMs || null,
        loadSuccessRate: loadMetrics.length ? `${Math.round((loadMetrics.filter(item => item.success).length / loadMetrics.length) * 100)}%` : '-',
        recentLoads: loadMetrics,
        proxy: process.env.HTTP_PROXY || process.env.HTTPS_PROXY || process.env.http_proxy || process.env.https_proxy || '未检测到代理环境变量',
        permissionEvents,
        cacheNote: 'Electron 未提供稳定同步缓存大小接口',
        logSize: fs.existsSync(LOG_PATH) ? fs.statSync(LOG_PATH).size : 0,
        electron: process.versions.electron,
        chrome: process.versions.chrome,
        node: process.versions.node,
        license: checkLicense(),
        localLicense: localLicenseStatus(),
        licenseServerState,
        remoteConfigMeta,
        remoteConfig
    };
}

function registerIpc() {
    ipcMain.handle('settings:get', () => settings);
    ipcMain.handle('settings:save', (event, value) => requireFeature('settings', () => saveSettings(value)));
    ipcMain.handle('settings:import', () => requireFeature('settings', importSettings));
    ipcMain.handle('settings:export', () => requireFeature('settings', exportSettings));
    ipcMain.handle('settings:openStartup', () => shell.openExternal('ms-settings:startupapps'));
    ipcMain.handle('app:clearCacheRestart', clearCacheAndRestart);
    ipcMain.handle('app:checkUpdates', checkForUpdates);
    ipcMain.handle('app:getUpdateState', () => updateState);
    ipcMain.handle('app:installUpdate', installDownloadedUpdate);
    ipcMain.handle('app:reload', loadAppUrl);
    ipcMain.handle('app:openHome', () => shell.openExternal(currentAppUrl()));
    ipcMain.handle('app:restart', () => { app.relaunch(); app.quit(); });
    ipcMain.handle('app:toggleAlwaysOnTop', () => saveSettings({ ...settings, alwaysOnTop: !settings.alwaysOnTop }));
    ipcMain.handle('app:toggleMuted', () => saveSettings({ ...settings, muted: !settings.muted }));
    ipcMain.handle('app:showSettings', showSettingsWindow);
    ipcMain.handle('app:showLogs', showLogsWindow);
    ipcMain.handle('app:showFeedback', showFeedbackWindow);
    ipcMain.handle('app:repairRestart', repairAndRestart);
    ipcMain.handle('app:health', () => requireFeature('health', getHealthInfo));
    ipcMain.handle('app:remoteConfig', fetchRemoteConfig);
    ipcMain.handle('app:license', () => validateLicenseWithServer());
    ipcMain.handle('license:localStatus', () => localLicenseStatus());
    ipcMain.handle('license:importLocal', importLocalLicense);
    ipcMain.handle('license:importLocalFile', (event, filePath) => importLocalLicenseFile(filePath));
    ipcMain.handle('license:clearLocal', clearLocalLicense);
    ipcMain.handle('license:clearUniversal', clearUniversalLicense);
    ipcMain.handle('license:exportRequest', exportLicenseRequest);
    ipcMain.handle('license:centerInfo', getLicenseCenterInfo);
    ipcMain.handle('license:copyDeviceId', copyDeviceId);
    ipcMain.handle('license:copyStatus', copyLicenseStatus);
    ipcMain.handle('license:openLocalFolder', openLocalLicenseFolder);
    ipcMain.handle('license:openRequestFolder', openLicenseRequestFolder);
    ipcMain.handle('remoteConfig:status', getRemoteConfigStatus);
    ipcMain.handle('app:showRemoteConfig', showRemoteConfigWindow);
    ipcMain.handle('app:showLicense', showLicenseWindow);
    ipcMain.handle('app:showReleaseNotes', () => showReleaseNotesWindow());
    ipcMain.handle('app:showSafeMode', showSafeModeWindow);
    ipcMain.handle('app:copyDiagnostics', copyDiagnosticsSummary);
    ipcMain.handle('app:exportDiagnosticsPackage', exportDiagnosticsPackage);
    ipcMain.handle('app:disableRemoteConfigRestart', () => { saveSettings({ ...settings, remoteConfigEnabled: false }); app.relaunch(); app.quit(); });
    ipcMain.handle('app:resetWindowState', () => removeFile(WINDOW_STATE_PATH));
    ipcMain.handle('app:safeModeInfo', () => ({ reason: safeModeReason, integrity: checkIntegrity() }));
    ipcMain.handle('feedback:submit', (event, value) => submitFeedback(value));
    ipcMain.handle('app:offlineInfo', () => ({ network: wasOnline ? 'online' : 'offline', lastOnlineAt }));
    ipcMain.handle('app:getLogs', () => requireFeature('logs', () => fs.existsSync(LOG_PATH) ? fs.readFileSync(LOG_PATH, 'utf8') : ''));
    ipcMain.handle('app:openLogs', showLogsWindow);
    ipcMain.handle('app:exportDiagnostics', exportDiagnostics);
    ipcMain.handle('onboarding:done', () => {
        fs.writeFileSync(ONBOARDING_DONE_PATH, '1');
        onboardingWindow?.close();
    });
    ipcMain.handle('announcement:read', (event, id) => markAnnouncementRead(id));
    ipcMain.handle('announcement:openUrl', (event, url) => {
        if (url && isAllowedNavigationUrl(url)) return shell.openExternal(url);
        return null;
    });
    ipcMain.handle('notifications:list', () => requireFeature('notifications', () => notifications));
    ipcMain.handle('downloads:list', () => requireFeature('downloads', () => downloads));
    ipcMain.handle('downloads:openFile', (event, filePath) => requireFeature('downloads', () => shell.openPath(filePath)));
    ipcMain.handle('downloads:showInFolder', (event, filePath) => requireFeature('downloads', () => shell.showItemInFolder(filePath)));
}

if (process.argv.includes('--reset-window-state')) removeFile(WINDOW_STATE_PATH);
if (process.argv.includes('--clear-cache')) app.commandLine.appendSwitch('disable-http-cache');

try {
    crashReporter.start({ uploadToServer: false });
} catch (error) {
    log('Crash reporter start failed:', error);
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    registerIpc();
    setupAutoUpdater();

    app.on('ready', () => {
        recordStartupAttempt();
        const integrity = checkIntegrity();
        if (!integrity.ok) dialog.showMessageBox({ type: 'warning', message: '检测到程序文件完整性异常，已进入安全模式。', detail: safeModeReason }).catch(() => {});
        importDefaultLicenseIfNeeded();
        createWindow();
        if (safeModeReason) showSafeModeWindow();
        setTimeout(showCrashRecoveryPrompt, 1200);
        if (!fs.existsSync(ONBOARDING_DONE_PATH)) showOnboardingWindow();
        setTimeout(markStartupSuccess, 8000);
    });

    app.on('second-instance', showMainWindow);
    app.on('activate', showMainWindow);

    app.on('before-quit', () => {
        isQuitting = true;
        if (networkTimer) clearInterval(networkTimer);
        if (reportTimer) clearInterval(reportTimer);
    });

    app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
        event.preventDefault();
        log(`Certificate error: ${url} ${error}`);
        addNotification('error', APP_NAME, `证书错误：${error}`, { system: false });
        if (webContents === mainWindow?.webContents && isAppUrl(url)) showErrorPage(`证书错误：${error}`);
        callback(false);
    });

    app.on('web-contents-created', (event, contents) => {
        contents.on('before-input-event', (inputEvent, input) => {
            if (app.isPackaged && !settings.allowDevTools && input.control && input.shift && input.key.toLowerCase() === 'i') inputEvent.preventDefault();
        });
    });

    app.whenReady().then(() => {
        tray = new Tray(ICON_PATH);
        updateTrayMenu();
        tray.on('click', showMainWindow);
        app.setLoginItemSettings({ openAtLogin: settings.autoLaunch, path: process.execPath });
        registerWindowShortcut();
    }).then(() => {
        netDect();
        fetchRemoteConfig();
        validateLicenseWithServer();
        reportLicenseStatus();
        reportTimer = setInterval(reportLicenseStatus, 30 * 60 * 1000);
        networkTimer = setInterval(netDect, NETWORK_CHECK_INTERVAL);
        if (autoUpdater && app.isPackaged) autoUpdater.checkForUpdates().catch(error => log('Auto update check failed:', error));
    });

    app.on('will-quit', () => {
        globalShortcut.unregisterAll();
    });
}
