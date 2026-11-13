export const SETTINGS_STORAGE_KEY = 'pv_settings_v1';

export const QUALITY_VALUES = ['low', 'medium', 'high'];
export const QUALITY_PRESETS = QUALITY_VALUES;
export const CHUNK_RANGE_VALUES = ['low', 'medium', 'high'];
export const DISTANCE_BLUR_VALUES = ['off', 'low', 'medium', 'high'];
export const RENDER_SCALE_VALUES = [0.65, 0.75, 0.85, 1, 1.25];
export const PAINT_VALUES = ['auto', 0, 1, 2, 3];

export const DEFAULT_SETTINGS = Object.freeze({
  quality: null,
  chunkRange: null,
  distanceBlur: null,
  camera: 'third',
  sound: true,
  renderScale: null,
  paint: 'auto',
  bloom: null,
  fov: 70,
  timeDrift: true,
  hour: 15.5,
});

const PERSISTED_KEYS = Object.keys(DEFAULT_SETTINGS);

const QUALITY_LABELS = {
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
};

const BLUR_LABELS = {
  off: 'Tắt',
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeQuality(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') return DEFAULT_SETTINGS.quality;
  const v = value.trim().toLowerCase();
  if (v === 'auto') return null;
  return QUALITY_VALUES.includes(v) ? v : DEFAULT_SETTINGS.quality;
}

function normalizeChunkRange(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') return DEFAULT_SETTINGS.chunkRange;
  const v = value.trim().toLowerCase();
  if (v === 'auto') return null;
  return CHUNK_RANGE_VALUES.includes(v) ? v : DEFAULT_SETTINGS.chunkRange;
}

function normalizeDistanceBlur(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return value ? 'medium' : 'off';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return DEFAULT_SETTINGS.distanceBlur;
    if (value <= 0) return 'off';
    if (value < 0.6) return 'low';
    if (value < 0.9) return 'medium';
    return 'high';
  }
  if (typeof value !== 'string') return DEFAULT_SETTINGS.distanceBlur;
  const v = value.trim().toLowerCase();
  if (v === 'auto') return null;
  if (v === '0' || v === 'false' || v === 'none') return 'off';
  if (v === '1') return 'low';
  if (v === '2') return 'medium';
  if (v === '3') return 'high';
  return DISTANCE_BLUR_VALUES.includes(v) ? v : DEFAULT_SETTINGS.distanceBlur;
}

function normalizeRenderScale(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string' && value.trim().toLowerCase() === 'auto') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_SETTINGS.renderScale;
  return Math.round(clamp(n, 0.25, 2.5) * 100) / 100;
}

function normalizePaint(value) {
  if (value === null || value === undefined || value === '') return DEFAULT_SETTINGS.paint;
  if (typeof value === 'string' && value.trim().toLowerCase() === 'auto') return 'auto';
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_SETTINGS.paint;
  return clamp(Math.round(n), 0, 3);
}

function normalizeBloom(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string' && value.trim().toLowerCase() === 'auto') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_SETTINGS.bloom;
  return Math.round(clamp(n, 0, 0.2) * 100) / 100;
}

function normalizeFov(value) {
  if (value === null || value === undefined || value === '') return DEFAULT_SETTINGS.fov;
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_SETTINGS.fov;
  return Math.round(clamp(n, 55, 90));
}

function normalizeCamera(value) {
  if (typeof value !== 'string') return DEFAULT_SETTINGS.camera;
  const v = value.trim().toLowerCase();
  return v === 'first' || v === 'third' ? v : DEFAULT_SETTINGS.camera;
}

function normalizeBool(value, fallback) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === 'true' || v === '1' || v === 'on') return true;
    if (v === 'false' || v === '0' || v === 'off') return false;
  }
  return fallback;
}

function normalizeHour(value) {
  if (value === null || value === undefined || value === '') return DEFAULT_SETTINGS.hour;
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_SETTINGS.hour;
  return Math.round(clamp(n, 5, 21) * 100) / 100;
}

function sanitizeSettings(raw, base = DEFAULT_SETTINGS) {
  const src = raw && typeof raw === 'object' ? raw : {};
  return {
    quality: 'quality' in src ? normalizeQuality(src.quality) : base.quality,
    chunkRange: 'chunkRange' in src ? normalizeChunkRange(src.chunkRange) : base.chunkRange,
    distanceBlur: 'distanceBlur' in src ? normalizeDistanceBlur(src.distanceBlur) : base.distanceBlur,
    camera: 'camera' in src ? normalizeCamera(src.camera) : base.camera,
    sound: 'sound' in src ? normalizeBool(src.sound, base.sound) : base.sound,
    renderScale: 'renderScale' in src ? normalizeRenderScale(src.renderScale) : base.renderScale,
    paint: 'paint' in src ? normalizePaint(src.paint) : base.paint,
    bloom: 'bloom' in src ? normalizeBloom(src.bloom) : base.bloom,
    fov: 'fov' in src ? normalizeFov(src.fov) : base.fov,
    timeDrift: 'timeDrift' in src ? normalizeBool(src.timeDrift, base.timeDrift) : base.timeDrift,
    hour: 'hour' in src ? normalizeHour(src.hour) : base.hour,
  };
}

function readStoredSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return sanitizeSettings(parsed, DEFAULT_SETTINGS);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function toSearchParams(params) {
  if (params instanceof URLSearchParams) return params;
  if (typeof params === 'string') return new URLSearchParams(params);
  if (typeof location !== 'undefined') return new URLSearchParams(location.search);
  return new URLSearchParams();
}

/**
 * Auto-detects hardware tier (`'low' | 'medium' | 'high'`) from GPU renderer string,
 * integrated flag, CPU logical cores (`navigator.hardwareConcurrency`), and RAM (`navigator.deviceMemory`).
 */
export function detectHardwarePreset(info = {}) {
  const nav = typeof navigator !== 'undefined' ? navigator : {};
  const name = String(info.gpuName ?? '');
  const cores = Number(info.cores ?? nav.hardwareConcurrency);
  const memoryGB = Number(info.memoryGB ?? nav.deviceMemory);

  if (/swiftshader|llvmpipe|mesa|softpipe|microsoft basic render/i.test(name)) return 'low';
  if ((Number.isFinite(cores) && cores > 0 && cores <= 4) || (Number.isFinite(memoryGB) && memoryGB > 0 && memoryGB <= 4)) {
    return 'low';
  }

  const isStrongGpu =
    /\b(rtx\s*(?:a\d{3,4}|[2-9]\d[6-9]0|titan)|gtx\s*(?:10[78]0|1660)|rx\s*(?:6[6-9]\d{2}|[7-9]\d{3})|arc\s*[ab][57]\d{2}|radeon\s+pro\s+[wv]|quadro\s+rtx)\b/i.test(
      name,
    );
  const isMidGpu =
    /\b(gtx\s*(?:9[56]0|1050|1060|1650)|mx\s*\d+|rtx\s*(?:2050|3050|4050)|apple\s*(?:m[12]\b|gpu)|rx\s*(?:5[5-8]0|6[45]00))\b/i.test(
      name,
    );
  const isAppleM3Plus = /\bapple\s*m[3-9]\b/i.test(name);

  if (isAppleM3Plus) return /\b(pro|max|ultra)\b/i.test(name) ? 'high' : 'medium';
  if (isMidGpu && !isStrongGpu) return 'medium';

  const isIntegrated =
    info.integratedGpu !== undefined
      ? Boolean(info.integratedGpu)
      : /\b(intel|uhd|iris|hd graphics|vega|swiftshader|llvmpipe|mesa)\b|radeon\(tm\)\s*graphics/i.test(name) &&
        !/\b(rtx|gtx|geforce|quadro|radeon\s+(?:rx|pro)|rx\s+[4-9]\d{2,3}|vega\s+(?:56|64)|arc)\b/i.test(name);

  if (isIntegrated) return 'low';
  if (isStrongGpu) return 'high';
  if (Number.isFinite(cores) && cores > 0 && cores <= 6) return 'medium';
  if (info.integratedGpu === false) return 'high';
  return Number.isFinite(cores) && cores >= 8 ? 'medium' : 'low';
}

/**
 * Loads settings from `localStorage` (`pv_settings_v1`) and applies URL search param overrides.
 * URL params (?quality=, ?chunk=, ?blur=, ?dpr=, ?paint=, ?samples=, ?bloom=, ?fov=, ?view=, ?hour=, ?drift=, ?nosound)
 * always take priority over saved values without mutating `localStorage`.
 */
export function loadSettings(params) {
  const search = toSearchParams(params);
  const stored = readStoredSettings();
  const overrides = {
    quality: false,
    chunkRange: false,
    distanceBlur: false,
    camera: false,
    sound: false,
    renderScale: false,
    paint: false,
    samples: false,
    bloom: false,
    fov: false,
    timeDrift: false,
    hour: false,
  };

  if (search.has('quality')) {
    const q = search.get('quality')?.trim().toLowerCase();
    if (q === 'auto' || QUALITY_VALUES.includes(q)) {
      stored.quality = q === 'auto' ? null : q;
      overrides.quality = true;
    }
  }
  if (search.has('chunk')) {
    const c = search.get('chunk')?.trim().toLowerCase();
    if (c === 'auto' || CHUNK_RANGE_VALUES.includes(c)) {
      stored.chunkRange = c === 'auto' ? null : c;
      overrides.chunkRange = true;
    }
  }
  if (search.has('blur')) {
    const raw = search.get('blur')?.trim().toLowerCase();
    if (raw === 'auto' || DISTANCE_BLUR_VALUES.includes(raw) || ['0', '1', '2', '3', 'false', 'none'].includes(raw)) {
      stored.distanceBlur = normalizeDistanceBlur(raw);
      overrides.distanceBlur = true;
    }
  }
  if (search.has('dpr')) {
    const raw = search.get('dpr')?.trim().toLowerCase();
    if (raw === 'auto') {
      stored.renderScale = null;
      overrides.renderScale = true;
    } else {
      const dpr = Number(raw);
      if (Number.isFinite(dpr) && dpr > 0) {
        stored.renderScale = normalizeRenderScale(dpr);
        overrides.renderScale = true;
      }
    }
  }
  if (search.has('paint')) {
    const raw = search.get('paint')?.trim().toLowerCase();
    if (raw === 'auto' || (Number.isFinite(Number(raw)) && raw !== '')) {
      stored.paint = normalizePaint(raw);
      overrides.paint = true;
    }
  }

  let samples = null;
  if (search.has('samples')) {
    const s = Number(search.get('samples'));
    if (Number.isFinite(s) && s >= 0) {
      samples = Math.round(s);
      overrides.samples = true;
    }
  }

  if (search.has('bloom')) {
    const raw = search.get('bloom')?.trim().toLowerCase();
    if (raw === 'auto') {
      stored.bloom = null;
      overrides.bloom = true;
    } else {
      const b = Number(raw);
      if (Number.isFinite(b)) {
        stored.bloom = normalizeBloom(b);
        overrides.bloom = true;
      }
    }
  }
  if (search.has('fov')) {
    const f = Number(search.get('fov'));
    if (Number.isFinite(f)) {
      stored.fov = normalizeFov(f);
      overrides.fov = true;
    }
  }
  if (search.has('view')) {
    const v = search.get('view')?.trim().toLowerCase();
    if (v === 'first' || v === 'third') {
      stored.camera = v;
      overrides.camera = true;
    }
  }
  if (search.has('nosound')) {
    stored.sound = false;
    overrides.sound = true;
  }
  if (search.has('drift')) {
    const d = Number(search.get('drift'));
    if (Number.isFinite(d)) {
      stored.timeDrift = d > 0;
      overrides.timeDrift = true;
    }
  }
  if (search.has('hour')) {
    const h = Number(search.get('hour'));
    if (Number.isFinite(h)) {
      stored.hour = normalizeHour(h);
      overrides.hour = true;
    }
  }

  return {
    ...stored,
    samples,
    overrides,
  };
}

/**
 * Merges and persists sanitized user preferences into `localStorage` (`pv_settings_v1`).
 */
export function saveSettings(partial) {
  const base = readStoredSettings();
  const pick = {};
  if (partial && typeof partial === 'object') {
    for (const key of PERSISTED_KEYS) {
      if (key in partial) pick[key] = partial[key];
    }
  }
  const clean = sanitizeSettings(pick, base);
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(clean));
  } catch {
    // storage may be unavailable in restricted contexts
  }
  return clean;
}

/**
 * Clears saved settings (`pv_settings_v1`) and returns a fresh copy of `DEFAULT_SETTINGS`.
 */
export function resetSettings() {
  try {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
  } catch {
    // storage may be unavailable in restricted contexts
  }
  return { ...DEFAULT_SETTINGS };
}

/**
 * Resolves `null | 'auto' | 'low' | 'medium' | 'high'` to a concrete preset (`'low' | 'medium' | 'high'`).
 * Accepts either hardware info `{ gpuName, integratedGpu, cores, memoryGB }` or a boolean `integratedGpu`.
 */
export function resolveEffectiveQuality(pref, hardwareOrIntegrated = false) {
  const normalized = normalizeQuality(pref);
  if (normalized) return normalized;
  if (hardwareOrIntegrated && typeof hardwareOrIntegrated === 'object') {
    return detectHardwarePreset(hardwareOrIntegrated);
  }
  return hardwareOrIntegrated ? 'low' : 'high';
}

/**
 * Resolves `null | 'auto' | 'low' | 'medium' | 'high'` chunk view range against the active quality preset.
 */
export function resolveEffectiveChunkRange(pref, effectiveQuality = 'low') {
  const normalized = normalizeChunkRange(pref);
  if (normalized) return normalized;
  return QUALITY_VALUES.includes(effectiveQuality) ? effectiveQuality : 'low';
}

/**
 * Resolves `null | 'auto' | 'off' | 'low' | 'medium' | 'high'` distance blur against the active quality preset.
 */
export function resolveEffectiveDistanceBlur(pref, effectiveQuality = 'low') {
  const normalized = normalizeDistanceBlur(pref);
  if (normalized) return normalized;
  return QUALITY_VALUES.includes(effectiveQuality) ? effectiveQuality : 'low';
}

/**
 * Resolves `null | 'auto' | number` bloom preference (`0` on `'low'`, `0.1` on `'medium'|'high'`).
 */
export function resolveEffectiveBloom(pref, effectiveQuality = 'high') {
  const n = normalizeBloom(pref);
  if (n !== null) return n;
  return effectiveQuality === 'low' ? 0 : 0.1;
}

function formatScale(scale) {
  return Number(scale.toFixed(2)).toString();
}

function formatGpuName(raw) {
  if (!raw) return 'WebGL 2 GPU';
  let name = String(raw).trim();
  const angleMatch = /^ANGLE\s*\([^,]+,\s*(.+?)(?:,\s*(?:D3D\d+|OpenGL|Vulkan|Metal|SwiftShader)[^)]*)?\)$/i.exec(name);
  if (angleMatch) name = angleMatch[1].trim();
  name = name
    .replace(/\s+Direct3D\d+.*$/i, '')
    .replace(/\s*\(0x[0-9a-fA-F]+\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return name || String(raw).trim();
}

function formatChunkTelemetry(info) {
  const c = info.chunks && typeof info.chunks === 'object' ? info.chunks : info;
  const built = c.builtChunks ?? c.built;
  const total = c.totalChunks ?? c.total;
  const visible = c.visibleChunks ?? c.visible;
  if (!Number.isFinite(built) || !Number.isFinite(total)) return null;
  if (Number.isFinite(visible)) return `${built} / ${total} (${visible} hiện)`;
  return `${built} / ${total}`;
}

function pickSettings(src) {
  return sanitizeSettings(src, DEFAULT_SETTINGS);
}

/**
 * Wires `#settings-toggle` and `#settings-panel` in `index.html`.
 * Returns `{ open, close, toggle, isOpen, getSettings, syncState, updateTelemetry, destroy }`.
 */
export function createSettingsUI(hooks = {}) {
  const $ = (id) => document.getElementById(id);

  const toggleBtn = $('settings-toggle');
  const backdrop = $('settings-backdrop');
  const panel = $('settings-panel');
  const closeXBtn = $('settings-close-x');
  const closeBtn = $('settings-close');
  const resetBtn = $('settings-reset');
  const reloadBar = $('settings-reload-bar');
  const reloadNote = $('settings-reload-note');
  const reloadBtn = $('settings-reload');
  const modeBadge = $('settings-mode-badge');

  const telFps = $('settings-tel-fps');
  const telGpu = $('settings-tel-gpu');
  const telGpuTag = $('settings-tel-gpu-tag');
  const telRes = $('settings-tel-res');
  const telChunks = $('settings-tel-chunks');

  const qualityGroup = $('settings-quality');
  const qualityHint = $('settings-quality-hint');
  const qualityVal = $('settings-quality-val');
  const chunkRangeGroup = $('settings-chunk-range');
  const chunkRangeVal = $('settings-chunk-range-val');
  const distanceBlurGroup = $('settings-distance-blur');
  const distanceBlurVal = $('settings-distance-blur-val');
  const cameraGroup = $('settings-camera');
  const cameraVal = $('settings-camera-val');
  const soundInput = $('settings-sound');
  const soundVal = $('settings-sound-val');

  const initial = hooks.initialSettings ?? loadSettings();
  let state = pickSettings(initial);
  const overrides = { ...(initial.overrides ?? {}) };
  let gpuName = hooks.gpuName ?? '';
  let integratedGpu = hooks.integratedGpu;
  const cores = hooks.cores;
  const memoryGB = hooks.memoryGB;

  const getHardwarePreset = () =>
    hooks.hardwarePreset ?? detectHardwarePreset({ gpuName, integratedGpu, cores, memoryGB });

  let effectiveQuality = hooks.effectiveQuality ?? resolveEffectiveQuality(state.quality, { gpuName, integratedGpu, cores, memoryGB });
  const bootEffectiveQuality = effectiveQuality;

  let open = false;
  const dirtyKeys = new Set();

  const cleanups = [];
  const on = (el, type, fn, opts) => {
    if (!el) return;
    el.addEventListener(type, fn, opts);
    cleanups.push(() => el.removeEventListener(type, fn, opts));
  };

  function setActiveSegment(group, matchValue) {
    if (!group) return;
    for (const btn of group.querySelectorAll('button[data-value]')) {
      const active = btn.dataset.value === matchValue;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    }
  }

  function renderControls() {
    const autoPreset = getHardwarePreset();
    const targetQuality = state.quality ?? autoPreset;
    const isAutoQuality = state.quality === null;

    if (modeBadge) {
      if (overrides.quality) {
        modeBadge.textContent = 'URL';
        modeBadge.classList.add('manual');
      } else if (isAutoQuality) {
        modeBadge.textContent = 'Tự động theo máy';
        modeBadge.classList.remove('manual');
      } else {
        modeBadge.textContent = 'Thủ công';
        modeBadge.classList.add('manual');
      }
    }

    setActiveSegment(qualityGroup, targetQuality);
    if (qualityVal) {
      const baseLabel = QUALITY_LABELS[targetQuality] ?? targetQuality;
      const suffix = overrides.quality ? ' · URL' : isAutoQuality ? ' (Theo máy)' : '';
      qualityVal.textContent = `${baseLabel}${suffix}`;
    }
    if (qualityHint) {
      if (isAutoQuality) {
        qualityHint.textContent =
          integratedGpu === true ? '(GPU tích hợp)' : integratedGpu === false ? '(GPU rời)' : '(Theo máy)';
      } else {
        qualityHint.textContent = '';
      }
    }

    const qualityDirty = targetQuality !== bootEffectiveQuality;
    if (reloadBar) {
      reloadBar.hidden = !qualityDirty;
      if (qualityDirty && reloadNote) {
        const fromLabel = QUALITY_LABELS[bootEffectiveQuality] ?? bootEffectiveQuality;
        const toLabel = QUALITY_LABELS[targetQuality] ?? targetQuality;
        reloadNote.textContent = `Mức đồ họa đổi (${fromLabel} → ${toLabel}). Áp dụng & tải lại để dựng lại cảnh.`;
      }
    }

    const activeChunk = resolveEffectiveChunkRange(state.chunkRange, effectiveQuality);
    setActiveSegment(chunkRangeGroup, activeChunk);
    if (chunkRangeVal) {
      const baseLabel = QUALITY_LABELS[activeChunk] ?? activeChunk;
      const suffix = overrides.chunkRange ? ' · URL' : state.chunkRange === null ? ' (Theo cấu hình)' : '';
      chunkRangeVal.textContent = `${baseLabel}${suffix}`;
    }

    const activeBlur = resolveEffectiveDistanceBlur(state.distanceBlur, effectiveQuality);
    setActiveSegment(distanceBlurGroup, activeBlur);
    if (distanceBlurVal) {
      const baseLabel = BLUR_LABELS[activeBlur] ?? activeBlur;
      const suffix = overrides.distanceBlur ? ' · URL' : state.distanceBlur === null ? ' (Theo cấu hình)' : '';
      distanceBlurVal.textContent = `${baseLabel}${suffix}`;
    }

    setActiveSegment(cameraGroup, state.camera);
    if (cameraVal) cameraVal.textContent = state.camera === 'first' ? 'Thứ 1' : 'Thứ 3';

    if (soundInput) soundInput.checked = state.sound;
    if (soundVal) soundVal.textContent = state.sound ? 'Bật' : 'Tắt';
  }

  function updateTelemetry(info = {}) {
    let hardwareChanged = false;
    if (typeof info.gpuName === 'string' && info.gpuName !== gpuName) {
      gpuName = info.gpuName;
      hardwareChanged = true;
    }
    if (typeof info.integratedGpu === 'boolean' && info.integratedGpu !== integratedGpu) {
      integratedGpu = info.integratedGpu;
      hardwareChanged = true;
    }
    if (typeof info.effectiveQuality === 'string' && QUALITY_VALUES.includes(info.effectiveQuality)) {
      effectiveQuality = info.effectiveQuality;
    }

    if (telFps && 'fps' in info) {
      telFps.textContent = Number.isFinite(info.fps)
        ? `${info.fps >= 10 ? Math.round(info.fps) : info.fps.toFixed(1)} fps`
        : '-- fps';
    }
    if (telGpu) {
      telGpu.textContent = formatGpuName(gpuName);
      telGpu.title = gpuName || 'WebGL 2 GPU';
    }
    if (telGpuTag) {
      if (gpuName || typeof info.integratedGpu === 'boolean' || hooks.integratedGpu !== undefined) {
        telGpuTag.hidden = false;
        telGpuTag.textContent = integratedGpu ? 'Tích hợp' : 'Rời';
        telGpuTag.classList.toggle('integrated', Boolean(integratedGpu));
        telGpuTag.classList.toggle('discrete', !integratedGpu);
      } else {
        telGpuTag.hidden = true;
      }
    }
    if (telRes && (Number.isFinite(info.width) || Number.isFinite(info.height))) {
      const w = Math.round(info.width ?? 0);
      const h = Math.round(info.height ?? 0);
      const dpr = Number.isFinite(info.pixelRatio) ? ` @ ${formatScale(info.pixelRatio)}×` : '';
      telRes.textContent = `${w} × ${h}${dpr}`;
    }
    if (telChunks) {
      const chunkText = formatChunkTelemetry(info);
      if (chunkText !== null) telChunks.textContent = chunkText;
    }
    if (hardwareChanged) renderControls();
  }

  function syncState(partial = {}) {
    if (!partial || typeof partial !== 'object') return;
    state = sanitizeSettings(partial, state);
    renderControls();
  }

  function openSettings() {
    if (open || !backdrop) return;
    if (document.pointerLockElement) {
      try {
        document.exitPointerLock?.();
      } catch {
        // ignore pointer lock exit failures
      }
    }
    const runtime = hooks.getRuntimeState?.();
    if (runtime) syncState(runtime);
    const tel = hooks.getTelemetry?.();
    if (tel) updateTelemetry(tel);

    open = true;
    backdrop.hidden = false;
    document.body.classList.add('settings-open');
    toggleBtn?.setAttribute('aria-expanded', 'true');
    renderControls();
    closeXBtn?.focus({ preventScroll: true });
    hooks.onOpen?.();
  }

  function closeSettings({ resume = false } = {}) {
    if (!open || !backdrop) return;
    open = false;
    backdrop.hidden = true;
    document.body.classList.remove('settings-open');
    toggleBtn?.setAttribute('aria-expanded', 'false');
    hooks.onClose?.(resume);
    if (resume) {
      if (hooks.requestPointerLock) {
        hooks.requestPointerLock();
      } else {
        document.getElementById('view')?.requestPointerLock?.()?.catch?.(() => {});
      }
    }
  }

  function applySetting(key, value) {
    state = sanitizeSettings({ [key]: value }, state);
    if (key in overrides) overrides[key] = false;
    dirtyKeys.add(key);
    saveSettings({ [key]: state[key] });
    renderControls();

    if (key === 'quality') {
      hooks.onQualityChange?.(state.quality);
    } else if (key === 'chunkRange') {
      const resolved = resolveEffectiveChunkRange(state.chunkRange, effectiveQuality);
      hooks.onChunkRangeChange?.(resolved, state.chunkRange);
    } else if (key === 'distanceBlur') {
      const resolved = resolveEffectiveDistanceBlur(state.distanceBlur, effectiveQuality);
      hooks.onDistanceBlurChange?.(resolved, state.distanceBlur);
    } else if (key === 'camera') {
      hooks.onCameraChange?.(state.camera);
    } else if (key === 'sound') {
      hooks.onSoundChange?.(state.sound);
    }
    hooks.onChange?.({ ...state }, key);
  }

  on(toggleBtn, 'click', (e) => {
    e.stopPropagation();
    if (open) closeSettings({ resume: false });
    else openSettings();
  });

  on(panel, 'click', (e) => e.stopPropagation());
  on(backdrop, 'click', (e) => {
    if (e.target === backdrop) closeSettings({ resume: false });
  });
  on(closeXBtn, 'click', () => closeSettings({ resume: false }));
  on(closeBtn, 'click', () => closeSettings({ resume: true }));

  on(qualityGroup, 'click', (e) => {
    const btn = e.target.closest('button[data-value]');
    if (!btn) return;
    applySetting('quality', btn.dataset.value);
  });

  on(chunkRangeGroup, 'click', (e) => {
    const btn = e.target.closest('button[data-value]');
    if (!btn) return;
    applySetting('chunkRange', btn.dataset.value);
  });

  on(distanceBlurGroup, 'click', (e) => {
    const btn = e.target.closest('button[data-value]');
    if (!btn) return;
    applySetting('distanceBlur', btn.dataset.value);
  });

  on(cameraGroup, 'click', (e) => {
    const btn = e.target.closest('button[data-value]');
    if (!btn) return;
    applySetting('camera', btn.dataset.value);
  });

  on(soundInput, 'change', () => applySetting('sound', soundInput.checked));

  on(resetBtn, 'click', () => {
    const defaults = resetSettings();
    state = { ...defaults };
    dirtyKeys.clear();
    for (const k of Object.keys(overrides)) overrides[k] = false;
    renderControls();

    const targetQuality = getHardwarePreset();
    const resolvedChunk = resolveEffectiveChunkRange(state.chunkRange, effectiveQuality);
    const resolvedBlur = resolveEffectiveDistanceBlur(state.distanceBlur, effectiveQuality);
    hooks.onChunkRangeChange?.(resolvedChunk, state.chunkRange);
    hooks.onDistanceBlurChange?.(resolvedBlur, state.distanceBlur);
    hooks.onCameraChange?.(state.camera);
    hooks.onSoundChange?.(state.sound);
    hooks.onReset?.({ ...state, targetQuality });
    hooks.onChange?.({ ...state }, 'reset');
  });

  on(reloadBtn, 'click', () => {
    if (dirtyKeys.size > 0) {
      const patch = {};
      for (const key of dirtyKeys) patch[key] = state[key];
      saveSettings(patch);
    }
    if (hooks.onReload) {
      hooks.onReload({ ...state });
      return;
    }
    const url = new URL(location.href);
    let urlChanged = false;
    const stripParam = (param) => {
      if (url.searchParams.has(param)) {
        url.searchParams.delete(param);
        urlChanged = true;
      }
    };
    stripParam('quality');
    stripParam('samples');
    if (dirtyKeys.has('chunkRange') || !overrides.chunkRange) stripParam('chunk');
    if (dirtyKeys.has('distanceBlur') || !overrides.distanceBlur) stripParam('blur');
    if (urlChanged) location.assign(url.toString());
    else location.reload();
  });

  const onWindowKeyDown = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === 'KeyO') {
      if (!document.body.classList.contains('ready') && !open) return;
      e.preventDefault();
      e.stopPropagation();
      if (open) closeSettings({ resume: false });
      else openSettings();
      return;
    }
    if (!open) return;
    if (e.code === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeSettings({ resume: false });
      return;
    }
    e.stopPropagation();
  };
  window.addEventListener('keydown', onWindowKeyDown, { capture: true });
  cleanups.push(() => window.removeEventListener('keydown', onWindowKeyDown, { capture: true }));

  renderControls();
  updateTelemetry({
    gpuName,
    integratedGpu,
    effectiveQuality,
    qualityPref: state.quality,
  });

  return {
    open: openSettings,
    close: closeSettings,
    toggle: () => (open ? closeSettings({ resume: false }) : openSettings()),
    isOpen: () => open,
    getSettings: () => ({ ...state }),
    syncState,
    updateTelemetry,
    destroy: () => {
      for (const cleanup of cleanups.splice(0)) cleanup();
    },
  };
}
