(function() {
    'use strict';

    var API = 'api.php';

    function $(sel) { return document.querySelector(sel); }
    function $$(sel) { return document.querySelectorAll(sel); }

    function api(action, data, callback, method) {
        var xhr = new XMLHttpRequest();
        var url = API + '?action=' + encodeURIComponent(action);
        xhr.open(method || 'POST', url);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onload = function() {
            try {
                var resp = JSON.parse(xhr.responseText);
                callback(resp);
            } catch (e) {
                callback({ error: 'Invalid response' });
            }
        };
        xhr.onerror = function() {
            callback({ error: 'Network error' });
        };
        xhr.send(data ? JSON.stringify(data) : null);
    }

    function apiGet(action, callback) {
        api(action, null, callback, 'GET');
    }

    function toast(msg, type) {
        var el = $('#toast');
        if (!el) return;
        el.textContent = msg;
        el.className = 'toast toast-' + (type || 'success') + ' show';
        clearTimeout(el._timer);
        el._timer = setTimeout(function() {
            el.classList.remove('show');
        }, 2500);
    }

    function showView(id) {
        ['setup-section', 'login-section', 'config-section', 'admin-layout'].forEach(function(s) {
            var el = document.getElementById(s);
            if (el) el.style.display = 'none';
        });
        var target = document.getElementById(id);
        if (target) target.style.display = (id === 'admin-layout') ? 'block' : 'block';
    }

    // ===== INIT =====
    function init() {
        apiGet('check_setup', function(resp) {
            if (resp.setup_complete) {
                checkAuth();
            } else {
                showView('setup-section');
            }
        });
    }

    function checkAuth() {
        apiGet('check_auth', function(resp) {
            if (resp.logged_in) {
                showAdmin();
            } else {
                showView('login-section');
            }
        });
    }

    // ===== SETUP =====
    function bindSetup() {
        var form = $('#setup-form');
        if (!form) return;
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            var data = {
                db_host: $('#setup-db-host').value || 'localhost',
                db_port: $('#setup-db-port').value || '3306',
                db_user: $('#setup-db-user').value,
                db_pass: $('#setup-db-pass').value,
                db_name: $('#setup-db-name').value,
                admin_password: $('#setup-admin-pass').value
            };
            if (!data.db_user || !data.db_name || !data.admin_password) {
                toast('请填写数据库用户名、数据库名和管理员密码', 'error');
                return;
            }
            var btn = $('#setup-submit');
            btn.disabled = true;
            btn.textContent = '正在初始化...';
            api('setup', data, function(resp) {
                btn.disabled = false;
                btn.textContent = '开始初始化';
                if (resp.error) {
                    toast(resp.error, 'error');
                } else {
                    showConfigResult(resp.config_code);
                }
            });
        });
    }

    // ===== LOGIN =====
    function showConfigResult(configCode) {
        showView('config-section');
        var el = $('#config-code');
        if (el) el.textContent = configCode;
    }

    function bindConfigDone() {
        var btn = $('#config-done');
        if (!btn) return;
        btn.addEventListener('click', function() {
            showView('login-section');
        });
    }

    var loginLockTimer = null;

    function bindLogin() {
        var form = $('#login-form');
        if (!form) return;
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            if (form.classList.contains('locked')) return;
            var password = $('#login-password').value;
            if (!password) {
                toast('请输入密码', 'error');
                return;
            }
            var btn = form.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.textContent = '验证中...';
            api('login', { password: password }, function(resp) {
                btn.disabled = false;
                btn.textContent = '登 录';
                if (resp.lockout) {
                    startLockout(resp.lockout, form, btn);
                    return;
                }
                if (resp.error) {
                    toast(resp.error, 'error');
                } else {
                    showAdmin();
                }
            });
        });
    }

    function startLockout(seconds, form, btn) {
        form.classList.add('locked');
        var pwInput = $('#login-password');
        if (pwInput) pwInput.disabled = true;
        btn.disabled = true;
        btn.textContent = seconds + ' 秒后可重试';
        clearInterval(loginLockTimer);
        loginLockTimer = setInterval(function() {
            seconds--;
            if (seconds <= 0) {
                clearInterval(loginLockTimer);
                form.classList.remove('locked');
                if (pwInput) pwInput.disabled = false;
                btn.disabled = false;
                btn.textContent = '登 录';
                pwInput.focus();
            } else {
                btn.textContent = seconds + ' 秒后可重试';
            }
        }, 1000);
        toast('密码连续错误 3 次，已锁定 60 秒', 'error');
    }

    function bindLogout() {
        var el = $('#logout-btn');
        if (!el) return;
        el.addEventListener('click', function(e) {
            e.preventDefault();
            apiGet('logout', function() {
                showView('login-section');
                var pw = $('#login-password');
                if (pw) pw.value = '';
            });
        });
    }

    // ===== ADMIN =====
    function showAdmin() {
        showView('admin-layout');
        switchTab('settings');
    }

    // ===== TABS =====
    function bindTabs() {
        $$('.nav-links a[data-tab]').forEach(function(a) {
            a.addEventListener('click', function(e) {
                e.preventDefault();
                switchTab(a.getAttribute('data-tab'));
            });
        });
    }

    function switchTab(tab) {
        $$('.nav-links a[data-tab]').forEach(function(a) {
            a.classList.toggle('active', a.getAttribute('data-tab') === tab);
        });
        $$('.panel').forEach(function(p) {
            p.classList.toggle('active', p.id === 'panel-' + tab);
        });
        if (tab === 'settings') loadSettings();
        if (tab === 'categories') loadCategories();
        if (tab === 'links') { loadCategoriesForFilter().then(loadLinks); }
        if (tab === 'announcements') loadAnnouncements();
        if (tab === 'social') loadSocialLinks();
    }

    // ===== SETTINGS =====
    function loadSettings() {
        apiGet('get_settings', function(data) {
            if (data.error) return;
            var fields = ['site_title','profile_title_prefix','profile_title_name','profile_name_color1','profile_name_color2','profile_anim_speed','profile_anim_width','profile_bio','footer_powered','footer_copyright','icp_number','icp_url','police_number','police_url'];
            fields.forEach(function(f) {
                var el = $('#setting-' + f);
                if (el) el.value = data[f] || '';
            });
            var pwEl = $('#setting-admin_password');
            if (pwEl) pwEl.value = '';
            syncHexFromColor('profile_name_color1');
            syncHexFromColor('profile_name_color2');
        });
    }

    function syncHexFromColor(key) {
        var colorEl = $('#setting-' + key);
        var hexEl = $('#setting-' + key + '_hex');
        if (colorEl && hexEl) hexEl.value = colorEl.value;
    }

    function bindColorSync() {
        ['profile_name_color1', 'profile_name_color2'].forEach(function(key) {
            var colorEl = $('#setting-' + key);
            var hexEl = $('#setting-' + key + '_hex');
            if (!colorEl || !hexEl) return;
            colorEl.addEventListener('input', function() { hexEl.value = colorEl.value; });
            hexEl.addEventListener('input', function() {
                var v = hexEl.value.trim();
                if (/^#[0-9a-fA-F]{6}$/.test(v)) colorEl.value = v;
            });
        });
    }

    function bindSettingsSave() {
        var btn = $('#save-settings');
        if (!btn) return;
        btn.addEventListener('click', function() {
            var data = {};
            var fields = ['site_title','profile_title_prefix','profile_title_name','profile_name_color1','profile_name_color2','profile_anim_speed','profile_anim_width','profile_bio','footer_powered','footer_copyright','icp_number','icp_url','police_number','police_url'];
            fields.forEach(function(f) {
                var el = $('#setting-' + f);
                if (el) {
                    if (f === 'profile_name_color1' || f === 'profile_name_color2') {
                        var hexEl = $('#setting-' + f + '_hex');
                        data[f] = hexEl ? hexEl.value.trim() : el.value;
                    } else {
                        data[f] = el.value;
                    }
                }
            });
            var pw = $('#setting-admin_password');
            if (pw && pw.value) data.admin_password = pw.value;

            api('save_settings', data, function(resp) {
                if (resp.error) {
                    toast(resp.error, 'error');
                } else {
                    toast('设置已保存');
                    if (pw) pw.value = '';
                }
            });
        });
    }

    // ===== CATEGORIES =====
    function loadCategories() {
        apiGet('get_categories', function(data) {
            if (data.error) return;
            renderTable('cat-table-body', data, [
                { key: 'title', label: '中文标题' },
                { key: 'title_en', label: '英文标题' },
                { key: 'sort_order', label: '排序' }
            ], 'cat');
        });
    }

    function bindCatAdd() {
        var btn = $('#btn-add-cat');
        if (!btn) return;
        btn.addEventListener('click', function() {
            openModal('编辑分类', { title: '', title_en: '', sort_order: 0 }, function(item) {
                api('save_category', item, function(resp) {
                    if (resp.error) { toast(resp.error, 'error'); return; }
                    toast('保存成功');
                    closeModal();
                    loadCategories();
                });
            }, ['title','title_en','sort_order']);
        });
    }

    // ===== LINKS =====
    function loadLinks() {
        var catId = ($('#link-filter-cat') ? $('#link-filter-cat').value : '') || '';
        var url = API + '?action=get_links';
        if (catId) url += '&category_id=' + encodeURIComponent(catId);
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.onload = function() {
            try {
                var data = JSON.parse(xhr.responseText);
                if (!data.error) renderTable('link-table-body', data, [
                    { key: 'title', label: '标题' },
                    { key: 'category_name', label: '分类' },
                    { key: 'description', label: '描述' },
                    { key: 'sort_order', label: '排序' }
                ], 'link');
            } catch(e) {}
        };
        xhr.send();
    }

    function loadCategoriesForFilter() {
        return new Promise(function(resolve) {
            apiGet('get_categories', function(data) {
                if (data.error) { resolve(); return; }
                var sel = $('#link-filter-cat');
                if (!sel) { resolve(); return; }
                sel.innerHTML = '<option value="">全部分类</option>';
                data.forEach(function(c) {
                    sel.innerHTML += '<option value="' + c.id + '">' + escapeHtml(c.title) + '</option>';
                });
                resolve();
            });
        });
    }

    function bindLinkAdd() {
        var btn = $('#btn-add-link');
        if (!btn) return;
        btn.addEventListener('click', function() {
            apiGet('get_categories', function(cats) {
                if (cats.error || !cats.length) { toast('请先创建分类', 'error'); return; }
                var item = { category_id: cats[0].id, title: '', description: '', url: '', sort_order: 0 };
                openLinkModal(item, cats, function(data) {
                    api('save_link', data, function(resp) {
                        if (resp.error) { toast(resp.error, 'error'); return; }
                        toast('保存成功');
                        closeModal();
                        loadLinks();
                    });
                });
            });
        });
    }

    function bindFilterCat() {
        var sel = $('#link-filter-cat');
        if (!sel) return;
        sel.addEventListener('change', loadLinks);
    }

    // ===== MODAL =====
    function openModal(title, item, saveFn, fields) {
        var overlay = $('#modal-overlay');
        var body = $('#modal-body');
        var modalTitle = $('#modal-title');
        if (!overlay || !body) return;

        modalTitle.textContent = title;
        var labels = { title:'标题', title_en:'英文标题', url:'链接地址', description:'描述', sort_order:'排序' };
        var html = '';
        fields.forEach(function(f) {
            var val = item[f] !== undefined ? item[f] : '';
            html += '<div class="form-group">';
            html += '<label>' + (labels[f] || f) + '</label>';
            if (f === 'description') {
                html += '<textarea id="modal-field-' + f + '">' + escapeHtml(val) + '</textarea>';
            } else {
                html += '<input type="text" id="modal-field-' + f + '" value="' + escapeAttr(val) + '">';
            }
            html += '</div>';
        });
        body.innerHTML = html;

        var saveBtn = $('#modal-save');
        var oldHandler = saveBtn._handler;
        if (oldHandler) saveBtn.removeEventListener('click', oldHandler);

        var handler = function() {
            var data = {};
            if (item.id) data.id = item.id;
            fields.forEach(function(f) {
                var el = $('#modal-field-' + f);
                data[f] = el ? el.value : '';
                if (f === 'sort_order') data[f] = parseInt(data[f]) || 0;
            });
            saveFn(data);
        };
        saveBtn._handler = handler;
        saveBtn.addEventListener('click', handler);

        overlay.classList.add('active');
    }

    function openLinkModal(item, categories, saveFn) {
        var overlay = $('#modal-overlay');
        var body = $('#modal-body');
        var modalTitle = $('#modal-title');
        if (!overlay || !body) return;

        modalTitle.textContent = '编辑卡片';
        var html = '<div class="form-group"><label>所属分类</label><select id="modal-field-category_id">';
        categories.forEach(function(c) {
            var sel = (parseInt(item.category_id) === parseInt(c.id)) ? ' selected' : '';
            html += '<option value="' + c.id + '"' + sel + '>' + escapeHtml(c.title) + '</option>';
        });
        html += '</select></div>';

        var fields = [
            { key: 'title', label: '标题' },
            { key: 'logo', label: 'Logo 图片链接（可选）' },
            { key: 'description', label: '描述' },
            { key: 'url', label: '链接地址' },
            { key: 'sort_order', label: '排序' }
        ];
        fields.forEach(function(f) {
            var val = item[f.key] !== undefined ? item[f.key] : '';
            html += '<div class="form-group"><label>' + f.label + '</label>';
            if (f.key === 'description') {
                html += '<textarea id="modal-field-' + f.key + '">' + escapeHtml(val) + '</textarea>';
            } else {
                html += '<input type="text" id="modal-field-' + f.key + '" value="' + escapeAttr(val) + '">';
            }
            html += '</div>';
        });
        body.innerHTML = html;

        var saveBtn = $('#modal-save');
        var oldHandler = saveBtn._handler;
        if (oldHandler) saveBtn.removeEventListener('click', oldHandler);

        var handler = function() {
            var data = {};
            if (item.id) data.id = item.id;
            data.category_id = parseInt($('#modal-field-category_id').value) || 0;
            fields.forEach(function(f) {
                var el = $('#modal-field-' + f.key);
                data[f.key] = el ? el.value : '';
                if (f.key === 'sort_order') data[f.key] = parseInt(data[f.key]) || 0;
            });
            saveFn(data);
        };
        saveBtn._handler = handler;
        saveBtn.addEventListener('click', handler);

        overlay.classList.add('active');
    }

    function closeModal() {
        var overlay = $('#modal-overlay');
        if (overlay) overlay.classList.remove('active');
    }

    function bindModalClose() {
        var overlay = $('#modal-overlay');
        if (!overlay) return;
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) closeModal();
        });
        var cancelBtn = $('#modal-cancel');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', closeModal);
        }
    }

    // ===== TABLE =====
    function editItem(type, item) {
        if (type === 'cat') {
            openModal('编辑分类', item, function(data) {
                api('save_category', data, function(resp) {
                    if (resp.error) { toast(resp.error, 'error'); return; }
                    toast('保存成功');
                    closeModal();
                    loadCategories();
                });
            }, ['title','title_en','sort_order']);
        } else if (type === 'link') {
            apiGet('get_categories', function(cats) {
                openLinkModal(item, cats || [], function(data) {
                    api('save_link', data, function(resp) {
                        if (resp.error) { toast(resp.error, 'error'); return; }
                        toast('保存成功');
                        closeModal();
                        loadLinks();
                    });
                });
            });
        } else if (type === 'announce') {
            openAnnounceModal(item, function(data) {
                api('save_announcement', data, function(resp) {
                    if (resp.error) { toast(resp.error, 'error'); return; }
                    toast('保存成功');
                    closeModal();
                    loadAnnouncements();
                });
            });
        } else if (type === 'social') {
            openModal('编辑社交链接', item, function(data) {
                api('save_social_link', data, function(resp) {
                    if (resp.error) { toast(resp.error, 'error'); return; }
                    toast('保存成功');
                    closeModal();
                    loadSocialLinks();
                });
            }, ['title','logo','url','sort_order']);
        }
    }

    // ===== SOCIAL LINKS =====
    function loadSocialLinks() {
        apiGet('get_social_links', function(data) {
            if (data.error) return;
            renderTable('social-table-body', data, [
                { key: 'title', label: '名称' },
                { key: 'logo', label: '图标链接' },
                { key: 'url', label: '跳转地址' },
                { key: 'sort_order', label: '排序' }
            ], 'social');
        });
    }

    function bindSocialAdd() {
        var btn = $('#btn-add-social');
        if (!btn) return;
        btn.addEventListener('click', function() {
            openModal('编辑社交链接', { title: '', logo: '', url: '', sort_order: 0 }, function(data) {
                api('save_social_link', data, function(resp) {
                    if (resp.error) { toast(resp.error, 'error'); return; }
                    toast('保存成功');
                    closeModal();
                    loadSocialLinks();
                });
            }, ['title','logo','url','sort_order']);
        });
    }

    function loadAnnouncements() {
        apiGet('get_announcements', function(data) {
            if (data.error) return;
            renderTable('announce-table-body', data, [
                { key: 'title', label: '标题' },
                { key: 'is_active', label: '状态' },
                { key: 'sort_order', label: '排序' }
            ], 'announce', function(item) {
                if (item.is_active == 1) return '<span style="color:#222;font-weight:600;">显示中</span>';
                return '<span style="color:#999;">已隐藏</span>';
            });
        });
    }

    function renderTable(tbodyId, items, columns, type, colRenderer) {
        var tbody = document.getElementById(tbodyId);
        if (!tbody) return;
        if (!items.length) {
            tbody.innerHTML = '<tr><td colspan="' + (columns.length + 1) + '" style="text-align:center;color:#999;padding:32px;">暂无数据</td></tr>';
            return;
        }
        var html = '';
        items.forEach(function(item) {
            html += '<tr>';
            columns.forEach(function(col) {
                var val = String(item[col.key] || '');
                if (colRenderer && col.key === 'is_active') {
                    html += '<td>' + colRenderer(item) + '</td>';
                } else {
                    html += '<td>' + escapeHtml(val) + '</td>';
                }
            });
            html += '<td><div class="table-actions">';
            html += '<button class="btn btn-secondary btn-sm edit-btn" data-type="' + type + '" data-id="' + item.id + '">编辑</button>';
            html += '<button class="btn btn-danger btn-sm delete-btn" data-type="' + type + '" data-id="' + item.id + '">删除</button>';
            html += '</div></td></tr>';
        });
        tbody.innerHTML = html;

        tbody.querySelectorAll('.edit-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var id = btn.getAttribute('data-id');
                var itemType = btn.getAttribute('data-type');
                var found = items.find(function(it) { return String(it.id) === String(id); });
                if (!found) return;
                editItem(itemType, found);
            });
        });

        tbody.querySelectorAll('.delete-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var id = btn.getAttribute('data-id');
                var itemType = btn.getAttribute('data-type');
                if (!confirm('确定要删除吗？')) return;
                deleteItem(itemType, id);
            });
        });
    }

    function bindAnnounceAdd() {
        var btn = $('#btn-add-announce');
        if (!btn) return;
        btn.addEventListener('click', function() {
            var item = { title: '', content: '', is_active: 1, sort_order: 0 };
            openAnnounceModal(item, function(data) {
                api('save_announcement', data, function(resp) {
                    if (resp.error) { toast(resp.error, 'error'); return; }
                    toast('保存成功');
                    closeModal();
                    loadAnnouncements();
                });
            });
        });
    }

    function openAnnounceModal(item, saveFn) {
        var overlay = $('#modal-overlay');
        var body = $('#modal-body');
        var modalTitle = $('#modal-title');
        if (!overlay || !body) return;

        modalTitle.textContent = '编辑公告';
        var html = '';
        html += '<div class="form-group"><label>标题</label><input type="text" id="modal-field-title" value="' + escapeAttr(item.title || '') + '"></div>';
        html += '<div class="form-group"><label>内容（支持 Markdown）</label><textarea id="modal-field-content" style="min-height:150px;">' + escapeHtml(item.content || '') + '</textarea></div>';
        html += '<div class="form-row"><div class="form-group"><label>状态</label><select id="modal-field-is_active"><option value="1"' + (item.is_active == 1 ? ' selected' : '') + '>显示</option><option value="0"' + (item.is_active == 0 ? ' selected' : '') + '>隐藏</option></select></div>';
        html += '<div class="form-group"><label>排序</label><input type="text" id="modal-field-sort_order" value="' + (item.sort_order || 0) + '"></div></div>';
        body.innerHTML = html;

        var saveBtn = $('#modal-save');
        var oldHandler = saveBtn._handler;
        if (oldHandler) saveBtn.removeEventListener('click', oldHandler);

        var handler = function() {
            var data = {};
            if (item.id) data.id = item.id;
            data.title = $('#modal-field-title').value;
            data.content = $('#modal-field-content').value;
            data.is_active = parseInt($('#modal-field-is_active').value);
            data.sort_order = parseInt($('#modal-field-sort_order').value) || 0;
            saveFn(data);
        };
        saveBtn._handler = handler;
        saveBtn.addEventListener('click', handler);

        overlay.classList.add('active');
    }

    function deleteItem(type, id) {
        var actionMap = { cat: 'delete_category', link: 'delete_link', announce: 'delete_announcement', social: 'delete_social_link' };
        var reloadMap = { cat: loadCategories, link: loadLinks, announce: loadAnnouncements, social: loadSocialLinks };
        var action = actionMap[type];
        if (!action) return;
        api(action, { id: parseInt(id) }, function(resp) {
            if (resp.error) { toast(resp.error, 'error'); return; }
            toast('已删除');
            reloadMap[type]();
        });
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }

    function escapeAttr(str) {
        return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // ===== BOOT =====
    function boot() {
        bindSetup();
        bindConfigDone();
        bindLogin();
        bindLogout();
        bindTabs();
        bindSettingsSave();
        bindColorSync();
        bindCatAdd();
        bindLinkAdd();
        bindAnnounceAdd();
        bindSocialAdd();
        bindFilterCat();
        bindModalClose();
        init();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
