const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
} = require('docx');

const md = fs.readFileSync(path.join(__dirname, 'tanzeel-search-logic.md'), 'utf8');
const lines = md.split('\n');

const children = [];

const codeBorder = {
  top:    { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
  left:   { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
  right:  { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
};

function codePara(text) {
  return new Paragraph({
    spacing: { before: 0, after: 0, line: 240 },
    shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F4F4F4' },
    children: [new TextRun({ text: text === '' ? ' ' : text, font: 'Consolas', size: 16 })],
  });
}

function flushCode(buf) {
  if (!buf.length) return;
  buf.forEach((l) => children.push(codePara(l)));
  children.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun('')] }));
}

function parseInline(text) {
  // Handle **bold**, `code`, *italic*
  const runs = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let last = 0; let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) runs.push(new TextRun(text.slice(last, m.index)));
    const t = m[0];
    if (t.startsWith('**')) runs.push(new TextRun({ text: t.slice(2, -2), bold: true }));
    else if (t.startsWith('`')) runs.push(new TextRun({ text: t.slice(1, -1), font: 'Consolas', size: 18 }));
    else runs.push(new TextRun({ text: t.slice(1, -1), italics: true }));
    last = m.index + t.length;
  }
  if (last < text.length) runs.push(new TextRun(text.slice(last)));
  return runs.length ? runs : [new TextRun(text)];
}

function flushTable(rows) {
  if (!rows.length) return;
  const cells = rows.map(r => r.split('|').slice(1, -1).map(c => c.trim()));
  // drop separator row (--- | ---)
  const header = cells[0];
  const body = cells.slice(1).filter(r => !r.every(c => /^-+:?$|^:?-+:?$/.test(c)));
  const buildRow = (arr, bold) => new TableRow({
    children: arr.map(c => new TableCell({
      width: { size: Math.floor(100 / arr.length), type: WidthType.PERCENTAGE },
      children: [new Paragraph({ children: [new TextRun({ text: c, bold })] })],
    })),
  });
  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [buildRow(header, true), ...body.map(r => buildRow(r, false))],
  }));
  children.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun('')] }));
}

let i = 0;
let inCode = false;
let codeBuf = [];
let tableBuf = [];

const flushTableIfAny = () => { if (tableBuf.length) { flushTable(tableBuf); tableBuf = []; } };

while (i < lines.length) {
  const line = lines[i];

  if (inCode) {
    if (line.startsWith('```')) {
      flushCode(codeBuf); codeBuf = []; inCode = false;
    } else {
      codeBuf.push(line);
    }
    i++; continue;
  }

  if (line.startsWith('```')) {
    flushTableIfAny();
    inCode = true; i++; continue;
  }

  if (line.startsWith('|') && line.includes('|', 1)) {
    tableBuf.push(line); i++; continue;
  } else {
    flushTableIfAny();
  }

  if (line.startsWith('# ')) {
    children.push(new Paragraph({ heading: HeadingLevel.TITLE, children: parseInline(line.slice(2)) }));
  } else if (line.startsWith('## ')) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 280, after: 120 }, children: parseInline(line.slice(3)) }));
  } else if (line.startsWith('### ')) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 }, children: parseInline(line.slice(4)) }));
  } else if (line.startsWith('---')) {
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '———', color: '888888' })] }));
  } else if (line.startsWith('> ')) {
    children.push(new Paragraph({ indent: { left: 360 }, children: parseInline(line.slice(2)).map(r => { if (r.italics === undefined) r.options && (r.options.italics = true); return r; }) }));
  } else if (/^\s*[-*]\s+/.test(line)) {
    const txt = line.replace(/^\s*[-*]\s+/, '');
    children.push(new Paragraph({ bullet: { level: 0 }, children: parseInline(txt) }));
  } else if (/^\s*\d+\.\s+/.test(line)) {
    const txt = line.replace(/^\s*\d+\.\s+/, '');
    children.push(new Paragraph({ numbering: { reference: 'numlist', level: 0 }, children: parseInline(txt) }));
  } else if (line.trim() === '') {
    children.push(new Paragraph({ children: [new TextRun('')] }));
  } else {
    children.push(new Paragraph({ children: parseInline(line) }));
  }
  i++;
}

flushTableIfAny();
flushCode(codeBuf);

const doc = new Document({
  creator: 'Tanzeel',
  title: 'Tanzeel — Search Logic Export',
  styles: {
    default: {
      document: { run: { font: 'Calibri', size: 22 } },
    },
  },
  numbering: {
    config: [{
      reference: 'numlist',
      levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.START }],
    }],
  },
  sections: [{ children }],
});

Packer.toBuffer(doc).then(buf => {
  const out = path.join(__dirname, 'tanzeel-search-logic.docx');
  fs.writeFileSync(out, buf);
  console.log('Wrote', out, buf.length, 'bytes');
});
