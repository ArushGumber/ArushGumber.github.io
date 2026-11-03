(function () {
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var LINK_LABELS = {
    paper: 'Paper', openreview: 'OpenReview', code: 'Code', demo: 'Demo', talk: 'Talk',
    preprint: 'Preprint', website: 'Team page'
  };
  var SOCIALS = [['scholar', 'Scholar'], ['github', 'GitHub'], ['linkedin', 'LinkedIn']];
  var HEAD_LAYER = 13;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function rich(tag, cls, text) {
    var n = el(tag, cls);
    String(text).split('**').forEach(function (part, i) {
      if (!part) return;
      n.appendChild(i % 2 ? el('b', null, part) : document.createTextNode(part));
    });
    return n;
  }
  function svg(tag, attrs) {
    var n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }
  function longDate(iso) {
    var p = iso.split('-');
    return parseInt(p[2], 10) + ' ' + MONTHS[parseInt(p[1], 10) - 1] + ' ' + p[0];
  }
  function external(a) { a.target = '_blank'; a.rel = 'noopener'; return a; }

  function init(data) {
    var domainColor = {};
    data.domains.forEach(function (d) { domainColor[d.id] = d.color; });
    function dot(domain) {
      var d = el('span', 'dot');
      d.style.background = domainColor[domain] || 'var(--ink)';
      d.setAttribute('aria-hidden', 'true');
      return d;
    }
    function linkRow(links) {
      var row = el('div', 'links');
      Object.keys(links || {}).forEach(function (key) {
        if (!links[key]) return;
        var a = external(el('a', null, (LINK_LABELS[key] || key) + ' ↗'));
        a.href = links[key];
        row.appendChild(a);
      });
      return row;
    }
    function handNote(text) {
      var note = el('span', 'hand', text);
      note.setAttribute('aria-hidden', 'true');
      var s = svg('svg', { width: '26', height: '30', viewBox: '0 0 26 30' });
      s.appendChild(svg('path', { d: 'M4 3 C 18 6, 22 16, 12 27 M7 21 L11 28 L18 24' }));
      note.appendChild(s);
      return note;
    }
    function picture(photo, eager) {
      var pic = el('picture');
      var source = el('source');
      source.type = 'image/webp';
      source.srcset = 'images/' + photo.file + '.webp';
      var img = el('img');
      img.src = 'images/' + photo.file + '.jpg';
      img.alt = photo.alt;
      img.width = photo.width;
      img.height = photo.height;
      img.loading = eager ? 'eager' : 'lazy';
      img.decoding = 'async';
      pic.appendChild(source);
      pic.appendChild(img);
      return pic;
    }
    function photoFrame(photo, eager) {
      var ph = el('div', 'ph');
      ph.style.aspectRatio = photo.width + ' / ' + photo.height;
      ph.appendChild(picture(photo, eager));
      ph.appendChild(el('span', 'patch', 'patchify(16×16)'));
      return ph;
    }
    function dims(index, photo) {
      var d = el('span', 'dims');
      d.appendChild(document.createTextNode('x'));
      if (index != null) d.appendChild(el('sub', null, String(index)));
      d.appendChild(document.createTextNode(' ∈ ℝ'));
      d.appendChild(el('sup', null, photo.height + '×' + photo.width + '×3'));
      return d;
    }

    var accepted = data.publications.filter(function (p) { return p.tier !== 'preprint'; });

    $('brand-name').textContent = data.profile.name;
    $('brand-tag').textContent = data.profile.tagline;
    $('stamp-date').textContent = data.stamp.title + ' ' + longDate(data.updated);
    $('stamp-ckpt').textContent = 'ckpt ' + data.updated;
    $('stamp').setAttribute('aria-label', 'Last updated ' + longDate(data.updated));

    var photos = data.photos.slice().sort(function (a, b) { return a.order - b.order; });
    function inGroup(name) { return photos.filter(function (p) { return p.group === name; }); }
    var cover = inGroup('cover')[0];
    var conferencePhotos = inGroup('conference');
    var personalPhotos = inGroup('personal');

    data.layers.forEach(function (layer) {
      if (!layer.title || layer.id === 'about' || layer.id === 'workshops' || layer.id === 'failure') return;
      var a = el('a', null, layer.id === 'head' ? 'contact' : layer.title.toLowerCase());
      a.href = '#' + layer.id;
      $('top-nav').appendChild(a);
    });

    var renderers = {
      input: renderHero,
      about: renderAbout,
      papers: renderPapers,
      workshops: renderWorkshops,
      companies: renderCompanies,
      projects: renderProjects,
      experience: renderExperience,
      news: renderNews,
      failure: renderFailures,
      head: renderHead
    };

    var main = $('main');
    data.layers.forEach(function (layer) {
      var section = el('section', layer.id === 'input' ? 'hero' : layer.id === 'head' ? 'head-section' : null);
      section.id = layer.id;
      section.dataset.lo = layer.lo;
      section.dataset.hi = layer.hi;
      section.dataset.name = layer.name;
      var wrap = el('div', 'wrap');
      if (layer.title) {
        var head = el('div', 'layer-head');
        head.appendChild(el('span', 'layer-tag', layer.lo === HEAD_LAYER ? 'head' : 'L' + layer.lo));
        head.appendChild(el('h2', null, layer.title));
        head.appendChild(el('span', 'layer-op', layer.op));
        wrap.appendChild(head);
      }
      section.appendChild(wrap);
      renderers[layer.id](wrap, section);
      main.appendChild(section);
    });

    function renderHero(wrap) {
      var kick = el('div', 'kick');
      kick.appendChild(el('b', null, 'L0'));
      kick.appendChild(el('span', null, data.hero.kicker));
      wrap.appendChild(kick);

      var h1 = el('h1');
      var accentIndex = 0;
      var lastName = null;
      data.about.headline.forEach(function (part) {
        if (part.tone !== 'accent') {
          if (lastName && /^[.,!?]$/.test(part.text)) lastName.insertBefore(el('span', 'punct', part.text), lastName.querySelector('sup'));
          else h1.appendChild(document.createTextNode(part.text));
          lastName = null;
          return;
        }
        accentIndex++;
        var name = el('span', 'name ' + (accentIndex === 1 ? 'name-a' : 'name-b'), part.text);
        name.appendChild(el('sup', null, String(accentIndex)));
        var line = svg('svg', { 'class': 'pen-line', viewBox: '0 0 300 12', preserveAspectRatio: 'none', 'aria-hidden': 'true' });
        line.appendChild(svg('path', { d: accentIndex === 1 ? 'M3 8 C 70 3, 150 10, 220 6 S 285 4, 297 7' : 'M2 6 C 60 10, 130 3, 200 7 S 280 9, 298 5' }));
        name.appendChild(line);
        h1.appendChild(name);
        lastName = name;
      });
      wrap.appendChild(h1);

      var notes = el('div', 'footnotes');
      data.hero.footnotes.forEach(function (text, i) {
        var s = el('span');
        s.appendChild(el('b', null, String(i + 1)));
        s.appendChild(document.createTextNode(text));
        notes.appendChild(s);
      });
      wrap.appendChild(notes);

      var f = data.hero.formula;
      var theorem = el('div', 'theorem');
      var formula = el('p', 'formula');
      function lambda(withSub) {
        var v = el('var', null, 'λ');
        if (withSub) v.appendChild(el('sub', null, 't'));
        return v;
      }
      formula.appendChild(el('b', null, f.lhs));
      formula.appendChild(document.createTextNode(' = '));
      formula.appendChild(lambda(true));
      formula.appendChild(document.createTextNode(' · '));
      formula.appendChild(el('b', null, f.left));
      formula.appendChild(document.createTextNode(' + (1 − '));
      formula.appendChild(lambda(true));
      formula.appendChild(document.createTextNode(') · '));
      formula.appendChild(el('b', null, f.right));
      var where = el('span', 'where');
      where.appendChild(document.createTextNode('where '));
      where.appendChild(lambda(true));
      where.appendChild(document.createTextNode(' ∈ [0, 1] ' + f.where));
      formula.appendChild(where);
      theorem.appendChild(formula);
      var proof = el('p', 'proof');
      proof.appendChild(el('em', null, 'Proof.'));
      proof.appendChild(document.createTextNode(' ' + data.hero.proof));
      var qed = el('span', 'qed');
      qed.setAttribute('aria-hidden', 'true');
      proof.appendChild(qed);
      theorem.appendChild(proof);
      wrap.appendChild(theorem);

      var grid = el('div', 'hero-grid');
      var left = el('div');
      var intro = rich('p', 'intro', data.about.intro);
      intro.appendChild(el('sup', null, '1'));
      left.appendChild(intro);
      left.appendChild(rich('p', 'cred', data.about.credentials));
      var facts = el('div', 'facts');
      data.keyFacts.forEach(function (fact) {
        var cell = el('div', 'fact');
        cell.appendChild(el('b', null, fact.countAccepted ? String(accepted.length) : fact.value));
        cell.appendChild(rich('span', null, fact.label));
        facts.appendChild(cell);
      });
      left.appendChild(facts);
      var fn = el('p', 'footnote');
      fn.appendChild(el('sup', null, '1'));
      fn.appendChild(document.createTextNode(data.about.footnote));
      left.appendChild(fn);
      grid.appendChild(left);

      var plate = el('figure', 'plate');
      var top = el('div', 'plate-top');
      top.appendChild(dims(cover.order, cover));
      top.appendChild(el('span', null, 'input sample'));
      plate.appendChild(top);
      var frame = el('div', 'plate-frame');
      frame.appendChild(el('span', 'plate-tag', 'Plate I'));
      frame.appendChild(photoFrame(cover, true));
      plate.appendChild(frame);
      var cap = el('figcaption');
      cap.appendChild(el('span', null, cover.where));
      cap.appendChild(el('span', 'label', 'label: ' + cover.label));
      plate.appendChild(cap);
      grid.appendChild(plate);
      wrap.appendChild(grid);
    }

    function renderAbout(wrap) {
      var grid = el('div', 'about-grid');
      var copy = el('div', 'about-copy');
      data.about.paragraphs.forEach(function (p) { copy.appendChild(rich('p', null, p)); });
      var skills = el('div', 'skills');
      Object.keys(data.skills).forEach(function (group) {
        var row = el('div', 'skill-row');
        row.appendChild(el('span', null, group));
        row.appendChild(el('span', null, data.skills[group].join(' · ')));
        skills.appendChild(row);
      });
      var course = el('div', 'skill-row');
      course.appendChild(el('span', null, 'Coursework'));
      course.appendChild(el('span', null, data.coursework.join(' · ')));
      skills.appendChild(course);
      copy.appendChild(skills);
      grid.appendChild(copy);
      grid.appendChild(renderPrints());
      wrap.appendChild(grid);
      renderGallery(wrap);
    }

    function renderPrints() {
      var block = el('div', 'prints');
      personalPhotos.forEach(function (photo, i) {
        var print = el('figure', 'print');
        print.style.setProperty('--tilt', (i % 2 ? 2.4 : -2.8) + 'deg');
        var frame = el('div', 'print-photo');
        var tape = el('span', 'tape');
        tape.setAttribute('aria-hidden', 'true');
        frame.appendChild(tape);
        frame.appendChild(picture(photo, false));
        print.appendChild(frame);
        print.appendChild(el('figcaption', null, photo.caption));
        block.appendChild(print);
      });
      var note = el('span', 'hand prints-note');
      note.setAttribute('aria-hidden', 'true');
      note.appendChild(el('span', null, data.gallery.personalTitle));
      var arrow = svg('svg', { width: '28', height: '34', viewBox: '0 0 28 34' });
      arrow.appendChild(svg('path', { d: 'M4 3 C 20 8, 24 20, 12 31 M7 25 L12 32 L19 28' }));
      note.appendChild(arrow);
      block.insertBefore(note, block.firstChild);
      return block;
    }

    function renderGallery(wrap) {
      var count = conferencePhotos.length;
      var toggle = el('button', 'deck');
      toggle.type = 'button';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-controls', 'conference-samples');
      var stack = el('span', 'deck-stack');
      stack.setAttribute('aria-hidden', 'true');
      conferencePhotos.slice(0, 3).forEach(function (photo) {
        var card = el('span', 'deck-card');
        card.appendChild(picture(photo, true));
        stack.appendChild(card);
      });
      toggle.appendChild(stack);
      var label = el('span', 'deck-label');
      var text = el('span', null, data.gallery.open + ' (' + count + ')');
      label.appendChild(text);
      label.appendChild(el('span', 'deck-shape', data.gallery.subtitle));
      toggle.appendChild(label);
      var sign = el('span', 'deck-sign', '+');
      sign.setAttribute('aria-hidden', 'true');
      toggle.appendChild(sign);
      wrap.appendChild(toggle);

      var gallery = el('ul', 'gallery');
      gallery.id = 'conference-samples';
      gallery.hidden = true;
      conferencePhotos.forEach(function (photo, i) {
        var item = el('li', 'shot');
        var thumb = el('button', 'shot-thumb');
        thumb.type = 'button';
        thumb.setAttribute('aria-label', 'Enlarge: ' + photo.alt);
        thumb.appendChild(picture(photo, false));
        var zoom = el('span', 'shot-zoom', 'enlarge ↗');
        zoom.setAttribute('aria-hidden', 'true');
        thumb.appendChild(zoom);
        thumb.addEventListener('click', function () { openLightbox(i, thumb); });
        item.appendChild(thumb);
        item.appendChild(el('p', 'shot-venue', photo.venue));
        item.appendChild(el('p', 'shot-caption', photo.caption));
        item.appendChild(dims(null, photo));
        gallery.appendChild(item);
      });
      wrap.appendChild(gallery);

      toggle.addEventListener('click', function () {
        var open = toggle.getAttribute('aria-expanded') !== 'true';
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        text.textContent = (open ? data.gallery.close : data.gallery.open) + ' (' + count + ')';
        sign.textContent = open ? '−' : '+';
        gallery.hidden = !open;
        if (!open || reduceMotion) return;
        var items = Array.prototype.slice.call(gallery.children);
        items.forEach(function (item, i) {
          item.style.transition = 'none';
          item.style.opacity = '0';
          item.style.transform = 'translateY(-18px) rotate(' + (i - 1) * 2.5 + 'deg) scale(0.96)';
        });
        gallery.getBoundingClientRect();
        items.forEach(function (item, i) {
          var delay = i * 70;
          item.style.transition = 'transform .55s cubic-bezier(.2,.8,.25,1.05) ' + delay + 'ms, opacity .35s ease ' + delay + 'ms';
          item.style.opacity = '1';
          item.style.transform = 'none';
        });
      });

      var box = el('dialog', 'lightbox');
      box.setAttribute('aria-label', 'Conference photo');
      var close = el('button', 'lightbox-close', 'close ✕');
      close.type = 'button';
      var stage = el('div', 'lightbox-stage');
      var prev = el('button', 'lightbox-nav', '←');
      prev.type = 'button';
      prev.setAttribute('aria-label', 'Previous photo');
      var next = el('button', 'lightbox-nav', '→');
      next.type = 'button';
      next.setAttribute('aria-label', 'Next photo');
      var figure = el('figure', 'lightbox-figure');
      stage.appendChild(prev);
      stage.appendChild(figure);
      stage.appendChild(next);
      box.appendChild(close);
      box.appendChild(stage);
      document.body.appendChild(box);
      var current = 0;
      var opener = null;

      function show(index) {
        current = (index + count) % count;
        var photo = conferencePhotos[current];
        figure.innerHTML = '';
        var img = picture(photo, true);
        figure.appendChild(img);
        var cap = el('figcaption');
        var top = el('span', 'lightbox-meta');
        top.appendChild(el('b', null, photo.venue));
        top.appendChild(el('span', null, (current + 1) + ' / ' + count));
        cap.appendChild(top);
        cap.appendChild(el('span', 'lightbox-caption', photo.caption));
        cap.appendChild(dims(null, photo));
        figure.appendChild(cap);
      }
      function openLightbox(index, from) {
        opener = from;
        show(index);
        if (box.showModal) box.showModal(); else box.setAttribute('open', '');
        close.focus();
      }
      function closeLightbox() {
        if (box.close) box.close(); else box.removeAttribute('open');
      }
      box.addEventListener('close', function () { if (opener) opener.focus(); });
      close.addEventListener('click', closeLightbox);
      prev.addEventListener('click', function () { show(current - 1); });
      next.addEventListener('click', function () { show(current + 1); });
      box.addEventListener('click', function (e) { if (e.target === box) closeLightbox(); });
      box.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowLeft') { e.preventDefault(); show(current - 1); }
        if (e.key === 'ArrowRight') { e.preventDefault(); show(current + 1); }
      });
    }

    function authorLine(authors) {
      var line = el('div', 'authors');
      authors.split(', ').forEach(function (name, i) {
        if (i) line.appendChild(document.createTextNode(', '));
        if (name.replace(/[*†]+$/, '') === data.profile.self) line.appendChild(el('b', null, name));
        else line.appendChild(document.createTextNode(name));
      });
      return line;
    }
    function pubRow(p, compact) {
      var row = el('article', 'row' + (compact ? ' compact' : ''));
      var meta = el('div', 'meta');
      var venue = el('div', 'venue');
      venue.appendChild(dot(p.domain));
      venue.appendChild(document.createTextNode(p.venue));
      if (p.astar) venue.appendChild(el('span', 'badge-astar', 'A*'));
      meta.appendChild(venue);
      if (p.venueLong) meta.appendChild(el('div', null, p.venueLong));
      var hot = /Spotlight|Industry|Accepted Jul/.test(p.status);
      meta.appendChild(el('div', hot ? 'status-hot' : null, p.status + (p.tier === 'preprint' ? '' : ' · ' + p.year)));
      var body = el('div');
      body.appendChild(el('h3', 'title', p.title));
      if (p.authors) body.appendChild(authorLine(p.authors));
      body.appendChild(rich('p', 'summary', p.summary));
      if (p.note) body.appendChild(el('p', 'note', p.note));
      if (p.links && Object.keys(p.links).length) body.appendChild(linkRow(p.links));
      row.appendChild(meta);
      row.appendChild(body);
      return row;
    }
    function group(host, label, count) {
      var g = el('div', 'group');
      g.appendChild(el('b', null, label));
      g.appendChild(el('span', null, '[' + count + ']'));
      host.appendChild(g);
    }

    function renderPapers(wrap) {
      var list = data.publications.filter(function (p) { return p.tier === 'conference' || p.tier === 'journal'; });
      wrap.appendChild(el('p', 'legend', data.researchIntro.replace('{count}', accepted.length)));
      group(wrap, 'Main conference and journal', list.length);
      list.forEach(function (p) { wrap.appendChild(pubRow(p)); });
    }

    function renderWorkshops(wrap) {
      var ws = data.publications.filter(function (p) { return p.tier === 'workshop'; });
      var pre = data.publications.filter(function (p) { return p.tier === 'preprint'; });
      group(wrap, 'Workshops', ws.length);
      ws.forEach(function (p) { wrap.appendChild(pubRow(p, true)); });
      group(wrap, 'Preprints', pre.length);
      pre.forEach(function (p) { wrap.appendChild(pubRow(p, true)); });
    }

    function renderCompanies(wrap) {
      var grid = el('div', 'companies');
      data.companies.forEach(function (c) {
        var card = el('article', 'company');
        var role = el('div', 'role');
        role.appendChild(dot(c.domain));
        role.appendChild(document.createTextNode(c.role + ' · ' + c.dates));
        card.appendChild(role);
        card.appendChild(el('h3', null, c.name));
        card.appendChild(rich('p', null, c.detail));
        if (c.badges) {
          var badges = el('div', 'badges');
          c.badges.forEach(function (b) { badges.appendChild(el('span', null, b)); });
          card.appendChild(badges);
        }
        var nums = el('div', 'numbers');
        c.stats.forEach(function (s) {
          var cell = el('div');
          cell.appendChild(el('b', null, s.value));
          cell.appendChild(el('span', null, s.label));
          nums.appendChild(cell);
        });
        card.appendChild(nums);
        grid.appendChild(card);
      });
      wrap.appendChild(grid);
    }

    function renderProjects(wrap) {
      var grid = el('div', 'projects');
      data.projects.forEach(function (p) {
        var card = el('article', 'project');
        var body = el('div');
        var kicker = el('div', 'kicker');
        kicker.appendChild(dot(p.domain));
        kicker.appendChild(document.createTextNode(p.kicker));
        body.appendChild(kicker);
        body.appendChild(el('h3', null, p.title));
        body.appendChild(el('p', null, p.built));
        if (p.links && Object.keys(p.links).length) body.appendChild(linkRow(p.links));
        var metric = el('div', 'metric');
        var value = el('b', null, p.metricValue);
        value.style.color = domainColor[p.domain];
        metric.appendChild(value);
        metric.appendChild(el('span', null, p.metricLabel));
        card.appendChild(body);
        card.appendChild(metric);
        grid.appendChild(card);
      });
      wrap.appendChild(grid);
    }

    function renderExperience(wrap) {
      data.experience.forEach(function (e) {
        var row = el('article', 'row');
        var meta = el('div', 'meta');
        var dates = el('div', 'venue');
        dates.appendChild(dot(e.domain));
        dates.appendChild(document.createTextNode(e.dates));
        meta.appendChild(dates);
        meta.appendChild(el('div', null, e.kind));
        var body = el('div');
        body.appendChild(el('h3', 'title', e.title));
        body.appendChild(rich('p', 'summary', e.detail));
        if (e.link) body.appendChild(linkRow({ website: e.link }));
        row.appendChild(meta);
        row.appendChild(body);
        wrap.appendChild(row);
      });
    }

    function renderNews(wrap, section) {
      section.classList.add('news-anchor');
      wrap.classList.add('anchor');
      wrap.appendChild(handNote(data.notes.news));
      var list = el('div', 'news');
      data.news.forEach(function (n) {
        var item = el('div', 'item');
        item.appendChild(el('div', 'date', n.date));
        var body = el('div');
        var h = el('h3', null, n.title);
        if (n.tag) h.appendChild(el('span', 'tag', n.tag));
        body.appendChild(h);
        body.appendChild(el('p', null, n.detail));
        item.appendChild(body);
        list.appendChild(item);
      });
      wrap.appendChild(list);
    }

    function renderFailures(wrap, section) {
      section.classList.add('failure-anchor');
      wrap.classList.add('anchor');
      wrap.appendChild(handNote(data.notes.failure));
      var list = el('ol', 'failures');
      data.failureModes.forEach(function (f) {
        var li = el('li');
        var text = el('div');
        text.appendChild(el('b', null, f.title));
        text.appendChild(el('span', null, f.detail));
        li.appendChild(text);
        list.appendChild(li);
      });
      wrap.appendChild(list);
    }

    function renderHead(wrap, section) {
      var c = data.contact;
      var out = el('div', 'output');
      var left = el('div');
      left.appendChild(el('h2', null, c.headline));
      left.appendChild(el('p', 'lede', c.lede));
      var actions = el('div', 'actions');
      var email = data.profile.email;
      var request = external(el('a', 'btn primary', data.connect.label + ' ↗'));
      request.href = 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(email) +
        '&su=' + encodeURIComponent(data.connect.subject) + '&body=' + encodeURIComponent(data.connect.body);
      actions.appendChild(request);
      var copy = el('button', 'btn', email);
      copy.type = 'button';
      copy.addEventListener('click', function () {
        try { if (navigator.clipboard) navigator.clipboard.writeText(email); } catch (err) {}
        copy.textContent = 'copied to clipboard';
        setTimeout(function () { copy.textContent = email; }, 1600);
      });
      actions.appendChild(copy);
      SOCIALS.forEach(function (s) {
        if (!data.profile.links[s[0]]) return;
        var a = external(el('a', 'btn', s[1] + ' ↗'));
        a.href = data.profile.links[s[0]];
        actions.appendChild(a);
      });
      left.appendChild(actions);
      var signature = el('div', 'signature');
      signature.appendChild(el('span', 'signature-name', c.signature.name));
      signature.appendChild(el('span', 'signature-label', c.signature.label));
      left.appendChild(signature);
      out.appendChild(left);

      var soft = el('div', 'softmax');
      soft.appendChild(el('div', 'softmax-title', 'softmax over what we could do together'));
      var max = Math.max.apply(null, c.softmax.map(function (s) { return s[1]; }));
      c.softmax.forEach(function (s) {
        var bar = el('div', 'bar');
        bar.appendChild(el('span', null, s[0]));
        var track = el('div', 'track');
        var fill = el('i');
        fill.dataset.width = (s[1] / max * 100).toFixed(1) + '%';
        track.appendChild(fill);
        bar.appendChild(track);
        bar.appendChild(el('b', null, s[1].toFixed(2)));
        soft.appendChild(bar);
      });
      out.appendChild(soft);
      wrap.appendChild(out);
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries, observer) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            Array.prototype.forEach.call(soft.querySelectorAll('i'), function (i) { i.style.width = i.dataset.width; });
            observer.disconnect();
          });
        }, { threshold: 0.4 }).observe(soft);
      } else {
        Array.prototype.forEach.call(soft.querySelectorAll('i'), function (i) { i.style.width = i.dataset.width; });
      }

      var toggle = el('button', 'embed-toggle');
      toggle.type = 'button';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-controls', 'embedding');
      toggle.appendChild(el('span', null, data.embedding.button));
      var sign = el('span', 'sign', '+');
      sign.setAttribute('aria-hidden', 'true');
      toggle.appendChild(sign);
      wrap.appendChild(toggle);

      var panel = el('div', 'embed-panel');
      panel.id = 'embedding';
      panel.hidden = true;
      var bar = el('div', 'embed-bar');
      var readout = el('output');
      bar.appendChild(readout);
      var controls = el('div', 'embed-controls');
      var range = el('input');
      range.type = 'range';
      range.min = '0';
      range.max = '12';
      range.step = '0.01';
      range.value = '0';
      range.setAttribute('aria-label', 'Layer depth');
      controls.appendChild(range);
      var run = el('button', 'run', 'run forward pass ▸');
      run.type = 'button';
      controls.appendChild(run);
      bar.appendChild(controls);
      panel.appendChild(bar);
      var canvas = el('canvas', 'embed-canvas');
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', 'Vectors for every paper, company, project and role, scattered by domain at layer 0, aligning into one direction toward the long-term goal by the output head.');
      panel.appendChild(canvas);
      var legend = el('div', 'embed-legend');
      panel.appendChild(legend);
      panel.appendChild(rich('p', 'caption', '**Fig. 1.** ' + data.embedding.caption));
      wrap.appendChild(panel);

      var footer = el('footer');
      var fw = el('div', 'wrap');
      fw.appendChild(el('span', null, '© ' + new Date().getFullYear() + ' ' + data.profile.name + ' · IIIT-Delhi'));
      fw.appendChild(el('span', null, data.footer));
      footer.appendChild(fw);
      section.appendChild(footer);

      var figure = null;
      toggle.addEventListener('click', function () {
        var open = toggle.getAttribute('aria-expanded') !== 'true';
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        sign.textContent = open ? '−' : '+';
        panel.hidden = !open;
        if (!open) return;
        if (!figure) {
          var used = {};
          embeddingItems.forEach(function (it) { used[it.domain] = true; });
          data.domains.forEach(function (d) {
            if (!used[d.id]) return;
            var s = el('span');
            s.appendChild(dot(d.id));
            s.appendChild(document.createTextNode(d.label));
            legend.appendChild(s);
          });
          figure = window.Convergence.create(canvas, embeddingItems, data.domains, {
            goalLabel: data.embedding.goal,
            reduceMotion: reduceMotion,
            onDepth: function (depth, align) {
              range.value = (depth * 12).toFixed(2);
              var layer = Math.round(depth * 12);
              readout.innerHTML = '';
              readout.appendChild(document.createTextNode('layer ' + layer + ' / 12 · mean cos(h, goal) = '));
              readout.appendChild(el('b', null, align.toFixed(2)));
            }
          });
        }
        figure.play();
      });
      range.addEventListener('input', function () { if (figure) figure.setDepth(range.value / 12); });
      run.addEventListener('click', function () { if (figure) figure.play(); });
    }

    var embeddingItems = []
      .concat(data.publications.map(function (p) { return { domain: p.domain }; }))
      .concat(data.companies.map(function (c) { return { domain: c.domain }; }))
      .concat(data.projects.map(function (p) { return { domain: p.domain }; }))
      .concat(data.experience.map(function (e) { return { domain: e.domain }; }));

    function drawPenLines() {
      Array.prototype.forEach.call(document.querySelectorAll('.pen-line path'), function (path) {
        path.style.setProperty('--len', Math.ceil(path.getTotalLength() + 4));
      });
      var hero = $('input');
      if (reduceMotion) { hero.classList.add('drawn'); return; }
      requestAnimationFrame(function () { setTimeout(function () { hero.classList.add('drawn'); }, 450); });
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawPenLines); else drawPenLines();

    wireDepth(embeddingItems, data.domains);
  }

  function wireDepth(items, domains) {
    var sections = Array.prototype.slice.call(document.querySelectorAll('main section'));
    var names = [];
    sections.forEach(function (s) {
      for (var l = +s.dataset.lo; l <= +s.dataset.hi; l++) names[l] = s.dataset.name;
    });
    var ticks = [];
    for (var l = 0; l <= HEAD_LAYER; l++) {
      var tick = el('button', 'tick', l === HEAD_LAYER ? 'head' : 'L' + l);
      tick.type = 'button';
      tick.setAttribute('aria-label', (l === HEAD_LAYER ? 'Output head' : 'Layer ' + l) + ': ' + names[l]);
      tick.appendChild(el('em', null, names[l]));
      (function (layer) {
        tick.addEventListener('click', function () {
          var target = sections.filter(function (s) { return +s.dataset.lo <= layer && layer <= +s.dataset.hi; })[0];
          if (target) target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
        });
      })(l);
      $('ticks').appendChild(tick);
      ticks.push(tick);
    }

    var miniDraw = window.Convergence.mini($('mini'), items, domains);
    var current = -1;
    var shownDepth = 0;
    var targetDepth = 0;
    var animating = false;

    function layerFromScroll() {
      var probe = window.innerHeight * 0.35;
      var layer = 0;
      sections.forEach(function (s) {
        var r = s.getBoundingClientRect();
        if (r.top <= probe) {
          var lo = +s.dataset.lo, hi = +s.dataset.hi;
          var frac = r.height > 0 ? Math.min(0.999, Math.max(0, (probe - r.top) / r.height)) : 0;
          layer = lo + Math.floor(frac * (hi - lo + 1));
        }
      });
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) layer = HEAD_LAYER;
      return layer;
    }

    function tickMini() {
      shownDepth += (targetDepth - shownDepth) * 0.12;
      if (Math.abs(targetDepth - shownDepth) < 0.002) shownDepth = targetDepth;
      miniDraw(shownDepth);
      if (shownDepth !== targetDepth) requestAnimationFrame(tickMini); else animating = false;
    }

    function update() {
      var layer = layerFromScroll();
      if (layer === current) return;
      current = layer;
      ticks.forEach(function (t, i) {
        t.classList.toggle('on', i === layer);
        t.classList.toggle('passed', i < layer);
      });
      var first = ticks[0].offsetTop + ticks[0].offsetHeight / 2;
      var now = ticks[layer].offsetTop + ticks[layer].offsetHeight / 2;
      $('ticks-fill').style.height = Math.max(0, now - first) + 'px';
      $('progress-layer').textContent = (layer === HEAD_LAYER ? 'head' : 'L' + layer + ' / 12');
      $('progress-name').textContent = names[layer];
      $('progress-fill').style.width = (layer / HEAD_LAYER * 100) + '%';
      targetDepth = layer / HEAD_LAYER;
      if (reduceMotion) { shownDepth = targetDepth; miniDraw(shownDepth); return; }
      if (!animating) { animating = true; requestAnimationFrame(tickMini); }
    }

    miniDraw(0);
    var queued = false;
    window.addEventListener('scroll', function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; update(); });
    }, { passive: true });
    window.addEventListener('resize', function () { current = -1; update(); });
    update();
  }

  document.addEventListener('DOMContentLoaded', function () {
    fetch('data/content.json', { cache: 'no-cache' })
      .then(function (r) { return r.json(); })
      .then(init)
      .catch(function (err) {
        $('main').appendChild(el('p', 'noscript', 'Content failed to load.'));
        if (window.console) console.error(err);
      });
  });
})();
