/* ===== ActiveCRM — נתוני הדגמה =====
   כל התאריכים מחושבים יחסית להיום, כך שההדגמה תמיד נראית "טרייה".
*/

const OWNERS = [
  { name: 'דנה אברמוב',    color: '#6366f1', role: 'מנהלת מכירות' },
  { name: 'יואב שרעבי',    color: '#0ea5e9', role: 'מנהל לקוחות' },
  { name: 'מיכל בן־דוד',   color: '#10b981', role: 'נציגת מכירות' },
  { name: 'אלכס פוליאקוב', color: '#f59e0b', role: 'מנהל פיתוח עסקי' }
];

const STAGES = [
  { id: 'new',       name: 'ליד חדש',      color: '#94a3b8', prob: 10 },
  { id: 'contact',   name: 'יצירת קשר',    color: '#0ea5e9', prob: 30 },
  { id: 'quote',     name: 'הצעת מחיר',    color: '#8b5cf6', prob: 55 },
  { id: 'negotiate', name: 'משא ומתן',     color: '#f59e0b', prob: 75 },
  { id: 'won',       name: 'נסגר בהצלחה',  color: '#10b981', prob: 100 },
  { id: 'lost',      name: 'נסגר בהפסד',   color: '#ef4444', prob: 0 }
];

const ACTIVITY_TYPES = ['שיחה', 'פגישה', 'מייל', 'עסקה', 'ליד', 'הערה'];

const SOURCES = ['אתר אינטרנט', 'המלצה מלקוח', 'גוגל', 'פייסבוק ואינסטגרם', 'לינקדאין', 'תערוכה', 'שיחה יזומה'];

/* ---- עזרי תאריכים ---- */
/* מחזיר YYYY-MM-DD לפי השעון המקומי.
   לא משתמשים ב-toISOString: הוא ממיר ל-UTC ובאזור זמן ישראל מחזיר את היום הקודם. */
function dayOffset(n) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + n);
  const p = x => String(x).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

function buildDemoData() {
  const customers = [
    { id: 'c1',  name: 'אורי כהן',        company: 'טכנולוגיות אורן בע״מ',      email: 'uri@oren-tech.co.il',    phone: '052-4471180', city: 'תל אביב',    industry: 'הייטק ותוכנה',      status: 'לקוח פעיל',      source: 'המלצה מלקוח',      owner: 'דנה אברמוב',    value: 184500, created: dayOffset(-410), lastContact: dayOffset(-2),  tags: ['VIP', 'חוזה שנתי'] },
    { id: 'c2',  name: 'נועה לוי',        company: 'סטודיו נועה — עיצוב פנים',  email: 'noa@studio-noa.co.il',   phone: '054-8823017', city: 'הרצליה',     industry: 'עיצוב ואדריכלות',   status: 'לקוח פעיל',      source: 'אינסטגרם',         owner: 'מיכל בן־דוד',   value: 62300,  created: dayOffset(-265), lastContact: dayOffset(-6),  tags: ['מנוי חודשי'] },
    { id: 'c3',  name: 'איתי מזרחי',      company: 'מזרחי הובלות ולוגיסטיקה',   email: 'itay@mizrahi-log.co.il', phone: '050-3390442', city: 'אשדוד',      industry: 'תחבורה ולוגיסטיקה', status: 'בטיפול',         source: 'גוגל',             owner: 'יואב שרעבי',    value: 97800,  created: dayOffset(-198), lastContact: dayOffset(-1),  tags: ['הרחבת חוזה'] },
    { id: 'c4',  name: 'שירה פרידמן',     company: 'קליניקת שיר — רפואה משלימה',email: 'shira@shir-clinic.co.il',phone: '053-7712064', city: 'רעננה',      industry: 'בריאות ורווחה',     status: 'לקוח פעיל',      source: 'אתר אינטרנט',      owner: 'מיכל בן־דוד',   value: 41200,  created: dayOffset(-152), lastContact: dayOffset(-11), tags: [] },
    { id: 'c5',  name: 'דוד אזולאי',      company: 'אזולאי בנייה ושיפוצים',     email: 'david@azoulay-build.co.il',phone:'052-6640913', city: 'באר שבע',    industry: 'בנייה ותשתיות',     status: 'לקוח פוטנציאלי', source: 'תערוכה',           owner: 'אלכס פוליאקוב', value: 0,      created: dayOffset(-38),  lastContact: dayOffset(-4),  tags: ['פוטנציאל גבוה'] },
    { id: 'c6',  name: 'יעל ברקוביץ׳',    company: 'גרין פארם — מזון אורגני',   email: 'yael@greenfarm.co.il',   phone: '054-2218870', city: 'כפר סבא',    industry: 'מזון וקמעונאות',    status: 'לקוח פעיל',      source: 'פייסבוק ואינסטגרם',owner: 'דנה אברמוב',    value: 128900, created: dayOffset(-320), lastContact: dayOffset(-3),  tags: ['VIP'] },
    { id: 'c7',  name: 'עומר שפירא',      company: 'שפירא ייעוץ פיננסי',        email: 'omer@shapira-fin.co.il', phone: '050-9982331', city: 'רמת גן',     industry: 'פיננסים וביטוח',    status: 'בטיפול',         source: 'לינקדאין',         owner: 'יואב שרעבי',    value: 73400,  created: dayOffset(-121), lastContact: dayOffset(-8),  tags: [] },
    { id: 'c8',  name: 'תמר נחום',        company: 'בית הספר תמר לאמנויות',     email: 'tamar@tamar-arts.org.il',phone: '053-4405512', city: 'ירושלים',    industry: 'חינוך והדרכה',      status: 'לקוח פעיל',      source: 'המלצה מלקוח',      owner: 'מיכל בן־דוד',   value: 35600,  created: dayOffset(-240), lastContact: dayOffset(-19), tags: ['מגזר ציבורי'] },
    { id: 'c9',  name: 'רון גולדשטיין',   company: 'רונטק מערכות מידע',         email: 'ron@rontech.co.il',      phone: '052-7738104', city: 'פתח תקווה',  industry: 'הייטק ותוכנה',      status: 'לקוח פעיל',      source: 'שיחה יזומה',       owner: 'אלכס פוליאקוב', value: 215700, created: dayOffset(-505), lastContact: dayOffset(-5),  tags: ['VIP', 'אנטרפרייז'] },
    { id: 'c10', name: 'הילה אדרי',       company: 'סלון הילה — יופי וטיפוח',   email: 'hila@hila-beauty.co.il', phone: '054-6612298', city: 'נתניה',      industry: 'שירותים אישיים',    status: 'לא פעיל',        source: 'גוגל',             owner: 'מיכל בן־דוד',   value: 18400,  created: dayOffset(-430), lastContact: dayOffset(-97), tags: ['לחידוש קשר'] },
    { id: 'c11', name: 'משה דיין',        company: 'דיין רכב וליסינג',          email: 'moshe@dayan-cars.co.il', phone: '050-4471023', city: 'חיפה',       industry: 'רכב ותחבורה',       status: 'לקוח פוטנציאלי', source: 'אתר אינטרנט',      owner: 'יואב שרעבי',    value: 0,      created: dayOffset(-22),  lastContact: dayOffset(-2),  tags: [] },
    { id: 'c12', name: 'ליאת סבן',        company: 'ליאת סבן נדל״ן',            email: 'liat@saban-realty.co.il',phone: '053-8890177', city: 'ראשון לציון',industry: 'נדל״ן',             status: 'לקוח פעיל',      source: 'המלצה מלקוח',      owner: 'דנה אברמוב',    value: 88750,  created: dayOffset(-176), lastContact: dayOffset(-7),  tags: ['מנוי חודשי'] },
    { id: 'c13', name: 'אבי חדד',         company: 'חדד מתכות ותעשייה',         email: 'avi@hadad-metal.co.il',  phone: '052-3317745', city: 'אשקלון',     industry: 'תעשייה וייצור',     status: 'בטיפול',         source: 'תערוכה',           owner: 'אלכס פוליאקוב', value: 152000, created: dayOffset(-289), lastContact: dayOffset(-13), tags: ['ייצוא'] },
    { id: 'c14', name: 'מאיה רוזן',       company: 'מאיה רוזן — צילום אירועים', email: 'maya@mayarozen.co.il',   phone: '054-9903318', city: 'מודיעין',    industry: 'מדיה ופרסום',       status: 'לקוח פוטנציאלי', source: 'פייסבוק ואינסטגרם',owner: 'מיכל בן־דוד',   value: 0,      created: dayOffset(-14),  lastContact: dayOffset(-1),  tags: [] },
    { id: 'c15', name: 'יוסי בן שמעון',   company: 'בן שמעון מסעדות',           email: 'yossi@bsrest.co.il',     phone: '050-2284490', city: 'תל אביב',    industry: 'מסעדנות ואירוח',    status: 'לקוח פעיל',      source: 'המלצה מלקוח',      owner: 'דנה אברמוב',    value: 104300, created: dayOffset(-358), lastContact: dayOffset(-9),  tags: ['רשת סניפים'] },
    { id: 'c16', name: 'גלית פרץ',        company: 'קליק דיגיטל — שיווק',       email: 'galit@clickdigital.co.il',phone:'053-6674401', city: 'גבעתיים',    industry: 'שיווק ופרסום',      status: 'לא פעיל',        source: 'לינקדאין',         owner: 'יואב שרעבי',    value: 29500,  created: dayOffset(-395), lastContact: dayOffset(-124),tags: ['לחידוש קשר'] }
  ];

  const deals = [
    { id: 'd1',  title: 'מערכת ניהול מלאי — שלב ב׳',   customerId: 'c1',  value: 78000,  stage: 'negotiate', owner: 'דנה אברמוב',    close: dayOffset(9),   created: dayOffset(-42) },
    { id: 'd2',  title: 'חבילת שיווק דיגיטלי שנתית',    customerId: 'c2',  value: 34000,  stage: 'quote',     owner: 'מיכל בן־דוד',   close: dayOffset(16),  created: dayOffset(-21) },
    { id: 'd3',  title: 'אינטגרציה למערכת שילוח',       customerId: 'c3',  value: 56500,  stage: 'contact',   owner: 'יואב שרעבי',    close: dayOffset(28),  created: dayOffset(-12) },
    { id: 'd4',  title: 'מערכת זימון תורים אונליין',    customerId: 'c4',  value: 21500,  stage: 'won',       owner: 'מיכל בן־דוד',   close: dayOffset(-6),  created: dayOffset(-51) },
    { id: 'd5',  title: 'אתר תדמית + נגישות',           customerId: 'c5',  value: 29800,  stage: 'new',       owner: 'אלכס פוליאקוב', close: dayOffset(34),  created: dayOffset(-5) },
    { id: 'd6',  title: 'הרחבת רישיונות ל־40 משתמשים',  customerId: 'c6',  value: 62000,  stage: 'negotiate', owner: 'דנה אברמוב',    close: dayOffset(6),   created: dayOffset(-33) },
    { id: 'd7',  title: 'פורטל לקוחות מאובטח',          customerId: 'c7',  value: 45000,  stage: 'quote',     owner: 'יואב שרעבי',    close: dayOffset(21),  created: dayOffset(-18) },
    { id: 'd8',  title: 'מערכת רישום תלמידים',          customerId: 'c8',  value: 27400,  stage: 'contact',   owner: 'מיכל בן־דוד',   close: dayOffset(40),  created: dayOffset(-9) },
    { id: 'd9',  title: 'חידוש חוזה תמיכה — 24 חודשים', customerId: 'c9',  value: 118000, stage: 'negotiate', owner: 'אלכס פוליאקוב', close: dayOffset(12),  created: dayOffset(-60) },
    { id: 'd10', title: 'קמפיין השקה לסניף חדש',        customerId: 'c15', value: 38500,  stage: 'quote',     owner: 'דנה אברמוב',    close: dayOffset(18),  created: dayOffset(-24) },
    { id: 'd11', title: 'מערכת CRM לצוות המכירות',      customerId: 'c12', value: 52000,  stage: 'won',       owner: 'דנה אברמוב',    close: dayOffset(-14), created: dayOffset(-72) },
    { id: 'd12', title: 'אוטומציה לקו הייצור',          customerId: 'c13', value: 96000,  stage: 'contact',   owner: 'אלכס פוליאקוב', close: dayOffset(45),  created: dayOffset(-15) },
    { id: 'd13', title: 'צילום ועריכת קטלוג מוצרים',    customerId: 'c14', value: 16800,  stage: 'new',       owner: 'מיכל בן־דוד',   close: dayOffset(30),  created: dayOffset(-3) },
    { id: 'd14', title: 'מערכת ניהול צי רכב',           customerId: 'c11', value: 41000,  stage: 'new',       owner: 'יואב שרעבי',    close: dayOffset(38),  created: dayOffset(-2) },
    { id: 'd15', title: 'שדרוג תשתית שרתים',            customerId: 'c9',  value: 33500,  stage: 'won',       owner: 'אלכס פוליאקוב', close: dayOffset(-25), created: dayOffset(-88) },
    { id: 'd16', title: 'מערכת דיוור ואוטומציה שיווקית', customerId: 'c16', value: 24000,  stage: 'lost',      owner: 'יואב שרעבי',    close: dayOffset(-31), created: dayOffset(-95), lostReason: 'הלקוח בחר בפתרון פנימי' }
  ];

  const tasks = [
    { id: 't1',  title: 'שיחת סיכום עם אורי כהן לפני חתימה',      customerId: 'c1',  type: 'שיחה',  due: dayOffset(0),  priority: 'גבוהה', done: false, owner: 'דנה אברמוב' },
    { id: 't2',  title: 'לשלוח הצעת מחיר מעודכנת לסטודיו נועה',   customerId: 'c2',  type: 'מייל',  due: dayOffset(0),  priority: 'גבוהה', done: false, owner: 'מיכל בן־דוד' },
    { id: 't3',  title: 'פגישת אפיון במשרדי מזרחי הובלות',        customerId: 'c3',  type: 'פגישה', due: dayOffset(1),  priority: 'רגילה', done: false, owner: 'יואב שרעבי' },
    { id: 't4',  title: 'מעקב אחר תשלום חשבונית 2041',            customerId: 'c4',  type: 'משימה', due: dayOffset(-3), priority: 'גבוהה', done: false, owner: 'מיכל בן־דוד' },
    { id: 't5',  title: 'שיחת היכרות עם דוד אזולאי',              customerId: 'c5',  type: 'שיחה',  due: dayOffset(2),  priority: 'רגילה', done: false, owner: 'אלכס פוליאקוב' },
    { id: 't6',  title: 'הכנת מצגת לחידוש החוזה של רונטק',        customerId: 'c9',  type: 'משימה', due: dayOffset(3),  priority: 'גבוהה', done: false, owner: 'אלכס פוליאקוב' },
    { id: 't7',  title: 'לתאם הדגמה לצוות של גרין פארם',          customerId: 'c6',  type: 'פגישה', due: dayOffset(4),  priority: 'רגילה', done: false, owner: 'דנה אברמוב' },
    { id: 't8',  title: 'לחדש קשר עם סלון הילה — לא פעיל 3 חודשים',customerId: 'c10', type: 'שיחה',  due: dayOffset(-1), priority: 'נמוכה', done: false, owner: 'מיכל בן־דוד' },
    { id: 't9',  title: 'לשלוח חומרים טכניים לשפירא ייעוץ',       customerId: 'c7',  type: 'מייל',  due: dayOffset(5),  priority: 'רגילה', done: false, owner: 'יואב שרעבי' },
    { id: 't10', title: 'סיכום פגישה עם בן שמעון מסעדות',         customerId: 'c15', type: 'משימה', due: dayOffset(-8), priority: 'רגילה', done: true,  owner: 'דנה אברמוב' },
    { id: 't11', title: 'שליחת חוזה חתום ללקוח ליאת סבן',         customerId: 'c12', type: 'מייל',  due: dayOffset(-12),priority: 'גבוהה', done: true,  owner: 'דנה אברמוב' },
    { id: 't12', title: 'בדיקת דרישות אוטומציה — חדד מתכות',      customerId: 'c13', type: 'משימה', due: dayOffset(7),  priority: 'רגילה', done: false, owner: 'אלכס פוליאקוב' },
    { id: 't13', title: 'החזרת שיחה למאיה רוזן',                  customerId: 'c14', type: 'שיחה',  due: dayOffset(1),  priority: 'נמוכה', done: false, owner: 'מיכל בן־דוד' }
  ];

  const activities = [
    { id: 'a1',  customerId: 'c1',  type: 'שיחה',   text: 'שיחה עם אורי כהן — אישר את היקף שלב ב׳, ממתין לאישור סמנכ״ל הכספים.', by: 'דנה אברמוב',    date: dayOffset(-2) },
    { id: 'a2',  customerId: 'c3',  type: 'פגישה',  text: 'פגישת היכרות באשדוד. הוצגה אינטגרציה למערכת השילוח הקיימת.',        by: 'יואב שרעבי',    date: dayOffset(-1) },
    { id: 'a3',  customerId: 'c14', type: 'ליד',    text: 'ליד חדש נכנס מטופס יצירת קשר באינסטגרם.',                            by: 'מערכת',         date: dayOffset(-1) },
    { id: 'a4',  customerId: 'c6',  type: 'מייל',   text: 'נשלחה הצעת מחיר להרחבת רישיונות ל־40 משתמשים.',                      by: 'דנה אברמוב',    date: dayOffset(-3) },
    { id: 'a5',  customerId: 'c11', type: 'ליד',    text: 'פנייה מהאתר — מתעניין במערכת ניהול צי רכב.',                          by: 'מערכת',         date: dayOffset(-2) },
    { id: 'a6',  customerId: 'c5',  type: 'שיחה',   text: 'שיחה ראשונית לאחר התערוכה בתל אביב. נקבעה שיחת המשך.',               by: 'אלכס פוליאקוב', date: dayOffset(-4) },
    { id: 'a7',  customerId: 'c9',  type: 'פגישה',  text: 'פגישת רבעון עם רונטק — שביעות רצון גבוהה, נדונה הרחבת התמיכה.',      by: 'אלכס פוליאקוב', date: dayOffset(-5) },
    { id: 'a8',  customerId: 'c2',  type: 'מייל',   text: 'סטודיו נועה ביקשו התאמות בהצעה — עדכון מחיר לחבילה השנתית.',         by: 'מיכל בן־דוד',   date: dayOffset(-6) },
    { id: 'a9',  customerId: 'c12', type: 'עסקה',   text: 'העסקה ״מערכת CRM לצוות המכירות״ נסגרה בהצלחה — 52,000 ₪.',           by: 'דנה אברמוב',    date: dayOffset(-14) },
    { id: 'a10', customerId: 'c4',  type: 'עסקה',   text: 'העסקה ״מערכת זימון תורים אונליין״ נסגרה בהצלחה — 21,500 ₪.',         by: 'מיכל בן־דוד',   date: dayOffset(-6) },
    { id: 'a11', customerId: 'c7',  type: 'שיחה',   text: 'עומר שפירא ביקש פירוט על אבטחת מידע ועמידה בתקן.',                    by: 'יואב שרעבי',    date: dayOffset(-8) },
    { id: 'a12', customerId: 'c15', type: 'פגישה',  text: 'סיור בסניף החדש בתל אביב לקראת קמפיין ההשקה.',                        by: 'דנה אברמוב',    date: dayOffset(-9) },
    { id: 'a13', customerId: 'c13', type: 'מייל',   text: 'התקבל מסמך דרישות טכניות לאוטומציה של קו הייצור.',                    by: 'אלכס פוליאקוב', date: dayOffset(-13) },
    { id: 'a14', customerId: 'c8',  type: 'שיחה',   text: 'עדכון לגבי תקציב שנת הלימודים הבאה — חזרה בספטמבר.',                  by: 'מיכל בן־דוד',   date: dayOffset(-19) },
    { id: 'a15', customerId: 'c10', type: 'הערה',   text: 'הלקוח לא הגיב לשלוש פניות אחרונות. הועבר לרשימת חידוש קשר.',          by: 'מיכל בן־דוד',   date: dayOffset(-97) },
    { id: 'a16', customerId: 'c16', type: 'הערה',   text: 'סיום התקשרות — הלקוח עבר לפתרון פנימי.',                              by: 'יואב שרעבי',    date: dayOffset(-124) }
  ];

  /* הכנסות 12 חודשים אחרונים (בש״ח) */
  const revenue = [142000, 128500, 165300, 151800, 173200, 189400, 168700, 196500, 184300, 211600, 224800, 238400];

  const owners = OWNERS.map(o => Object.assign({}, o));

  return {
    customers, deals, tasks, activities, revenue, owners,
    settings: { biz: 'אקטיב דיגיט בע״מ', currency: '₪', contact: 'דנה אברמוב', email: 'sales@example.co.il' }
  };
}
