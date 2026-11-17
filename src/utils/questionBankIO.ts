import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { SECTORS, SectorData, getSubLessonQuestions } from '../data/sectors';
import { CustomQuestionRecord, SectorId } from '../types';

export interface ParsedImportPreview {
  questions: CustomQuestionRecord[];
  extractedImages: { name: string; dataUrl: string }[];
  warnings: string[];
}

function normalizeAnswerIndex(raw: unknown): number {
  const s = String(raw ?? '').trim().toUpperCase();
  if (s === 'A' || s === '①') return 0;
  if (s === 'B' || s === '②') return 1;
  if (s === 'C' || s === '③') return 2;
  if (s === 'D' || s === '④') return 3;
  const num = Number(s);
  if (!Number.isNaN(num)) {
    if (num >= 1 && num <= 4) return num - 1;
    if (num >= 0 && num <= 3) return num;
  }
  return 0;
}

function normalizeSectorAndSub(
  rawSector: unknown,
  rawSub: unknown,
  fallbackSector: SectorId = 's1',
  fallbackSub = 's1-1'
): { sectorId: SectorId; subId: string } {
  const secStr = String(rawSector ?? '').trim().toLowerCase();
  const subStr = String(rawSub ?? '').trim().toLowerCase();

  // Check if subStr looks like "s1-2" or "1-2"
  const subMatch = subStr.match(/s?([1-8])[-_]([1-3])/);
  if (subMatch) {
    const sectorId = `s${subMatch[1]}` as SectorId;
    return { sectorId, subId: `${sectorId}-${subMatch[2]}` };
  }

  // Check sectorStr like "s3" or "03" or "3"
  const secMatch = secStr.match(/s?([1-8])/);
  if (secMatch) {
    const sectorId = `s${secMatch[1]}` as SectorId;
    const def = SECTORS.find((s) => s.id === sectorId);
    const firstSub = def?.subLessons[0]?.id ?? `${sectorId}-1`;
    return { sectorId, subId: firstSub };
  }

  return { sectorId: fallbackSector, subId: fallbackSub };
}

export function exportQuestionsToExcel(
  scope: string,
  sectorsSource: SectorData[]
): { filename: string; count: number } {
  const rows: Record<string, string>[] = [];

  const targetSectors =
    scope === 'all'
      ? sectorsSource
      : /^s[1-8]$/.test(scope)
      ? sectorsSource.filter((s) => s.id === scope)
      : sectorsSource;

  targetSectors.forEach((sec) => {
    const targetSubs = /^s[1-8]-[1-3]$/.test(scope)
      ? sec.subLessons.filter((sub) => sub.id === scope)
      : sec.subLessons;

    targetSubs.forEach((sub) => {
      const qs = getSubLessonQuestions(sec, sub);
      qs.forEach((q) => {
        rows.push({
          題號ID: q.id,
          單元代碼: sec.id,
          小節代碼: sub.id,
          單元小節名稱: `${sec.shortTitle} · ${sub.code} ${sub.title}`,
          題目內容: q.q,
          選項A: q.options[0] ?? '',
          選項B: q.options[1] ?? '',
          選項C: q.options[2] ?? '',
          選項D: q.options[3] ?? '',
          正解代號: String.fromCharCode(65 + Math.max(0, Math.min(3, q.ans))),
          詳解說明: q.exp,
          內建圖表ID: q.diagramId ?? '',
          圖片網址或DataURL: q.imageUrl && q.imageUrl.length < 32000 ? q.imageUrl : '',
        });
      });
    });
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 14 },
    { wch: 10 },
    { wch: 10 },
    { wch: 26 },
    { wch: 46 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 10 },
    { wch: 44 },
    { wch: 18 },
    { wch: 30 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '題庫匯出');
  const filename = `math-voyager-questions-${scope}.xlsx`;
  XLSX.writeFile(wb, filename);
  return { filename, count: rows.length };
}

export function downloadExcelTemplate(): string {
  const sampleRows = [
    {
      題號ID: 's1-1-custom1',
      單元代碼: 's1',
      小節代碼: 's1-1',
      題目內容: '若 a 為奇數、b 為偶數，則 3a + 2b 的結果一定是哪一種數？',
      選項A: '奇數',
      選項B: '偶數',
      選項C: '質數',
      選項D: '無法判斷',
      正解代號: 'A',
      詳解說明: '奇數×3 仍為奇數，偶數×2 仍為偶數，奇數＋偶數＝奇數。',
      內建圖表ID: '',
      圖片網址或DataURL: '',
    },
    {
      題號ID: 's3-1-custom1',
      單元代碼: 's3',
      小節代碼: 's3-1',
      題目內容: '下列哪一個英文字母「同時」具有水平對稱軸與鉛直對稱軸？',
      選項A: 'A',
      選項B: 'E',
      選項C: 'H',
      選項D: 'M',
      正解代號: 'C',
      詳解說明: 'H 左右對稱也上下對稱，共有 2 條對稱軸。',
      內建圖表ID: '',
      圖片網址或DataURL: '',
    },
  ];
  const ws = XLSX.utils.json_to_sheet(sampleRows);
  ws['!cols'] = [
    { wch: 16 },
    { wch: 10 },
    { wch: 10 },
    { wch: 46 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 10 },
    { wch: 44 },
    { wch: 16 },
    { wch: 28 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '匯入範本');
  const filename = 'math-voyager-import-template.xlsx';
  XLSX.writeFile(wb, filename);
  return filename;
}

export async function parseExcelQuestionsFile(
  file: File,
  defaultSector: SectorId = 's1',
  defaultSub = 's1-1'
): Promise<ParsedImportPreview> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const warnings: string[] = [];

  if (!sheetName) {
    return { questions: [], extractedImages: [], warnings: ['Excel 檔案內找不到任何工作表。'] };
  }

  const sheet = wb.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  const questions: CustomQuestionRecord[] = [];
  const now = Date.now();

  rawRows.forEach((row, idx) => {
    const pick = (...keys: string[]) => {
      for (const k of keys) {
        if (row[k] !== undefined && String(row[k]).trim() !== '') {
          return String(row[k]).trim();
        }
      }
      return '';
    };

    const qText = pick('題目內容', '題幹', '題目', 'q', 'question');
    if (!qText) return;

    const optA = pick('選項A', 'A', 'optionA', 'opt1') || '選項 A';
    const optB = pick('選項B', 'B', 'optionB', 'opt2') || '選項 B';
    const optC = pick('選項C', 'C', 'optionC', 'opt3') || '選項 C';
    const optD = pick('選項D', 'D', 'optionD', 'opt4') || '選項 D';

    const { sectorId, subId } = normalizeSectorAndSub(
      pick('單元代碼', '單元', 'sectorId', 'sector'),
      pick('小節代碼', '小節', 'subId', 'sub'),
      defaultSector,
      defaultSub
    );

    const rawId = pick('題號ID', '題號', 'id')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 48);
    const id = rawId || `${subId}-xl-${now % 100000}-${idx + 1}`;

    const ans = normalizeAnswerIndex(pick('正解代號', '正解', '答案', 'ans', 'answer'));
    const exp = pick('詳解說明', '詳解', '解析', 'exp', 'explanation') || '教師匯入自訂題目。';
    const diagramId = pick('內建圖表ID', 'diagramId');
    const imageUrl = pick('圖片網址或DataURL', '圖片網址', '圖片', 'imageUrl');

    questions.push({
      id,
      sectorId,
      subId,
      q: qText.slice(0, 1800),
      options: [optA, optB, optC, optD].map((o) => o.slice(0, 200)),
      ans,
      exp: exp.slice(0, 1800),
      diagramId: diagramId || undefined,
      imageUrl: imageUrl || undefined,
      source: 'excel',
      updatedAt: now,
    });
  });

  if (questions.length === 0) {
    warnings.push('Excel 中未偵測到有效題目，請確認欄位名稱包含「題目內容」與「選項A~D」。');
  }

  return { questions, extractedImages: [], warnings };
}

/**
 * Compress an image Blob/DataURL to lightweight JPEG/WebP (< 120KB) for smooth Firestore sync
 */
export async function compressImageBlobToDataUrl(blob: Blob, maxWidth = 640): Promise<string> {
  if (typeof document === 'undefined') return '';
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          resolve('');
          return;
        }
        // Fill white background in case source PNG diagram is transparent
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        URL.revokeObjectURL(url);
        resolve(dataUrl.length <= 280000 ? dataUrl : canvas.toDataURL('image/jpeg', 0.55));
      } catch {
        URL.revokeObjectURL(url);
        resolve('');
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve('');
    };
    img.src = url;
  });
}

function guessMimeFromName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  return 'image/jpeg';
}

function extractInlineOptions(text: string): { stem: string; opts: string[] } | null {
  // Match "(A) ... (B) ... (C) ... (D) ..." or "A. ... B. ... C. ... D. ..."
  const matchParen = text.match(
    /\(?[AＡ]\)?[、.．)）\s]+(.+?)\s*\(?[BＢ]\)?[、.．)）\s]+(.+?)\s*\(?[CＣ]\)?[、.．)）\s]+(.+?)\s*\(?[DＤ]\)?[、.．)）\s]+(.+)$/
  );
  if (matchParen) {
    const idxA = text.search(/\(?[AＡ]\)?[、.．)）\s]/);
    return {
      stem: idxA > 0 ? text.slice(0, idxA).trim() : '',
      opts: [matchParen[1].trim(), matchParen[2].trim(), matchParen[3].trim(), matchParen[4].trim()],
    };
  }
  return null;
}

/**
 * Parse a Publisher .docx file directly in the browser:
 * Extracts paragraphs + embedded word/media/* images mapped via relationship IDs.
 */
export async function parseWordDocxFile(
  file: File,
  defaultSector: SectorId = 's1',
  defaultSub = 's1-1'
): Promise<ParsedImportPreview> {
  const warnings: string[] = [];
  const buf = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);

  const docXmlFile = zip.file('word/document.xml');
  if (!docXmlFile) {
    return {
      questions: [],
      extractedImages: [],
      warnings: ['這不是標準的 .docx Word 檔案（舊版 .doc 請先於 Word「另存新檔」為 .docx）。'],
    };
  }

  // 1. Parse relationships: rId -> word/media/...
  const relMap = new Map<string, string>();
  const relsFile = zip.file('word/_rels/document.xml.rels');
  if (relsFile) {
    const relsXml = await relsFile.async('text');
    const parser = new DOMParser();
    const relDoc = parser.parseFromString(relsXml, 'application/xml');
    const relNodes = Array.from(relDoc.getElementsByTagName('Relationship'));
    relNodes.forEach((node) => {
      const id = node.getAttribute('Id');
      const target = node.getAttribute('Target');
      if (id && target && target.includes('media/')) {
        const normalized = target.startsWith('word/') ? target : `word/${target.replace(/^\/+/, '')}`;
        relMap.set(id, normalized);
      }
    });
  }

  // 2. Convert embedded media images into compressed data URLs
  const mediaDataMap = new Map<string, string>();
  const extractedImages: { name: string; dataUrl: string }[] = [];

  for (const [path, zipObj] of Object.entries(zip.files)) {
    if (!zipObj.dir && path.startsWith('word/media/')) {
      const lower = path.toLowerCase();
      if (/\.(emf|wmf)$/.test(lower)) {
        warnings.push(`偵測到舊式向量格式 ${path.split('/').pop()}（瀏覽器無法直接預覽 EMF/WMF，建議改為 PNG/JPG 插入）。`);
        continue;
      }
      const rawBytes = await zipObj.async('arraybuffer');
      const blob = new Blob([rawBytes], { type: guessMimeFromName(path) });
      const dataUrl = await compressImageBlobToDataUrl(blob, 640);
      if (dataUrl) {
        mediaDataMap.set(path, dataUrl);
        extractedImages.push({
          name: path.split('/').pop() || path,
          dataUrl,
        });
      }
    }
  }

  // 3. Walk <w:p> paragraphs in word/document.xml
  const docXml = await docXmlFile.async('text');
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(docXml, 'application/xml');
  const paragraphs = Array.from(xmlDoc.getElementsByTagName('w:p'));

  interface ParaItem {
    text: string;
    images: string[];
  }

  const paraItems: ParaItem[] = [];
  paragraphs.forEach((p) => {
    const tNodes = Array.from(p.getElementsByTagName('w:t'));
    const text = tNodes.map((n) => n.textContent ?? '').join('').replace(/\s+/g, ' ').trim();

    const imgDataUrls: string[] = [];
    // Modern OOXML drawing blip
    const blips = Array.from(p.getElementsByTagName('a:blip'));
    blips.forEach((b) => {
      const rId = b.getAttribute('r:embed') || b.getAttribute('embed');
      const mediaPath = rId ? relMap.get(rId) : undefined;
      const dataUrl = mediaPath ? mediaDataMap.get(mediaPath) : undefined;
      if (dataUrl && !imgDataUrls.includes(dataUrl)) imgDataUrls.push(dataUrl);
    });
    // Legacy VML imagedata
    const vmlImgs = Array.from(p.getElementsByTagName('v:imagedata'));
    vmlImgs.forEach((v) => {
      const rId = v.getAttribute('r:id') || v.getAttribute('id');
      const mediaPath = rId ? relMap.get(rId) : undefined;
      const dataUrl = mediaPath ? mediaDataMap.get(mediaPath) : undefined;
      if (dataUrl && !imgDataUrls.includes(dataUrl)) imgDataUrls.push(dataUrl);
    });

    if (text || imgDataUrls.length > 0) {
      paraItems.push({ text, images: imgDataUrls });
    }
  });

  // 4. Segment paragraphs into structured quiz questions
  interface DraftQuestion {
    qLines: string[];
    options: string[];
    ans: number;
    expLines: string[];
    imageUrl?: string;
  }

  const drafts: DraftQuestion[] = [];
  let current: DraftQuestion | null = null;
  let pendingOrphanImage: string | undefined;

  const flushCurrent = () => {
    if (!current) return;
    if (current.qLines.length > 0) {
      drafts.push(current);
    }
    current = null;
  };

  paraItems.forEach((item) => {
    const line = item.text;
    const firstImg = item.images[0];

    // Check answer line: "答案：B", "正解: A", "【答案】C"
    const ansMatch = line.match(/^(?:【?(?:標準)?答案】?|正解|Ans(?:wer)?)[：:\s]*([A-Da-d1-4])/i);
    if (ansMatch && current) {
      current.ans = normalizeAnswerIndex(ansMatch[1]);
      // Check if explanation also sits on the same line after answer
      const rest = line.slice(ansMatch[0].length).replace(/^[；;，,\s]*(?:詳解|解析)[：:\s]*/, '').trim();
      if (rest) current.expLines.push(rest);
      if (firstImg && !current.imageUrl) current.imageUrl = firstImg;
      return;
    }

    // Check explanation line: "詳解：...", "解析：..."
    const expMatch = line.match(/^(?:【?(?:詳解|解析|解說)】?)[：:\s]*(.+)$/);
    if (expMatch && current) {
      current.expLines.push(expMatch[1].trim());
      if (firstImg && !current.imageUrl) current.imageUrl = firstImg;
      return;
    }

    // Check start of new numbered question: "1. ...", "1、...", "(1) ...", "第1題 ..."
    const qStartMatch = line.match(/^(?:第\s*\d+\s*題[：:\s]*|\(?\d+\)?[、.．)）\s]+|Q\d+[.、:\s]+)(.+)$/i);
    if (qStartMatch) {
      flushCurrent();
      const body = qStartMatch[1].trim();
      const inline = extractInlineOptions(body);
      current = {
        qLines: [inline ? inline.stem : body],
        options: inline ? inline.opts : [],
        ans: 0,
        expLines: [],
        imageUrl: firstImg || pendingOrphanImage,
      };
      pendingOrphanImage = undefined;
      return;
    }

    // Check single option line: "(A) xxx", "A. xxx", "A、xxx"
    const singleOptMatch = line.match(/^\(?([A-Da-d])\)?[、.．)）\s]+(.+)$/);
    if (singleOptMatch && current) {
      // Also handle two options on the same line e.g. "(A) 12 (B) 24"
      const inline = extractInlineOptions(line);
      if (inline) {
        current.options = inline.opts;
      } else {
        const twoMatch = line.match(/^\(?[A-Da-d]\)?[、.．)）\s]+(.+?)\s+\(?[A-Da-d]\)?[、.．)）\s]+(.+)$/);
        if (twoMatch) {
          current.options.push(twoMatch[1].trim(), twoMatch[2].trim());
        } else {
          current.options.push(singleOptMatch[2].trim());
        }
      }
      if (firstImg && !current.imageUrl) current.imageUrl = firstImg;
      return;
    }

    // Inline 4-options line following question stem
    const inlineAll = extractInlineOptions(line);
    if (inlineAll && current) {
      if (inlineAll.stem) current.qLines.push(inlineAll.stem);
      current.options = inlineAll.opts;
      if (firstImg && !current.imageUrl) current.imageUrl = firstImg;
      return;
    }

    // Image-only paragraph or continuation text
    if (current) {
      if (line) current.qLines.push(line);
      if (firstImg && !current.imageUrl) current.imageUrl = firstImg;
    } else if (firstImg) {
      pendingOrphanImage = firstImg;
    }
  });

  flushCurrent();

  const now = Date.now();
  const questions: CustomQuestionRecord[] = drafts
    .map((d, idx) => {
      const q = d.qLines.join(' ').trim();
      const opts = [...d.options];
      while (opts.length < 4) {
        opts.push(`選項 ${String.fromCharCode(65 + opts.length)}`);
      }
      return {
        id: `${defaultSub}-wd-${now % 100000}-${idx + 1}`,
        sectorId: defaultSector,
        subId: defaultSub,
        q: q.slice(0, 1800),
        options: opts.slice(0, 4).map((o) => o.slice(0, 200)),
        ans: Math.max(0, Math.min(3, d.ans)),
        exp: (d.expLines.join(' ').trim() || '出版社 Word 匯入題目。').slice(0, 1800),
        imageUrl: d.imageUrl,
        source: 'word' as const,
        updatedAt: now,
      };
    })
    .filter((item) => item.q.length > 0);

  if (questions.length === 0) {
    warnings.push(
      '尚未偵測到標準編號題目（請確認 Word 題目開頭為「1. 題幹…」，選項為「(A) … (B) … (C) … (D) …」與「答案：A」）。'
    );
  }

  return { questions, extractedImages, warnings };
}
