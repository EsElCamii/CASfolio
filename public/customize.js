// Customization module for CASfolio
(function() {
  const KEYS = {
    LAYOUT: 'casfolio_layout',
    THEME: 'casfolio_theme',
    CONTENT: 'casfolio_content',
    CUSTOM_SECTIONS: 'casfolio_custom_sections'
  };

  const defaultSections = [
    { id: 'home', name: 'Hero', builtin: true, visible: true },
    { id: 'overview', name: 'CAS Overview', builtin: true, visible: true },
    { id: 'recent', name: 'Recent Activities', builtin: true, visible: true },
    { id: 'timeline', name: 'Timeline', builtin: true, visible: true },
    { id: 'reflection', name: 'Reflection Journal', builtin: true, visible: true },
    { id: 'progress', name: 'Progress Overview', builtin: true, visible: true },
    { id: 'gallery', name: 'Activity Gallery', builtin: true, visible: true },
    { id: 'contact', name: 'Portfolio Information', builtin: true, visible: true }
  ];

  // State
  let layout = null; // { order: [], visibility: { id: boolean } }
  let theme = null;  // { primary, secondary, accent, radius, dark }
  let content = null; // { heroTitle, heroSubtitle, heroDescription, heroImageUrl }
  let customSections = []; // [{ id, name, content, visible }]

  // Mapped content fields for panel editing
  const contentFields = [
    // Brand
    { key: 'brand_title', label: 'Brand Title', selector: '.nav-brand h1', type: 'text', group: 'Brand' },
    { key: 'brand_icon', label: 'Brand Icon Class', selector: '#brand-icon', type: 'text', group: 'Brand' },
    // Hero
    { key: 'hero_title', label: 'Hero Title', selector: '#hero-title', type: 'text', group: 'Hero' },
    { key: 'hero_subtitle', label: 'Hero Subtitle', selector: '#hero-subtitle', type: 'text', group: 'Hero' },
    { key: 'hero_description', label: 'Hero Description', selector: '#hero-description', type: 'textarea', group: 'Hero' },
    { key: 'hero_months', label: 'Hero Months Counter', selector: '#total-months', type: 'number', group: 'Hero' },
  ];

  // Utilities
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.warn('Save failed', key, e); }
  }
  function load(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function $(sel) { return document.querySelector(sel); }
  function $all(sel) { return Array.from(document.querySelectorAll(sel)); }

  function hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return null;
    return `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}`;
  }

  // Load state
  function loadState() {
    customSections = load(KEYS.CUSTOM_SECTIONS, []);
    const defaultOrder = defaultSections.map(s => s.id).concat(customSections.map(s => s.id));
    const defaultVisibility = {};
    defaultOrder.forEach(id => { defaultVisibility[id] = true; });
    layout = load(KEYS.LAYOUT, { order: defaultOrder, visibility: defaultVisibility });
    theme = load(KEYS.THEME, null);
    content = load(KEYS.CONTENT, null);
  }

  // Apply theme
  function applyTheme() {
    if (!theme) return;
    const root = document.documentElement;
    if (theme.primary) {
      root.style.setProperty('--primary', theme.primary);
      const rgb = hexToRgb(theme.primary);
      if (rgb) root.style.setProperty('--primary-rgb', rgb);
    }
    if (theme.secondary) root.style.setProperty('--secondary', theme.secondary);
    if (theme.accent) root.style.setProperty('--accent', theme.accent);
    if (typeof theme.radius === 'number') root.style.setProperty('--radius', theme.radius + 'px');
    const body = document.body;
    if (theme.dark) body.classList.add('dark'); else body.classList.remove('dark');
  }

  // Apply content (hero)
  function applyContent() {
    if (!content) return;
    migrateContentSchema();
    // Generic fields
    contentFields.forEach(f => {
      if (!content.hasOwnProperty(f.key)) return;
      const el = document.querySelector(f.selector);
      if (!el) return;
      // Special handling for brand icon class
      if (el.id === 'brand-icon') {
        setIcon(el, content[f.key]);
      } else {
        setText(el, content[f.key]);
      }
    });
    // Hero image
    const img = $('#hero-profile-image');
    if (img && content.heroImageUrl) img.src = content.heroImageUrl;
  }

  function migrateContentSchema() {
    // Map older camelCase hero keys to new snake_case once
    const map = [
      ['heroTitle', 'hero_title'],
      ['heroSubtitle', 'hero_subtitle'],
      ['heroDescription', 'hero_description']
    ];
    let changed = false;
    map.forEach(([oldK, newK]) => {
      if (content && content[oldK] && !content[newK]) { content[newK] = content[oldK]; changed = true; }
    });
    if (changed) save(KEYS.CONTENT, content);
  }

  function setText(el, text) {
    // Avoid HTML injection; use textContent
    if (el && el.id === 'total-months') {
      const n = parseInt(text, 10);
      el.textContent = isNaN(n) ? text : (n + '+');
      return;
    }
    el.textContent = text;
  }

  // Sets icon class for brand fallback icon
  function setIcon(el, classNames) {
    const classes = String(classNames || '').trim();
    el.className = classes || 'fas fa-graduation-cap';
    el.setAttribute('aria-hidden', 'true');
  }

  // Toggle between brand image and brand icon based on Content settings
  function applyBrandVisual() {
    const icon = document.getElementById('brand-icon');
    const img = document.getElementById('brand-image');
    const url = content && content.brand_image_url ? String(content.brand_image_url).trim() : '';
    if (img && icon) {
      if (url) {
        img.src = url;
        img.style.display = 'block';
        icon.style.display = 'none';
      } else {
        img.style.display = 'none';
        icon.style.display = 'inline-flex';
        setIcon(icon, (content && content.brand_icon) || 'fas fa-graduation-cap');
      }
    }
  }

  // Ensure custom sections are in the DOM
  function ensureCustomSectionsInDOM() {
    if (!customSections || customSections.length === 0) return;
    const footer = document.querySelector('footer.footer');
    customSections.forEach(cs => {
      let el = document.getElementById(cs.id);
      if (!el) {
        el = document.createElement('section');
        el.id = cs.id;
        el.className = 'custom-section';
        el.setAttribute('role', 'region');
        el.setAttribute('aria-label', cs.name);
        el.innerHTML = `
          <div class="container custom-content">
            <div class="section-header">
              <h2>${escapeHtml(cs.name)}</h2>
              <p class="helper-text">Custom section</p>
            </div>
            <div class="custom-card">
              <h3 class="custom-title">${escapeHtml(cs.name)}</h3>
              <div class="custom-text">${escapeHtml(cs.content)}</div>
            </div>
          </div>
        `;
        document.body.insertBefore(el, footer);
      }
      // visibility will be applied in applyLayout
    });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"]+/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));
  }

  // Apply layout (order + visibility)
  function applyLayout() {
    const footer = document.querySelector('footer.footer');
    if (!layout || !footer) return;

    // Make sure any newly added custom sections exist
    ensureCustomSectionsInDOM();

    layout.order.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        document.body.insertBefore(el, footer);
        const visible = layout.visibility[id] !== false;
        el.style.display = visible ? '' : 'none';
      }
    });
  }

  // Build panel sections list
  function buildSectionsList() {
    const wrapper = $('#sections-list');
    if (!wrapper) return;
    wrapper.innerHTML = '';
    const byId = {};
    defaultSections.forEach(s => byId[s.id] = { ...s });
    customSections.forEach(s => byId[s.id] = { id: s.id, name: s.name, builtin: false, visible: true });

    layout.order.forEach(id => {
      if (!byId[id]) return;
      const item = document.createElement('div');
      item.className = 'section-item';
      item.setAttribute('draggable', 'true');
      item.dataset.id = id;
      item.innerHTML = `
        <span class="drag-handle" aria-hidden="true"><i class="fas fa-grip-vertical"></i></span>
        <input type="checkbox" class="visibility-toggle" ${layout.visibility[id] !== false ? 'checked' : ''} aria-label="Toggle visibility">
        <span class="section-name">${byId[id].name}</span>
        <span class="reorder-controls">
          <button class="btn btn-outline btn-sm move-up" title="Move up" aria-label="Move up"><i class="fas fa-arrow-up"></i></button>
          <button class="btn btn-outline btn-sm move-down" title="Move down" aria-label="Move down"><i class="fas fa-arrow-down"></i></button>
          ${byId[id].builtin ? '' : '<button class="btn btn-danger btn-sm remove-custom" title="Remove" aria-label="Remove"><i class="fas fa-trash"></i></button>'}
        </span>
      `;
      wrapper.appendChild(item);
    });

    // Wire up interactions
    wrapper.querySelectorAll('.visibility-toggle').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = e.target.closest('.section-item').dataset.id;
        layout.visibility[id] = e.target.checked;
        save(KEYS.LAYOUT, layout);
        applyLayout();
      });
    });

    wrapper.querySelectorAll('.move-up').forEach(btn => btn.addEventListener('click', () => moveItem(btn, -1)));
    wrapper.querySelectorAll('.move-down').forEach(btn => btn.addEventListener('click', () => moveItem(btn, +1)));
    wrapper.querySelectorAll('.remove-custom').forEach(btn => btn.addEventListener('click', () => removeCustom(btn)));

    // Drag and drop reorder
    wrapper.querySelectorAll('.section-item').forEach(item => {
      item.addEventListener('dragstart', () => {
        item.classList.add('dragging');
      });
      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        // commit order
        const ids = Array.from(wrapper.querySelectorAll('.section-item')).map(el => el.dataset.id);
        layout.order = ids;
        save(KEYS.LAYOUT, layout);
        applyLayout();
      });
    });
    wrapper.addEventListener('dragover', (e) => {
      e.preventDefault();
      const dragging = wrapper.querySelector('.dragging');
      if (!dragging) return;
      const after = getDragAfterElement(wrapper, e.clientY);
      if (after == null) wrapper.appendChild(dragging); else wrapper.insertBefore(dragging, after);
    });
  }

  function getDragAfterElement(container, y) {
    const els = [...container.querySelectorAll('.section-item:not(.dragging)')];
    return els.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) return { offset, element: child };
      return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  function moveItem(btn, delta) {
    const item = btn.closest('.section-item');
    const id = item.dataset.id;
    const idx = layout.order.indexOf(id);
    const newIdx = idx + delta;
    if (newIdx < 0 || newIdx >= layout.order.length) return;
    layout.order.splice(idx, 1);
    layout.order.splice(newIdx, 0, id);
    save(KEYS.LAYOUT, layout);
    buildSectionsList();
    applyLayout();
  }

  function removeCustom(btn) {
    const id = btn.closest('.section-item').dataset.id;
    const csIdx = customSections.findIndex(s => s.id === id);
    if (csIdx === -1) return;
    if (!confirm('Remove this custom section?')) return;
    customSections.splice(csIdx, 1);
    layout.order = layout.order.filter(x => x !== id);
    delete layout.visibility[id];
    save(KEYS.CUSTOM_SECTIONS, customSections);
    save(KEYS.LAYOUT, layout);
    const el = document.getElementById(id);
    if (el && el.parentNode) el.parentNode.removeChild(el);
    buildSectionsList();
    applyLayout();
  }

  // Panel open/close
  function openCustomizePanel() {
    $('#customize-overlay')?.classList.add('show');
    $('#customize-panel')?.classList.add('show');
    // Mark mapped fields as editable for inline editing
    markEditable(true);
    // enable inline editing
    $all('[data-editable="true"]').forEach(el => { el.setAttribute('contenteditable', 'true'); el.classList.add('editable'); });
    initTabs();
    syncThemeInputs();
    syncContentInputs();
    buildSectionsList();
  }

  function closeCustomizePanel() {
    $('#customize-overlay')?.classList.remove('show');
    $('#customize-panel')?.classList.remove('show');
    // disable inline editing
    $all('[data-editable="true"]').forEach(el => { el.removeAttribute('contenteditable'); el.classList.remove('editable'); });
    // Unmark mapped fields to avoid cluttering DOM
    markEditable(false);
  }

  // Tabs
  function initTabs() {
    const tabs = Array.from(document.querySelectorAll('.customize-tab'));
    tabs.forEach(tab => {
      if (tab.dataset.bound) return;
      tab.addEventListener('click', () => {
        tabs.forEach(t => { t.classList.remove('active'); });
        tab.classList.add('active');
        const name = tab.dataset.tab;
        ['layout','theme','content'].forEach(id => {
          const el = document.getElementById('tab-' + id);
          if (el) el.hidden = id !== name;
        });
      });
      tab.dataset.bound = '1';
    });
    // Default to layout visible
    ['layout','theme','content'].forEach(id => {
      const el = document.getElementById('tab-' + id);
      if (el) el.hidden = id !== 'layout';
    });
  }

  // Theme controls
  function syncThemeInputs() {
    const styles = getComputedStyle(document.documentElement);
    const p = (theme && theme.primary) || styles.getPropertyValue('--primary').trim();
    const s = (theme && theme.secondary) || styles.getPropertyValue('--secondary').trim();
    const a = (theme && theme.accent) || styles.getPropertyValue('--accent').trim();
    const r = (theme && typeof theme.radius === 'number') ? theme.radius : parseInt(styles.getPropertyValue('--radius')) || 8;
    const dark = theme ? !!theme.dark : document.body.classList.contains('dark');
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    setVal('color-primary', normalizeColorValue(p));
    setVal('color-secondary', normalizeColorValue(s));
    setVal('color-accent', normalizeColorValue(a));
    const rr = document.getElementById('radius-range'); if (rr) rr.value = r;

    // listeners
    $('#color-primary')?.addEventListener('input', (e) => { theme = theme || {}; theme.primary = e.target.value; save(KEYS.THEME, theme); applyTheme(); });
    $('#color-secondary')?.addEventListener('input', (e) => { theme = theme || {}; theme.secondary = e.target.value; save(KEYS.THEME, theme); applyTheme(); });
    $('#color-accent')?.addEventListener('input', (e) => { theme = theme || {}; theme.accent = e.target.value; save(KEYS.THEME, theme); applyTheme(); });
    $('#radius-range')?.addEventListener('input', (e) => { theme = theme || {}; theme.radius = parseInt(e.target.value); save(KEYS.THEME, theme); applyTheme(); });
  }

  function normalizeColorValue(val) {
    // Some browsers may return rgb(); keep it as-is or fallback to hex
    if (!val) return '#3b82f6';
    if (val.startsWith('#')) return val;
    // rudimentary rgb->hex conversion if needed
    const m = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/i.exec(val);
    if (!m) return '#3b82f6';
    const toHex = (n) => ('0' + parseInt(n,10).toString(16)).slice(-2);
    return `#${toHex(m[1])}${toHex(m[2])}${toHex(m[3])}`;
  }

  // Content controls
  function syncContentInputs() {
    // Apply current content to DOM
    applyContent();

    // Hero image input
    const img = $('#hero-profile-image');
    const input = $('#hero-image-url');
    if (img && input && !input.dataset.bound) {
      input.value = (content && content.heroImageUrl) || img.src || '';
      input.addEventListener('change', () => {
        content = content || {};
        content.heroImageUrl = input.value.trim();
        img.src = content.heroImageUrl;
        save(KEYS.CONTENT, content);
      });
      input.dataset.bound = '1';
    }

    // Inline editing toggle
    const inlineToggle = $('#toggle-inline-editing');
    if (inlineToggle && !inlineToggle.dataset.bound) {
      inlineToggle.checked = true;
      inlineToggle.addEventListener('change', () => {
        const enabled = inlineToggle.checked;
        $all('[data-editable="true"]').forEach(el => {
          if (enabled) {
            el.setAttribute('contenteditable', 'true'); el.classList.add('editable');
          } else {
            el.removeAttribute('contenteditable'); el.classList.remove('editable');
          }
        });
      });
      inlineToggle.dataset.bound = '1';
    }

    // Build the content editor form list
    buildContentEditor();

    // Brand image URL & fallback icon class
    const brandImgInput = document.getElementById('brand-image-url');
    const brandIconInput = document.getElementById('brand-icon-class');
    if (brandImgInput && !brandImgInput.dataset.bound) {
      brandImgInput.value = (content && content.brand_image_url) || '';
      brandImgInput.addEventListener('change', () => {
        content = content || {};
        content.brand_image_url = brandImgInput.value.trim();
        save(KEYS.CONTENT, content);
        applyBrandVisual();
      });
      brandImgInput.dataset.bound = '1';
    }
    if (brandIconInput && !brandIconInput.dataset.bound) {
      brandIconInput.value = (content && content.brand_icon) || 'fas fa-graduation-cap';
      brandIconInput.addEventListener('input', () => {
        content = content || {};
        content.brand_icon = brandIconInput.value;
        save(KEYS.CONTENT, content);
        applyBrandVisual();
      });
      brandIconInput.dataset.bound = '1';
    }

    // Inline editable fields save on blur
    $all('[data-editable="true"]').forEach(el => {
      if (el.dataset.editBound) return;
      el.addEventListener('blur', () => {
        content = content || {};
        // If element matches a mapped field, save to that key
        const field = contentFields.find(f => document.querySelector(f.selector) === el);
        if (field) {
          content[field.key] = el.textContent.trim();
        } else {
          // Specific hero fallbacks by id
          if (el.id === 'hero-title') content.hero_title = el.textContent.trim();
          if (el.id === 'hero-subtitle') content.hero_subtitle = el.textContent.trim();
          if (el.id === 'hero-description') content.hero_description = el.textContent.trim();
        }
        save(KEYS.CONTENT, content);
      });
      el.dataset.editBound = '1';
    });
  }

  function buildContentEditor() {
    const container = document.getElementById('content-editor');
    if (!container) return;
    // Build grouped fields
    const groups = {};
    contentFields.forEach(f => {
      if (!groups[f.group]) groups[f.group] = [];
      groups[f.group].push(f);
    });
    container.innerHTML = '';

    Object.keys(groups).forEach(groupName => {
      const section = document.createElement('div');
      section.className = 'panel-section';
      const title = document.createElement('h4');
      title.textContent = groupName;
      section.appendChild(title);

      groups[groupName].forEach(field => {
        // Skip text fields in the panel; use inline editing on page
        if (field.type === 'text' || field.type === 'textarea') return;
        const el = document.querySelector(field.selector);
        if (!el) return; // skip missing elements
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';
        const label = document.createElement('label');
        label.setAttribute('for', 'input-' + field.key);
        label.textContent = field.label;
        formGroup.appendChild(label);

        let inputEl;
        if (field.type === 'textarea') {
          inputEl = document.createElement('textarea');
          inputEl.className = 'small-textarea';
          inputEl.rows = 3;
        } else if (field.type === 'number') {
          inputEl = document.createElement('input');
          inputEl.type = 'number';
          inputEl.min = '0';
          inputEl.step = '1';
          inputEl.className = 'small-input';
        } else {
          inputEl = document.createElement('input');
          inputEl.type = 'text';
          inputEl.className = 'small-input';
        }
        inputEl.id = 'input-' + field.key;
        let initialValue = (content && content[field.key]) || (el.id === 'brand-icon' ? el.className : el.textContent.trim());
        if (field.type === 'number') {
          initialValue = String(parseInt(String(initialValue).replace(/[^0-9-]/g, ''), 10) || 0);
        }
        inputEl.value = initialValue;
        inputEl.addEventListener('input', () => {
          content = content || {};
          if (el.id === 'brand-icon') {
            setIcon(el, inputEl.value);
          } else if (field.type === 'number') {
            const num = parseInt(inputEl.value, 10);
            content[field.key] = isNaN(num) ? 0 : num;
          } else {
            content[field.key] = inputEl.value;
          }
          save(KEYS.CONTENT, content);
          if (el.id !== 'brand-icon') setText(el, inputEl.value);
        });
        formGroup.appendChild(inputEl);
        section.appendChild(formGroup);
      });
      container.appendChild(section);
    });
  }

  // Add Section Modal
  function openAddSectionModal() {
    const modal = $('#add-section-modal');
    if (modal) modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    const form = $('#add-section-form');
    if (form && !form.dataset.bound) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const title = (fd.get('title') || '').toString().trim();
        const text = (fd.get('content') || '').toString().trim();
        if (!title || !text) return;
        const id = 'custom-' + Date.now().toString(36);
        const section = { id, name: title, content: text, visible: true };
        customSections.push(section);
        layout.order.push(id);
        layout.visibility[id] = true;
        save(KEYS.CUSTOM_SECTIONS, customSections);
        save(KEYS.LAYOUT, layout);
        ensureCustomSectionsInDOM();
        applyLayout();
        buildSectionsList();
        closeAddSectionModal();
        form.reset();
      });
      form.dataset.bound = '1';
    }
  }

  function closeAddSectionModal() {
    const modal = $('#add-section-modal');
    if (modal) modal.classList.remove('show');
    document.body.style.overflow = '';
  }

  // Reset customization
  function resetCustomization() {
    if (!confirm('Reset customization to defaults?')) return;
    localStorage.removeItem(KEYS.LAYOUT);
    localStorage.removeItem(KEYS.THEME);
    localStorage.removeItem(KEYS.CONTENT);
    localStorage.removeItem(KEYS.CUSTOM_SECTIONS);
    window.location.reload();
  }

  // Expose minimal API globally for inline handlers
  window.openCustomizePanel = openCustomizePanel;
  window.closeCustomizePanel = closeCustomizePanel;
  window.openAddSectionModal = openAddSectionModal;
  window.closeAddSectionModal = closeAddSectionModal;
  window.resetCustomization = resetCustomization;

  // Initialize on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    loadState();
    ensureCustomSectionsInDOM();
    applyLayout();
    if (theme) applyTheme();
    if (content) applyContent();
  });

  function markEditable(enable) {
    contentFields.forEach(f => {
      const el = document.querySelector(f.selector);
      if (!el) return;
      if (enable) {
        el.setAttribute('data-editable', 'true');
      } else {
        // Keep hero explicitly marked in HTML; only remove if we added it
        if (!['#hero-title','#hero-subtitle','#hero-description'].includes(f.selector)) {
          el.removeAttribute('data-editable');
        }
      }
    });
  }
})();
