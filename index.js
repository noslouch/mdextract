var Matcher = require('./lib/matcher');
var extend = require('util')._extend;

/***
 * mdextract:
 * hello.
 *
 * To extract from source, use:
 *
 *     mdextract(source, options)
 *
 * Returns a JSON block.
 */

var mdextract = module.exports = function (src, options) {
  var doc = new Document(options);
  doc.parse(src);
  return doc;
};

var rules = new Matcher({
  space: "\\s",
  string: '.*?',
  eol: '(\\s*%{endcomment})?\\s*',
  h2: '\\s*%{h2prefix}\\s*%{doc:string}%{eol}',
  h3: '\\s*%{h3prefix}\\s*%{doc:string}%{eol}',
  doc: '\\s*%{docprefix}\\s?%{doc:string}%{eol}',
  blank: '%{eol}',
  h2prefix: '/\\*\\*\\*',
  h3prefix: '/\\*\\*',
  docprefix: '\\*',
  endcomment: '\\*/',
});

/***
 * Document:
 * A markdown document with multiple source files.
 */

var Document = function (options) {
  /*** options: the options passed onto the constructor. */
  this.options = options || {};
  this.blocks = [];
};

Document.prototype = {

  /**
   * parse : .parse(options)
   * parses the document and saves its JSON tree to [data].
   */

  parse: function (src, fname) {
    var ctx = new Context(this, src, fname);
    ctx.process();
    this.blocks = this.blocks.concat(ctx.blocks);
  },

  /**
   * warn : warn(text, file, line)
   * (internal) Issues a warning
   */

  warn: function (text, file, line) {
    console.warn("%s:%s: warning: %s", file, line, text);
  },

  /**
   * processText : processText(text, block)
   * (internal) Propagates `text` into the given `block`.
   */

  processText: function (text, block) {
    var lines = text.split("\n");
    var m;
    var bodylines = [];

    lines.forEach(function (line, i) {
      if (i === 0) {
        if (m = line.match(/^(.*?):$/)) {
          block.heading = m[1];
        }
        else if (m = line.match(/^(.*?) : (.*?)$/)) {
          block.heading = m[1];
          block.subheading = m[2];
        }
        else if (m = line.match(/^(.*?):(?: (.*?))?$/)) {
          block.heading = m[1];
          bodylines.push(m[2]);
        }
      } else {
        bodylines.push(line);
      }
    });

    block.body = bodylines.join("\n");
  }
};

/***
 * Context: a parsing context.
 */

function Context(doc, src, fname) {
  this.doc = doc;
  this.src = src;
  this.fname = fname;
  this.blocks = [];
  this.block = undefined;
}

Context.prototype = {
  process: function () {
    var ctx = this;

    eachLine(ctx.src, function (line, i) {
      rules.switch(line, {
        h2: function (m) {
          ctx.flush();
          ctx.block = ctx.newBlock(2, m.doc, i+1);
        },
        h3: function (m) {
          ctx.flush();
          ctx.block = ctx.newBlock(3, m.doc, i+1);
        },
        blank: function() {
          ctx.flush();
        },
        doc: function (m) {
          if (!ctx.block) return;
          ctx.block.lines.push(m.doc);
        },
        else: function () {
          var block = ctx.lastBlock();
          if (block) block.codeline = i+1;
        }
      });
    });

    ctx.flush();
  },

  /** newBlock: (internal) Creates a new block. */
  newBlock: function (level, line, docline) {
    return new Block({
      level: level,
      lines: [line],
      docline: docline,
      filename: this.fname
    });
  },

  /** lastBlock: (internal) Returns the last defined block. */
  lastBlock: function () {
    return this.blocks[this.blocks.length-1];
  },

  /** flush: finalizes the last block defined. */
  flush: function () {
    if (!this.block) return;

    if (!this.block.lines) {
      // warn("no lines found", block.docline);
      this.block = null;
      return;
    }

    this.block.lines = this.block.lines.join("\n").trim();
    this.doc.processText(this.block.lines, this.block);
    delete this.block.lines;

    if (!this.block.heading) {
      // warn("no heading found", block.docline);
      this.block = null;
      return;
    }

    this.blocks.push(this.block);
    this.block = null;
  }
};

/***
 * Block:
 * A block. Options:
 *
 * ~ docline (number): line number where the documentation starts
 * ~ codeline (number): line number where code starts
 * ~ level (number): heading level
 * ~ heading (string): heading text
 * ~ subheading (string, optional): optional subheading text
 * ~ body (string): body text
 */

function Block (data) {
  extend(this, data);
}

/***
 * Helpers:
 * (internal)
 */

/** eachline: (internal) Helper for iterating through each line. */
function eachLine (src, fn) {
  src.split('\n').forEach(fn);
}

mdextract.Document = Document;
