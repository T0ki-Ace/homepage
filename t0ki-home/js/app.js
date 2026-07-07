(function() {
    'use strict';

    var API = 'api.php';

    function fetchData(callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', API + '?action=get_all');
        xhr.onload = function() {
            if (xhr.status === 200) {
                try { callback(JSON.parse(xhr.responseText)); } catch (e) {}
            }
        };
        xhr.send();
    }

    // ===== Helpers =====
    // ===== Profile Header =====
    function renderProfile(settings, socialLinks) {
        var prefix = settings.profile_title_prefix || 'Hi, Here is ';
        var name = settings.profile_title_name || 'T0KI';
        var bio = settings.profile_bio || '';

        var prefixEl = document.getElementById('profile-prefix');
        var nameEl = document.getElementById('profile-name');
        var bioEl = document.getElementById('profile-bio');
        if (prefixEl) prefixEl.textContent = prefix;
        if (nameEl) {
            nameEl.textContent = name;
            var c1 = settings.profile_name_color1 || '#1A1A1A';
            var c2 = settings.profile_name_color2 || '#666666';
            var speed = parseInt(settings.profile_anim_speed) || 5;
            speed = Math.max(1, Math.min(30, speed));
            nameEl.style.animationDuration = speed + 's';
            var w = parseInt(settings.profile_anim_width) || 16;
            w = Math.max(1, Math.min(100, w));
            var half = w / 2;
            nameEl.style.backgroundImage = 'linear-gradient(90deg, ' + c1 + ' 0%, ' + c1 + ' ' + (50 - half) + '%, ' + c2 + ' 50%, ' + c1 + ' ' + (50 + half) + '%, ' + c1 + ' 100%)';
        }
        if (bioEl) bioEl.textContent = bio;

        var socialEl = document.getElementById('profile-social');
        if (!socialEl) return;
        var html = '';
        if (socialLinks && socialLinks.length) {
            socialLinks.forEach(function(link) {
                var url = link.url || '#';
                if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;
                html += '<a href="' + escapeAttr(url) + '" target="_blank" rel="noopener" class="social-btn" title="' + escapeHtml(link.title) + '">';
                if (link.logo) {
                    html += '<img src="' + escapeAttr(link.logo) + '" alt="' + escapeHtml(link.title) + '">';
                } else {
                    html += '<span>' + escapeHtml(link.title.charAt(0)) + '</span>';
                }
                html += '</a>';
            });
        }
        socialEl.innerHTML = html;
    }

    // ===== Categories =====
    function renderCategories(categories, links) {
        var container = document.getElementById('categories-container');
        if (!container) return;
        var html = '';
        categories.forEach(function(cat) {
            var catLinks = links.filter(function(l) { return parseInt(l.category_id) === parseInt(cat.id); });
            html += '<section class="category-section">';
            html += '<div class="category-header">';
            html += '<h2>' + escapeHtml(cat.title) + '</h2>';
            if (cat.title_en) html += '<p class="cat-subtitle">' + escapeHtml(cat.title_en) + '</p>';
            html += '</div><div class="card-grid">';
            catLinks.forEach(function(link) { html += renderCard(link); });
            html += '</div></section>';
        });
        container.innerHTML = html;

        container.querySelectorAll('.card').forEach(function(card) {
            card.addEventListener('click', function() {
                var url = card.getAttribute('data-url');
                if (url) window.open(url, '_blank', 'noopener');
            });
        });
    }

    function renderCard(link) {
        var url = link.url || '#';
        if (url !== '#' && !/^https?:\/\//i.test(url)) url = 'https://' + url;
        var logo = link.logo || '';
        return '<div class="card" data-url="' + escapeAttr(url) + '">' +
            (logo ? '<img class="card-logo" src="' + escapeAttr(logo) + '" alt="">' : '') +
            '<div class="card-body"><div class="card-title">' + escapeHtml(link.title) + '</div>' +
            '<div class="card-desc">' + escapeHtml(link.description || '') + '</div></div></div>';
    }

    // ===== Footer =====
    function renderFooter(settings) {
        var footer = document.getElementById('footer');
        if (!footer) return;
        var powered = settings.footer_powered || 'Powered by T0ki';
        var copyright = settings.footer_copyright || '';
        var icpNum = settings.icp_number || 'xxxxxxxxx';
        var icpUrl = settings.icp_url || 'https://beian.miit.gov.cn/';
        var policeNum = settings.police_number || 'xxxxxxxxx';
        var policeUrl = settings.police_url || 'http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=' + encodeURIComponent(policeNum);

        footer.innerHTML = '<div class="footer-row"><span>' + escapeHtml(powered) + '</span>' +
            (copyright ? '<span>' + escapeHtml(copyright) + '</span>' : '') + '</div>' +
            '<div class="footer-row"><a href="' + escapeAttr(icpUrl) + '" target="_blank" rel="noopener">' + escapeHtml(icpNum) + '</a>' +
            '<a href="' + escapeAttr(policeUrl) + '" target="_blank" rel="noopener">' + escapeHtml(policeNum) + '</a></div>';
    }

    // ===== Announcements =====
    function renderAnnouncements(announcements) {
        var wrap = document.getElementById('announce-wrap');
        if (!wrap || !announcements || !announcements.length) return;
        var html = '';
        announcements.forEach(function(item) {
            var bodyHtml = (typeof marked !== 'undefined') ? marked.parse(item.content || '') : escapeHtml(item.content || '');
            html += '<div class="announce-card"><button class="announce-close" onclick="this.parentElement.remove()">&times;</button>' +
                '<div class="announce-title">' + escapeHtml(item.title) + '</div>' +
                '<div class="announce-body markdown-body">' + bodyHtml + '</div></div>';
        });
        wrap.innerHTML = html;
        wrap.style.display = 'flex';
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }

    function escapeAttr(str) {
        return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // ===== Init =====
    function init() {
        fetchData(function(data) {
            if (data.error) return;
            var s = data.settings || {};
            document.title = s.site_title || 'T0KI HOME';
            renderProfile(s, data.social_links || []);
            renderCategories(data.categories || [], data.links || []);
            renderFooter(s);
            renderAnnouncements(data.announcements || []);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
