import JSZip from 'jszip';
import { EnhancedResume } from '../schemas/enhancement.schema';

/** ATS-friendly plain-text rendering: standard headings, simple hyphen bullets, no tables or columns. */
export function renderPlainText(r: EnhancedResume): string {
  const out: string[] = [];
  const c = r.contact;
  if (c.name) out.push(c.name);
  const contactLine = [c.email, c.phone, ...(c.links ?? [])].filter(Boolean).join(' | ');
  if (contactLine) out.push(contactLine);
  if (out.length) out.push('');

  if (r.summary?.text) out.push('SUMMARY', r.summary.text, '');
  if (r.skills.length) out.push('SKILLS', r.skills.join(', '), '');
  if (r.experience.length) {
    out.push('EXPERIENCE');
    for (const e of r.experience) {
      out.push([e.title, e.company, e.location].filter(Boolean).join(' | ') + (e.dates ? `  ${e.dates}` : ''));
      for (const b of e.bullets) out.push(`- ${b.text}`);
      out.push('');
    }
  }
  if (r.projects.length) {
    out.push('PROJECTS');
    for (const p of r.projects) {
      out.push(p.name + (p.technologies.length ? ` (${p.technologies.join(', ')})` : ''));
      if (p.description?.text) out.push(p.description.text);
      for (const b of p.bullets) out.push(`- ${b.text}`);
      out.push('');
    }
  }
  if (r.education.length) {
    out.push('EDUCATION');
    for (const e of r.education) {
      const deg = [e.degree, e.field].filter(Boolean).join(', ');
      out.push([e.institution, deg].filter(Boolean).join(' | ') + (e.dates ? `  ${e.dates}` : '') + (e.gpa ? `  GPA: ${e.gpa}` : ''));
    }
    out.push('');
  }
  if (r.certifications.length) {
    out.push('CERTIFICATIONS');
    for (const c2 of r.certifications) {
      out.push([c2.name, c2.issuer, c2.date].filter(Boolean).join(' | '));
    }
    out.push('');
  }
  if (r.achievements.length) {
    out.push('ACHIEVEMENTS');
    for (const a of r.achievements) out.push(`- ${a.text}`);
    out.push('');
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

const xmlEsc = (s: string): string =>
  s
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const isHeading = (l: string): boolean => /^[A-Z][A-Z &/]{2,}$/.test(l);

/** Minimal valid DOCX: one paragraph per line, bold section headings. */
export async function buildDocx(text: string): Promise<Buffer> {
  const paras = text
    .split(/\r?\n/)
    .map((line) => {
      const t = xmlEsc(line);
      const rPr = isHeading(line) ? '<w:rPr><w:b/></w:rPr>' : '';
      return `<w:p><w:r>${rPr}<w:t xml:space="preserve">${t}</w:t></w:r></w:p>`;
    })
    .join('');
  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'
  );
  zip.file(
    '_rels/.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
  );
  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paras}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>`
  );
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}
