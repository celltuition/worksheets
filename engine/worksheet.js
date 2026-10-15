/* CELL TUITION WORKSHEETS: turns the SHEET written in a sheet file into printed pages.
   The same file gives the worksheet and, with ?answers on the end of the address, the answer sheet with working.

   A SHEET looks like this:
     { code, year, strand, title, calculator: true | false,
       span: [9, 10]               when the sheet serves two year levels: the header then says "Years 9 to 10" (year stays the home year)| false,
       quiz: 'year-10-number'      the quiz page that matches this sheet (left out: the main quiz page is printed instead)
       keywords: [ 'multiplier', ... ]   the words a student needs for this sheet, printed in one line under the name
       sections: [ { title,
                     mode: 'sheet' (short answers written on the sheet) | 'book' (working done in the student's book),
                     level: 1 | 2 | 3            how hard the section is, shown as dots beside its heading
                     hint: 'one line'            printed under the heading after "Remember:"            } use one or the other,
                     watch: 'one line'           printed under the heading after "Watch out:"            } or neither
                     extension: true             the last section, for early finishers: a star instead of a letter
                     v1: [ questions ], v2: [ questions ]   two versions of the sheet: same layout, different numbers
                     (or  questions: [ ... ]  for a sheet with one version)
                     answerCols: 2               on the answer sheet, set this section's questions in two columns } ] }

     A question is  { stem, cols, lead, answerCols, parts: [ { q, w, a, at } ] }     several parts set out in columns
               or   { stem, w, a, at }                                               one question on its own
     q    what the student reads. Maths goes between \( and \).
     img  a drawing, written as in the quizzes, for example  'draw:poly 0,0 8,0 0,6 / 8 cm / x / 6 cm; ra 0,0 8,0 0,6'
          (a part's drawing sits above its words; a single question's drawing sits to the right of its words).
          scale: 0.38 makes a drawing smaller, 0.6 larger (0.45 if left out).
     w    the working, in LaTeX: one line, or a list of lines. The answer is joined to the last line with "=".
     a    the answer, in LaTeX.   at   words that follow or replace the answer, for example "increase".
     approx: true   the answer is rounded, so it is joined to the working with "≈" instead of "=".
     lead a sign printed before each answer line on the worksheet, such as "=".
     room millimetres of empty space left above a part's drawing, for the student to draw in.
     aimg a drawing for the answer sheet only (the line a student was asked to draw, for example). ascale sets its size.
     table  a table: { rows: [['x', -2, -1, 0], ['y', '', '', '']] }  An empty cell is one the student fills in.
            head: 1 makes the first row headings; the first column is headings unless side: 0.
     atable the same table filled in, for the answer sheet (the cells that were empty are printed bold).
     A question with parts can have one img or table for the whole question: it sits to the right of the parts,
     or above them with  wide: true.  A part's own words go above its drawing with  above: true.

   A sheet with two versions makes one PDF: Version 1, then Version 2. Each version starts on a new sheet of paper
   when the PDF is printed on both sides.                                                                             */
(function () {
  var SHEET = window.SHEET, ANSWERS = /[?&]answers/.test(location.search) && !SHEET.public;   // a published copy has no answers to show
  // Options on the address:  ?layout=space  (room to write the working under every question, pages filled exactly)
  //                          ?year=1        (print the year level in the header; it is left off unless asked for)
  //                          ?v=1 or ?v=2   (one version only)
  var SPACE = /[?&]layout=space/.test(location.search) && !ANSWERS, SHOW_YEAR = /[?&]year=1/.test(location.search), ONLY = (/[?&]v=([12])/.exec(location.search) || [])[1];
  var SHOW_REO = /[?&]reo=1/.test(location.search);   // preview only: print the te reo Māori proposals that have not been checked yet
  // A page of worked examples (one per section, written in the sheet file as  example: <part>  in the section's options) is
  // printed first only when the address says ?examples=1 (the viewer adds it when its box is ticked)
  var EXAMPLES = /[?&]examples=1/.test(location.search) && !ANSWERS;   // the worked examples page prints only when asked for (?examples=1): Marcel, 15 Oct 2026
  // ?strip=1 (used by tools/publish.ps1): instead of printing the sheet, write out its data with every answer, working and
  // answer drawing removed, so the copy published on the website carries the questions only. The worked examples keep theirs.
  if (/[?&]strip=1/.test(location.search)) {
    var KEEP_Q = ['stem', 'cols', 'scale', 'ascale', 'lead', 'img', 'table', 'wide', 'noBlank', 'longBlank', 'split', 'room', 'work', 'answerCols'];
    var KEEP_P = ['q', 'img', 'table', 'above', 'scale', 'room', 'v'];
    var pick = function (o, keys) { var out = {}; keys.forEach(function (k) { if (o[k] !== undefined) out[k] = o[k]; }); return out; };
    var stripQ = function (q) { var o = pick(q, KEEP_Q); if (q.parts) o.parts = q.parts.map(function (p) { return pick(p, KEEP_P); }); else { var single = pick(q, KEEP_P); Object.keys(single).forEach(function (k) { if (o[k] === undefined) o[k] = single[k]; }); } return o; };
    var data = { code: SHEET.code, year: SHEET.year, span: SHEET.span, strand: SHEET.strand, title: SHEET.title, calculator: SHEET.calculator, quiz: SHEET.quiz, keywords: SHEET.keywords, public: true, sections: SHEET.sections.map(function (s) {
      var o = { title: s.title, mode: s.mode, level: s.level, hint: s.hint, watch: s.watch, extension: s.extension, answerCols: s.answerCols, example: s.example };
      if (s.questions) o.questions = s.questions.map(stripQ); if (s.v1) o.v1 = s.v1.map(stripQ); if (s.v2) o.v2 = s.v2.map(stripQ);
      return o;
    }) };
    document.documentElement.innerHTML = '<head><meta charset="utf-8"></head><body><pre id="dump">' + JSON.stringify(data).replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre></body>';
    return;
  }
  var SITE = 'celltuition.com', ANSWERS_AT = SITE + '/answers', QUIZ_AT = SITE + '/' + (SHEET.quiz || 'do-nows');
  var VERSIONS = SHEET.sections.some(function (s) { return s.v2; }) ? ['1', '2'] : [''];
  if (ONLY && VERSIONS.length > 1) VERSIONS = [ONLY];
  var MM = 3.7795;   // pixels in a millimetre
  // Working space (?layout=space): how much room a student needs depends on the kind of question. A short-answer part
  // (mode 'sheet') gets 12 mm, a worked part (mode 'book') 20 mm, a question on its own (a word problem) 30 mm. A sheet
  // can set its own figure with  work: 25  on a question (millimetres, for every part of it). The boxes are ruled with a
  // faint line every 8 mm. SCALE shrinks everything once (to 0.8) if the last page would otherwise be nearly empty.
  var SPACE_MM = { sheet: 12, book: 20, single: 30 }, SCALE = 1, RULE_MM = 8;
  var here = document.currentScript.src.replace(/[^\/]*$/, '');
  var BULB = '<svg viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.3 1 2.1h5c0-.8.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>';
  var WARN = '<svg viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4l9 16H3z M12 10v4 M12 17v.5"/></svg>';
  var STAR = '<svg viewBox="0 0 24 24" fill="#fff"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"/></svg>';

  function load(tag, attrs) {
    return new Promise(function (done) {
      var el = document.createElement(tag);
      Object.keys(attrs).forEach(function (k) { el[k] = attrs[k]; });
      el.onload = done; el.onerror = done;
      document.head.appendChild(el);
    });
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function tex(s) { return window.katex ? katex.renderToString(String(s), { throwOnError: false }) : esc(s); }
  // Ordinary text, with any maths between \( and \) typeset
  // A piece of maths is never broken across two lines (it moves to the next line whole), and a "\n" in the text starts a new line
  function fmt(s) {
    return String(s).split(/(\\\(.*?\\\))/).map(function (bit) {
      return /^\\\(/.test(bit) ? '<span class="mth">' + tex(bit.slice(2, -2)) + '</span>' : esc(bit).replace(/\n/g, '<br>');
    }).join('');
  }
  function el(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }

  // A drawing, written the same short way as in the quizzes (the notes are in engine/draw.js), turned to black and white.
  // "scale" sets its printed size (0.45 if left out). fitFigures finishes the job once the drawing is on the page.
  function figHtml(spec, scale, room) {
    if (!window.CTDraw) return '';
    // A drawing may start with "letters=0.8|" to set how much its lettering is enlarged (a map with a name in every square, say)
    var letters = /^letters=([\d.]+)\|/.exec(spec);
    if (letters) spec = spec.slice(letters[0].length);
    var svg = CTDraw.figure(spec);
    // A drawing that holds "NaN" was given something it could not read as a number (a bar's name with a space in it, say).
    // It is listed as a problem, so that a broken graph cannot go unnoticed.
    if (/NaN/.test(svg)) (window.CT_BAD_FIGS = window.CT_BAD_FIGS || []).push(spec.slice(0, 60));
    // Several sets of bars are told apart by colour on a screen. In print the first set is black, the second grey and the third white.
    if (/^bars:/.test(spec)) svg = svg.replace(/#e7b53c/gi, '#d0d0d0').replace(/#d9480f/gi, '#ffffff');
    // room: millimetres left empty above the drawing, for the student to draw in (a box plot above its axis, say)
    return '<span class="fig" data-k="' + (scale || 0.45) + '"' + (letters ? ' data-g="' + letters[1] + '"' : '') + (room ? ' style="padding-top:' + room + 'mm"' : '') + '>' + mono(svg) + '</span>';
  }
  // Every colour becomes black, white or one light grey, so a drawing photocopies cleanly
  function mono(svg) {
    return svg.replace(/#([0-9a-f]{6})\b/gi, function (m, hex) {
      var lum = 0.299 * parseInt(hex.slice(0, 2), 16) + 0.587 * parseInt(hex.slice(2, 4), 16) + 0.114 * parseInt(hex.slice(4, 6), 16);
      return lum > 238 ? '#ffffff' : lum > 205 ? '#bdbdbd' : '#000000';
    }).replace(/border-radius:12px;/g, '');
  }
  // Called once the drawings are on the page. The drawing tools size things for a screen, so here the lettering is made
  // bigger, the empty margin around each drawing is trimmed, and the printed size is set. Drawings with the same
  // "scale" then all have lettering of the same size, whatever their shape.
  function fitFigures(root) {
    [].forEach.call(root.querySelectorAll('.fig'), function (f) {
      var svg = f.querySelector('svg');
      if (!svg || f.getAttribute('data-fit')) return;
      // The slices of a pie graph are told apart by colour on a screen. In black and white they are left white with a black outline.
      if (svg.getAttribute('aria-label') === 'Pie graph') [].forEach.call(svg.querySelectorAll('path'), function (p) { p.setAttribute('fill', '#ffffff'); p.setAttribute('stroke', '#000000'); p.setAttribute('stroke-width', '1.6'); });
      // (the labels on the branches of a tree diagram sit close together, so they are enlarged less and the tree is printed bigger)
      // (so are the sizes written inside angles, which have little room between the arms of the angle)
      var grow = f.getAttribute('data-g') ? +f.getAttribute('data-g') : svg.getAttribute('aria-label') === 'Tree diagram' ? 1.1 : svg.querySelector('path[fill-opacity="0.4"]') ? 1.15 : 1.45;
      [].forEach.call(svg.querySelectorAll('[font-size]'), function (t) { t.setAttribute('font-size', (parseFloat(t.getAttribute('font-size')) * grow).toFixed(1)); });
      var b = svg.getBBox(), pad = 4, k = +f.getAttribute('data-k');
      svg.setAttribute('viewBox', (b.x - pad).toFixed(1) + ' ' + (b.y - pad).toFixed(1) + ' ' + (b.width + 2 * pad).toFixed(1) + ' ' + (b.height + 2 * pad).toFixed(1));
      svg.setAttribute('width', ((b.width + 2 * pad) * k).toFixed(1));
      svg.removeAttribute('height');
      f.setAttribute('data-fit', '1');
    });
  }

  // Called once everything is on the page for measuring. If something in a row of parts is too wide for its column,
  // the row is given fewer columns (4, then 3, 2, 1), and at one column long lines are allowed to wrap. A section set
  // in columns on an answer sheet is treated the same way. So a sheet file can ask for as many columns as it likes.
  function autoFit(root) {
    function wide(items) { return [].some.call(items, function (e) { return e.scrollWidth > e.clientWidth + 2; }); }
    [].forEach.call(root.querySelectorAll('.q-cols'), function (box) {
      var n = +box.style.columnCount || 1;
      while (n > 1 && wide(box.querySelectorAll('.q'))) { n--; box.style.columnCount = n; }
    });
    [].forEach.call(root.querySelectorAll('ol.parts'), function (list) {
      var cols = +(/cols-(\d)/.exec(list.className) || [0, 1])[1];
      while (cols > 1 && wide(list.children)) { list.classList.remove('cols-' + cols); cols--; list.classList.add('cols-' + cols); }
      if (wide(list.children)) list.classList.add('can-wrap');
    });
  }

  // A table: a list of rows, each a list of cells. An empty cell '' is a box for the student to fill in.
  // { rows: [['x', -2, -1, 0], ['y', '', '', '']], head: 1 (the first row is headings), side: 1 (so is the first column) }
  // On an answer sheet the cells that were empty on the worksheet are printed bold.
  function tableHtml(t, asked) {
    var rows = t.rows || t, head = t.head == null ? 0 : t.head, side = t.side == null ? 1 : t.side;
    return '<table class="tab">' + rows.map(function (r, i) {
      return '<tr>' + r.map(function (c, j) {
        var title = i < head || j < side, was = asked ? (asked.rows || asked)[i][j] : c;
        return '<' + (title ? 'th' : 'td') + (asked && was === '' ? ' class="is-new"' : '') + '>' + (c === '' ? '' : fmt(String(c))) + '</' + (title ? 'th' : 'td') + '>';
      }).join('') + '</tr>';
    }).join('') + '</table>';
  }

  // A question with several rows of parts may run over the foot of a page: each row after the first becomes a block of
  // its own, so it can move to the next page. Always on answer sheets (their working is long); on a worksheet only for
  // a question marked  split: true  (a page of grids, for example).
  function splitRows(list) {
    var out = [];
    list.forEach(function (b) {
      var ol = b.querySelector('.q-main > ol.parts');
      out.push(b);
      if (!ol || !(ANSWERS || SPACE || ol.classList.contains('may-split'))) return;
      var cols = +(/cols-(\d)/.exec(ol.className) || [0, 1])[1], items = [].slice.call(ol.children);
      for (var i = cols; i < items.length; i += cols) {
        var more = el('<div class="block is-more"><div class="q"><span class="q-n"></span><div class="q-main"><ol class="' + ol.className + '"></ol></div></div></div>');
        items.slice(i, i + cols).forEach(function (li) { more.querySelector('ol').appendChild(li); });
        out.push(more);
      }
    });
    return out;
  }

  // The working for one part or question, ending in its answer
  function workHtml(item) {
    var all = item.w == null ? [] : [].concat(item.w), out = [], notes = [];
    // A line of working written with M.note('...') is a remark in words, not maths: it is shown first, as plain text
    var lines = all.filter(function (line) { if (line && line.note) { notes.push(line.note); return false; } return true; });
    notes.forEach(function (n) { out.push('<span class="note">' + fmt(n) + '</span>'); });
    // A conclusion in words after several lines of working gets a line of its own
    var ownLine = item.at && item.a == null && lines.length > 1;
    // The solution of an equation (own: true) is not joined to the working with "=": it gets a line of its own
    if (item.own && lines.length && item.a != null) {
      lines.forEach(function (line) { out.push('<span>' + tex(line) + '</span>'); });
      out.push('<span>' + tex('\\boldsymbol{' + item.a + '}') + (item.at ? ' <span class="ans">' + fmt(item.at) + '</span>' : '') + '</span>');
      return '<span class="work">' + out.join('') + '</span>';
    }
    lines.forEach(function (line, k) {
      var last = k === lines.length - 1;
      out.push('<span>' + tex(line + (last && item.a != null ? (item.approx ? ' \\approx ' : ' = ') + '\\boldsymbol{' + item.a + '}' : '')) +
        (last && item.at && !ownLine ? ' <span class="ans">' + fmt(item.at) + '</span>' : '') + '</span>');
    });
    if (ownLine) out.push('<span class="ans is-words">' + fmt(item.at) + '</span>');
    if (!lines.length && (item.a != null || item.at)) out.push('<span class="ans is-words">' + (item.a != null ? tex('\\boldsymbol{' + item.a + '}') + ' ' : '') + (item.at ? fmt(item.at) : '') + '</span>');
    return '<span class="work">' + out.join('') + '</span>';
  }
  function questionHtml(q, n, section) {
    var body = '';
    // An answer sheet repeats only short headings such as "Increase:", not whole questions
    if (q.stem && (!ANSWERS || (q.parts && q.stem.length <= 60))) body += '<p class="q-stem">' + fmt(q.stem) + '</p>';
    if (q.parts) {
      var cols = ANSWERS ? (q.answerCols || q.cols || 1) : (q.cols || 1);
      body += '<ol class="parts cols-' + cols + (!ANSWERS && section.mode === 'sheet' && !q.noBlank ? ' has-blanks' : '') + (q.longBlank ? ' long-blanks' : '') + (q.split ? ' may-split' : '') + '">' + q.parts.map(function (p, k) {
        var label = '<span class="p-l">' + String.fromCharCode(97 + k) + ')</span>';
        if (ANSWERS) return '<li' + (p.aimg || p.atable ? ' class="has-fig"' : '') + '>' + label + (p.aimg || p.atable ? '<span class="fig-col">' + (p.atable ? tableHtml(p.atable, p.table) : '') + (p.aimg ? figHtml(p.aimg, p.ascale || q.ascale || 0.36) : '') + workHtml(p) + '</span>' : workHtml(p)) + '</li>';
        // A lead longer than a sign, such as "x =", is set apart from the question
        var words = p.q ? '<span class="p-t">' + fmt(p.q) + (q.lead ? (q.lead.length > 1 ? '<span class="p-lead">' + fmt(q.lead) + '</span>' : ' ' + esc(q.lead)) : '') + '</span>' : '';
        var line = section.mode === 'sheet' && !q.noBlank && !SPACE ? '<span class="blank"></span>' : '';
        // In the working-space layout a part that is a drawing to complete (a grid, a table) keeps its blank drawing; every other part gets a working box
        var box = SPACE && !(q.noBlank && (p.img || p.table)) ? spaceBox(q.work || SPACE_MM[section.mode === 'sheet' ? 'sheet' : 'book']) : '';
        // With a drawing, the words and the answer line sit under the drawing
        if (p.img || p.table) return '<li class="has-fig">' + label + '<span class="fig-col">' + (p.above && words ? '<span class="fig-line">' + words + '</span>' : '') + (p.table ? tableHtml(p.table) : '') + (p.img ? figHtml(p.img, p.scale || q.scale, p.room) : '') + (!p.above && (words || line) ? '<span class="fig-line">' + words + line + '</span>' : '') + box + '</span></li>';
        return '<li' + (box ? ' class="spaced"' : '') + '>' + label + words + line + box + '</li>';
      }).join('') + '</ol>';
      // A drawing or a table that belongs to the whole question: beside the parts, or (wide: true) above them
      if (!ANSWERS && (q.img || q.table)) {
        var shown = (q.img ? figHtml(q.img, q.scale) : '') + (q.table ? tableHtml(q.table) : '');
        body = q.wide ? body.replace('<ol class="parts', '<div class="q-wide">' + shown + '</div><ol class="parts') : '<div class="q-side"><div class="q-side-main">' + body + '</div>' + shown + '</div>';
      }
      if (ANSWERS && (q.aimg || q.atable)) body = '<div class="q-wide">' + (q.aimg ? figHtml(q.aimg, q.ascale || 0.4) : '') + (q.atable ? tableHtml(q.atable, q.table) : '') + '</div>' + body;
    } else if (ANSWERS) {
      body = (q.aimg || q.atable ? '<div class="q-wide">' + (q.aimg ? figHtml(q.aimg, q.ascale || 0.4) : '') + (q.atable ? tableHtml(q.atable, q.table) : '') + '</div>' : '') + workHtml(q);
    } else if (q.table && !q.img) {
      body += '<div class="q-wide">' + tableHtml(q.table) + '</div>';
    } else if (q.img) {
      // A question on its own with a drawing: the words on the left, the drawing on the right
      body = '<div class="q-side">' + body + figHtml(q.img, q.scale) + '</div>';
    }
    // A question on its own (no parts) gets one working box in the working-space layout
    if (SPACE && !ANSWERS && !q.parts) body += spaceBox(q.work || SPACE_MM.single).replace('class="space"', 'class="space is-q"');
    return '<div class="q"><span class="q-n">' + n + '.</span><div class="q-main">' + body + '</div></div>';
  }

  // The heading of a section: letter (or a star for the extension), title, difficulty dots, and on a worksheet
  // where to write the answers
  function headHtml(s, letter) {
    var dots = s.level && !s.extension
      ? '<span class="dots">' + [1, 2, 3].map(function (i) { return '<i' + (i <= s.level ? ' class="on"' : '') + '></i>'; }).join('') + '</span>' : '';
    // (The old "Answer on the sheet / Work in your book / For early finishers" tags were dropped on 15 October 2026 after the teacher survey.)
    var note = s.watch ? [' is-watch', WARN, 'Watch out:', s.watch] : s.hint ? ['', BULB, 'Remember:', s.hint] : null;
    return '<div class="sec">' + (s.extension ? '<span class="sec-l is-star">' + STAR + '</span>' : '<span class="sec-l">' + letter + '</span>') +
      '<span class="sec-t">' + fmt(s.title) + '</span>' + (ANSWERS ? '' : dots) + '<span class="sec-rule"></span></div>' +
      (!ANSWERS && note ? '<div class="hint' + note[0] + '">' + note[1] + '<span><b>' + note[2] + '</b> ' + fmt(note[3]) + '</span></div>' : '');
  }
  // Everything that goes on one version's pages, as blocks that must not be split. A heading stays with its first question.
  function blocks(version) {
    var list = [], n = 0, letters = 0;
    SHEET.sections.forEach(function (s) {
      var questions = s['v' + version] || s.questions || [];
      var head = headHtml(s, s.extension ? '' : String.fromCharCode(65 + letters++));
      // On an answer sheet a section of one-line answers (answerCols: 2) is set in columns, read down the page
      if (ANSWERS && s.answerCols > 1) {
        var all = questions.map(function (q) { n++; return questionHtml(q, n, s); }).join('');
        list.push(el('<div class="block">' + head + '<div class="q-cols" style="column-count:' + s.answerCols + '">' + all + '</div></div>'));
        return;
      }
      questions.forEach(function (q, i) {
        n++;
        list.push(el('<div class="block">' + (i === 0 ? head : '') + questionHtml(q, n, s) + '</div>'));
      });
    });
    return list;
  }

  function page(first, version) {
    // A sheet shared by two year levels prints both ("Years 9 to 10"): span: [9, 10] in the sheet file
    var yearLabel = SHEET.span ? 'Years ' + SHEET.span[0] + ' to ' + SHEET.span[1] : SHEET.year;
    // The year level is printed only when asked for (?year=1): a Year 10 class should not be handed a sheet that says Year 8
    var kicker = (SHOW_YEAR ? esc(yearLabel) + ' · ' : '') + esc(SHEET.strand), named = version ? 'Version ' + version : '';
    // Each key word is followed by its te reo Māori term when the glossary has a checked one (engine/glossary.js)
    var words = (SHEET.keywords || []).map(function (k) { var g = window.GLOSSARY && GLOSSARY[k.toLowerCase()]; return '<span class="kw">' + esc(k) + (g && (g.ok || SHOW_REO) ? ' <span class="reo">' + esc(g.reo) + '</span>' : '') + '</span>'; });
    var qr = '<span class="qr"><span class="qr-box"></span><span class="qr-cap">Scan to practise<br>this topic online</span></span>';
    var top = first
      ? '<header class="head"><img class="logo" src="' + here + 'logo-black.png" alt="Cell Tuition"><div class="head-main"><div class="kicker">' + kicker + '</div><h1>' + fmt(SHEET.title) + '</h1></div></header>' +
        (ANSWERS ? '<div class="band">Answers with working' + (named ? ' · ' + named : '') + '</div>'
          : '<div class="meta"><span class="field">Name <i></i></span><span class="field is-short">Date <i></i></span>' +
            '<span class="tag">' + (SHEET.calculator ? 'Calculator allowed' : 'No calculator') + '</span>' +
            (named ? '<span class="tag is-version">' + named + '</span>' : '') + qr + '</div>' +
            (SHEET.keywords ? '<div class="words"><b>Key words</b>' + words.join(' <i>·</i> ') + '</div>' : ''))
      : '<div class="head-small"><b>' + fmt(SHEET.title) + (ANSWERS ? ': answers' : '') + (named ? ' · ' + named : '') + '</b><span>' + kicker + '</span></div>';
    var year = new Date().getFullYear();
    var foot = '<footer class="foot"><div class="foot-row">' + (ANSWERS
      ? '<span><b>Worksheets and quizzes:</b> <a href="https://' + SITE + '">' + SITE + '</a></span>' +
        '<span><b>Practise online:</b> <a href="https://' + QUIZ_AT + '">' + QUIZ_AT + '</a></span>'
      : '<span><b>Answers with working:</b> <a href="https://' + ANSWERS_AT + '">' + ANSWERS_AT + '</a></span>' +
        '<span><b>Practise online:</b> <a href="https://' + QUIZ_AT + '">' + QUIZ_AT + '</a></span>') +
      '<span>' + esc(SHEET.code) + (version ? '-V' + version : '') + ' · Page <i class="pg" style="font-style:normal"></i></span></div><div class="foot-legal">' + (ANSWERS
        ? '© ' + year + ' Cell Tuition. This answer sheet is for the person who bought it. Please do not share it or post it online.'
        : '© ' + year + ' Cell Tuition. You may print and photocopy this worksheet for your own classes and children. It may not be changed, sold or posted on other websites.') +
      '</div></footer>';
    var p = el('<section class="page' + (ANSWERS ? ' answers' : '') + (SPACE ? ' spaced' : '') + '">' + top + '<div class="page-body"></div>' + foot + '</section>');
    document.body.appendChild(p);
    made.push(p);
    // The QR code points at the quiz page for this topic (drawn by the qrcode-generator library, loaded with KaTeX)
    var box = p.querySelector('.qr-box');
    if (box && window.qrcode) { try { var code = qrcode(0, 'M'); code.addData('https://' + QUIZ_AT); code.make(); box.innerHTML = code.createSvgTag({ cellSize: 2, margin: 0, scalable: true }); } catch (e) { box.parentNode.style.display = 'none'; } }
    else if (box) box.parentNode.style.display = 'none';
    return p.querySelector('.page-body');
  }
  var made = [];
  // ?layout=space: every part and every question on its own gets a box to work in, and a short line for the answer
  function spaceBox(mm) { var h = Math.round(mm * SCALE); return '<span class="space" data-mm="' + h + '" style="min-height:' + h + 'mm"></span>'; }
  // Share a page's spare height between its working boxes, so the page ends exactly at its foot
  function fillPage(b) {
    var boxes = b.querySelectorAll('.space'), last = b.lastElementChild;
    if (!boxes.length || !last) return;
    // Boxes set in columns share a row, so growing them adds only part of the gap: measure and share again, a few times.
    // A box never grows past 2.5 times its starting size, so a page with only a few questions is not padded absurdly.
    var capOf = function (s) { return (+s.getAttribute('data-mm')) * 2.5 * MM; };
    for (var pass = 0; pass < 5; pass++) {
      var spare = b.clientHeight - (last.offsetTop + last.offsetHeight - b.offsetTop);
      var open = [].filter.call(boxes, function (s) { return s.offsetHeight < capOf(s) - 1; });
      if (spare <= 2 || !open.length) return;
      var each = spare / open.length;
      open.forEach(function (s) { s.style.minHeight = Math.min(capOf(s), s.offsetHeight + each - 0.3) + 'px'; });
    }
  }
  // Rule every working box with a faint line every 8 mm (drawn as elements, so they print without "background graphics")
  function ruleBoxes() {
    [].forEach.call(document.querySelectorAll('.space'), function (s) {
      var n = Math.floor(s.offsetHeight / (RULE_MM * MM) + 0.05), out = '';
      for (var i = 0; i < n; i++) out += '<span class="ln"></span>';
      s.innerHTML = out;
    });
  }
  // The key words line must stay on one line: a word (and its te reo term) is dropped from the end until it fits
  function fitWords() {
    [].forEach.call(document.querySelectorAll('.words'), function (w) {
      for (var guard = 0; guard < 12 && w.scrollWidth > w.clientWidth + 1; guard++) {
        var items = w.querySelectorAll('.kw'); if (items.length < 2) break;
        var k = items[items.length - 1]; k.parentNode.removeChild(k);
        var dots = w.querySelectorAll('i'); if (dots.length) dots[dots.length - 1].parentNode.removeChild(dots[dots.length - 1]);
      }
    });
  }
  // One version: fill a page until the next block no longer fits, then start another page
  function layout(version, isLast) {
    var body = page(true, version), bodies = [body], list = blocks(version);
    // The drawings are finished off first (that needs them on the page for a moment), because their size decides what fits
    // (the stage is a page like the real ones, so the same styles and the same width apply while measuring)
    var stage = el('<section class="page' + (ANSWERS ? ' answers' : '') + '" style="position:absolute;left:0;top:0;visibility:hidden;height:auto"><div class="page-body" style="overflow:visible"></div></section>');
    document.body.appendChild(stage);
    list.forEach(function (b) { stage.firstChild.appendChild(b); });
    fitFigures(stage);
    autoFit(stage);
    list = splitRows(list);
    document.body.removeChild(stage);
    list.forEach(function (b) {
      body.appendChild(b);
      if (body.scrollHeight > body.clientHeight + 1 && body.children.length > 1) { body.removeChild(b); body = page(false, version); bodies.push(body); body.appendChild(b); }
    });
    // In the working-space layout, a nearly empty last page means the boxes are a little too big: shrink them and lay out again (three tries)
    if (SPACE && bodies.length > 1 && SCALE === 1) {
      var endBody = bodies[bodies.length - 1], endTail = endBody.lastElementChild, endFill = endTail ? (endTail.offsetTop + endTail.offsetHeight - endBody.offsetTop) / endBody.clientHeight : 0;
      if (endFill < 0.4) {
        bodies.forEach(function (b) { var pg = b.parentNode; pg.parentNode.removeChild(pg); made.splice(made.indexOf(pg), 1); });
        SCALE = 0.8;
        var again = layout(version, isLast); SCALE = 1; return again;
      }
    }
    bodies.forEach(function (b, k) {
      b.parentNode.querySelector('.pg').textContent = (k + 1) + ' of ' + bodies.length;
      // Working-space layout: every page except a half-empty last one is filled exactly by growing its working boxes
      if (SPACE) {
        var endB = k === bodies.length - 1, tailEl = b.lastElementChild, filled = tailEl ? (tailEl.offsetTop + tailEl.offsetHeight - b.offsetTop) / b.clientHeight : 0;
        if (!endB || filled >= 0.4) fillPage(b);
        return;
      }
      // A page that is nearly full shares its spare space out between its blocks, so it ends at the foot of the page.
      // Only small gaps are added (up to 6 mm each): a half-empty page is left as it is.
      var last = b.lastElementChild, n = b.children.length;
      if (!last || n < 2) return;
      var spare = b.clientHeight - (last.offsetTop + last.offsetHeight - b.offsetTop), each = spare / (n - 1);
      if (each <= 0 || each > 22.7) return;   // 22.7 px is 6 mm
      [].forEach.call(b.children, function (c, i) { if (i) c.style.paddingTop = (each - 0.2) + 'px'; });
    });
    // Printed on both sides, the next version must start on a new sheet of paper: an odd number of pages gets a blank one
    if (!ANSWERS && !isLast && bodies.length % 2) {
      document.body.appendChild(el('<section class="page is-blank"><p>This page is blank so that the next version starts on a new sheet of paper.</p></section>'));
    }
    // How full the last page is, for check.ps1: a half-empty last page means the sheet wants more questions
    var end = bodies[bodies.length - 1], tail = end.lastElementChild;
    fills.push(tail ? Math.round((tail.offsetTop + tail.offsetHeight - end.offsetTop) / end.clientHeight * 100) + '%' : '0%');
    return bodies.length;
  }
  var fills = [];
  // The worked examples page: the heading of each section that has an example, then the example with its working
  function examplesPage() {
    var secs = SHEET.sections.filter(function (s) { return s.example && !s.extension; });
    if (!secs.length) return;
    var top = '<header class="head"><img class="logo" src="' + here + 'logo-black.png" alt="Cell Tuition"><div class="head-main"><div class="kicker">' + esc(SHEET.strand) + '</div><h1>' + fmt(SHEET.title) + '</h1></div></header>' +
      '<div class="band">Worked examples · read these before you start</div>';
    var year = new Date().getFullYear();
    var foot = '<footer class="foot"><div class="foot-row"><span><b>Answers with working:</b> <a href="https://' + ANSWERS_AT + '">' + ANSWERS_AT + '</a></span><span><b>Practise online:</b> <a href="https://' + QUIZ_AT + '">' + QUIZ_AT + '</a></span><span>' + esc(SHEET.code) + ' · Examples</span></div>' +
      '<div class="foot-legal">© ' + year + ' Cell Tuition. You may print and photocopy this worksheet for your own classes and children. It may not be changed, sold or posted on other websites.</div></footer>';
    var p = el('<section class="page examples' + (secs.length <= 4 ? ' few' : '') + '">' + top + '<div class="page-body"></div>' + foot + '</section>');
    document.body.appendChild(p); made.push(p);
    var body = p.querySelector('.page-body'), letters = 0;
    SHEET.sections.forEach(function (s) {
      if (s.extension) return;
      var letter = String.fromCharCode(65 + letters++);
      if (!s.example) return;
      var e = s.example, fig = e.aimg || e.img, words = e.q ? '<p class="ex-q">' + fmt(e.q) + '</p>' : '';
      var note = s.hint ? '<p class="ex-hint">' + fmt(s.hint) + '</p>' : s.watch ? '<p class="ex-hint">' + fmt(s.watch) + '</p>' : '';
      body.appendChild(el('<div class="ex"><div class="ex-head"><span class="sec-l">' + letter + '</span><span class="sec-t">' + fmt(s.title) + '</span></div>' + note +
        '<div class="ex-body">' + (fig ? '<div class="ex-fig">' + figHtml(fig, e.ascale || 0.3) + '</div>' : '') + '<div class="ex-main">' + words + (e.table ? tableHtml(e.atable || e.table) : '') + workHtml(e) + '</div></div></div>'));
    });
    fitFigures(p);
    // When the examples do not fit the page (a third column, or past the bottom), the page is scaled down a step at a
    // time until they do, so no example is ever cut off
    var over = function () { var r = body.getBoundingClientRect(); return [].some.call(body.querySelectorAll('.ex'), function (e) { var b = e.getBoundingClientRect(); return b.right > r.right + 1 || b.bottom > r.bottom + 1; }); };
    for (var z = 1; over() && z > 0.55; ) { z = Math.round((z - 0.05) * 100) / 100; body.style.zoom = z; }
    // Printed on both sides, the first version must still start on a new sheet of paper
    if (VERSIONS.length > 1 || true) document.body.appendChild(el('<section class="page is-blank"><p>This page is blank so that the worksheet starts on a new sheet of paper.</p></section>'));
  }
  function paginate() {
    if (EXAMPLES) examplesPage();
    var counts = VERSIONS.map(function (v, k) { return layout(v, k === VERSIONS.length - 1); });
    fitWords(); if (SPACE) ruleBoxes();
    document.title = SHEET.title + (ANSWERS ? ' (answers)' : '') + ' | ' + (SHEET.span ? 'Years ' + SHEET.span[0] + ' to ' + SHEET.span[1] : SHEET.year) + ' ' + SHEET.strand + ' | Cell Tuition';
    // For the build script: how many pages each version took
    document.documentElement.setAttribute('data-pages', counts.join('+'));
    document.documentElement.setAttribute('data-fill', fills.join('+'));
    // Anything the sheet's own tools complained about (engine/make.js) is reported to check.ps1 and printed in red,
    // so a sheet with a wrong answer cannot slip through unnoticed
    var problems = window.M ? M.errors.slice() : [];
    // The rule: every final answer has been worked out or checked by the computer (see engine/make.js).
    // An answer that has not been is counted here and treated as a problem.
    var tally = VERSIONS.map(function (v) {
      var checked = 0, inWords = 0, missing = [];
      SHEET.sections.forEach(function (s) {
        (s['v' + v] || s.questions || []).forEach(function (q, k) {
          (q.parts || [q]).forEach(function (p, j) {
            if (p.a == null && !p.at && !p.aimg && !p.atable) return;
            if (p.v === 1) checked++;
            else if (p.v === 'words') inWords++;
            else missing.push(s.title + ' ' + (k + 1) + (q.parts ? String.fromCharCode(97 + j) : ''));
          });
        });
      });
      if (missing.length) problems.push((v ? 'Version ' + v + ': ' : '') + missing.length + ' answers not checked by the computer (' + missing.slice(0, 5).join(', ') + (missing.length > 5 ? ', ...' : '') + ')');
      return checked + ' checked' + (inWords ? ' + ' + inWords + ' in words' : '');
    });
    document.documentElement.setAttribute('data-answers', tally.join(' / '));
    // Text that is too wide for its column runs over its neighbour: count it as a problem so it cannot go unnoticed
    var wide = [];
    [].forEach.call(document.querySelectorAll('.parts li, .q-cols .q'), function (e) {
      if (e.scrollWidth > e.clientWidth + 2) wide.push((e.textContent || '').replace(/\s+/g, ' ').slice(0, 12) + ' +' + (e.scrollWidth - e.clientWidth) + 'px');
    });
    if (wide.length) problems.push(wide.length + ' item(s) too wide for their column (' + wide.slice(0, 14).join(' / ') + ')');
    if (window.CT_BAD_FIGS && window.CT_BAD_FIGS.length) problems.push(window.CT_BAD_FIGS.length + ' drawing(s) with a number that could not be read (' + window.CT_BAD_FIGS.slice(0, 3).join(' / ') + ')');
    document.documentElement.setAttribute('data-errors', problems.join(' | '));
    if (problems.length) {
      var top = document.querySelector('.page-body');
      top.insertBefore(el('<div class="problems"><b>This sheet has a problem that must be fixed before it is used:</b> ' + problems.map(esc).join('; ') + '</div>'), top.firstChild);
    }
    // A last look once every picture has loaded: nothing may run off the foot of a page. (A picture that loads late can
    // change how the heading wraps, which changes the room left on the page. check.ps1 reports this as a problem.
    // A page may be over by a millimetre or so, which is only the empty space under its last block: more than 6 px counts.)
    var late = function () {
      var root = document.documentElement, cut = [];
      [].forEach.call(document.querySelectorAll('.page'), function (p, k) { var b = p.querySelector('.page-body'); if (b && b.scrollHeight > b.clientHeight + 6) cut.push('page ' + (k + 1) + ' by ' + (b.scrollHeight - b.clientHeight) + ' px'); });
      if (cut.length) root.setAttribute('data-errors', (root.getAttribute('data-errors') ? root.getAttribute('data-errors') + ' | ' : '') + 'text is cut off at the foot of a page (' + cut.join(', ') + ')');
    };
    var waiting = [].filter.call(document.images, function (i) { return !i.complete; }), left = waiting.length;
    if (!left) late();
    else waiting.forEach(function (i) { i.addEventListener('load', function () { if (--left === 0) late(); }); i.addEventListener('error', function () { if (--left === 0) late(); }); });
  }

  Promise.all([
    // The static files of the Inter font: a PDF stores these compactly (the "variable" Inter from Google Fonts is stored glyph by glyph and made the file four times the size)
    load('link', { rel: 'stylesheet', href: 'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/400.css' }),
    load('link', { rel: 'stylesheet', href: 'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/700.css' }),
    load('link', { rel: 'stylesheet', href: 'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/800.css' }),
    load('link', { rel: 'stylesheet', href: 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css' }),
    load('script', { src: 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js' }),
    load('script', { src: 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js' }),
    load('script', { src: here + 'glossary.js' }),
    load('script', { src: here + 'draw.js' })
  ]).then(function () {
    // Typeset once so every font the sheet needs is asked for, wait for the fonts, then lay out the pages by measuring
    var all = VERSIONS.map(function (v) { return blocks(v).map(function (b) { return b.outerHTML; }).join(''); }).join('');
    var probe = el('<div style="position:absolute;visibility:hidden">' + all + '<b>x</b><i>x</i></div>');
    document.body.appendChild(probe);
    var fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    return fonts.then(function () { probe.remove(); });
  }).then(paginate);
})();
