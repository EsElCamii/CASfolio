(function() {
  const HERO_UPLOAD_MAX_RETRIES = 3;
  const HERO_UPLOAD_LIMIT_BYTES = 5 * 1024 * 1024; // 5MB default, aligned with server fallback
  const HERO_UPLOAD_LIMIT_LABEL = '5MB';
  const QUEUE_STORAGE_KEY = 'casfolio_pending_queue';
  const PENDING_CUSTOMIZE_KEY = 'casfolio_pending_customize';

  function nowIso() {
    return new Date().toISOString();
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function isOfflineError(error) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
    if (!error) return false;
    if (error.name === 'AbortError') return false;
    return error instanceof TypeError;
  }

  function debounce(fn, wait) {
    let timer = null;
    return function debounced(...args) {
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        timer = null;
        fn.apply(this, args);
      }, wait);
    };
  }

  class ToastManager {
    constructor() {
      this.root = null;
      this.active = new Set();
    }

    ensureRoot() {
      if (this.root) return;
      const root = document.createElement('div');
      root.className = 'toast-root';
      root.setAttribute('role', 'status');
      root.setAttribute('aria-live', 'polite');
      document.body.appendChild(root);
      this.root = root;
    }

    show(message, { type = 'info', duration = 5000 } = {}) {
      if (!message) return;
      this.ensureRoot();
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.textContent = message;
      this.root.appendChild(toast);
      this.active.add(toast);

      const close = () => {
        if (!this.active.has(toast)) return;
        this.active.delete(toast);
        toast.classList.add('toast-leave');
        setTimeout(() => {
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
          }
        }, 200);
      };

      toast.addEventListener('click', close);

      if (duration > 0) {
        setTimeout(close, duration);
      }

      return close;
    }

    info(message, options) {
      return this.show(message, { ...(options || {}), type: 'info' });
    }

    success(message, options) {
      return this.show(message, { ...(options || {}), type: 'success' });
    }

    warn(message, options) {
      return this.show(message, { ...(options || {}), type: 'warning' });
    }

    error(message, options) {
      return this.show(message, { ...(options || {}), type: 'error', duration: Math.max((options && options.duration) || 6000, 4000) });
    }
  }

  function loadJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (_error) {
      return fallback;
    }
  }

  function saveJson(key, value) {
    try {
      if (value === undefined || value === null) {
        localStorage.removeItem(key);
        return;
      }
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_error) {
      // Ignore quota errors for now
    }
  }

  function clone(value) {
    if (value === null || value === undefined) return value;
    if (typeof structuredClone === 'function') {
      try {
        return structuredClone(value);
      } catch (_error) {
        // fall through
      }
    }
    return JSON.parse(JSON.stringify(value));
  }

  class CasfolioClient {
    constructor() {
      this.baseUrl = '';
      this.toasts = new ToastManager();
      this.limits = {
        heroUploadBytes: HERO_UPLOAD_LIMIT_BYTES,
        heroUploadLabel: HERO_UPLOAD_LIMIT_LABEL,
      };
      this.abortControllers = new Map();
      this.listeners = new Map();
      this.state = {
        customize: null,
        hero: null,
        activities: null,
      };
      this.pendingCustomizePatch = loadJson(PENDING_CUSTOMIZE_KEY, null);
      this.queue = loadJson(QUEUE_STORAGE_KEY, []);
      this.processingQueue = false;
      this.debouncedFlushCustomize = debounce(() => this.flushCustomizePatch(), 800);

      if (typeof window !== 'undefined') {
        window.addEventListener('online', () => {
          this.toasts.info('Back online. Syncing pending CASfolio changes...');
          this.flushQueue();
          this.flushCustomizePatch();
        });
      }

      if (this.pendingCustomizePatch) {
        this.debouncedFlushCustomize();
      }

      // Emit cached state immediately if available
      if (this.state.customize) {
        this.emit('customize', clone(this.state.customize), { optimistic: false, cached: true });
      }
      if (this.state.hero) {
        this.emit('hero', clone(this.state.hero), { optimistic: false, cached: true });
      }
      if (this.state.activities) {
        this.emit('activities', clone(this.state.activities), { optimistic: false, cached: true });
      }
    }

    on(event, handler) {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, new Set());
      }
      const handlers = this.listeners.get(event);
      handlers.add(handler);
      return () => {
        handlers.delete(handler);
      };
    }

    emit(event, payload, meta = {}) {
      const handlers = this.listeners.get(event);
      if (!handlers || handlers.size === 0) return;
      handlers.forEach((handler) => {
        try {
          handler(payload, meta);
        } catch (error) {
          console.error('CASfolio client listener error', error);
        }
      });
    }

    abort(key) {
      const controller = this.abortControllers.get(key);
      if (controller) {
        controller.abort();
        this.abortControllers.delete(key);
      }
    }

    async request(key, path, options = {}) {
      if (key) {
        this.abort(key);
      }
      const controller = new AbortController();
      const headers = Object.assign({}, options.headers || {});
      const finalOptions = Object.assign(
        {
          credentials: 'include',
        },
        options,
        {
          headers,
          signal: controller.signal,
        }
      );
      if (key) {
        this.abortControllers.set(key, controller);
      }

      try {
        const response = await fetch(this.baseUrl + path, finalOptions);
        if (!response.ok) {
          let details = null;
          try {
            details = await response.json();
          } catch (_error) {
            // swallow
          }
          const error = new Error(details && details.error ? details.error : `Request failed with status ${response.status}`);
          error.status = response.status;
          error.details = details;
          throw error;
        }
        return response;
      } catch (error) {
        if (error.name === 'AbortError') {
          throw error;
        }
        throw error;
      } finally {
        if (key) {
          this.abortControllers.delete(key);
        }
      }
    }

    async fetchCustomize(options = {}) {
      const force = Boolean(options.force);
      if (!force && this.state.customize) {
        return clone(this.state.customize);
      }
      try {
        const response = await this.request('customize:fetch', '/api/customize', {
          method: 'GET',
        });
        const data = await response.json();
        this.state.customize = data;
        if (data && data.hero) {
          this.state.hero = data.hero;
          this.emit('hero', clone(data.hero), { optimistic: false, source: 'customize' });
        }
        this.emit('customize', clone(data), { optimistic: false, source: 'fetch' });
        return clone(data);
      } catch (error) {
        if (isOfflineError(error)) {
          this.toasts.warn('You appear to be offline. Showing the last saved customization.');
          return clone(this.state.customize);
        }
        throw error;
      }
    }

    queueCustomizePatch(patch) {
      if (!patch || typeof patch !== 'object') return;
      this.pendingCustomizePatch = this.mergeCustomizePatch(this.pendingCustomizePatch || {}, patch);
      saveJson(PENDING_CUSTOMIZE_KEY, this.pendingCustomizePatch);
      this.debouncedFlushCustomize();
    }

    mergeCustomizePatch(target, patch) {
      const next = target ? clone(target) : {};
      Object.keys(patch).forEach((key) => {
        const value = patch[key];
        if (value === undefined) return;
        if (value === null) {
          next[key] = null;
          return;
        }
        if (Array.isArray(value)) {
          next[key] = value.map((item) => clone(item));
        } else if (typeof value === 'object') {
          next[key] = this.mergeCustomizePatch(next[key] || {}, value);
        } else {
          next[key] = value;
        }
      });
      return next;
    }

    async flushCustomizePatch() {
      if (!this.pendingCustomizePatch) return;
      const patch = this.pendingCustomizePatch;
      this.pendingCustomizePatch = null;
      saveJson(PENDING_CUSTOMIZE_KEY, null);

      try {
        const response = await this.request('customize:update', '/api/customize', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        const data = await response.json();
        this.state.customize = data;
        if (data && data.hero) {
          this.state.hero = data.hero;
          this.emit('hero', clone(data.hero), { optimistic: false, source: 'customize' });
        }
        this.emit('customize', clone(data), { optimistic: false, source: 'mutation' });
        await this.flushQueue();
        return data;
      } catch (error) {
        if (isOfflineError(error)) {
          this.enqueueOperation({ type: 'customize', payload: patch });
          this.toasts.info('Saved changes locally. They will sync once you are back online.');
          return null;
        }
        this.toasts.error(error && error.message ? error.message : 'Failed to save customization changes.');
        throw error;
      }
    }

    async fetchHero(options = {}) {
      const force = Boolean(options.force);
      if (!force && this.state.hero) {
        return clone(this.state.hero);
      }
      try {
        const response = await this.request('hero:fetch', '/api/hero-image', { method: 'GET' });
        const data = await response.json();
        this.state.hero = data.hero;
        this.emit('hero', clone(data.hero), { optimistic: false, source: 'fetch' });
        return clone(data.hero);
      } catch (error) {
        if (isOfflineError(error)) {
          this.toasts.warn('Cannot reach the server. Showing cached hero image.');
          return clone(this.state.hero);
        }
        throw error;
      }
    }

    async computeChecksum(file) {
      if (!file || !file.arrayBuffer) return null;
      try {
        const buffer = await file.arrayBuffer();
        const digest = await crypto.subtle.digest('SHA-256', buffer);
        const bytes = Array.from(new Uint8Array(digest));
        return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
      } catch (_error) {
        return null;
      }
    }

    async uploadHeroImage(file) {
      if (!(file instanceof File)) {
        throw new Error('Expected a File to upload.');
      }
      if (!file.type || !file.type.startsWith('image/')) {
        this.toasts.error('Please choose a valid image file.');
        throw new Error('Invalid image file');
      }
      if (file.size > this.limits.heroUploadBytes) {
        this.toasts.error(`Image is too large. Please choose a file under ${this.limits.heroUploadLabel}.`);
        throw new Error('Image too large');
      }

      const checksum = await this.computeChecksum(file);
      const previewUrl = URL.createObjectURL(file);
      const optimisticHero = {
        url: previewUrl,
        path: null,
        checksum: checksum,
        updatedAt: nowIso(),
        source: 'upload-preview',
      };
      this.state.hero = optimisticHero;
      this.emit('hero', clone(optimisticHero), { optimistic: true, source: 'upload' });

      let attempt = 0;
      let lastError = null;
      while (attempt < HERO_UPLOAD_MAX_RETRIES) {
        attempt += 1;
        try {
          const form = new FormData();
          form.append('file', file);
          const response = await this.request(`hero:upload:${attempt}`, '/api/hero-image', {
            method: 'POST',
            body: form,
          });
          const data = await response.json();
          URL.revokeObjectURL(previewUrl);
          this.state.hero = data.hero;
          if (data && data.hero && checksum && data.hero.checksum && data.hero.checksum !== checksum) {
            this.toasts.warn('Hero image synced, but checksum differed from the local copy. Using server version.');
          }
          this.emit('hero', clone(data.hero), { optimistic: false, source: 'upload' });
          this.invalidate('customize');
          return data.hero;
        } catch (error) {
          lastError = error;
          if (error.name === 'AbortError') {
            URL.revokeObjectURL(previewUrl);
            throw error;
          }
          if (attempt < HERO_UPLOAD_MAX_RETRIES && !isOfflineError(error)) {
            this.toasts.warn(`Upload failed (attempt ${attempt}). Retrying...`);
            await delay(600 * attempt);
            continue;
          }
          break;
        }
      }

      URL.revokeObjectURL(previewUrl);

      if (lastError && isOfflineError(lastError)) {
        const dataUrl = await this.fileToDataUrl(file);
        this.enqueueOperation({ type: 'hero-upload', payload: { name: file.name, type: file.type, dataUrl } });
        this.toasts.info('Offline detected. Hero image queued and will upload when you reconnect.');
        return null;
      }

      this.toasts.error('Failed to upload hero image.');
      throw lastError || new Error('Hero upload failed');
    }

    async setHeroImageUrl(url) {
      const normalized = typeof url === 'string' && url.trim() !== '' ? url.trim() : null;
      try {
        const response = await this.request('hero:set-url', '/api/hero-image', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: normalized }),
        });
        const data = await response.json();
        this.state.hero = data.hero;
        this.emit('hero', clone(data.hero), { optimistic: false, source: 'url' });
        this.invalidate('customize');
        return data.hero;
      } catch (error) {
        if (isOfflineError(error)) {
          this.enqueueOperation({ type: 'hero-url', payload: { url: normalized } });
          this.toasts.info('Saved hero URL offline. It will sync when you are online.');
          return null;
        }
        this.toasts.error(error && error.message ? error.message : 'Failed to update hero image URL.');
        throw error;
      }
    }

    async clearHeroImage() {
      try {
        await this.request('hero:clear', '/api/hero-image', {
          method: 'DELETE',
        });
        const cleared = { url: null, path: null, checksum: null, updatedAt: null, source: null };
        this.state.hero = cleared;
        this.emit('hero', clone(cleared), { optimistic: false, source: 'clear' });
        this.invalidate('customize');
        return cleared;
      } catch (error) {
        if (isOfflineError(error)) {
          this.enqueueOperation({ type: 'hero-clear', payload: {} });
          this.toasts.info('Hero image removal queued until you are back online.');
          return null;
        }
        this.toasts.error('Failed to clear hero image.');
        throw error;
      }
    }

    invalidate(resource) {
      switch (resource) {
        case 'customize':
          this.state.customize = null;
          break;
        case 'hero':
          this.state.hero = null;
          break;
        case 'activities':
          this.state.activities = null;
          break;
        default:
          break;
      }
    }

    getActivityState() {
      if (!Array.isArray(this.state.activities)) {
        this.state.activities = [];
      }
      return this.state.activities;
    }

    setActivityState(list, meta = {}) {
      this.state.activities = Array.isArray(list) ? list : [];
      this.emit('activities', clone(this.state.activities), meta);
    }

    async fetchActivities(options = {}) {
      const force = Boolean(options.force);
      if (!force && Array.isArray(this.state.activities) && this.state.activities.length > 0) {
        return { activities: clone(this.state.activities) };
      }
      try {
        const response = await this.request('activities:fetch', '/api/activities', { method: 'GET' });
        const data = await response.json();
        const activities = data.activities || [];
        this.setActivityState(activities, { optimistic: false, source: 'fetch' });
        return { activities: clone(activities) };
      } catch (error) {
        if (isOfflineError(error)) {
          this.toasts.warn('Unable to load activities. Showing cached items if available.');
          return { activities: clone(this.state.activities || []) };
        }
        throw error;
      }
    }

    async createActivity(payload, options = {}) {
      const tempId = `temp-${Date.now().toString(36)}`;
      const optimistic = options.optimisticActivity ? clone(options.optimisticActivity) : Object.assign(
        {
          id: tempId,
          title: payload.title || 'Untitled activity',
          description: payload.description || '',
          category: payload.category || 'creativity',
          status: payload.status || 'draft',
          startDate: payload.startDate || null,
          endDate: payload.endDate || null,
          hours: payload.hours || 0,
          learningOutcomes: Array.isArray(payload.learningOutcomes) ? payload.learningOutcomes : [],
          headerImageUrl: payload.headerImageUrl || null,
          createdAt: nowIso(),
          updatedAt: nowIso(),
          assets: [],
        },
        options.optimisticActivity || {}
      );

      optimistic.id = tempId;

      const activities = this.getActivityState();
      activities.unshift(optimistic);
      this.setActivityState(activities, { optimistic: true, action: 'create', activity: clone(optimistic) });

      try {
        const response = await this.request(`activities:create:${tempId}`, '/api/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        this.replaceActivity(tempId, data.activity);
        this.setActivityState(this.getActivityState(), { optimistic: false, action: 'create', activity: clone(data.activity) });
        return data.activity;
      } catch (error) {
        this.removeActivity(tempId);
        this.setActivityState(this.getActivityState(), { optimistic: false, action: 'create', error: true });
        if (isOfflineError(error)) {
          this.enqueueOperation({ type: 'activity-create', payload: { data: payload } });
          this.toasts.info('Activity saved offline. It will sync automatically when you reconnect.');
          return null;
        }
        this.toasts.error(error && error.message ? error.message : 'Failed to create activity.');
        throw error;
      }
    }

    async updateActivity(id, payload, options = {}) {
      const activities = this.getActivityState();
      const index = activities.findIndex((activity) => activity.id === id);
      if (index === -1) {
        throw new Error('Activity not found');
      }
      const current = clone(activities[index]);
      const optimistic = Object.assign({}, current, options.optimisticActivity || {}, payload, {
        updatedAt: nowIso(),
      });
      activities[index] = optimistic;
      this.setActivityState(activities, { optimistic: true, action: 'update', activity: clone(optimistic) });

      try {
        const response = await this.request(`activities:update:${id}`, `/api/activities/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        this.replaceActivity(id, data.activity);
        this.setActivityState(this.getActivityState(), { optimistic: false, action: 'update', activity: clone(data.activity) });
        return data.activity;
      } catch (error) {
        activities[index] = current;
        this.setActivityState(activities, { optimistic: false, action: 'update', error: true });
        if (isOfflineError(error)) {
          this.enqueueOperation({ type: 'activity-update', payload: { id, data: payload } });
          this.toasts.info('Update stored locally. It will sync when online.');
          return null;
        }
        this.toasts.error(error && error.message ? error.message : 'Failed to update activity.');
        throw error;
      }
    }

    async deleteActivity(id) {
      const activities = this.getActivityState();
      const index = activities.findIndex((activity) => activity.id === id);
      if (index === -1) {
        return;
      }
      const removed = activities.splice(index, 1)[0];
      this.setActivityState(activities, { optimistic: true, action: 'delete', activity: clone(removed) });

      try {
        await this.request(`activities:delete:${id}`, `/api/activities/${encodeURIComponent(id)}`, {
          method: 'DELETE',
        });
        this.setActivityState(this.getActivityState(), { optimistic: false, action: 'delete', activity: clone(removed) });
      } catch (error) {
        activities.splice(index, 0, removed);
        this.setActivityState(activities, { optimistic: false, action: 'delete', error: true });
        if (isOfflineError(error)) {
          this.enqueueOperation({ type: 'activity-delete', payload: { id } });
          this.toasts.info('Delete queued. It will complete when online.');
          return;
        }
        this.toasts.error('Failed to delete activity.');
        throw error;
      }
    }

    replaceActivity(id, data) {
      if (!data) return;
      const activities = this.getActivityState();
      const index = activities.findIndex((activity) => activity.id === id);
      if (index === -1) return;
      activities[index] = data;
    }

    removeActivity(id) {
      const activities = this.getActivityState();
      const index = activities.findIndex((activity) => activity.id === id);
      if (index === -1) return;
      activities.splice(index, 1);
    }

    enqueueOperation(operation) {
      this.queue.push(operation);
      saveJson(QUEUE_STORAGE_KEY, this.queue);
      this.flushQueue();
    }

    async flushQueue() {
      if (this.processingQueue) return;
      if (!this.queue || this.queue.length === 0) return;
      this.processingQueue = true;
      try {
        while (this.queue.length > 0) {
          const next = this.queue[0];
          try {
            await this.executeQueuedOperation(next);
            this.queue.shift();
            saveJson(QUEUE_STORAGE_KEY, this.queue);
          } catch (error) {
            if (isOfflineError(error)) {
              // Stop processing; will retry later
              break;
            }
            console.error('Failed to process queued operation', error);
            this.queue.shift();
            saveJson(QUEUE_STORAGE_KEY, this.queue);
          }
        }
      } finally {
        this.processingQueue = false;
      }
    }

    async executeQueuedOperation(operation) {
      switch (operation.type) {
        case 'customize':
          await this.request('queue:customize', '/api/customize', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(operation.payload),
          });
          break;
        case 'hero-upload': {
          const file = await this.dataUrlToFile(operation.payload);
          await this.uploadHeroImage(file);
          break;
        }
        case 'hero-url':
          await this.setHeroImageUrl(operation.payload.url);
          break;
        case 'hero-clear':
          await this.clearHeroImage();
          break;
        case 'activity-create':
          await this.createActivity(operation.payload.data || {});
          break;
        case 'activity-update':
          await this.updateActivity(operation.payload.id, operation.payload.data || {});
          break;
        case 'activity-delete':
          await this.deleteActivity(operation.payload.id);
          break;
        default:
          break;
      }
    }

    async fileToDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
    }

    async dataUrlToFile(descriptor) {
      if (!descriptor || !descriptor.dataUrl) {
        throw new Error('Missing queued upload payload');
      }
      const response = await fetch(descriptor.dataUrl);
      const blob = await response.blob();
      return new File([blob], descriptor.name || 'queued-upload', { type: descriptor.type || blob.type });
    }
  }

  window.casfolioClient = new CasfolioClient();
})();
