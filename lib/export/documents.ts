// Eksport szkicu wniosku do .docx (Word) i .odt (LibreOffice / OpenOffice) - w przeglądarce, bez dodatkowych bibliotek:
// oba formaty to archiwa zip z plikami XML (fflate jest już w projekcie).
import { zipSync, strToU8 } from "fflate"

export type DocSection = { heading: string; content: string }
export type DocInput = { kicker: string; title: string; note?: string; sections: DocSection[]; sources?: string[] }

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
/** Akapity z treści sekcji: pusta linia = nowy akapit, pojedyncze linie też osobno (listy „- …” zostają czytelne). */
const paragraphs = (t: string) => t.split(/\n/).map((l) => l.trimEnd()).filter((l, i, a) => l !== "" || (a[i - 1] ?? "") !== "")

// ── DOCX (Office Open XML) ──
export function buildDocx(d: DocInput): Uint8Array {
  const p = (text: string, style?: string) =>
    `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ""}<w:r><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`
  const body = [
    p(d.kicker, "Subtitle"),
    p(d.title, "Title"),
    d.note ? p(d.note) : "",
    ...d.sections.flatMap((s) => [p(s.heading, "Heading1"), ...paragraphs(s.content).map((l) => p(l))]),
    ...(d.sources?.length ? [p("Źródła", "Heading1"), ...d.sources.map((s) => p(s))] : []),
  ].join("")
  const style = (id: string, name: string, size: number, bold = true, space = 240) =>
    `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:spacing w:before="${space}" w:after="120"/></w:pPr><w:rPr>${bold ? "<w:b/>" : ""}<w:sz w:val="${size}"/></w:rPr></w:style>`
  return zipSync({
    "[Content_Types].xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`),
    "_rels/.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`),
    "word/_rels/document.xml.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
    "word/styles.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:lang w:val="pl-PL"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>${style("Title", "Title", 36)}${style("Subtitle", "Subtitle", 20, false, 0)}${style("Heading1", "heading 1", 28, true, 360)}</w:styles>`),
    "word/document.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1418" w:right="1418" w:bottom="1418" w:left="1418" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr></w:body></w:document>`),
  })
}

// ── ODT (OpenDocument) - „mimetype” musi być pierwszy i nieskompresowany ──
export function buildOdt(d: DocInput): Uint8Array {
  const p = (text: string, style = "P") => `<text:p text:style-name="${style}">${esc(text)}</text:p>`
  const h = (text: string) => `<text:h text:style-name="H1" text:outline-level="1">${esc(text)}</text:h>`
  const body = [
    p(d.kicker, "Kicker"),
    `<text:h text:style-name="Title" text:outline-level="1">${esc(d.title)}</text:h>`,
    d.note ? p(d.note) : "",
    ...d.sections.flatMap((s) => [h(s.heading), ...paragraphs(s.content).map((l) => p(l))]),
    ...(d.sources?.length ? [h("Źródła"), ...d.sources.map((s) => p(s))] : []),
  ].join("")
  const ns = `xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"`
  const content = `<?xml version="1.0" encoding="UTF-8"?><office:document-content ${ns} office:version="1.3"><office:automatic-styles>
<style:style style:name="P" style:family="paragraph"><style:paragraph-properties fo:margin-bottom="0.2cm"/><style:text-properties fo:font-size="11pt" fo:language="pl" fo:country="PL"/></style:style>
<style:style style:name="Kicker" style:family="paragraph"><style:text-properties fo:font-size="10pt" fo:color="#66635d"/></style:style>
<style:style style:name="Title" style:family="paragraph"><style:paragraph-properties fo:margin-bottom="0.3cm"/><style:text-properties fo:font-size="18pt" fo:font-weight="bold"/></style:style>
<style:style style:name="H1" style:family="paragraph"><style:paragraph-properties fo:margin-top="0.5cm" fo:margin-bottom="0.2cm"/><style:text-properties fo:font-size="14pt" fo:font-weight="bold"/></style:style>
</office:automatic-styles><office:body><office:text>${body}</office:text></office:body></office:document-content>`
  return zipSync({
    mimetype: [strToU8("application/vnd.oasis.opendocument.text"), { level: 0 }],
    "META-INF/manifest.xml": strToU8(`<?xml version="1.0" encoding="UTF-8"?><manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3"><manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/><manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/></manifest:manifest>`),
    "content.xml": strToU8(content),
  })
}

/** Pobranie pliku w przeglądarce. */
export function download(bytes: Uint8Array, filename: string, mime: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mime }))
  const a = document.createElement("a")
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
