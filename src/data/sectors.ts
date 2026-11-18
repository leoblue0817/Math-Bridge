import { CustomQuestionRecord, SectorId, SectorProgress } from '../types';

export interface SlideBlank {
  prompt: string;
  answer: string;
}

export interface SectorSlide {
  title: string;
  subtitle: string;
  bullets: string[];
  blanks?: SlideBlank[];
  diagramId?: string;
  hasInteractiveExplorer?: boolean;
}

export interface KeyPointCard {
  title: string;
  items: string[];
}

export interface QuizQuestion {
  id: string;
  q: string;
  diagramId?: string;
  imageUrl?: string;
  options: string[];
  ans: number;
  exp: string;
}

export interface SubLesson {
  id: string;
  code: string;
  title: string;
  summaryTitle: string;
  summaryItems: string[];
  questionIds: string[];
  questionIndices: number[];
  fairyTip: string;
}

export interface SectorData {
  id: SectorId;
  code: string;
  orderLabel: string;
  domainLabel: string;
  planetName: string;
  topicName: string;
  title: string;
  shortTitle: string;
  creativeName: string;
  planetFlavor: string;
  desc: string;
  slides: SectorSlide[];
  subLessons: SubLesson[];
  keyPoints: KeyPointCard[];
  coolFactTitle: string;
  coolFactBody: string;
  fairyHints: string[];
  quizzes: QuizQuestion[];
}

export function getSectorQuestionById(sector: SectorData, qId: string): QuizQuestion | undefined {
  return sector.quizzes.find((q) => q.id === qId);
}

export function getSubLessonQuestions(sector: SectorData, sub: SubLesson): QuizQuestion[] {
  if (sub.questionIds && sub.questionIds.length > 0) {
    return sub.questionIds
      .map((id) => sector.quizzes.find((q) => q.id === id))
      .filter((q): q is QuizQuestion => Boolean(q));
  }
  return sub.questionIndices
    .map((qi) => sector.quizzes[qi])
    .filter((q): q is QuizQuestion => Boolean(q));
}

export function getSectorStarStats(sector: SectorData, progress: SectorProgress) {
  const subDone = sector.subLessons.filter((sub) => progress.subLevels?.[sub.id]?.completed).length;
  // 4 stars per sector: slides (1) + 2 practice segments (2) + creative lab (1)
  const total = 2 + sector.subLessons.length;
  const earned = (progress.slides ? 1 : 0) + subDone + (progress.lab ? 1 : 0);
  return {
    earned,
    total,
    subDone,
    subTotal: sector.subLessons.length,
    allDone: earned === total,
  };
}

export function getTotalSystemStars(sectors: SectorData[]): number {
  return sectors.reduce((acc, s) => acc + 2 + s.subLessons.length, 0);
}

export function getMergedSectors(customQuestions: CustomQuestionRecord[] = []): SectorData[] {
  if (!customQuestions || customQuestions.length === 0) return SECTORS;

  const bySector = new Map<SectorId, CustomQuestionRecord[]>();
  customQuestions.forEach((cq) => {
    const arr = bySector.get(cq.sectorId) ?? [];
    arr.push(cq);
    bySector.set(cq.sectorId, arr);
  });

  return SECTORS.map((sec) => {
    const extras = bySector.get(sec.id);
    if (!extras || extras.length === 0) return sec;

    const mergedQuizzes: QuizQuestion[] = [...sec.quizzes];
    const idToIdx = new Map<string, number>();
    mergedQuizzes.forEach((q, idx) => idToIdx.set(q.id, idx));

    const extraSubMap = new Map<string, string[]>();

    extras.forEach((item) => {
      const normalized: QuizQuestion = {
        id: item.id,
        q: item.q,
        diagramId: item.diagramId || undefined,
        imageUrl: item.imageUrl || undefined,
        options: item.options,
        ans: item.ans,
        exp: item.exp,
      };
      const existingIdx = idToIdx.get(item.id);
      if (existingIdx !== undefined) {
        mergedQuizzes[existingIdx] = normalized;
      } else {
        const newIdx = mergedQuizzes.length;
        mergedQuizzes.push(normalized);
        idToIdx.set(item.id, newIdx);
      }

      const subKey = item.subId || sec.subLessons[0]?.id;
      if (subKey) {
        const list = extraSubMap.get(subKey) ?? [];
        if (!list.includes(item.id)) list.push(item.id);
        extraSubMap.set(subKey, list);
      }
    });

    const mergedSubs = sec.subLessons.map((sub) => {
      const extraIds = extraSubMap.get(sub.id);
      if (!extraIds || extraIds.length === 0) return sub;
      const combinedIds = [...sub.questionIds];
      extraIds.forEach((eid) => {
        if (!combinedIds.includes(eid)) combinedIds.push(eid);
      });
      return {
        ...sub,
        questionIds: combinedIds,
      };
    });

    return {
      ...sec,
      quizzes: mergedQuizzes,
      subLessons: mergedSubs,
    };
  });
}

export function findQuestionById(
  qId: string,
  sectorsSource: SectorData[] = SECTORS
): { sector: SectorData; quiz: QuizQuestion; qIdx: number } | null {
  for (const sector of sectorsSource) {
    const qIdx = sector.quizzes.findIndex((q) => q.id === qId);
    if (qIdx >= 0) {
      return { sector, quiz: sector.quizzes[qIdx], qIdx };
    }
  }
  return null;
}

export interface BattleQuestionSnapshot {
  qId: string;
  sectorId: SectorId;
  subId: string;
  q: string;
  options: string[];
  ans: number;
  exp: string;
  diagramId: string;
  imageUrl: string;
}

export function getScopeReadableLabel(scope: string, sectorsSource: SectorData[] = SECTORS): string {
  if (scope === 'all') return '八大主題綜合搶答賽';
  const sector = sectorsSource.find((s) => s.id === scope);
  if (sector) return `${sector.shortTitle} · ${sector.title}`;
  for (const sec of sectorsSource) {
    const sub = sec.subLessons.find((sl) => sl.id === scope);
    if (sub) return `${sec.shortTitle} · ${sub.code} ${sub.title}`;
  }
  return scope;
}

export function sampleBattleQuestions(
  scope: string,
  count: number,
  customQuestions: CustomQuestionRecord[] = []
): BattleQuestionSnapshot[] {
  const merged = getMergedSectors(customQuestions);
  const pool: BattleQuestionSnapshot[] = [];

  if (scope === 'all') {
    merged.forEach((sec) => {
      sec.subLessons.forEach((sub) => {
        getSubLessonQuestions(sec, sub).forEach((quiz) => {
          pool.push({
            qId: quiz.id,
            sectorId: sec.id,
            subId: sub.id,
            q: quiz.q,
            options: quiz.options.slice(0, 4),
            ans: quiz.ans,
            exp: quiz.exp,
            diagramId: quiz.diagramId ?? '',
            imageUrl: quiz.imageUrl ?? '',
          });
        });
      });
    });
  } else if (/^s[1-8]$/.test(scope)) {
    const sec = merged.find((s) => s.id === scope);
    if (sec) {
      sec.subLessons.forEach((sub) => {
        getSubLessonQuestions(sec, sub).forEach((quiz) => {
          pool.push({
            qId: quiz.id,
            sectorId: sec.id,
            subId: sub.id,
            q: quiz.q,
            options: quiz.options.slice(0, 4),
            ans: quiz.ans,
            exp: quiz.exp,
            diagramId: quiz.diagramId ?? '',
            imageUrl: quiz.imageUrl ?? '',
          });
        });
      });
    }
  } else {
    for (const sec of merged) {
      const sub = sec.subLessons.find((sl) => sl.id === scope);
      if (sub) {
        getSubLessonQuestions(sec, sub).forEach((quiz) => {
          pool.push({
            qId: quiz.id,
            sectorId: sec.id,
            subId: sub.id,
            q: quiz.q,
            options: quiz.options.slice(0, 4),
            ans: quiz.ans,
            exp: quiz.exp,
            diagramId: quiz.diagramId ?? '',
            imageUrl: quiz.imageUrl ?? '',
          });
        });
        break;
      }
    }
  }

  const uniqueMap = new Map<string, BattleQuestionSnapshot>();
  pool.forEach((item) => uniqueMap.set(item.qId, item));
  const copy = Array.from(uniqueMap.values());

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}

export const SECTORS: SectorData[] = [
  /* ========================================================================
   * 第1星域：數列規律 — 費波那契星環
   * ====================================================================== */
  {
    id: 's1',
    code: '第1星域',
    orderLabel: '第1星域',
    domainLabel: '規律探索',
    planetName: '費波那契星環',
    topicName: '數列規律',
    title: '費波那契星環 · 數列規律',
    shortTitle: '數列規律',
    creativeName: '點格對決',
    planetFlavor: '星環藍寶脈衝星',
    desc: '掌握首項 a₁ 與末項 aₙ、平方/三角/階乘/費氏兔子數列，並運用餘數破解 1/7 循環小數第 N 位！',
    slides: [
      {
        title: '數列定義與四大經典數列家族',
        subtitle: '把數字排成一列，找出相鄰數字間隱藏的秘密規律',
        bullets: [
          '將數字排成一列（無論有無規律或重複），都稱為數列，其中每個數字叫做「項」。',
          '第 1 項稱為首項，記為 a₁；最後一項（第 n 項）稱為末項，記為 aₙ。',
          '經典四大家族：平方數 (1,4,9,16…)、三角數 (+2,+3,+4…)、乘積連乘 (×2,×3,×4…)、階差等差 (+2,+4,+6,+8…)。',
        ],
        blanks: [
          { prompt: '第 1 個數稱為（　），簡記為（　）', answer: '首項；a₁' },
          { prompt: '最後一個數稱為第 n 項或（　），簡記為（　）', answer: '末項；aₙ' },
        ],
      },
      {
        title: '費波那契數列：兔子生兔子的神祕規律',
        subtitle: '每一項都等於前面兩項相加：1, 1, 2, 3, 5, 8, 13, 21…',
        bullets: [
          '義大利數學家費波那契在《計算之書》提出兔子問題：小兔出生兩個月後成大兔，每月生 1 對新小兔，且永生不死。',
          '前兩個月只有 1 對兔子；第 3 月開始大兔生小兔變 2 對，之後每月總數剛好是「前兩月相加」！',
          '一年（第 12 個月）後共有：1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144 對兔子！',
        ],
        blanks: [
          { prompt: '費波那契數列：1, 1, 2, 3, 5, 8, 13, (　)', answer: '21' },
          { prompt: '一年（12 個月）後共有幾對兔子？', answer: '144 對' },
        ],
        hasInteractiveExplorer: true,
      },
      {
        title: '循環小數與 1/7 旋轉密碼轉盤',
        subtitle: '抓出「循環節」長度，第 199 位也能用餘數一秒算出！',
        bullets: [
          '無限循環小數：小數部分某一位起有幾個數字依序重複出現（如 7/11 = 0.6363… 記作上橫線 0.6̄3̄），重複這節叫循環節。',
          '無限不循環小數：小數無限延伸卻完全沒有重複模式，例如圓周率 π ≈ 3.14159265…。',
          '1/7 = 0.142857142857…（6 位循環節），且 2/7~6/7 都是 142857 順時針輪流當頭的旋轉密碼！',
        ],
        blanks: [
          { prompt: '1/7 ＝ 0.142857… 循環節長度為（　）位', answer: '6 位' },
          { prompt: '4/7 ＝（　）（依旋轉轉盤從第 5 大的數字 5 開始）', answer: '0.571428…' },
        ],
        hasInteractiveExplorer: true,
      },
    ],
    subLessons: [
      {
        id: 's1-1',
        code: '1-1',
        title: '基礎核心 · 數列規律觀察（第 1–4 題）',
        summaryTitle: '實戰秘訣 · 比對差值與倍數倍率',
        summaryItems: [
          '看到 1, 4, 9, 16… 先想連續平方數 n×n；看到 0, 2, 6, 12… 先算相鄰差值 (+2, +4, +6…)。',
          '數字暴衝得很快（1, 2, 6, 24, 120…）時，優先檢查前後項的乘法倍數 (×2, ×3, ×4…)。',
        ],
        questionIds: ['s1-q1', 's1-q2', 's1-q3', 's1-q4'],
        questionIndices: [0, 1, 2, 3],
        fairyTip: '先寫出相鄰兩項之間的「＋多少」或「×多少」，九成數列規律立刻無所遁形！',
      },
      {
        id: 's1-2',
        code: '1-2',
        title: '進階應用 · 費氏數列與循環小數（第 5–8 題）',
        summaryTitle: '實戰秘訣 · 餘數定位循環小數第 N 位',
        summaryItems: [
          '遇非純循環小數（如 18/55 = 0.3272727…），先把「前面不循環的位數」扣掉，再除以循環節長度！',
          '整除代表落在循環節的「最後一個數字」，餘 1 落在第一個數字。',
        ],
        questionIds: ['s1-q5', 's1-q6', 's1-q7', 's1-q8'],
        questionIndices: [4, 5, 6, 7],
        fairyTip: '算 18/55 小數點後 1~10 位總和時，別忘了第 1 位「3」不會再重複喔！',
      },
    ],
    keyPoints: [
      {
        title: '常見數列觀察法',
        items: [
          '相鄰作差法：1, 3, 6, 10, 15（每次＋2, ＋3, ＋4, ＋5）。',
          '前兩項相加：費波那契數列 1, 1, 2, 3, 5, 8, 13, 21…。',
        ],
      },
      {
        title: '循環小數第 N 位秘訣',
        items: [
          '1/7 循環節為 142857（週期 6）；n ÷ 6 看餘數即可對應位置。',
          '混合循環（如 0.32727…）先扣前面不循環的位數再算餘數。',
        ],
      },
    ],
    coolFactTitle: '數學酷知識 · 費波那契與大自然密碼',
    coolFactBody:
      '向日葵種子的螺旋線條數（34 與 55）、松果鱗片排列、甚至花瓣數目（3, 5, 8, 13）幾乎都是費波那契數列！',
    fairyHints: [
      '點格對決進階版會預先填好 1～9 分數，小心別送給對手連環佔領高分大格喔！',
      '1/7、2/7、3/7… 的小數都共用 1-4-2-8-5-7 六個數字順時針排列！',
    ],
    quizzes: [
      {
        id: 's1-q1',
        q: '有一數列：1、4、9、16、25、36、(　)、64、…，請問括號中應填入多少？',
        options: ['42', '48', '49', '50'],
        ans: 2,
        exp: '此數列為連續正整數的平方數：1²=1、2²=4、3²=9、4²=16、5²=25、6²=36，第 7 項為 7×7 ＝ 49。',
      },
      {
        id: 's1-q2',
        q: '有一數列：1、3、6、(甲)、15、21、28、(乙)…，請問甲與乙依序分別是多少？',
        options: ['甲=9、乙=35', '甲=10、乙=36', '甲=10、乙=35', '甲=12、乙=36'],
        ans: 1,
        exp: '前後兩項的差依序增加：＋2、＋3、＋4、＋5、＋6、＋7、＋8。所以甲 ＝ 6＋4 ＝ 10；乙 ＝ 28＋8 ＝ 36。',
      },
      {
        id: 's1-q3',
        q: '有一數列：0、2、6、12、20、(　)、42…，請問括號中的數字是多少？',
        options: ['28', '30', '32', '34'],
        ans: 1,
        exp: '相鄰兩數的差為連續偶數：＋2、＋4、＋6、＋8、＋10、＋12。因此 20＋10 ＝ 30（驗證 30＋12＝42 正確）。',
      },
      {
        id: 's1-q4',
        q: '有一數列：1、2、6、24、120、(　)…，請問括號中的數字是多少？',
        options: ['240', '600', '720', '840'],
        ans: 2,
        exp: '相鄰倍數依序為 ×2、×3、×4、×5、×6：1×2=2、2×3=6、6×4=24、24×5=120，下一項為 120×6 ＝ 720。',
      },
      {
        id: 's1-q5',
        q: '有一費波那契數列：1、1、2、3、5、8、13、(　)…，請問括號中應填入多少？',
        options: ['18', '20', '21', '24'],
        ans: 2,
        exp: '費波那契數列規律為「前兩項之和等於下一項」：8 ＋ 13 ＝ 21。',
      },
      {
        id: 's1-q6',
        q: '請將分數 1/12 化為小數後，請問小數點後面總共會出現幾個「不同的數字」？',
        options: ['2 個', '3 個', '4 個', '6 個'],
        ans: 1,
        exp: '1 ÷ 12 ＝ 0.083333…，小數點後面出現過的數字只有「0、8、3」三種不同的數字，共 3 個。',
      },
      {
        id: 's1-q7',
        q: '請將 1/7 化為循環小數（0.142857142857…），請問小數點後第 199 位上的數字是多少？',
        options: ['1', '2', '4', '7'],
        ans: 0,
        exp: '循環節「142857」共有 6 位數字。199 ÷ 6 ＝ 33 餘 1，餘數 1 代表循環節的第 1 個數字，也就是 1。',
      },
      {
        id: 's1-q8',
        q: '將分數 18/55 化為小數後，請問小數點後第 1 位到第 10 位的數字總和是多少？',
        options: ['38', '40', '41', '45'],
        ans: 2,
        exp: '18 ÷ 55 ＝ 0.3272727…（第 1 位是 3，之後 2、7 循環）。前 10 位依序為 3 + (2+7)×4 + 2 ＝ 3 + 36 + 2 ＝ 41。',
      },
    ],
  },

  /* ========================================================================
   * 第2星域：奇偶與曆法 — 雙星奇偶觀測站
   * ====================================================================== */
  {
    id: 's2',
    code: '第2星域',
    orderLabel: '第2星域',
    domainLabel: '數論曆法',
    planetName: '雙星奇偶觀測站',
    topicName: '奇偶與曆法',
    title: '雙星奇偶觀測站 · 奇偶與曆法',
    shortTitle: '奇偶性質',
    creativeName: 'KenKen 數獨（算獨對決）',
    planetFlavor: '紫微脈衝雙子星',
    desc: '掌握「0 是偶數」與奇偶加減乘 8 大定律秒殺算式，並學會陽曆、陰陽曆 19 年 7 閏與時差曆法推理！',
    slides: [
      {
        title: '奇數與偶數核心定義（含 0）與八大性質',
        subtitle: '先搞清楚「0」到底算哪一邊！',
        bullets: [
          '偶數：能被 2 整除的整數（例：0、2、4、6、8…）—— 注意：0 ÷ 2 ＝ 0 餘 0，所以「0 是偶數」！',
          '加減法口訣「同偶異奇」：奇±奇＝偶、偶±偶＝偶；只有一奇一偶相加減才是奇數。',
          '乘法口訣「遇偶即偶」：只要算式中乘到任何一個偶數，積就一定是偶數；只有奇×奇＝奇。',
        ],
        blanks: [
          { prompt: '0 是奇數還是偶數？', answer: '0 是偶數' },
          { prompt: '連續奇數相加減：奇數 ± 奇數 ＝（　）', answer: '偶數' },
        ],
        hasInteractiveExplorer: true,
      },
      {
        title: '陽曆與閏年規則：4 閏、100 不閏、400 閏',
        subtitle: '為何西元 1900 年不是閏年，而西元 2000 年卻是閏年？',
        bullets: [
          '儒略曆 1 年計為 365.25 日，比真正回歸年 365.2422 日多了 0.0078 日，每 200 年會多出約 1.5 日誤差。',
          '現行西元閏年規則：① 逢 4 的倍數閏（如 1996）② 逢 100 的倍數不閏（如 1700、1900）。',
          '③ 逢 400 的倍數要閏（如 1600、2000 千禧年）④ 逢 4000 的倍數不閏（如 4000、8000）。',
        ],
        blanks: [
          { prompt: '西元 1900 年能否被 400 整除？是平年還是閏年？', answer: '不能，平年（逢 100 不閏）' },
          { prompt: '計算包含頭尾的天數（如 7/13 到 7/26）：（　）', answer: '末日 － 首日 ＋ 1' },
        ],
      },
      {
        title: '陰陽曆（農曆）與 19 年 7 閏秘密',
        subtitle: '把太陽年和月亮朔望月完美對齊的古代智慧',
        bullets: [
          '陰陽曆以「朔望月（約 29.5306 天）」算月，卻以「回歸年（約 365.2422 天）」計年，例如傳統農曆。',
          '19 個回歸年約有 6939.6018 天 ÷ 29.5306 ≈ 235 個朔望月。',
          '因為 235 ＝ 12 × 19 ＋ 7（餘數 7），所以每 19 年必須加入 7 個閏月，才不會農曆過年跑到夏天！',
        ],
        blanks: [
          { prompt: '農曆每（　）年必須加入（　）個閏月', answer: '19 年；7 個閏月' },
        ],
      },
    ],
    subLessons: [
      {
        id: 's2-1',
        code: '2-1',
        title: '基礎核心 · 奇偶判斷與性質應用（第 1–4 題）',
        summaryTitle: '實戰秘訣 · 數有幾個奇數看「奇偶」',
        summaryItems: [
          '多個數相加是奇還是偶，完全不用管偶數，只要數「共有幾個奇數」：奇數個奇數相加＝奇，偶數個奇數相加＝偶！',
          '兩數相減與相加奇偶永遠相同（同偶異奇）：例如答對＋答錯＝50(偶)，所以相差也一定是偶數！',
        ],
        questionIds: ['s2-q1', 's2-q2', 's2-q3', 's2-q4'],
        questionIndices: [0, 1, 2, 3],
        fairyTip: '遇到超長連加或大數字選項，先用奇偶性砍掉一半錯誤選項超快！',
      },
      {
        id: 's2-2',
        code: '2-2',
        title: '進階應用 · 方程式奇偶與曆法推算（第 5–8 題）',
        summaryTitle: '實戰秘訣 · 跨年先看有沒有經過 2 月 29 日',
        summaryItems: [
          '1982x 是偶數，要讓 1982x − 1981y ＝ 1983(奇數)，1981y 必須是奇數，直接淘汰偶數 y！',
          '跨年推星期幾：平年 365 天除以 7 餘 1（星期＋1）；若跨過閏年 2/29 則是 366 天除以 7 餘 2（星期＋2）。',
        ],
        questionIds: ['s2-q5', 's2-q6', 's2-q7', 's2-q8'],
        questionIndices: [4, 5, 6, 7],
        fairyTip: '西元 2012 年（民國 101 年）雖然是閏年，但 2/2 還沒到 2/29 喔！小心陷阱！',
      },
    ],
    keyPoints: [
      {
        title: '奇偶速斷兩大口訣',
        items: [
          '加法看「奇數個數」：偶數個奇數相加＝偶；奇數個奇數相加＝奇。',
          '兩數「和與差」奇偶永遠相同；偶數×任何整數永遠＝偶數。',
        ],
      },
      {
        title: '曆法與跨月推算',
        items: [
          '相差幾天＝大－小；一共幾天（含頭尾）＝大－小＋1。',
          '西元年份：4 閏、100 不閏、400 閏、4000 不閏。',
        ],
      },
    ],
    coolFactTitle: '數學酷知識 · 奇偶之爭「0 是偶數」',
    coolFactBody:
      '台灣口罩實名制、1977 年巴黎單雙號限行、2012 年紐約颱風配給油料時，都曾引發「車牌尾數 0 到底算奇數還是偶數」熱議——數學定義非常明確：0 能被 2 整除，0 是偶數！',
    fairyHints: [
      'KenKen 算獨的「9×」三格只能填 1、3、3，兩個 3 不能在同一行或同一列，先放對角準沒錯！',
      '19→58→29→88→44→22→11… 講義的「考拉茲猜想」偶數除2、奇數×3+1 最後都會掉進 4→2→1！',
    ],
    quizzes: [
      {
        id: 's2-q1',
        q: '請問連加算式「1 ＋ 2 ＋ 3 ＋ 4 ＋ … ＋ 2000 ＋ 2001」的總和是奇數還是偶數？',
        options: ['奇數', '偶數', '有時奇有時偶', '等於 0'],
        ans: 0,
        exp: '1 到 2000 中有 1000 個奇數（偶數個奇數相加＝偶數），再加上最後一個奇數 2001，總共有 1001 個奇數，因此總和是奇數！',
      },
      {
        id: 's2-q2',
        q: '有一數列：1、1、2、3、5、8、13、…，請問前 100 個數中，總共有多少個奇數？',
        options: ['33 個', '50 個', '66 個', '67 個'],
        ans: 3,
        exp: '觀察奇偶規律為「奇、奇、偶」每 3 個一循環（每組有 2 個奇數）。100 ÷ 3 ＝ 33 組餘 1（第 100 個是下一組第 1 個奇數），共 33×2 ＋ 1 ＝ 67 個奇數。',
      },
      {
        id: 's2-q3',
        q: '某次測驗有 50 道判斷題，做對一題得 3 分，不做或做錯倒扣 1 分，某生共得 82 分，問答對題數和答錯（含不做）相差多少？',
        options: ['33 題', '39 題', '17 題', '16 題'],
        ans: 3,
        exp: '設答對 x 題，答錯或不做 (50－x) 題。3x － (50 － x) ＝ 82 → 4x ＝ 132 → x ＝ 33 題；答錯 50－33 ＝ 17 題，相差 33 － 17 ＝ 16 題。',
      },
      {
        id: 's2-q4',
        q: '大小兩個整數之差為 2345，其中大數恰好是小數的 8 倍，請問這兩個數的和是多少？',
        options: ['3015', '3126', '3178', '3224'],
        ans: 0,
        exp: '大數減小數為 (8－1)＝7 倍 ＝ 2345，所以小數 ＝ 2345 ÷ 7 ＝ 335；兩數之和為 (8＋1)＝9 倍 ＝ 335 × 9 ＝ 3015（且兩數和與差同奇偶，必為奇數）。',
      },
      {
        id: 's2-q5',
        q: '滿足等式「1983 ＝ 1982x － 1981y」的一組正整數解是下列哪一組？',
        options: ['x＝12785，y＝12768', 'x＝12784，y＝12770', 'x＝11888，y＝11893', 'x＝1947，y＝1945'],
        ans: 2,
        exp: '1982x 必為偶數，等號左邊 1983 是奇數，故 1981y 必須為奇數（先排除偶數 y 的 A、B）。代入 (C)：1982×11888 － 1981×(11888＋5) ＝ 11888 － 9905 ＝ 1983 成立！',
      },
      {
        id: 's2-q6',
        q: '7 月 13 日延長疫情警戒至 7 月 26 日止，請問「這兩個日期相差幾天」？「延長時間一共幾天（含頭尾）」？',
        options: ['相差 13 天；共 13 天', '相差 13 天；共 14 天', '相差 14 天；共 14 天', '相差 12 天；共 13 天'],
        ans: 1,
        exp: '日期相差 ＝ 26 － 13 ＝ 13 天；延長時間從 13 日起算到 26 日止（包含頭尾兩天），一共有 26 － 13 ＋ 1 ＝ 14 天。',
      },
      {
        id: 's2-q7',
        q: 'Blue 所在美國的時間比臺灣時間「晚 15 個小時」，現在臺灣時間是 7 月 7 日下午 8 時（20:00），Blue 那邊是什麼時候？',
        options: ['7 月 7 日上午 5 時', '7 月 8 日上午 11 時', '7 月 6 日下午 5 時', '7 月 7 日上午 8 時'],
        ans: 0,
        exp: '臺灣時間 7 月 7 日下午 8 時即為 20 時。比臺灣晚 15 小時：20 － 15 ＝ 5 時，尚未跨日退回前一天，因此是 7 月 7 日上午 5 時。',
      },
      {
        id: 's2-q8',
        q: '已知民國 100 年（西元 2011 年）2 月 2 日是星期三，請問民國 101 年 2 月 2 日與民國 102 年 2 月 2 日分別是星期幾？',
        options: ['星期四、星期五', '星期四、星期六', '星期五、星期六', '星期五、星期日'],
        ans: 1,
        exp: '2011/2/2 → 2012/2/2 還沒到 2/29，只經過 365 天（÷7 餘 1），故 101 年 2/2 是星期四；2012/2/2 → 2013/2/2 跨過了 2012/2/29 閏日共 366 天（÷7 餘 2），故 102 年 2/2 是星期六！',
      },
    ],
  },

  /* ========================================================================
   * 第3星域：面積綜合 — 黃金割補秘境
   * ====================================================================== */
  {
    id: 's3',
    code: '第3星域',
    orderLabel: '第3星域',
    domainLabel: '幾何測量',
    planetName: '黃金割補秘境',
    topicName: '面積綜合',
    title: '黃金割補秘境 · 面積綜合',
    shortTitle: '面積綜合',
    creativeName: '摺摺稱奇－線對稱',
    planetFlavor: '琥珀晶格軌道星',
    desc: '熟練五大面積公式與圓切拼長方形推導，運用「和差法」與「割補法」秒解葉子、四葉草與資優複合幾何題！',
    slides: [
      {
        title: '五大基本圖形與對角線垂直四邊形',
        subtitle: '打通小學到國中幾何面積的所有基礎公式',
        bullets: [
          '平行四邊形 ＝ 底 × 高；三角形 ＝ 底 × 高 ÷ 2；梯形 ＝ (上底 ＋ 下底) × 高 ÷ 2。',
          '特別公式：若四邊形的兩條對角線互相垂直（如菱形、箏形、正方形），面積 ＝ 對角線 × 對角線 ÷ 2！',
          '活用：圓內接正方形不需要知道邊長，直接拿直徑當對角線算「直徑 × 直徑 ÷ 2」最快。',
        ],
        blanks: [
          { prompt: '對角線垂直的四邊形面積 ＝（　）÷ 2', answer: '對角線 × 對角線' },
        ],
      },
      {
        title: '圓切拼長方形推導 ＆ 扇形面積公式',
        subtitle: '把圓切成越多小扇形，拼起來就越接近長方形',
        bullets: [
          '圓周長 ＝ 直徑 × 3.14 ＝ 半徑 × 2 × 3.14；扇形面積 ＝ 圓面積 × (圓心角 ÷ 360°)。',
          '將圓切成偶數個小扇形上下交錯對拼：近似長方形的「寬 ＝ 半徑」，「長 ＝ 圓周長的一半 (半徑 × 3.14)」。',
          '長 × 寬 ＝ (半徑 × 3.14) × 半徑 ＝ 半徑 × 半徑 × 3.14！',
        ],
        blanks: [
          { prompt: '扇形面積 ＝ 圓面積 ×（　）÷ 360', answer: '圓心角度數' },
        ],
        hasInteractiveExplorer: true,
      },
      {
        title: '複合圖形兩大密技：和差法 ＆ 割補法',
        subtitle: '不用硬算不規則邊界！重疊相加減或平移旋轉補成整塊',
        bullets: [
          '和差法：利用規則圖形相加或相減算出目標面積（例：葉子面積 ＝ 兩個 1/4 圓 － 正方形）。',
          '割補法：把凸出或弧形部分切下來，平移或旋轉補到對稱的空缺裡，立刻變身成簡單三角形或正方形！',
          '遇到等腰直角三角形與半圓組合時，連接中線後常能直接把弓形補回空白處。',
        ],
        blanks: [
          { prompt: '求四葉草面積可用 4 個半圓（＝ 2 個整圓）減去（　）', answer: '1 個正方形面積' },
        ],
      },
    ],
    subLessons: [
      {
        id: 's3-1',
        code: '3-1',
        title: '基礎核心 · 圓與和差法面積（第 1–4 題）',
        summaryTitle: '實戰秘訣 · 葉子與四葉草重疊計數',
        summaryItems: [
          '羊吃草遇到牆角轉彎時，繩長扣掉牆邊長＝轉彎後的剩餘繩長，另外畫一個 1/4 圓扇形。',
          '四葉草：4 個半圓加起來正好蓋滿正方形 1 次＋4 片花瓣重疊各 1 次 → 2 個整圓 － 正方形！',
        ],
        questionIds: ['s3-q1', 's3-q2', 's3-q3', 's3-q4'],
        questionIndices: [0, 1, 2, 3],
        fairyTip: '算圓內接正方形時，直接把「直徑 20cm」當成對角線：20×20÷2 = 200 最快！',
      },
      {
        id: 's3-2',
        code: '3-2',
        title: '進階應用 · 割補轉移與資優面積（第 5–8 題）',
        summaryTitle: '實戰秘訣 · 切下來補過去變超簡單',
        summaryItems: [
          '兩側各作半圓的圖形：把突出的兩塊半圓剪下來，剛好填補進正方形內凹的兩個半圓洞！',
          '直角三角形內接長方形：利用三角形等積與相似旋轉概念，長方形面積 ＝ 兩條斜邊旁線段長相乘！',
        ],
        questionIds: ['s3-q5', 's3-q6', 's3-q7', 's3-q8'],
        questionIndices: [4, 5, 6, 7],
        fairyTip: '看到 45° 等腰直角三角形＋半圓，畫一條高把半圓切一半補過去，答案直接剩三角形！',
      },
    ],
    keyPoints: [
      {
        title: '公式與圓周率常用組',
        items: [
          'r=10 圓面積 = 314；1/4 圓 = 78.5；3/4 圓 = 235.5。',
          '正方形兩側半圓割補法：面積直接還原成完整正方形。',
        ],
      },
      {
        title: '資優割補思維',
        items: [
          '葉子面積 ＝ 半圓 － 正方形 ＝ 0.57 × 邊長²（以 π=3.14）。',
          '直角三角形內接長方形（如 AD=8, EC=5）：長方形面積直接等於 8 × 5 = 40！',
        ],
      },
    ],
    coolFactTitle: '數學酷知識 · 16×16 摺摺稱奇雙面色紙',
    coolFactBody:
      '利用「線對稱軸」將 16×16 格的黃、黑、灰三色方格往內與往後翻摺，竟然可以把所有灰色格子完全夾進夾層裡，變出正面全黑 4×4、背面全黃 4×4！',
    fairyHints: [
      '「摺摺稱奇」只要先摺斜對稱菱形把灰色包進去，再把右側黃色整片反摺到背面就能完美過關！',
      '記得圓面積算完「半徑 × 半徑 × 3.14」，不要忘記乘以扇形的角度比例喔！',
    ],
    quizzes: [
      {
        id: 's3-q1',
        q: '以 AC 為直徑 20 cm 作一圓，其中 ABCD 為圓內接正方形，請問外圍著色部分的面積是多少平方公分？',
        diagramId: 'area-inscribed-square',
        options: ['100 平方公分', '114 平方公分', '157 平方公分', '200 平方公分'],
        ans: 1,
        exp: '半徑 r ＝ 20 ÷ 2 ＝ 10 cm，圓面積 ＝ 10 × 10 × 3.14 ＝ 314。正方形面積 ＝ 對角線 × 對角線 ÷ 2 ＝ 20 × 20 ÷ 2 ＝ 200。著色面積 ＝ 314 － 200 ＝ 114 平方公分。',
      },
      {
        id: 's3-q2',
        q: '如圖中長 16m、寬 8m 的倉庫周圍都是草地，小羊用 10m 繩子綁在右下牆角，請問小羊最大能吃到的草地面積是多少平方公尺？',
        diagramId: 'area-goat-barn',
        options: ['235.5 平方公尺', '238.64 平方公尺', '251.2 平方公尺', '314 平方公尺'],
        ans: 1,
        exp: '繩長 10m 掃出 3/4 個大圓：10 × 10 × 3.14 × 3/4 ＝ 235.5 m²；繞過右上方 8m 牆角後剩 10 － 8 ＝ 2m 繩長，多出 1/4 小圓：2 × 2 × 3.14 × 1/4 ＝ 3.14 m²。合計 235.5 ＋ 3.14 ＝ 238.64 平方公尺。',
      },
      {
        id: 's3-q3',
        q: '正方形 ABCD 的邊長為 8 cm，則圖中葉子（斜線重疊部分）的面積是多少平方公分？',
        diagramId: 'area-leaf-8cm',
        options: ['32 平方公分', '36.48 平方公分', '50.24 平方公分', '64 平方公分'],
        ans: 1,
        exp: '葉子 ＝ 兩個 1/4 圓 － 正方形 ＝ 半圓 － 正方形。8 × 8 × 3.14 ÷ 2 － 8 × 8 ＝ 100.48 － 64 ＝ 36.48 平方公分。',
      },
      {
        id: 's3-q4',
        q: '正方形 ABCD 的邊長為 20 cm，以四邊為直徑往內作四個半圓形成「四葉草」，請問上色部分的面積是多少平方公分？',
        diagramId: 'area-clover-20cm',
        options: ['114 平方公分', '200 平方公分', '228 平方公分', '314 平方公分'],
        ans: 2,
        exp: '4 個半圓恰好等於 2 個直徑 20 cm（半徑 10 cm）的圓：10 × 10 × 3.14 × 2 ＝ 628；減去正方形面積 20 × 20 ＝ 400，得四葉草面積 ＝ 628 － 400 ＝ 228 平方公分。',
      },
      {
        id: 's3-q5',
        q: '如圖為一個兩條對角線互相垂直的四邊形，對角線長分別為 12 cm 與 10 cm，請問這個四邊形的面積是多少平方公分？',
        diagramId: 'area-perp-diag',
        options: ['44 平方公分', '60 平方公分', '100 平方公分', '120 平方公分'],
        ans: 1,
        exp: '對角線互相垂直的四邊形面積 ＝ 對角線 × 對角線 ÷ 2 ＝ 12 × 10 ÷ 2 ＝ 60 平方公分。',
      },
      {
        id: 's3-q6',
        q: '在邊長 25 cm 的正方形 ABCD 兩側分別往外與往內作直徑 25 cm 的半圓（如圖），請問著色面積為多少平方公分？',
        diagramId: 'area-two-semicircles',
        options: ['312.5 平方公分', '490.625 平方公分', '625 平方公分', '785 平方公分'],
        ans: 2,
        exp: '將左側凸出的半圓「割下來」，剛好完整「補進」正方形右側凹進去的半圓空缺！還原後就是一個邊長 25 cm 的完整正方形：25 × 25 ＝ 625 平方公分！',
      },
      {
        id: 's3-q7',
        q: '在底邊為 10 cm 的 45° 等腰直角三角形一側，以底邊為直徑作 1/2 圓（如圖），試問綠色著色總面積是多少平方公分？',
        diagramId: 'area-45-triangle-semicircle',
        options: ['25 平方公分', '39.25 平方公分', '50 平方公分', '78.5 平方公分'],
        ans: 2,
        exp: '等腰直角三角形兩腰等長都是 10 cm。作垂線後，把左側突出半圓的那塊弓形割補到右側三角形內的空白半圓區域，著色部分正好拼成整個直角三角形：10 × 10 ÷ 2 ＝ 50 平方公分！',
      },
      {
        id: 's3-q8',
        q: '如圖，直角三角形 ABC 內部有一個長方形 BDFE，已知 AD ＝ 8 cm，EC ＝ 5 cm，請問中間著色長方形的面積是多少平方公分？',
        diagramId: 'area-rect-in-triangle',
        options: ['20 平方公分', '26 平方公分', '40 平方公分', '80 平方公分'],
        ans: 2,
        exp: '把 △ADF 與 △FEC 以點 F 為中心做比例／剪拼重組，可得兩股長積滿足 DF × FE ＝ AD × EC ＝ 8 × 5 ＝ 40 平方公分！（小六秘訣：內接長方形面積剛好等於外頭兩段線段相乘！）',
      },
    ],
  },

  /* ========================================================================
   * 第4星域：加法與乘法原理 — 星門分流樞紐
   * ====================================================================== */
  {
    id: 's4',
    code: '第4星域',
    orderLabel: '第4星域',
    domainLabel: '組合計數',
    planetName: '星門分流樞紐',
    topicName: '加法與乘法原理',
    title: '星門分流樞紐 · 加法與乘法原理',
    shortTitle: '加乘法原理',
    creativeName: '數連 Numberlink',
    planetFlavor: '青嵐雙軌衛星城',
    desc: '精準區分「分類相加」與「分步驟相乘」，學會計算來回不走同路、多邊形對角線公式、握手問題與鐵路車票種類！',
    slides: [
      {
        title: '加法原理 v.s. 乘法原理',
        subtitle: '先問自己：這件事是一次挑完（分類），還是要分步驟依序完成？',
        bullets: [
          '加法原理：完成一件事有 n 類「各自獨立」的方法，選其一即可完成 → 總方法數 ＝ m₁ ＋ m₂ ＋ … ＋ mₙ。',
          '乘法原理：完成一件事必須經過 n 個「彼此相連」的步驟（先選 A 再選 B）→ 總方法數 ＝ m₁ × m₂ × … × mₙ。',
          '小口訣：「或／分類」用加法，「且／步驟」用乘法！',
        ],
        blanks: [
          { prompt: '各類辦法彼此獨立、選一類就能完成 → 用（　）原理', answer: '加法' },
          { prompt: '必須經過好幾個步驟連貫完成 → 用（　）原理', answer: '乘法' },
        ],
      },
      {
        title: '來回不同路陷阱 ＆ 車票計數',
        subtitle: '雙向道去的時候走過，回程就少 1 條路可以選！',
        bullets: [
          '若去程選「單行道」，回程完全不影響雙向道或另一方向的單行道；若去程選「雙向道」，回程雙向道要減 1！',
          '因此有雙向道參與「去回不走同一條路」時，務必把去程分成「走單行道」與「走雙向道」兩類分開乘再相加！',
          '鐵路單程車票（如高雄→台北與台北→高雄是不同起訖票種）：n 個車站共需 n × (n − 1) 種車票。',
        ],
        blanks: [
          { prompt: '10 個車站間買單程車票（起迄不同算不同種）共（　）種', answer: '10 × 9 ＝ 90 種' },
        ],
      },
      {
        title: '多邊形對角線與握手問題',
        subtitle: '為何兩個人握手只算一次，公式一定要除以 2？',
        bullets: [
          'n 邊形每個頂點不能連自己，也不能連左右相鄰 2 點，所以可連出 (n − 3) 條對角線。',
          'n 個頂點共畫出 n × (n − 3) 條，但每條線都被兩端頂點各算一次，故必須除以 2 → n × (n − 3) ÷ 2。',
          '同理，n 位同學彼此握手一次：每人握 (n − 1) 人，除以 2 去重複 → n × (n − 1) ÷ 2！',
        ],
        blanks: [
          { prompt: 'n 邊形的對角線數量公式 ＝（　）', answer: 'n × (n － 3) ÷ 2' },
        ],
        hasInteractiveExplorer: true,
      },
    ],
    subLessons: [
      {
        id: 's4-1',
        code: '4-1',
        title: '基礎核心 · 路線與套餐計數（第 1–4 題）',
        summaryTitle: '實戰秘訣 · 遇雙向道必分類討論',
        summaryItems: [
          '「陸路 3 種或水路 5 種」都能直接到達 → 加法原理；「主菜、副食、甜點各選一種」要連選三步 → 乘法原理。',
          '去回不走同一條路：把去程拆成「甲→乙單行道」和「雙向道」兩情況分開計算再相加！',
        ],
        questionIds: ['s4-q1', 's4-q2', 's4-q3', 's4-q4'],
        questionIndices: [0, 1, 2, 3],
        fairyTip: '第 4 題（阿呆走單雙向道）一定要分兩類：去走單行道有 8×9=72，去走雙向道有 5×8=40！',
      },
      {
        id: 's4-2',
        code: '4-2',
        title: '進階應用 · 對角線、握手與車票（第 5–8 題）',
        summaryTitle: '實戰秘訣 · 分辨「要除 2」還是「不用除 2」',
        summaryItems: [
          '握手、無方向線段、對角線：A↔B 跟 B↔A 算同一條 → 一定要「÷ 2」。',
          '單程車票（高雄→左營 ≠ 左營→高雄）：有方向順序之分 → 不除 2，直接 n × (n − 1)！',
        ],
        questionIds: ['s4-q5', 's4-q6', 's4-q7', 's4-q8'],
        questionIndices: [4, 5, 6, 7],
        fairyTip: '高雄鐵路地下化題記得加上原有的左營、高雄、鳳山 3 站，總共是 3＋7 ＝ 10 個車站喔！',
      },
    ],
    keyPoints: [
      {
        title: '加法與乘法對照表',
        items: [
          '加法原理：不同分類各自完成，數量相加（m₁ + m₂）。',
          '乘法原理：連續步驟缺一不可，數量相乘（m₁ × m₂）。',
        ],
      },
      {
        title: '兩大配對公式',
        items: [
          '無方向配對（握手／對角線）：n(n−1)÷2、n(n−3)÷2。',
          '有方向配對（單程車票／排冠亞軍）：n × (n−1)。',
        ],
      },
    ],
    coolFactTitle: '數學酷知識 · 數連 Numberlink 的路線拓撲',
    coolFactBody:
      '數連遊戲要求相同數字連線「不能交叉、不能佔 2×2 方格、且必須鋪滿全盤」！掌握「先貼牆角走外圍，再留內部通道」的路線思考，就和組合計數一樣有系統！',
    fairyHints: [
      '玩「數連 Numberlink」時，優先連接靠近邊框與角落的數字，就能為內側數字保留唯一通道喔！',
      '看到題目寫「總共增加 7 個車站」要先加上原本的 3 個車站，共有 10 個站！',
    ],
    quizzes: [
      {
        id: 's4-q1',
        q: '小新由甲地到乙地，走陸路有 3 種方法，走水路有 5 種方法，請問小新由甲地到乙地總共有多少種方法？',
        options: ['8 種', '15 種', '16 種', '24 種'],
        ans: 0,
        exp: '走陸路或走水路皆能獨立從甲地到達乙地，屬於「加法原理」：3 ＋ 5 ＝ 8 種方法。',
      },
      {
        id: 's4-q2',
        q: '餐廳有 3 種主菜、2 種副食、4 種甜點，每位客人從主菜、副食、甜點各選一種，請問點餐方式有多少種？',
        options: ['9 種', '12 種', '18 種', '24 種'],
        ans: 3,
        exp: '點餐需連續經過選主菜、選副食、選甜點三個步驟，屬於「乘法原理」：3 × 2 × 4 ＝ 24 種。',
      },
      {
        id: 's4-q3',
        q: '小華從家裡經過超商再到學校：家到超商有 2 條步行路線、2 條公車路線，超商到學校有 3 條路線，請問家到學校共有幾種走法？',
        options: ['7 種', '10 種', '12 種', '16 種'],
        ans: 2,
        exp: '第一步（家到超商）用加法共有 2＋2 ＝ 4 種；第二步（超商到學校）有 3 種。合起來用乘法：4 × 3 ＝ 12 種走法。',
      },
      {
        id: 's4-q4',
        q: '甲、乙二地間，有 8 條甲到乙的單行道、4 條乙到甲的單行道，另有 5 條雙向道。若阿呆從甲到乙再回甲，「去回不走同一條路」，共有幾種走法？',
        options: ['104 種', '112 種', '117 種', '125 種'],
        ans: 1,
        exp: '分類討論：① 去程走甲→乙單行道 (8 種)，回程可走 (4+5)＝9 種，共 8×9＝72 種；② 去程走雙向道 (5 種)，回程不能走同一條剩 4＋(5－1)＝8 種，共 5×8＝40 種。合計 72＋40 ＝ 112 種！',
      },
      {
        id: 's4-q5',
        q: '利用多邊形對角線公式計算：一個正八邊形（n＝8）總共有幾條對角線？',
        options: ['16 條', '20 條', '24 條', '40 條'],
        ans: 1,
        exp: '套用公式 n × (n － 3) ÷ 2 ＝ 8 × (8 － 3) ÷ 2 ＝ 8 × 5 ÷ 2 ＝ 20 條對角線。',
      },
      {
        id: 's4-q6',
        q: '已知一個凸多邊形總共可以畫出 35 條對角線，請問這個多邊形是幾邊形？',
        options: ['八邊形', '九邊形', '十邊形', '十二邊形'],
        ans: 2,
        exp: '由 n × (n － 3) ÷ 2 ＝ 35，得知 n × (n － 3) ＝ 70。找兩個差為 3 的整數相乘等於 70：10 × 7 ＝ 70，故為十邊形！',
      },
      {
        id: 's4-q7',
        q: '小高開學第一天班上有 20 位同學彼此握手互相認識，重複握手只算一次，請問全班總共握手幾次？',
        options: ['180 次', '190 次', '200 次', '380 次'],
        ans: 1,
        exp: '每位同學都要跟其他 19 人握手，共有 20×19 次，但甲握乙與乙握甲算同一次需除以 2：20 × 19 ÷ 2 ＝ 190 次。',
      },
      {
        id: 's4-q8',
        q: '高雄鐵路地下化，除原左營、高雄、鳳山 3 站外，中間新增加 7 個車站。如果從每個車站買票至其他 9 個車站，總共會有幾種車票買法？',
        options: ['45 種', '63 種', '90 種', '100 種'],
        ans: 2,
        exp: '總站數共有 3 ＋ 7 ＝ 10 個車站，每個車站都能買票到其他 9 個車站（起訖方向不同算不同票種），共有 10 × 9 ＝ 90 種買法！',
      },
    ],
  },

  /* ========================================================================
   * 第5星域：運算規則 — 奧術拆括號星雲（小六正數限定，不含負數）
   * ====================================================================== */
  {
    id: 's5',
    code: '第5星域',
    orderLabel: '第5星域',
    domainLabel: '代數運算',
    planetName: '奧術拆括號星雲',
    topicName: '運算規則',
    title: '奧術拆括號星雲 · 運算規則',
    shortTitle: '運算規則',
    creativeName: '等值算式連線射擊',
    planetFlavor: '珊瑚分配律稜鏡星',
    desc: '以生活化正數例子學會「交換律、結合律湊整、分配律拆解」與「括號前＋－×÷去括號變號規則」（全正數、不含負數）！',
    slides: [
      {
        title: '運算順序與湊整好朋友（交換律／結合律）',
        subtitle: '聰明調換計算順序，把好算的數字先湊成 100 或 1000！',
        bullets: [
          '基本原則：先乘除後加減，由左而右算，有括號要先算括號裡。',
          '加法、乘法「交換律與結合律」：連加或連乘時可以自由配對，特別記住三大湊整搭檔：4×25＝100、8×125＝1000、2×5＝10！',
          '例：125 × 25 × 32 把 32 拆成 8 × 4，變成 (125×8) × (25×4) ＝ 1000 × 100 ＝ 100,000！',
        ],
        blanks: [
          { prompt: '25 × 4 ＝（　）；125 × 8 ＝（　）', answer: '100；1000' },
        ],
      },
      {
        title: '小六「去括號」超白話規則（正數限定）',
        subtitle: '括號前面如果是「－」或「÷」，拆掉門時裡面的符號要變身！',
        bullets: [
          '括號前面是「＋」：直接拆括號完全不變號！例：458 + (242 + 175) ＝ 458 + 242 + 175。',
          '括號前面是「－」（扣款退差額）：把「－」拆進去，括號內的「＋變－、－變＋」！例：635 − (235 − 48) ＝ 635 − 235 ＋ 48（折價 48 元不用付，等於留回 48 元）。',
          '括號前面是「÷」（連除分配）：把「÷」拆進去，括號內的「×變÷、÷變×」！例：720 ÷ (8 × 9) ＝ 720 ÷ 8 ÷ 9 ＝ 10。',
        ],
        blanks: [
          { prompt: '635 － (235 － 48) 去括號 ＝ 635 － 235（　）48', answer: '＋' },
          { prompt: '720 ÷ (8 × 9) 去括號 ＝ 720 ÷ 8（　）9', answer: '÷' },
        ],
        hasInteractiveExplorer: true,
      },
      {
        title: '分配律雙向魔法：發糖果 vs 收公因數',
        subtitle: 'c × (a ± b) ＝ c × a ± c × b',
        bullets: [
          '正用（拆數好算）：遇到 99 × 25，把 99 變成 (100 − 1)，算 100×25 − 1×25 ＝ 2475！',
          '逆用（提出公因數）：算式每項都有同一個乘數時（如 37×25 + 37×41 + 37×34），提出 37 → 37 × (25+41+34) ＝ 37 × 100 ＝ 3700！',
          '隱藏 ×1 陷阱：遇到 978×69 ＋ 978×32 － 978，要把最後單獨的 978 看成 978 × 1，提出後括號內是 (69 ＋ 32 － 1) ＝ 100！',
        ],
        blanks: [
          { prompt: '978×69 ＋ 978×32 － 978 ＝ 978 × (　　　)', answer: '69 ＋ 32 － 1（＝ 100）' },
        ],
      },
    ],
    subLessons: [
      {
        id: 's5-1',
        code: '5-1',
        title: '基礎核心 · 湊整律與分配律（第 1–4 題）',
        summaryTitle: '實戰秘訣 · 找公因數與拆 99 湊百',
        summaryItems: [
          '看到 25 找 4，看到 125 找 8；遇到 32 或 16 先拆出需要的 4 或 8。',
          '減去單獨一個數字（如 − 978）別忘了補上「× 1」，否則提出公因數會算錯！',
        ],
        questionIds: ['s5-q1', 's5-q2', 's5-q3', 's5-q4'],
        questionIndices: [0, 1, 2, 3],
        fairyTip: '第 4 題的「－ 978」就是「－ 978 × 1」，提出 978 後變成 (69 + 32 - 1) = 100 喔！',
      },
      {
        id: 's5-2',
        code: '5-2',
        title: '進階應用 · 正數去括號變號實戰（第 5–8 題）',
        summaryTitle: '實戰秘訣 · 減號與除號當老大，拆括號要變號',
        summaryItems: [
          '括號前是「＋」或「×」最和平，去括號（或乘進去）符號照抄（如 a＋(b−c)=a+b−c）。',
          '括號前是「－」，裡面「＋變－、－變＋」；括號前是「÷」，裡面「×變÷、÷變×」！',
        ],
        questionIds: ['s5-q5', 's5-q6', 's5-q7', 's5-q8'],
        questionIndices: [4, 5, 6, 7],
        fairyTip: '用買東西付錢來記：「帶 635 元買 235 元打折少付 48 元」，先扣 235 元再拿回 48 元就懂啦！',
      },
    ],
    keyPoints: [
      {
        title: '三大運算定律',
        items: [
          '交換律＆結合律：只限全加或全乘時自由調換順序湊整。',
          '分配律：a×c ± b×c ＝ (a ± b) × c。',
        ],
      },
      {
        title: '去括號不迷路口訣',
        items: [
          '括號前是「＋」，直接拆：a ＋ (b − c) ＝ a ＋ b − c。',
          '括號前是「－」，要變號：a − (b − c) ＝ a − b ＋ c；括號前是「÷」，×÷ 互換。',
        ],
      },
    ],
    coolFactTitle: '生活數學 · 為何去括號不用死背負負得正？',
    coolFactBody:
      '小六還沒學負數也沒關係！想像你有 864 元，買了一件 364 元外套和一條 199 元圍巾：先一起算總共花 (364＋199)，跟「先付外套 364 元、再付圍巾 199 元」剩的錢完全一樣：864 − (364+199) = 864 − 364 − 199！',
    fairyHints: [
      '「等值算式連線射擊」中，左邊有括號的算式一定和右邊一個去括號後的值相等，小心減號與除號的變號陷阱！',
      '算 99 × 25 別用直式了，用 (100 − 1) × 25 ＝ 2500 − 25 心算 3 秒搞定！',
    ],
    quizzes: [
      {
        id: 's5-q1',
        q: '運用乘法交換律與結合律巧算：「125 × 25 × 32」的結果是多少？',
        options: ['10,000', '32,000', '100,000', '125,000'],
        ans: 2,
        exp: '把 32 拆成 8 × 4，再搭配湊整好朋友：(125 × 8) × (25 × 4) ＝ 1000 × 100 ＝ 100,000。',
      },
      {
        id: 's5-q2',
        q: '運用分配律化簡計算：「37 × 25 ＋ 37 × 41 ＋ 37 × 34」等於多少？',
        options: ['3,700', '3,737', '37,000', '3,600'],
        ans: 0,
        exp: '三項都有公因數 37，提出 37 得：37 × (25 ＋ 41 ＋ 34) ＝ 37 × 100 ＝ 3,700！',
      },
      {
        id: 's5-q3',
        q: '利用分配律拆數技巧計算：「99 × 25」的正確結果是多少？',
        options: ['2,425', '2,475', '2,500', '2,525'],
        ans: 1,
        exp: '把 99 寫成 (100 － 1)，套用分配律：(100 － 1) × 25 ＝ 100 × 25 － 1 × 25 ＝ 2500 － 25 ＝ 2,475。',
      },
      {
        id: 's5-q4',
        q: '請利用分配律巧算：「978 × 69 ＋ 978 × 32 － 978」的答案是多少？',
        options: ['97,800', '98,778', '96,822', '97,899'],
        ans: 0,
        exp: '把最後的「－ 978」看作「－ 978 × 1」，提出 978：978 × (69 ＋ 32 － 1) ＝ 978 × 100 ＝ 97,800。',
      },
      {
        id: 's5-q5',
        q: '關於括號前是「＋」號的去括號運算，請問「458 ＋ (242 ＋ 175)」去括號後等於下列何者，且總和為何？',
        options: ['458 ＋ 242 － 175 ＝ 525', '458 ＋ 242 ＋ 175 ＝ 875', '458 － 242 ＋ 175 ＝ 391', '458 ＋ 242 ＋ 175 ＝ 775'],
        ans: 1,
        exp: '括號前面是「＋」號時，去掉括號裡面完全不變號：458 ＋ 242 ＋ 175 ＝ 700 ＋ 175 ＝ 875。',
      },
      {
        id: 's5-q6',
        q: '小藍帶 635 元買一本定價 235 元的漫畫，老闆現場折價 48 元（實付 235－48 元）。請問算式「635 － (235 － 48)」去掉括號後等於哪一個？',
        options: ['635 － 235 － 48 ＝ 352', '635 － 235 ＋ 48 ＝ 448', '635 ＋ 235 － 48 ＝ 822', '635 － 235 ＋ 48 ＝ 352'],
        ans: 1,
        exp: '括號前是「－」號，去括號裡面要變號（「－ 48」變「＋ 48」，就像折價 48 元沒花出去留在身上）：635 － 235 ＋ 48 ＝ 400 ＋ 48 ＝ 448！',
      },
      {
        id: 's5-q7',
        q: '老師把 720 顆糖果先平分給 8 班，每班再平分給 9 位學生。請問算式「720 ÷ (8 × 9)」去掉括號後等於下列哪一個？',
        options: ['720 ÷ 8 × 9 ＝ 810', '720 ÷ 8 ÷ 9 ＝ 10', '720 × 8 ÷ 9 ＝ 640', '720 ÷ 9 × 8 ＝ 640'],
        ans: 1,
        exp: '括號前面是「÷」號，去掉括號時裡面的「×」要變成「÷」：720 ÷ 8 ÷ 9 ＝ 90 ÷ 9 ＝ 10 顆。',
      },
      {
        id: 's5-q8',
        q: '運用去括號與湊整技巧計算：「864 － (364 ＋ 199)」的結果是多少？',
        options: ['301', '303', '499', '699'],
        ans: 0,
        exp: '括號前是「－」號，裡面的「＋ 199」去括號變成「－ 199」：864 － 364 － 199 ＝ 500 － 199 ＝ 301！',
      },
    ],
  },

  /* ========================================================================
   * 第6星域：數形規律 — 高斯數陣聖殿
   * ====================================================================== */
  {
    id: 's6',
    code: '第6星域',
    orderLabel: '第6星域',
    domainLabel: '幾何數列',
    planetName: '高斯數陣聖殿',
    topicName: '數形規律',
    title: '高斯數陣聖殿 · 數形規律',
    shortTitle: '數形規律',
    creativeName: '電子鐘火柴棒腦力戰',
    planetFlavor: '翡翠點陣晶體星',
    desc: '探索正方形數（連續奇數和與山頂相加）、三角形數，搭配高斯求和公式與 Blue 秘笈破解積木、牙籤、折繩剪刀與空心圍棋題！',
    slides: [
      {
        title: '正方形數的兩大神奇現象',
        subtitle: '邊長 n×n 的點陣，其實藏著連續奇數相加與山頂對稱！',
        bullets: [
          '定義：排成正方形的點或物體總數稱為正方形數（完全平方數：1, 4, 9, 16, 25…）。',
          '奇數現象：從 1 開始將連續奇數相加，每次剛好是平方數 → 1 + 3 + 5 + … + (2n−1) ＝ n²！',
          '遞迴山頂現象：1 + 2 + … + n + … + 2 + 1 ＝ n²（把山頂數字自己平方就是總和！）。',
        ],
        blanks: [
          { prompt: '將連續（　）相加：1+3+5+7+9 ＝ 5² ＝ 25', answer: '奇數' },
          { prompt: '從 1 連加到 10 再加回 1 的總和 ＝（　）', answer: '10² ＝ 100' },
        ],
        hasInteractiveExplorer: true,
      },
      {
        title: '三角形數與數形牙籤規律',
        subtitle: '第 n 個三角形數 ＝ 1 + 2 + … + n ＝ n × (n + 1) ÷ 2',
        bullets: [
          '三角形數：1, 3, 6, 10, 15, 21…；任意「兩個相鄰三角形數相加」剛好等於一個正方形數！',
          '牙籤橫排三角形：第 1 個用 3 根，每多 1 個三角形只多 2 根 → 需 2n ＋ 1 根牙籤。',
          '折繩剪刀規律：把繩子對折成 m 段再剪 n 刀（連折彎端點沒剪斷），總段數 ＝ m × n ＋ 1！',
        ],
        blanks: [
          { prompt: '第 n 個三角形數公式 ＝（　）', answer: 'n × (n ＋ 1) ÷ 2' },
          { prompt: '兩個連續三角形數相加一定是（　）', answer: '正方形數' },
        ],
      },
      {
        title: '高斯求和 1～100 與 Blue 秘笈',
        subtitle: '等差級數和 ＝ (首項 ＋ 末項) × 項數 ÷ 2',
        bullets: [
          '小高斯 10 歲秒殺 1+2+…+100：把 1+100、2+99、… 配成 100 組都是 101，兩組相加除 2 → 100 × 101 ÷ 2 ＝ 5050。',
          'Blue 秘笈 ① 公差 ＝ (末項 − 首項) ÷ 間隔數。',
          'Blue 秘笈 ② 項數 ＝ (末項 − 首項) ÷ 公差 ＋ 1（別忘記最後的「＋1」頭尾都要算！）。',
        ],
        blanks: [
          { prompt: '項數 ＝ (末項 － 首項) ÷ 公差 ＋（　）', answer: '1' },
          { prompt: '等差級數和 ＝ (首項 ＋ 末項) ×（　）÷ 2', answer: '項數' },
        ],
      },
    ],
    subLessons: [
      {
        id: 's6-1',
        code: '6-1',
        title: '基礎核心 · 點陣與積木牙籤（第 1–4 題）',
        summaryTitle: '實戰秘訣 · 數清楚邊長是 n 還是 2n',
        summaryItems: [
          '講義圖(一)是 2×2、圖(二)是 4×4、圖(三)是 6×6，所以第 n 個圖邊長是 2n（點數 = (2n)²）！',
          '山頂對稱缺頭少尾題（如 11+…+50+…+10）：先用 50² = 2500，再扣掉左右缺的 1~10 和 1~9！',
        ],
        questionIds: ['s6-q1', 's6-q2', 's6-q3', 's6-q4'],
        questionIndices: [0, 1, 2, 3],
        fairyTip: '第 1 題的圖(二)是 4×4 不是 3×3，所以第 10 個圖是 20×20 = 400 顆黑點喔！',
      },
      {
        id: 's6-2',
        code: '6-2',
        title: '進階應用 · 牙籤、折繩與等差級數（第 5–8 題）',
        summaryTitle: '實戰秘訣 · 折繩公式 m×n+1 與圍棋去重疊',
        summaryItems: [
          '空心正三角形三個頂點都會被兩條邊重複算到，所以直接看成「每多 1 號就每邊多 1 顆 → 3n」！',
          '音樂廳算總座位數：先用「末項 = 首項 + (n−1)×公差」求出第 15 排幾個位子，再套梯形和公式！',
        ],
        questionIds: ['s6-q5', 's6-q6', 's6-q7', 's6-q8'],
        questionIndices: [4, 5, 6, 7],
        fairyTip: '遇到「折成 m 段剪 n 刀」，畫一下彎折點就有幾個「1」，總段數永遠是 m × n ＋ 1！',
      },
    ],
    keyPoints: [
      {
        title: '點陣與圖形公式',
        items: [
          '第 n 個三角數 ＝ n(n+1)÷2；牙籤金字塔第 n 圖 ＝ 3 × 三角數 Tₙ。',
          '橫排牙籤三角形：2n + 1 根；空心正三角形圍棋：3n 顆。',
        ],
      },
      {
        title: 'Blue 等差級數秘笈',
        items: [
          '第 n 項 aₙ ＝ a₁ + (n−1) × d；項數 ＝ (aₙ − a₁) ÷ d + 1。',
          '級數總和 ＝ (首項 ＋ 末項) × 項數 ÷ 2。',
        ],
      },
    ],
    coolFactTitle: '數學酷知識 · 特殊三角形數與電子鐘火柴棒',
    coolFactBody:
      '電子鐘數字 0～9 各自需要 6, 2, 5, 5, 4, 5, 6, 3, 7, 6 根火柴棒！就像「123456」一共需要 2+5+5+4+5+6 ＝ 27 根，許多生活數字裡都藏著等差與組合規律！',
    fairyHints: [
      '「電子鐘火柴棒腦力戰」要同時比對七段顯示的根數和數字大小，例如 6 和 9 都是 6 根、2/3/5 都是 5 根！',
      '算 11+12+…+49+50+49+…+11+10 時，記得右邊有＋10 喔，所以缺的是 (1~10)=55 和 (1~9)=45，共少 100！',
    ],
    quizzes: [
      {
        id: 's6-q1',
        q: '如圖(一)～圖(三)的黑點都排成正方形（依序為 2×2、4×4、6×6），請問按照此規律，「第 10 個圖（a₁₀）」總共有幾個黑點？',
        diagramId: 'seq-square-dots',
        options: ['100 個', '121 個', '361 個', '400 個'],
        ans: 3,
        exp: '圖(一)邊長 2、圖(二)邊長 4、圖(三)邊長 6，所以第 n 個圖的邊長為 2n，黑點總數為 (2n)²。第 10 個圖 ＝ (2 × 10)² ＝ 20² ＝ 400 個黑點！',
      },
      {
        id: 's6-q2',
        q: '利用正方形數的「山頂對稱現象」巧妙計算：11 ＋ 12 ＋ 13 ＋ … ＋ 49 ＋ 50 ＋ 49 ＋ … ＋ 11 ＋ 10 ＝？',
        options: ['2,390', '2,400', '2,455', '2,500'],
        ans: 1,
        exp: '完整的山頂和 1＋…＋50＋…＋1 ＝ 50² ＝ 2500。左邊少了 1～10（和 55），右邊少了 1～9（和 45，因有＋10），總共少了 55＋45 ＝ 100，故答案為 2500 － 100 ＝ 2,400！',
      },
      {
        id: 's6-q3',
        q: '如圖的正方體積木堆疊（第 1 層 1 個、第 2 層 3 個、第 3 層 6 個…），請問第 25 層總共有幾個正方體積木？',
        diagramId: 'seq-triangle-cubes',
        options: ['300 個', '325 個', '350 個', '625 個'],
        ans: 1,
        exp: '各層積木數為三角形數 1, 3, 6, 10…。第 25 層即第 25 個三角形數 ＝ 1 ＋ 2 ＋ … ＋ 25 ＝ 25 × (25 ＋ 1) ÷ 2 ＝ 25 × 26 ÷ 2 ＝ 325 個。',
      },
      {
        id: 's6-q4',
        q: '下圖是由等長牙籤組成的三角形金字塔（圖①用 3 根、圖②用 9 根、圖③用 18 根…），按照規律畫下去，圖⑩總共需要幾根牙籤？',
        diagramId: 'seq-toothpick-triangles',
        options: ['135 根', '150 根', '165 根', '180 根'],
        ans: 2,
        exp: '圖①有 1 個上三角(×3=3)，圖②有 (1+2) 個(×3=9)，圖③有 (1+2+3) 個(×3=18)…圖⑩共有 (1＋2＋…＋10) ＝ 55 個小正三角形，共需 55 × 3 ＝ 165 根牙籤！',
      },
      {
        id: 's6-q5',
        q: '用等長牙籤橫排連接成正三角形（第 1 個用 3 根，每多 1 個三角形多 2 根），如果手上有 100 根牙籤，最多能排出幾個三角形？',
        diagramId: 'seq-toothpick-row',
        options: ['48 個', '49 個', '50 個', '51 個'],
        ans: 1,
        exp: '排 n 個三角形需要 2n ＋ 1 根牙籤。先留開頭 1 根，剩下 100 － 1 ＝ 99 根，每 2 根可多排 1 個：99 ÷ 2 ＝ 49 餘 1，故最多能排出 49 個三角形（用 99 根）！',
      },
      {
        id: 's6-q6',
        q: '將一條繩子折成等長 2 段後剪 2 刀可剪成 5 段。按照同樣折法，若折成等長 5 段，再剪 3 刀，總共可剪成幾段？',
        options: ['15 段', '16 段', '17 段', '18 段'],
        ans: 1,
        exp: '折成 m 段再剪 n 刀時，每一刀會剪出 m 個切口，總段數為「m × n ＋ 1」。所以折 5 段剪 3 刀共有 5 × 3 ＋ 1 ＝ 16 段！',
      },
      {
        id: 's6-q7',
        q: '小家將黑色圍棋排成空心正三角形（圖 1 有 3 顆、圖 2 有 6 顆、圖 3 有 9 顆、圖 4 有 12 顆…），請問圖 15 需要用到多少顆黑色圍棋？',
        diagramId: 'seq-hollow-tri',
        options: ['42 顆', '45 顆', '48 顆', '60 顆'],
        ans: 1,
        exp: '圖 1 有 3 顆、圖 2 有 6 顆、圖 3 有 9 顆，每進一圖增加 3 顆（圖 n 共 3n 顆）。圖 15 共需 15 × 3 ＝ 45 顆黑色圍棋。',
      },
      {
        id: 's6-q8',
        q: '一音樂廳共有 15 排座位，若第一排有 16 個座位，且每一排都比前一排多 2 個座位，則這個音樂廳總共有多少個座位？',
        options: ['420 個', '440 個', '450 個', '480 個'],
        ans: 2,
        exp: '第 15 排座位數 ＝ 16 ＋ (15 － 1) × 2 ＝ 16 ＋ 28 ＝ 44 個。等差級數總和 ＝ (16 ＋ 44) × 15 ÷ 2 ＝ 60 × 15 ÷ 2 ＝ 450 個座位！',
      },
    ],
  },

  /* ========================================================================
   * 第7星域：四則混合計算 — 超光速指數奇點
   * ====================================================================== */
  {
    id: 's7',
    code: '第7星域',
    orderLabel: '第7星域',
    domainLabel: '數算乘方',
    planetName: '超光速指數奇點',
    topicName: '四則混合計算',
    title: '超光速指數奇點 · 四則混合計算',
    shortTitle: '四則混合',
    creativeName: '指數獎勵倍增戰',
    planetFlavor: '電漿乘方反應星',
    desc: '統整分數與小數混合巧算、連鎖對消絕招與「指數 aⁿ」乘方概念，破解 2⁷⁸ 個位循環與指數獎勵倍增決策戰！',
    slides: [
      {
        title: '分數與小數混合計算四大鐵則',
        subtitle: '先觀察分母與湊整，別急著通分或硬乘！',
        bullets: [
          '分數加減：宜用「帶分數」分開計算（切記不要硬換成假分數），先把同分母湊成整數！',
          '分數乘除：務必換成「假分數」計算（除法要乘以倒數），並且能約分先約分。',
          '算式同時有分數和小數時，先看分數會不會變無限小數——宜把小數換成分數再算最保險！',
        ],
        blanks: [
          { prompt: '分數加減用（　）計算；分數乘除換成（　）計算', answer: '帶分數；假分數' },
          { prompt: '同時有分數和小數時，宜將（　）換成（　）再算', answer: '小數；分數' },
        ],
      },
      {
        title: '分配律高階技巧與「連鎖對消」魔法',
        subtitle: '分子分母互相消光光，100 個括號一秒變 1 個數！',
        bullets: [
          '拆帶分數巧算：如 199又18/19 × 38，把 199又18/19 看成「200 − 1/19」，再乘 38 ＝ 7600 − 2 ＝ 7598！',
          '連鎖約分對消：把每個括號通分寫成假分數，例如 (1+1/2)×(1+1/3)×…×(1+1/10) ＝ 3/2 × 4/3 × 5/4 × … × 11/10。',
          '上下對角線的 3, 4, 5, …, 10 全部消光，只剩頭的分母 2 與尾的分子 11 → 11/2！',
        ],
        blanks: [
          { prompt: '(1 + 1/2)×(1 + 1/3)×…×(1 + 1/10) 約分後剩下（　）', answer: '11/2（或 5.5）' },
        ],
      },
      {
        title: '指數乘方世界：底數 a 與指數 n',
        subtitle: '連加用乘法表示，連乘用「指數 aⁿ」表示！',
        bullets: [
          '當同一個數 a 連乘 n 次時，記為 aⁿ，其中 a 是底數、n 是指數（注意：任何非 0 數的 0 次方 a⁰ ＝ 1）。',
          '背熟常見指數：2¹~2¹⁰ ＝ 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024；3⁴=81、3⁵=243、5³=125、5⁴=625。',
          '2ⁿ 個位數字每 4 次方循環一次「2, 4, 8, 6」；一對 2×5 就生出一個 10（末尾 1 個 0）！',
        ],
        blanks: [
          { prompt: '2¹⁰ ＝（　）；任何非 0 數的 0 次方等於（　）', answer: '1024；1' },
          { prompt: '2²¹ × 5²⁴ 末尾連續有（　）個 0', answer: '21 個 0' },
        ],
        hasInteractiveExplorer: true,
      },
    ],
    subLessons: [
      {
        id: 's7-1',
        code: '7-1',
        title: '基礎核心 · 分小數巧算與分配律（第 1–4 題）',
        summaryTitle: '實戰秘訣 · 湊整分母與負一拆項',
        summaryItems: [
          '同分母湊整：3又3/11 + 6又8/11 = 10！帶分數相加把同分母配對湊十最快。',
          '算 199又18/19 × 38 時，只差 1/19 就到 200，用 (200 − 1/19) × 38 秒算！',
        ],
        questionIds: ['s7-q1', 's7-q2', 's7-q3', 's7-q4'],
        questionIndices: [0, 1, 2, 3],
        fairyTip: '遇到 0.8 混在分數除法裡（第 3 題），馬上把 0.8 換成 4/5 再算！',
      },
      {
        id: 's7-2',
        code: '7-2',
        title: '進階應用 · 連鎖對消與指數次方（第 5–8 題）',
        summaryTitle: '實戰秘訣 · 指數個位循環與配對造 10',
        summaryItems: [
          '2 的次方個位數字「2, 4, 8, 6」每 4 個一循環，用指數 ÷ 4 看餘數（餘 1→2、餘 2→4、餘 3→8、整除→6）。',
          '數末尾幾個 0：找 2 和 5 最多能配成幾對 (2×5)=10，取「較小的那個次方數」！',
        ],
        questionIds: ['s7-q5', 's7-q6', 's7-q7', 's7-q8'],
        questionIndices: [4, 5, 6, 7],
        fairyTip: '2²¹ × 5²⁴ 中只有 21 個 2 可以跟 5 配對，剩下的 5³=125 不會生出 0 喔！',
      },
    ],
    keyPoints: [
      {
        title: '分數混合四大捷徑',
        items: [
          '同分母先合併；小數化分數；乘除全換假分數先約分。',
          '連鎖括號全寫開，對角線分子分母一齊對消！',
        ],
      },
      {
        title: '指數爆炸威力',
        items: [
          '2⁷ ＝ 128，但 1+2+4+8+16+32+64 ＝ 127 元，仍略輸每天 20 元的 140 元！',
          '只要多到第 8 天，倍增方案當天就給 128 元、累計 255 元反超！',
        ],
      },
    ],
    coolFactTitle: '數學酷知識 · 藍莓的 7 天獎勵金計畫（p.3 EX3）',
    coolFactBody:
      '帥哥 Blue 給藍莓兩個 7 天獎勵方案：甲方案第 1 天 1 元、每天翻倍（7 天共 1+2+4+8+16+32+64 ＝ 127 元）；乙方案每天固定 20 元（7 天共 140 元）。在 7 天內乙方案竟多了 13 元，但若延長到第 8 天，甲方案總額立刻飆到 255 元大勝！',
    fairyHints: [
      '「指數獎勵倍增戰」會帶你一天一天模擬甲、乙兩方案的累計金錢變化，親眼見證第幾天發生黃金交叉！',
      '算 2⁷⁸ 個位數字：78 ÷ 4 ＝ 19 餘 2，對應循環 (2, 4, 8, 6) 的第 2 個數字就是 4！',
    ],
    quizzes: [
      {
        id: 's7-q1',
        q: '計算分數帶數連加：「3又3/11 ＋ 1又5/17 ＋ 6又8/11 ＋ 8又12/17」等於多少？',
        options: ['18', '19', '20', '21'],
        ans: 2,
        exp: '同分母配對合併：(3又3/11 ＋ 6又8/11) ＋ (1又5/17 ＋ 8又12/17) ＝ 10 ＋ 10 ＝ 20！',
      },
      {
        id: 's7-q2',
        q: '利用湊整技巧計算：「199 × 125 × 32 × 25」的結果是多少？',
        options: ['1,990,000', '19,900,000', '199,000,000', '3,980,000'],
        ans: 1,
        exp: '把 32 拆成 8 × 4：199 × (125 × 8) × (4 × 25) ＝ 199 × 1000 × 100 ＝ 19,900,000！',
      },
      {
        id: 's7-q3',
        q: '計算分數與小數四則混合：「1又5/6 ÷ (2/5 ＋ 3/5 × 0.8)」等於多少？',
        options: ['1又11/12', '2', '2又1/12', '2又1/6'],
        ans: 2,
        exp: '先把 0.8 換成 4/5：括號內 ＝ 2/5 ＋ 3/5 × 4/5 ＝ 10/25 ＋ 12/25 ＝ 22/25。原式 ＝ 11/6 ÷ 22/25 ＝ 11/6 × 25/22 ＝ 25/12 ＝ 2又1/12！',
      },
      {
        id: 's7-q4',
        q: '活用分配律計算：「199又18/19 × 38」的正確答案是多少？',
        options: ['7,560', '7,596', '7,598', '7,602'],
        ans: 2,
        exp: '把 199又18/19 寫成 (200 － 1/19)：(200 － 1/19) × 38 ＝ 200 × 38 － (1/19) × 38 ＝ 7600 － 2 ＝ 7,598！',
      },
      {
        id: 's7-q5',
        q: '利用連鎖約分計算：「(1 ＋ 1/2) × (1 ＋ 1/3) × (1 ＋ 1/4) × … × (1 ＋ 1/10)」等於多少？',
        options: ['5', '5又1/2', '6', '11'],
        ans: 1,
        exp: '各括號通分寫成：3/2 × 4/3 × 5/4 × … × 11/10，分子分母連鎖相消後只剩 11/2 ＝ 5又1/2（5.5）。',
      },
      {
        id: 's7-q6',
        q: '利用連鎖約分計算：「(1 － 1/3) × (1 － 1/4) × (1 － 1/5) × … × (1 － 1/100)」等於多少？',
        options: ['1/100', '1/50', '3/100', '1/25'],
        ans: 1,
        exp: '寫成假分數連乘：2/3 × 3/4 × 4/5 × … × 99/100，中間 3～99 全部對消，只剩 2/100 ＝ 1/50！',
      },
      {
        id: 's7-q7',
        q: '已知 2 的次方個位數字呈現「2, 4, 8, 6」循環，請問 2⁷⁸ 乘開後的「個位數字」是多少？',
        options: ['2', '4', '6', '8'],
        ans: 1,
        exp: '個位循環週期為 4。將指數 78 ÷ 4 ＝ 19 餘 2，餘數為 2 對應循環的第 2 個數字，因此個位數字是 4。',
      },
      {
        id: 's7-q8',
        q: '請問乘積「2²¹ × 5²⁴」乘開之後，整數的末尾總共連續有幾個 0？',
        options: ['3 個 0', '21 個 0', '24 個 0', '45 個 0'],
        ans: 1,
        exp: '每一對 2 × 5 ＝ 10 會在末尾產生一個 0。2²¹ × 5²⁴ ＝ (2 × 5)²¹ × 5³ ＝ 10²¹ × 125，因此末尾連續有 21 個 0！',
      },
    ],
  },

  /* ========================================================================
   * 第8星域：三視圖 — 全息立體幻境
   * ====================================================================== */
  {
    id: 's8',
    code: '第8星域',
    orderLabel: '第8星域',
    domainLabel: '空間幾何',
    planetName: '全息立體幻境',
    topicName: '三視圖',
    title: '全息立體幻境 · 三視圖',
    shortTitle: '三視圖',
    creativeName: '神秘三視圖與火柴陣',
    planetFlavor: '靛紫立體投影星',
    desc: '精熟平行投影前/上/右/左視圖與鏡像原則，精通積木移除不變判斷、三視圖反推最多/最少方塊及表面積體積計算！',
    slides: [
      {
        title: '三視圖是物體在三個方向光線下的投影',
        subtitle: '前視圖、上視圖、右視圖各自鎖定哪兩個維度？',
        bullets: [
          '前視圖（正面投影）：看「左右寬度 × 最高高度」，只保留每一欄的最強高度，分不出前後遠近。',
          '上視圖（俯視底座地圖）：看「左右寬度 × 前後深度」，告訴你「哪幾格地板有放積木」。',
          '右視圖（側面投影）：看「前後深度 × 最高高度」，每一列的高度取該排的最大值。',
        ],
        blanks: [
          { prompt: '從某一角度觀察立體所看到的光線投影稱為（　）', answer: '視圖' },
        ],
      },
      {
        title: '左視圖與右視圖鏡像原理 ＆ 遮擋移除術',
        subtitle: '站在左邊跟站在右邊看，剛好左右相反！',
        bullets: [
          '左視圖和右視圖從完全相反方向觀看，因此必呈「左右鏡像翻轉」（左高右低 ↔ 左低右高）。',
          '移除積木看視圖變不變：只要被移走的那塊「後面或同一排」還留有等高或更高的積木擋著，那個方向的視圖就完全不變！',
          '拿走 2×2×2 大正方體頂角的一塊小正方體：雖然少了 3 個外露面，卻同時露出 3 個內側面，總表面積不變！',
        ],
        blanks: [
          { prompt: '左視圖與右視圖兩者必互為（　）關係', answer: '左右鏡像翻轉' },
        ],
        hasInteractiveExplorer: true,
      },
      {
        title: '三視圖反推「最少與最多積木」及表面積',
        subtitle: '寫出俯視高度表，最值與表面積全都有固定公式！',
        bullets: [
          '求「最少塊」：先在上視圖有畫格子的位置各放 1 塊打底，再挑最省格子的交點往上補到前/右視圖的高度。',
          '求「最多塊」：每個有積木的格子，都擺滿「前視上限」與「右視上限」兩者較小值，能塞多高就塞多高！',
          '算表面積技巧（無凹槽階梯型）：總表面積 ＝ (上視 ＋ 前視 ＋ 右視 面數) × 2 × 單格正方形面積！',
        ],
        blanks: [
          { prompt: '每個正方體邊長 2 cm 時，單一立方體體積 ＝（　）', answer: '8 立方公分' },
        ],
      },
    ],
    subLessons: [
      {
        id: 's8-1',
        code: '8-1',
        title: '基礎核心 · 模型點數與視圖鏡像（第 1–4 題）',
        summaryTitle: '實戰秘訣 · 俯視格子高度加法與遮擋判斷',
        summaryItems: [
          '看到立體積木先分排數清各柱高度，再加起來；被遮住看不到的底層也要算進去喔！',
          '移除某塊前視圖是否改變？只要順著視線往後看有更矮以外的同高或更高積木支撐，前視圖就不變！',
        ],
        questionIds: ['s8-q1', 's8-q2', 's8-q3', 's8-q4'],
        questionIndices: [0, 1, 2, 3],
        fairyTip: '第 3 題移除 D 時，因為 D 正後方還有一塊 2 層的 C 擋著，所以前視圖右側高度依然是 2 層不變！',
      },
      {
        id: 's8-2',
        code: '8-2',
        title: '進階應用 · 最少最多積木與表面積（第 5–8 題）',
        summaryTitle: '實戰秘訣 · 上視圖打底法 vs 六向投影表面積',
        summaryItems: [
          '已知上視圖 5 格且前視圖 [2, 3, 1]：最少 = 底層 5 塊 + 只在左中各補高 1、2 塊 = 8 塊；最多 = 每欄都疊滿最高限制！',
          '表面積記得先算「1 個面」的面積（例如邊長 2cm → 每面 4 cm²），別跟體積 (8 cm³) 搞混！',
        ],
        questionIds: ['s8-q5', 's8-q6', 's8-q7', 's8-q8'],
        questionIndices: [4, 5, 6, 7],
        fairyTip: '第 8 題記得算 6 個方向（上＋下、前＋後、左＋右）總面數再乘以單面面積 4 cm²！',
      },
    ],
    keyPoints: [
      {
        title: '三視圖三大法則',
        items: [
          '前視看寬×高，上視看寬×深，右視看深×高。',
          '左視圖與右視圖一定是「左右鏡像翻轉」。',
        ],
      },
      {
        title: '體積與表面積不變律',
        items: [
          '體積 ＝ 總塊數 × 單塊體積；表面積 ＝ 六方向總露面數 × 單面面積。',
          '由角頂拿走 1 塊小正方體時，總表面積完全不變！',
        ],
      },
    ],
    coolFactTitle: '腦力補給 · 16 根火柴棒移位變 3 個正方形（p.5）',
    coolFactBody:
      '講義最後的空間謎題：用 16 根火柴排成一大一小兩個同心正方形（外框每邊 3 根共 12 根，內框每邊 1 根共 4 根）。只移動其中 4 根火柴棒且不可落單，就能重新拼出 3 個大小相同且相連的正方形！快去「創意對戰」親手移動試試看！',
    fairyHints: [
      '「神秘三視圖與火柴陣」包含立體積木拼圖（9 塊/10 塊挑戰）＋ 16 根火柴棒移 4 根變 3 正方形雙模式！',
      '算表面積時，只要是階梯狀無懸空凹洞的積木塔，總露面數就是 (上視格數＋前視格數＋右視格數) × 2！',
    ],
    quizzes: [
      {
        id: 's8-q1',
        q: '如圖為由若干小正方體堆疊而成的立體圖形（前排左中右各 1 層，後排左邊 3 層、中間 2 層），請問總共使用了幾個正方體？',
        diagramId: 'views-stacked-cubes',
        options: ['6 個', '7 個', '8 個', '9 個'],
        ans: 2,
        exp: '點算各位置高度：後排左 3 個、後排中 2 個、前排左中右各 1 個（共 3 個），合計 3 ＋ 2 ＋ 3 ＝ 8 個。',
      },
      {
        id: 's8-q2',
        q: '已知某立體圖形的「左視圖」是一個左下 L 型（左行高 3 格、右行高 1 格），若改從正右方看過去，「右視圖」應為何者？',
        options: [
          '完全相同（左行 3 格、右行 1 格）',
          '左右鏡像相反（左行 1 格、右行 3 格）',
          '上下顛倒',
          '變成 3×3 實心正方形',
        ],
        ans: 1,
        exp: '左視圖與右視圖是從完全相反的左右兩側觀察，因此視圖一定會呈「左右鏡像翻轉」，變成左行 1 格、右行 3 格。',
      },
      {
        id: 's8-q3',
        q: '如圖為堆疊的立體模型，箭頭指向代表「前面」。若移除圖中 A、B、C、D 其中一塊積木後，立體模型的「前視圖」仍與原先完全相同，被移除的是哪一塊？',
        diagramId: 'views-remove-abcd',
        options: ['積木 A', '積木 B', '積木 C', '積木 D'],
        ans: 3,
        exp: '移除前排右下角 1 層的積木 D 後，它正後方還有一座 2 層高的積木 C 撐住該欄高度，因此從前面看過去的前視圖完全不變！',
      },
      {
        id: 's8-q4',
        q: '若 2×2 的俯視底座上，四個格子的疊放層數分別寫為「左上 3、右上 1、左下 2、右下 2」，這個積木塔共用了幾個小正方體？',
        options: ['7 個', '8 個', '9 個', '12 個'],
        ans: 1,
        exp: '把俯視高度地圖上的四個數字直接加起來：3 ＋ 1 ＋ 2 ＋ 2 ＝ 8 個小正方體！',
      },
      {
        id: 's8-q5',
        q: '一個立體積木的「上視圖」有 5 個方格，「前視圖」三欄高度分別為 2、3、1，若要符合這兩張視圖，至少需要幾個積木？',
        options: ['6 個', '7 個', '8 個', '9 個'],
        ans: 2,
        exp: '上視圖有 5 格代表這 5 格至少各有 1 塊（底層 5 塊）；再各挑左欄加高 1 塊、中欄加高 2 塊達成 2 與 3，最少需 5 ＋ 1 ＋ 2 ＝ 8 個。',
      },
      {
        id: 's8-q6',
        q: '接續上題，若在相同的 5 格上視圖（左欄 2 格、中欄 2 格、右欄 1 格）與前視圖（三欄高 2, 3, 1）條件下，最多能放幾個積木？',
        options: ['8 個', '10 個', '11 個', '12 個'],
        ans: 2,
        exp: '左欄 2 格都放滿 2 層（2×2＝4 個）、中欄 2 格都放滿 3 層（2×3＝6 個）、右欄 1 格放 1 層（1 個），合計最多可放 4 ＋ 6 ＋ 1 ＝ 11 個！',
      },
      {
        id: 's8-q7',
        q: '將一個 2×2×2 的大正方體（由 8 塊邊長 1cm 小積木組成），從「右上角頂角」拿走 1 塊小積木後，它的「總表面積」會怎麼變化？',
        options: ['減少 3 平方公分', '減少 1 平方公分', '不變（仍是 24 平方公分）', '增加 2 平方公分'],
        ans: 2,
        exp: '從頂角拿走 1 塊，雖然少了 3 個外露面，但同時露出了 3 個凹進去的新內側面，一減一加總表面積完全不變（仍為 24 平方公分）！',
      },
      {
        id: 's8-q8',
        q: 'Blue 拿 10 個邊長為 2 公分的正方體積木堆疊成如圖模型，請問它的「體積」跟「表面積」各是多少？',
        diagramId: 'views-10cubes-sa',
        options: [
          '體積 40 立方公分、表面積 120 平方公分',
          '體積 80 立方公分、表面積 128 平方公分',
          '體積 80 立方公分、表面積 144 平方公分',
          '體積 60 立方公分、表面積 128 平方公分',
        ],
        ans: 1,
        exp: '每塊體積 ＝ 2×2×2 ＝ 8 立方公分，10 塊總體積 ＝ 80 立方公分。表面積看六向投影（無凹洞）：上視 5 ＋ 前視 (3+2+1=6) ＋ 右視 (2+3=5) ＝ 16 面，× 2 ＝ 32 個露面；每個面面積 2×2＝4 cm²，故總表面積 ＝ 32 × 4 ＝ 128 平方公分！',
      },
    ],
  },
];
