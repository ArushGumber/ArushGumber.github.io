(function () {
  var LINK_LABELS = {
    preprint: 'Pre-print', paper: 'Paper', code: 'Code', demo: 'Demo', talk: 'Talk',
    website: 'Website', scholar: 'Scholar', github: 'GitHub', linkedin: 'LinkedIn', resume: 'Résumé'
  };
  var SOCIAL_ORDER = ['scholar', 'github', 'linkedin'];
  var TIER_ORDER = ['conference', 'workshop', 'preprint'];
  var TIER_LABELS = { conference: 'Main conference', workshop: 'Workshop', preprint: 'Under review' };

  function node(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function pad2(x) { return x < 10 ? '0' + x : '' + x; }

  function linkRow(links, cls) {
    var row = node('div', 'link-row');
    Object.keys(links || {}).forEach(function (k) {
      if (!links[k]) return;
      var a = node('a', cls || 'xlink', (LINK_LABELS[k] || k) + ' ↗');
      a.href = links[k];
      a.target = '_blank';
      a.rel = 'noopener';
      row.appendChild(a);
    });
    return row;
  }

  function init(data) {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var instrument = null;
    var state = { hover: null, filter: null };

    document.getElementById('year').textContent = new Date().getFullYear();

    renderHero(data);
    renderWorkIntro(data);
    var domainButtons = renderDomains(data);
    var filterChips = renderFilters(data);
    renderPublications(data);
    renderFounder(data);
    renderExperience(data);
    renderNews(data);
    renderStack(data);
    renderContact(data);
    renderProjects(data);
    renderFoundations(data);
    refreshDomains();
    wireMenu();
    wirePortraitTilt();
    startInstrument();

    function setHighlighted(el, text, mark) {
      clear(el);
      text.split(mark).forEach(function (part, i) {
        if (i > 0) el.appendChild(node('span', 'hl-cg', mark));
        el.appendChild(document.createTextNode(part));
      });
    }

    function renderHero(d) {
      document.getElementById('role-line').textContent = d.profile.roleLine;
      var h = document.getElementById('about-headline');
      clear(h);
      d.about.headline.forEach(function (part) {
        if (part.tone === 'accent') h.appendChild(node('span', 'accent', part.text));
        else h.appendChild(document.createTextNode(part.text));
      });
      document.getElementById('hero-bio').textContent = d.about.bio;
      setHighlighted(document.getElementById('hero-cred'), d.about.credentials, '8.91/10');
    }

    function renderWorkIntro(d) {
      var host = document.getElementById('work-intro');
      clear(host);
      (d.workIntro || []).forEach(function (line) {
        host.appendChild(node('span', 'hl ' + (line.tone || 'ink'), line.text));
      });
    }

    function wirePortraitTilt() {
      if (reduce) return;
      var frame = document.querySelector('.portrait-frame');
      if (!frame) return;
      window.addEventListener('pointermove', function (e) {
        var nx = e.clientX / window.innerWidth - 0.5;
        var ny = e.clientY / window.innerHeight - 0.5;
        frame.style.transform = 'perspective(900px) rotateY(' + (nx * 9).toFixed(2) + 'deg) rotateX(' + (-ny * 7).toFixed(2) + 'deg)';
      });
    }

    function refreshDomains() {
      domainButtons.forEach(function (btn) {
        var on = state.hover === btn.dataset.id || state.filter === btn.dataset.id;
        btn.classList.toggle('active', on);
      });
      filterChips.forEach(function (chip) {
        chip.classList.toggle('active', state.filter === chip.dataset.id || (chip.dataset.all && !state.filter));
      });
      var src = data.domains.filter(function (x) { return x.id === (state.hover || state.filter); })[0];
      document.getElementById('readout').textContent = src ? src.blurb : 'idle · an evolving latent manifold';
    }

    function setMorph(name) { if (instrument) instrument.setMorph(name); }

    function selectDomain(d) {
      var willActive = state.filter !== d.id;
      state.filter = willActive ? d.id : null;
      setMorph(willActive ? d.morph : 'base');
      refreshDomains();
      renderProjects(data);
      var work = document.getElementById('work');
      if (work) window.scrollTo({ top: work.getBoundingClientRect().top + window.scrollY - 56, behavior: reduce ? 'auto' : 'smooth' });
    }

    function revertMorph() {
      var f = data.domains.filter(function (x) { return x.id === state.filter; })[0];
      setMorph(f ? f.morph : 'base');
    }

    function renderDomains(d) {
      var row = document.getElementById('domains-row');
      clear(row);
      var btns = [];
      d.domains.forEach(function (dom) {
        var btn = node('button', 'domain-btn');
        btn.type = 'button';
        btn.dataset.id = dom.id;
        btn.appendChild(node('div', 'domain-id', dom.index + ' · ' + dom.coord));
        btn.appendChild(node('div', 'domain-label', dom.label));
        var enter = function () { state.hover = dom.id; setMorph(dom.morph); refreshDomains(); };
        var leave = function () { state.hover = null; revertMorph(); refreshDomains(); };
        btn.addEventListener('mouseenter', enter);
        btn.addEventListener('mouseleave', leave);
        btn.addEventListener('focus', enter);
        btn.addEventListener('blur', leave);
        btn.addEventListener('click', function () { selectDomain(dom); });
        row.appendChild(btn);
        btns.push(btn);
      });
      return btns;
    }

    function renderFilters(d) {
      var bar = document.getElementById('filters');
      clear(bar);
      var chips = [];
      var all = node('button', 'chip', 'All');
      all.type = 'button';
      all.dataset.all = '1';
      all.addEventListener('click', function () { state.filter = null; setMorph('base'); refreshDomains(); renderProjects(data); });
      bar.appendChild(all);
      chips.push(all);
      d.domains.forEach(function (dom) {
        var chip = node('button', 'chip', dom.label);
        chip.type = 'button';
        chip.dataset.id = dom.id;
        chip.addEventListener('click', function () { selectDomain(dom); });
        bar.appendChild(chip);
        chips.push(chip);
      });
      return chips;
    }

    function renderProjects(d) {
      var host = document.getElementById('cases');
      clear(host);
      var list = d.projects.filter(function (p) { return !state.filter || p.domains.indexOf(state.filter) >= 0; });
      if (!list.length) {
        host.appendChild(node('div', 'empty-state', 'No easy problems found.'));
        return;
      }
      list.forEach(function (p, i) {
        var row = node('div', 'case');

        var colA = node('div');
        var head = node('div', 'case-head');
        head.appendChild(node('span', 'case-num', pad2(i + 1)));
        head.appendChild(node('span', 'case-kicker', p.kicker));
        colA.appendChild(head);
        colA.appendChild(node('h3', 'case-title', p.title));
        colA.appendChild(node('div', 'case-subtitle', p.subtitle));
        var tags = node('div', 'tags');
        (p.tags || []).forEach(function (t) { tags.appendChild(node('span', 'tag', t)); });
        colA.appendChild(tags);

        var colB = node('div', 'case-mid');
        var prob = node('div');
        prob.appendChild(node('div', 'micro-label', 'Problem'));
        prob.appendChild(node('div', 'micro-body', p.problem));
        colB.appendChild(prob);
        var built = node('div');
        built.appendChild(node('div', 'micro-label', 'What I built'));
        built.appendChild(node('div', 'micro-body', p.built));
        colB.appendChild(built);
        if (p.links && Object.keys(p.links).length) colB.appendChild(linkRow(p.links));

        var colC = node('div', 'case-metric');
        colC.appendChild(node('div', 'metric-value', p.metricValue));
        colC.appendChild(node('div', 'metric-label', p.metricLabel));

        row.appendChild(colA);
        row.appendChild(colB);
        row.appendChild(colC);
        host.appendChild(row);
      });
      host.appendChild(node('div', 'case-rule'));
    }

    function renderPublications(d) {
      var host = document.getElementById('pub-groups');
      clear(host);
      TIER_ORDER.forEach(function (tier) {
        var items = d.publications.filter(function (p) { return p.tier === tier; });
        if (!items.length) return;
        var group = node('div', 'pub-group');
        var gh = node('div', 'pub-group-head');
        gh.appendChild(node('h3', 'pub-group-label', TIER_LABELS[tier]));
        gh.appendChild(node('span', 'pub-group-count', '[' + pad2(items.length) + ']'));
        gh.appendChild(node('span', 'pub-group-rule'));
        group.appendChild(gh);
        items.forEach(function (p) {
          var row = node('div', 'pub' + (p.astar ? ' astar' : ''));
          var meta = node('div', 'pub-meta');
          var venueLine = node('div', 'pub-venue');
          venueLine.appendChild(document.createTextNode(p.venue));
          if (p.astar) venueLine.appendChild(node('span', 'astar-badge', 'A★'));
          meta.appendChild(venueLine);
          meta.appendChild(node('div', null, p.year + ' · ' + p.status));
          if (p.authorship) meta.appendChild(node('div', 'pub-authorship', p.authorship));
          var body = node('div');
          body.appendChild(node('h4', 'pub-title', p.title));
          body.appendChild(node('p', 'pub-summary', p.summary));
          if (p.links && Object.keys(p.links).length) body.appendChild(linkRow(p.links));
          row.appendChild(meta);
          row.appendChild(body);
          group.appendChild(row);
        });
        host.appendChild(group);
      });
    }

    function renderFounder(d) {
      document.getElementById('founder-kicker').textContent = d.founder.kicker;
      document.getElementById('founder-name').textContent = d.founder.name;
      document.getElementById('founder-desc').textContent = d.founder.description;
      var badges = document.getElementById('founder-badges');
      clear(badges);
      (d.founder.badges || []).forEach(function (b) { badges.appendChild(node('span', 'badge', b)); });
      var stats = document.getElementById('founder-stats');
      clear(stats);
      d.founderStats.forEach(function (s) {
        var cell = node('div', 'founder-stat');
        cell.appendChild(node('div', 'stat-value', s.value));
        cell.appendChild(node('div', 'stat-label', s.label));
        stats.appendChild(cell);
      });
    }

    function renderExperience(d) {
      var host = document.getElementById('experience-cards');
      clear(host);
      d.experience.forEach(function (b) {
        var card = node('div', 'build-card');
        card.appendChild(node('div', 'build-kicker', b.kicker));
        card.appendChild(node('h3', 'build-title', b.title));
        card.appendChild(node('p', 'build-detail', b.detail));
        host.appendChild(card);
      });
    }

    function renderNews(d) {
      var host = document.getElementById('timeline');
      clear(host);
      d.news.forEach(function (n) {
        var row = node('div', 'news-row');
        row.appendChild(node('div', 'news-date', n.date));
        var head = node('div', 'news-head');
        head.appendChild(node('h3', 'news-title', n.title));
        if (n.tag) head.appendChild(node('span', 'news-tag', n.tag));
        row.appendChild(head);
        row.appendChild(node('div', 'news-detail', n.detail));
        host.appendChild(row);
      });
      host.appendChild(node('div', 'news-rule'));
    }

    function renderStack(d) {
      var host = document.getElementById('stack-groups');
      clear(host);
      var addGroup = function (label, items) {
        var g = node('div', 'skill-group');
        g.appendChild(node('div', 'skill-group-label', label));
        var chips = node('div', 'skill-chips');
        items.forEach(function (it) { chips.appendChild(node('span', 'skill-chip', it)); });
        g.appendChild(chips);
        host.appendChild(g);
      };
      Object.keys(d.skills).forEach(function (k) { addGroup(k, d.skills[k]); });
      if (d.coursework && d.coursework.length) addGroup('Coursework', d.coursework);
    }

    function renderFoundations(d) {
      var host = document.getElementById('cs-foundations');
      clear(host);
      (d.foundations || []).forEach(function (f) {
        var item = node('div', 'foundation');
        item.appendChild(node('div', 'foundation-title', f.title));
        if (f.note) item.appendChild(node('div', 'foundation-note', f.note));
        if (f.links && Object.keys(f.links).length) item.appendChild(linkRow(f.links));
        host.appendChild(item);
      });
    }

    function renderContact(d) {
      var btn = document.getElementById('email-btn');
      var email = d.profile.email;
      btn.textContent = email;
      var resetT = null;
      btn.addEventListener('click', function () {
        try { if (navigator.clipboard) navigator.clipboard.writeText(email); } catch (e) {}
        btn.textContent = 'copied ✓';
        clearTimeout(resetT);
        resetT = setTimeout(function () { btn.textContent = email; }, 1800);
      });
      var socials = document.getElementById('socials');
      clear(socials);
      if (d.connect) {
        var url = 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(email) +
          '&su=' + encodeURIComponent(d.connect.subject) + '&body=' + encodeURIComponent(d.connect.body);
        var rq = node('a', 'social-btn resume-req', d.connect.label + ' ↗');
        rq.href = url; rq.target = '_blank'; rq.rel = 'noopener';
        socials.appendChild(rq);
      }
      SOCIAL_ORDER.forEach(function (key) {
        var url = d.profile.links[key];
        if (!url) return;
        var a = node('a', 'social-btn', LINK_LABELS[key] + ' ↗');
        a.href = url; a.target = '_blank'; a.rel = 'noopener';
        socials.appendChild(a);
      });
    }

    function wireMenu() {
      var menu = document.getElementById('mobile-menu');
      var toggle = document.querySelector('[data-toggle-menu]');
      function close() { menu.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-label', 'Open menu'); }
      toggle.addEventListener('click', function () {
        var open = menu.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      });
      Array.prototype.forEach.call(document.querySelectorAll('[data-close-menu]'), function (a) {
        a.addEventListener('click', close);
      });
    }

    function startInstrument() {
      var canvas = document.getElementById('instrument');
      var hero = document.getElementById('hero');
      var statusText = document.getElementById('status-text');
      var mobile = window.innerWidth < 760;
      function fail() { hero.classList.add('is-failed'); statusText.textContent = 'static background'; }
      var waited = 0;
      (function wait() {
        if (window.THREE) {
          instrument = window.createInstrument(canvas, {
            mobile: mobile, reduceMotion: reduce,
            onReady: function () { statusText.textContent = 'drag to rotate · scroll to read'; },
            onFail: fail
          });
          return;
        }
        waited += 90;
        if (waited > 6000) { fail(); return; }
        setTimeout(wait, 90);
      })();
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    fetch('data/content.json', { cache: 'no-cache' })
      .then(function (r) { return r.json(); })
      .then(init)
      .catch(function (err) {
        var s = document.getElementById('status-text');
        if (s) s.textContent = 'content unavailable';
        if (window.console) console.error('content load failed', err);
      });
  });
})();
