'use client';

import { useState } from 'react';
import {
  FileText, Calendar, Clock, Users,
  TrendingUp, AlertCircle, Check, Download, Send,
  Plus, ChevronLeft, ChevronRight, Zap, Bell,
  CreditCard, Wallet, ClipboardList, X, CheckCircle, Copy, Globe
} from 'lucide-react';

const salesData = {
  thisMonth: 4820000, lastMonth: 4320000, unpaid: 320000, expenses: 1250000,
};

const calendarData: Record<number, { sales: number; type: 'high' | 'mid' | 'low' | 'none' }> = {
  1:{sales:180000,type:'mid'},2:{sales:0,type:'none'},3:{sales:220000,type:'high'},
  4:{sales:150000,type:'mid'},5:{sales:90000,type:'low'},6:{sales:310000,type:'high'},
  7:{sales:280000,type:'high'},8:{sales:0,type:'none'},9:{sales:195000,type:'mid'},
  10:{sales:165000,type:'mid'},11:{sales:120000,type:'low'},12:{sales:340000,type:'high'},
  13:{sales:290000,type:'high'},14:{sales:250000,type:'high'},15:{sales:0,type:'none'},
  16:{sales:175000,type:'mid'},17:{sales:140000,type:'mid'},18:{sales:85000,type:'low'},
  19:{sales:320000,type:'high'},20:{sales:275000,type:'high'},21:{sales:230000,type:'high'},
  22:{sales:0,type:'none'},23:{sales:185000,type:'mid'},24:{sales:155000,type:'mid'},
  25:{sales:110000,type:'low'},26:{sales:295000,type:'high'},27:{sales:260000,type:'high'},
  28:{sales:0,type:'none'},29:{sales:145000,type:'mid'},30:{sales:200000,type:'mid'},
};

type Invoice = {
  id: string; client: string; bizNo: string; amount: number;
  date: string; status: string; due: string; email: string; item: string;
};

const initialInvoices: Invoice[] = [
  { id:'INV-2026-004', client:'하랑마케팅', bizNo:'123-45-67890', amount:550000, date:'2026-04-01', status:'발행완료', due:'2026-04-30', email:'harang@naver.com', item:'마케팅 대행' },
  { id:'INV-2026-003', client:'부천 꽃집', bizNo:'234-56-78901', amount:330000, date:'2026-03-01', status:'입금완료', due:'2026-03-31', email:'flower@naver.com', item:'SNS 운영' },
  { id:'INV-2026-002', client:'신중동 카페', bizNo:'345-67-89012', amount:220000, date:'2026-03-01', status:'미수금', due:'2026-03-31', email:'cafe@naver.com', item:'블로그 포스팅' },
  { id:'INV-2026-001', client:'소사구 식당', bizNo:'456-78-90123', amount:440000, date:'2026-02-01', status:'입금완료', due:'2026-02-28', email:'sosa@naver.com', item:'플레이스 관리' },
];

const employees = [
  { name:'김알바', role:'파트타임', checkIn:'09:02', checkOut:'18:05', status:'퇴근' },
  { name:'이직원', role:'정규직', checkIn:'08:58', checkOut:'-', status:'근무중' },
  { name:'박알바', role:'파트타임', checkIn:'-', checkOut:'-', status:'휴무' },
];

const govSupports = [
  { title:'소상공인 경영안정자금', deadline:'2026-04-30', amount:'최대 5,000만원', status:'신청가능', category:'자금' },
  { title:'부천시 청년창업 지원금', deadline:'2026-05-15', amount:'최대 2,000만원', status:'신청가능', category:'창업' },
  { title:'고용유지 지원금', deadline:'2026-04-20', amount:'월 최대 180만원', status:'마감임박', category:'고용' },
];

export default function AdminBizPage() {
  const [activeTab, setActiveTab] = useState<'calendar'|'invoice'|'employee'|'support'>('calendar');
  const [selectedDay, setSelectedDay] = useState<number|null>(null);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showExtGuide, setShowExtGuide] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [isIssuing, setIsIssuing] = useState(false);
  const [successInvoice, setSuccessInvoice] = useState<Invoice|null>(null);
  const [downloadingId, setDownloadingId] = useState<string|null>(null);
  const [form, setForm] = useState({ client:'', bizNo:'', item:'', amount:'', email:'' });
  const [extInstalled, setExtInstalled] = useState(false);

  const growthRate = (((salesData.thisMonth - salesData.lastMonth) / salesData.lastMonth) * 100).toFixed(1);

  // ✅ 발행 + 클립보드 복사 + 홈택스 이동
  const handleIssue = async () => {
    if (!form.client || !form.amount) {
      alert('거래처명과 공급가액은 필수입니다!');
      return;
    }
    setIsIssuing(true);

    const supplyAmt = parseInt(form.amount.replace(/,/g,'') || '0');
    const vat = Math.round(supplyAmt * 0.1);
    const total = supplyAmt + vat;

    // 클립보드 복사
    const clipText =
      `거래처명: ${form.client}\n` +
      `사업자번호: ${form.bizNo || '미입력'}\n` +
      `품목: ${form.item || '마케팅 대행 서비스'}\n` +
      `공급가액: ${supplyAmt.toLocaleString()}원\n` +
      `부가세: ${vat.toLocaleString()}원\n` +
      `합계: ${total.toLocaleString()}원\n` +
      `이메일: ${form.email || '미입력'}`;

    await navigator.clipboard.writeText(clipText);

    // localStorage에 데이터 저장 (크롬 확장이 읽어감)
    localStorage.setItem('localution_invoice', JSON.stringify({
      client: form.client,
      bizNo: form.bizNo.replace(/-/g, ''),
      item: form.item || '마케팅 대행 서비스',
      amount: String(supplyAmt),
      vat: String(vat),
      total: String(total),
      email: form.email,
      timestamp: Date.now(),
    }));

    await new Promise(r => setTimeout(r, 800));

    const newInvoice: Invoice = {
      id: `INV-2026-${String(invoices.length + 1).padStart(3,'0')}`,
      client: form.client,
      bizNo: form.bizNo || '미입력',
      amount: supplyAmt,
      date: new Date().toISOString().split('T')[0],
      status: '발행완료',
      due: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
      email: form.email,
      item: form.item || '마케팅 대행 서비스',
    };

    setInvoices(prev => [newInvoice, ...prev]);
    setSuccessInvoice(newInvoice);
    setIsIssuing(false);
    setShowInvoiceForm(false);
    setForm({ client:'', bizNo:'', item:'', amount:'', email:'' });

    // 홈택스 전자세금계산서 발급 페이지 직접 이동
    setTimeout(() => {
      window.open(
        'https://www.hometax.go.kr/websquare/websquare.html?w2xPath=/ui/ab/a/a/UTERPAAA001M.xml&menuCd=MDR030101000',
        '_blank'
      );
    }, 300);
  };

  // ✅ PDF 다운로드
  const handleDownloadPDF = async (inv: Invoice) => {
    setDownloadingId(inv.id);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      doc.setFillColor(15,15,19); doc.rect(0,0,210,297,'F');
      doc.setTextColor(255,255,255); doc.setFontSize(22); doc.setFont('helvetica','bold');
      doc.text('TAX INVOICE', 105, 30, {align:'center'});
      doc.setFontSize(11); doc.setTextColor(160,160,180); doc.setFont('helvetica','normal');
      doc.text('Electronic Tax Invoice', 105, 40, {align:'center'});
      doc.setDrawColor(124,58,237); doc.setLineWidth(0.8); doc.line(20,48,190,48);

      const supplyAmt = inv.amount;
      const vat = Math.round(supplyAmt * 0.1);
      const total = supplyAmt + vat;

      const rows = [
        ['문서번호', inv.id], ['발행일자', inv.date],
        ['공급받는자', inv.client], ['사업자번호', inv.bizNo],
        ['품목', inv.item], ['이메일', inv.email || '미입력'],
        ['납부기한', inv.due],
      ];
      let y = 65;
      rows.forEach(([l,v]) => {
        doc.setTextColor(130,130,160); doc.text(l, 25, y);
        doc.setTextColor(220,220,240); doc.setFont('helvetica','bold'); doc.text(String(v), 80, y);
        doc.setFont('helvetica','normal'); y += 12;
      });

      doc.setFillColor(30,10,60); doc.roundedRect(20,y+5,170,55,5,5,'F');
      doc.setDrawColor(124,58,237); doc.setLineWidth(0.5); doc.roundedRect(20,y+5,170,55,5,5,'S');
      doc.setFontSize(11); doc.setTextColor(160,130,220); doc.setFont('helvetica','normal');
      doc.text('공급가액', 35, y+22); doc.text('부가세 (10%)', 35, y+35);
      doc.setTextColor(220,200,255); doc.setFont('helvetica','bold');
      doc.text(`${supplyAmt.toLocaleString()} KRW`, 185, y+22, {align:'right'});
      doc.text(`${vat.toLocaleString()} KRW`, 185, y+35, {align:'right'});
      y += 65;
      doc.setFillColor(124,58,237); doc.roundedRect(20,y,170,22,3,3,'F');
      doc.setFontSize(13); doc.setTextColor(255,255,255);
      doc.text('합계 (VAT 포함)', 35, y+14);
      doc.setFont('helvetica','bold');
      doc.text(`${total.toLocaleString()} KRW`, 185, y+14, {align:'right'});
      y += 35;
      doc.setFontSize(9); doc.setTextColor(100,100,130); doc.setFont('helvetica','normal');
      doc.text('발행처: 하랑마케팅 | Powered by Localution AI', 105, y, {align:'center'});
      doc.save(`세금계산서_${inv.id}_${inv.client}.pdf`);
    } catch(e) {
      alert('PDF 생성 오류가 발생했어요.'); console.error(e);
    } finally {
      setDownloadingId(null);
    }
  };

  // ✅ 카카오 전송
  const handleSendKakao = async (inv: Invoice) => {
    const text =
      `[로컬루션] 세금계산서 발행 안내\n\n` +
      `문서번호: ${inv.id}\n거래처: ${inv.client}\n품목: ${inv.item}\n` +
      `공급가액: ${inv.amount.toLocaleString()}원\n` +
      `부가세: ${Math.round(inv.amount*0.1).toLocaleString()}원\n` +
      `합계: ${Math.round(inv.amount*1.1).toLocaleString()}원\n` +
      `납부기한: ${inv.due}\n\n확인 후 입금 부탁드립니다 🙏`;
    await navigator.clipboard.writeText(text);
    alert('내용이 복사됐어요!\n카카오톡에서 붙여넣기로 전송하세요 😊');
    window.location.href = 'kakaolink://';
  };

  return (
    <div className="min-h-screen bg-[#F8FAFB]">

      {/* 헤더 */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl border-b border-gray-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[#191F28] font-bold text-lg leading-none">정산 · 행정</h1>
            <p className="text-[#8B95A1] text-xs mt-1">매출 관리 · 세금계산서 · 근태</p>
          </div>
          {salesData.unpaid > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-100 rounded-xl">
              <AlertCircle size={13} className="text-red-400" />
              <span className="text-red-400 text-xs font-bold">미수금 {salesData.unpaid.toLocaleString()}원</span>
            </div>
          )}
        </div>
        <div className="flex gap-1 mt-4 bg-[#F8FAFB] rounded-xl p-1">
          {[
            {id:'calendar', label:'매출 캘린더', icon:Calendar},
            {id:'invoice', label:'세금계산서', icon:FileText},
            {id:'employee', label:'근태 관리', icon:Users},
            {id:'support', label:'지원금 봇', icon:Bell},
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeTab === tab.id ? 'bg-[#3182F6] text-white shadow-sm' : 'text-[#8B95A1] hover:text-[#191F28] hover:bg-gray-50'
                }`}>
                <Icon size={13}/><span className="hidden sm:block">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-5 space-y-5 max-w-4xl mx-auto">

        {/* ── 매출 캘린더 ── */}
        {activeTab === 'calendar' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 rounded-2xl bg-gradient-to-r bg-[#EBF3FF] border border-blue-100 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[#8B95A1] text-xs mb-1">이번달 총 매출</p>
                    <p className="text-[#191F28] font-black text-3xl">{salesData.thisMonth.toLocaleString()}<span className="text-lg text-gray-400 font-normal">원</span></p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <TrendingUp size={12} className="text-emerald-400"/>
                      <span className="text-emerald-400 text-xs font-medium">지난달 대비 +{growthRate}%</span>
                    </div>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-[#EBF3FF] flex items-center justify-center">
                    <Wallet size={24} className="text-[#3182F6]"/>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <p className="text-[#8B95A1] text-xs mb-1">미수금</p>
                <p className="text-red-400 font-bold text-xl">{salesData.unpaid.toLocaleString()}<span className="text-sm font-normal">원</span></p>
                <p className="text-[#B0B8C1] text-xs mt-1">2건 미입금</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <p className="text-[#8B95A1] text-xs mb-1">이번달 지출</p>
                <p className="text-amber-400 font-bold text-xl">{salesData.expenses.toLocaleString()}<span className="text-sm font-normal">원</span></p>
                <p className="text-[#B0B8C1] text-xs mt-1">식자재·임대료 등</p>
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <button className="w-8 h-8 rounded-xl bg-[#F8FAFB] flex items-center justify-center"><ChevronLeft size={16} className="text-gray-400"/></button>
                <p className="text-[#191F28] font-bold text-sm">2026년 4월</p>
                <button className="w-8 h-8 rounded-xl bg-[#F8FAFB] flex items-center justify-center"><ChevronRight size={16} className="text-gray-400"/></button>
              </div>
              <div className="grid grid-cols-7 mb-2">
                {['일','월','화','수','목','금','토'].map(d => (
                  <div key={d} className={`text-center text-xs font-medium py-1 ${d==='일'?'text-red-400':d==='토'?'text-[#3182F6]':'text-gray-500'}`}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {[...Array(2)].map((_,i) => <div key={`e${i}`}/>)}
                {Object.entries(calendarData).map(([day, data]) => {
                  const dayNum = parseInt(day);
                  const isSelected = selectedDay === dayNum;
                  const bgColor = data.type==='high'?'bg-[#EBF3FF] border-blue-200':
                    data.type==='mid'?'bg-[#EBF3FF] border-blue-100':
                    data.type==='low'?'bg-[#F8FAFB] border-gray-200':'border-gray-100';
                  return (
                    <button key={day} onClick={() => setSelectedDay(isSelected?null:dayNum)}
                      className={`rounded-xl p-1.5 border text-center transition-all ${bgColor} ${isSelected?'ring-2 ring-[#3182F6]':''}`}>
                      <p className={`text-xs font-bold ${data.type!=='none'?'text-[#191F28]':'text-[#B0B8C1]'}`}>{dayNum}</p>
                      {data.sales > 0 && <p className="text-[#3182F6] font-medium leading-none mt-0.5" style={{fontSize:'9px'}}>{(data.sales/10000).toFixed(0)}만</p>}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-3 mt-4 justify-center">
                {[{color:'bg-[#EBF3FF]',label:'30만+'},{color:'bg-[#EBF3FF]',label:'15만+'},{color:'bg-[#F8FAFB]',label:'15만 미만'}].map(item => (
                  <div key={item.label} className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded-sm ${item.color}`}/>
                    <span className="text-[#8B95A1] text-xs">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {selectedDay && calendarData[selectedDay] && (
              <div className="rounded-2xl bg-white border border-blue-100 p-4">
                <p className="text-[#3182F6] text-xs font-bold mb-2">4월 {selectedDay}일 상세</p>
                {calendarData[selectedDay].sales > 0 ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[#191F28] font-bold text-xl">{calendarData[selectedDay].sales.toLocaleString()}원</p>
                      <p className="text-[#8B95A1] text-xs mt-0.5">일 매출</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#8B95A1] text-sm">목표 대비</p>
                      <p className="text-emerald-400 font-bold">{((calendarData[selectedDay].sales/300000)*100).toFixed(0)}%</p>
                    </div>
                  </div>
                ) : <p className="text-[#8B95A1] text-sm">휴무일</p>}
              </div>
            )}
          </>
        )}

        {/* ── 세금계산서 ── */}
        {activeTab === 'invoice' && (
          <>
            <div className="rounded-2xl bg-gradient-to-r bg-emerald-50 border border-emerald-100 p-5">
              <div className="flex items-center gap-2 mb-1">
                <FileText size={16} className="text-emerald-400"/>
                <h3 className="text-[#191F28] font-bold text-sm">원클릭 세금계산서</h3>
              </div>
              <p className="text-[#8B95A1] text-xs">정보 입력 → 클립보드 복사 → 홈택스 자동 이동 → 크롬 확장으로 자동 입력!</p>
            </div>

            {/* ✅ 크롬 확장 프로그램 설치 안내 */}
            <div className={`rounded-2xl border p-4 transition-all ${extInstalled ? 'bg-emerald-50 border-emerald-100' : 'bg-[#EBF3FF] border-blue-100'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Globe size={16} className={extInstalled ? 'text-emerald-400' : 'text-[#3182F6]'}/>
                  <p className="text-[#191F28] font-bold text-sm">
                    {extInstalled ? '✅ 크롬 확장 설치됨!' : '🔧 크롬 확장 프로그램 설치 (강력 추천)'}
                  </p>
                </div>
                <button onClick={() => setShowExtGuide(!showExtGuide)}
                  className="text-xs text-gray-400 hover:text-[#191F28] transition-colors">
                  {showExtGuide ? '닫기' : '설치 방법'}
                </button>
              </div>

              {!extInstalled && (
                <p className="text-[#3182F6] text-xs leading-relaxed mb-3">
                  설치하면 홈택스에서 버튼 한 번으로 거래처명·금액·품목이 자동 입력돼요!
                </p>
              )}

              {showExtGuide && (
                <div className="space-y-3 mt-3">
                  <div className="bg-[#F8FAFB] rounded-xl p-4">
                    <p className="text-[#191F28] text-xs font-bold mb-3">📦 크롬 확장 설치 방법</p>
                    <div className="space-y-2.5">
                      {[
                        { step:'1', text:'아래 "확장 코드 복사" 버튼 클릭' },
                        { step:'2', text:'크롬 주소창에 Globe://extensions 입력' },
                        { step:'3', text:'우측 상단 "개발자 모드" 토글 ON' },
                        { step:'4', text:'새 폴더 만들기 → manifest.json + content.js 파일 저장' },
                        { step:'5', text:'"압축해제된 확장 프로그램 로드" → 폴더 선택' },
                        { step:'6', text:'홈택스 세금계산서 발급 페이지에서 자동입력 버튼 클릭!' },
                      ].map(item => (
                        <div key={item.step} className="flex items-start gap-2.5">
                          <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-[#3182F6] text-xs font-bold">{item.step}</div>
                          <p className="text-[#8B95A1] text-xs pt-0.5">{item.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* manifest.json 코드 */}
                  <div className="bg-[#F0F2F5] rounded-xl p-4 border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[#3182F6] text-xs font-bold">📄 manifest.json</p>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify({
                            manifest_version: 3,
                            name: "로컬루션 홈택스 자동입력",
                            version: "1.0",
                            description: "로컬루션에서 입력한 세금계산서 정보를 홈택스에 자동입력합니다",
                            permissions: ["activeTab", "storage"],
                            host_permissions: ["https://www.hometax.go.kr/*"],
                            content_scripts: [{
                              matches: ["https://www.hometax.go.kr/*"],
                              js: ["content.js"],
                              run_at: "document_idle"
                            }],
                            action: { default_popup: "popup.html", default_title: "로컬루션 자동입력" }
                          }, null, 2));
                          alert('manifest.json 코드 복사됨!');
                        }}
                        className="text-xs bg-[#EBF3FF] text-[#3182F6] px-2 py-1 rounded-lg hover:bg-blue-100 transition-all">
                        복사
                      </button>
                    </div>
                    <pre className="text-green-400 text-xs overflow-x-auto leading-relaxed">
{`{
  "manifest_version": 3,
  "name": "로컬루션 홈택스 자동입력",
  "version": "1.0",
  "permissions": ["activeTab","storage"],
  "host_permissions": [
    "https://www.hometax.go.kr/*"
  ],
  "content_scripts": [{
    "matches": [
      "https://www.hometax.go.kr/*"
    ],
    "js": ["content.js"],
    "run_at": "document_idle"
  }],
  "action": {
    "default_popup": "popup.html"
  }
}`}
                    </pre>
                  </div>

                  {/* content.js 코드 */}
                  <div className="bg-[#F0F2F5] rounded-xl p-4 border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-amber-400 text-xs font-bold">📄 content.js</p>
                      <button
                        onClick={() => {
                          const code = `// 로컬루션 홈택스 자동입력 확장
function fillField(selectors, value) {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) {
      el.value = value;
      el.dispatchEvent(new Event('input', {bubbles:true}));
      el.dispatchEvent(new Event('change', {bubbles:true}));
      el.dispatchEvent(new KeyboardEvent('keyup', {bubbles:true}));
      return true;
    }
  }
  return false;
}

function autoFill() {
  const raw = localStorage.getItem('localution_invoice');
  if (!raw) {
    alert('로컬루션에서 세금계산서 정보를 먼저 입력해주세요!');
    return;
  }
  
  const data = JSON.parse(raw);
  const age = (Date.now() - data.timestamp) / 1000 / 60;
  if (age > 30) {
    alert('데이터가 30분 이상 지났어요. 로컬루션에서 다시 발행해주세요!');
    return;
  }

  let filled = 0;
  
  // 거래처명
  if (fillField([
    'input[id*="dlpNm"]', 'input[name*="dlpNm"]',
    '#dlpNm', 'input[placeholder*="거래처"]'
  ], data.client)) filled++;

  // 사업자번호
  if (fillField([
    'input[id*="bizrNo"]', 'input[name*="bizrNo"]',
    '#bizrNo', 'input[placeholder*="사업자"]'
  ], data.bizNo)) filled++;

  // 품목
  if (fillField([
    'input[id*="itemNm"]', 'input[name*="itemNm"]',
    '#itemNm', 'input[placeholder*="품목"]'
  ], data.item)) filled++;

  // 공급가액
  if (fillField([
    'input[id*="splAmt"]', 'input[name*="splAmt"]',
    '#splAmt', 'input[placeholder*="공급가"]'
  ], data.amount)) filled++;

  // 부가세
  if (fillField([
    'input[id*="taxAmt"]', 'input[name*="taxAmt"]',
    '#taxAmt', 'input[placeholder*="세액"]'
  ], data.vat)) filled++;

  if (filled > 0) {
    alert('✅ ' + filled + '개 항목 자동입력 완료!\\n나머지는 직접 확인 후 발급하기를 클릭하세요.');
  } else {
    alert('⚠️ 자동입력 위치를 찾지 못했어요.\\n페이지가 완전히 로딩된 후 다시 시도해주세요.');
  }
}

// 자동입력 버튼 추가
function addButton() {
  if (document.getElementById('localution-btn')) return;
  
  const btn = document.createElement('button');
  btn.id = 'localution-btn';
  btn.innerHTML = '🤖 로컬루션 자동입력';
  btn.style.cssText = \`
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 99999;
    background: linear-gradient(135deg, #7c3aed, #a855f7);
    color: white;
    border: none;
    padding: 12px 20px;
    border-radius: 25px;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 4px 20px rgba(124,58,237,0.5);
    transition: all 0.2s;
  \`;
  btn.onmouseover = () => btn.style.transform = 'scale(1.05)';
  btn.onmouseout = () => btn.style.transform = 'scale(1)';
  btn.onclick = autoFill;
  document.body.appendChild(btn);
}

// 페이지 로드 후 버튼 추가
if (document.readyState === 'complete') {
  addButton();
} else {
  window.addEventListener('load', addButton);
}

// SPA 페이지 변경 감지
const observer = new MutationObserver(() => addButton());
observer.observe(document.body, {childList: true, subtree: true});`;
                          navigator.clipboard.writeText(code);
                          alert('content.js 코드 복사됨!');
                        }}
                        className="text-xs bg-amber-50 text-amber-400 px-2 py-1 rounded-lg hover:bg-amber-500/40 transition-all">
                        복사
                      </button>
                    </div>
                    <p className="text-[#8B95A1] text-xs">홈택스 페이지에 보라색 "로컬루션 자동입력" 버튼이 생겨요</p>
                  </div>

                  {/* popup.html */}
                  <div className="bg-[#F0F2F5] rounded-xl p-4 border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-pink-400 text-xs font-bold">📄 popup.html</p>
                      <button
                        onClick={() => {
                          const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { width: 280px; padding: 16px; background: #0f0f13; color: white; font-family: sans-serif; }
  h3 { color: #a78bfa; font-size: 14px; margin-bottom: 8px; }
  p { color: #9ca3af; font-size: 12px; line-height: 1.6; }
  .status { background: #1a1a2e; border-radius: 8px; padding: 10px; margin-top: 10px; }
  .label { color: #6b7280; font-size: 11px; }
  .value { color: white; font-size: 12px; font-weight: bold; }
  button { width: 100%; padding: 10px; background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: bold; cursor: pointer; margin-top: 10px; }
</style>
</head>
<body>
  <h3>🤖 로컬루션 자동입력</h3>
  <p>로컬루션에서 세금계산서 정보를 입력하면 홈택스에 자동으로 채워드려요!</p>
  <div class="status" id="status">
    <p class="label">마지막 데이터</p>
    <p class="value" id="client">-</p>
  </div>
  <button onclick="window.close()">홈택스로 이동</button>
  <script>
    const raw = localStorage.getItem('localution_invoice');
    if (raw) {
      const d = JSON.parse(raw);
      document.getElementById('client').textContent = d.client + ' / ' + parseInt(d.amount).toLocaleString() + '원';
    }
  </script>
</body>
</html>`;
                          navigator.clipboard.writeText(html);
                          alert('popup.html 코드 복사됨!');
                        }}
                        className="text-xs bg-pink-500/20 text-pink-400 px-2 py-1 rounded-lg hover:bg-pink-500/40 transition-all">
                        복사
                      </button>
                    </div>
                    <p className="text-[#8B95A1] text-xs">확장 프로그램 팝업 화면이에요</p>
                  </div>

                  <button
                    onClick={() => { setExtInstalled(true); setShowExtGuide(false); }}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-[#191F28] font-bold text-sm transition-all">
                    ✅ 설치 완료!
                  </button>
                </div>
              )}
            </div>

            <button onClick={() => setShowInvoiceForm(!showInvoiceForm)}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-[#191F28] font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
              <Plus size={16}/>새 세금계산서 발행
            </button>

            {/* 발행 폼 */}
            {showInvoiceForm && (
              <div className="rounded-2xl bg-white border border-emerald-100 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[#191F28] font-bold text-sm">세금계산서 정보 입력</h3>
                  <button onClick={() => setShowInvoiceForm(false)}><X size={16} className="text-gray-400"/></button>
                </div>

                {[
                  {key:'client', label:'거래처명 (공급받는자)', placeholder:'예: 하랑마케팅', required:true},
                  {key:'bizNo', label:'사업자등록번호', placeholder:'000-00-00000', required:false},
                  {key:'item', label:'품목', placeholder:'예: 마케팅 대행 서비스', required:false},
                  {key:'amount', label:'공급가액 (원)', placeholder:'예: 500000', required:true},
                  {key:'email', label:'이메일 (카카오 전송용)', placeholder:'example@naver.com', required:false},
                ].map(field => (
                  <div key={field.key}>
                    <label className="text-xs text-gray-500 mb-1.5 block">
                      {field.label} {field.required && <span className="text-red-400">*</span>}
                    </label>
                    <input
                      value={form[field.key as keyof typeof form]}
                      onChange={e => setForm(prev => ({...prev, [field.key]: e.target.value}))}
                      placeholder={field.placeholder}
                      className="w-full bg-[#F8FAFB] border border-gray-200 rounded-xl px-4 py-2.5 text-[#191F28] text-sm placeholder-[#B0B8C1] focus:outline-none focus:border-[#3182F6] focus:ring-2 focus:ring-[#EBF3FF] transition-all"/>
                  </div>
                ))}

                {form.amount && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                    <p className="text-emerald-400 text-xs font-bold mb-2">💰 금액 계산</p>
                    {[
                      ['공급가액', `${parseInt(form.amount.replace(/,/g,'')||'0').toLocaleString()}원`],
                      ['부가세 (10%)', `${Math.round(parseInt(form.amount.replace(/,/g,'')||'0')*0.1).toLocaleString()}원`],
                      ['합계', `${Math.round(parseInt(form.amount.replace(/,/g,'')||'0')*1.1).toLocaleString()}원`],
                    ].map(([l,v]) => (
                      <div key={l} className="flex justify-between mt-1">
                        <span className="text-[#8B95A1] text-xs">{l}</span>
                        <span className="text-[#191F28] text-xs font-bold">{v}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-[#EBF3FF] border border-blue-100 rounded-xl p-3">
                  <p className="text-[#3182F6] text-xs font-bold mb-2">⚡ 발행 후 자동화 순서</p>
                  {[
                    '① 버튼 클릭 → 정보 클립보드 복사 + 홈택스 이동',
                    '② 홈택스 로그인 → 전자세금계산서 건별발급 이동',
                    '③ 🤖 보라색 "로컬루션 자동입력" 버튼 클릭',
                    '④ 자동으로 거래처·금액·품목 입력됨!',
                    '⑤ 영수 선택 → 발급하기 → 인증 완료',
                  ].map((s,i) => <p key={i} className="text-[#3182F6] text-xs mt-1">{s}</p>)}
                </div>

                <button onClick={handleIssue} disabled={isIssuing}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 disabled:opacity-50 text-[#191F28] font-bold text-sm flex items-center justify-center gap-2 transition-all">
                  {isIssuing
                    ? <><span className="animate-spin inline-block">⟳</span> 처리 중...</>
                    : <><Zap size={15}/>정보 복사 + 홈택스 이동</>}
                </button>
              </div>
            )}

            {/* 발행 성공 가이드 */}
            {successInvoice && (
              <div className="rounded-2xl bg-white border border-emerald-100 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle size={18} className="text-emerald-400"/>
                  <h3 className="text-[#191F28] font-bold text-sm">복사 완료! 홈택스에서 자동입력 버튼을 클릭하세요 🎉</h3>
                </div>

                <div className="bg-[#F8FAFB] rounded-xl p-4 mb-4 space-y-2 border border-gray-100">
                  {[
                    ['거래처명', successInvoice.client],
                    ['사업자번호', successInvoice.bizNo],
                    ['품목', successInvoice.item],
                    ['공급가액', `${successInvoice.amount.toLocaleString()}원`],
                    ['부가세', `${Math.round(successInvoice.amount*0.1).toLocaleString()}원`],
                    ['합계', `${Math.round(successInvoice.amount*1.1).toLocaleString()}원`],
                  ].map(([l,v]) => (
                    <div key={l} className="flex justify-between">
                      <span className="text-[#8B95A1] text-xs">{l}</span>
                      <span className="text-[#191F28] text-xs font-bold">{v}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => {
                      const text = `거래처명: ${successInvoice.client}\n사업자번호: ${successInvoice.bizNo}\n품목: ${successInvoice.item}\n공급가액: ${successInvoice.amount.toLocaleString()}원\n부가세: ${Math.round(successInvoice.amount*0.1).toLocaleString()}원\n합계: ${Math.round(successInvoice.amount*1.1).toLocaleString()}원`;
                      navigator.clipboard.writeText(text);
                      alert('다시 복사됐어요!');
                    }}
                    className="w-full py-3 rounded-xl bg-[#3182F6] hover:bg-[#1B6EF3] text-white font-bold text-sm flex items-center justify-center gap-2 transition-all">
                    <Copy size={14}/>정보 다시 복사
                  </button>
                  <button
                    onClick={() => window.open('https://www.hometax.go.kr/websquare/websquare.html?w2xPath=/ui/ab/a/a/UTERPAAA001M.xml&menuCd=MDR030101000','_blank')}
                    className="w-full py-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/40 border border-blue-100 text-[#3182F6] font-bold text-sm flex items-center justify-center gap-2 transition-all">
                    🏛️ 홈택스 전자세금계산서 발급 페이지
                  </button>
                  <button onClick={() => handleDownloadPDF(successInvoice)} disabled={downloadingId===successInvoice.id}
                    className="w-full py-3 rounded-xl bg-[#F8FAFB] hover:bg-gray-100 text-[#8B95A1] font-bold text-sm flex items-center justify-center gap-2 transition-all border border-gray-200">
                    <Download size={14}/>{downloadingId===successInvoice.id ? 'PDF 생성 중...' : '내부용 PDF 저장'}
                  </button>
                </div>

                <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <p className="text-amber-400 text-xs font-bold mb-3">🔔 홈택스 입력 순서</p>
                  {[
                    {step:'1', text:'홈택스 로그인 → 아이디/비밀번호'},
                    {step:'2', text:'전자(세금)계산서 → 건별발급 클릭'},
                    {step:'3', text:'🤖 보라색 "로컬루션 자동입력" 버튼 클릭!'},
                    {step:'4', text:'자동입력 확인 후 "영수" 선택'},
                    {step:'5', text:'발급하기 → 공인인증서 완료'},
                  ].map(item => (
                    <div key={item.step} className="flex items-start gap-2.5 mt-2">
                      <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 text-amber-400 text-xs font-bold">{item.step}</div>
                      <p className="text-[#8B95A1] text-xs leading-relaxed pt-0.5">{item.text}</p>
                    </div>
                  ))}
                </div>

                <button onClick={() => setSuccessInvoice(null)} className="w-full mt-3 py-2.5 rounded-xl border border-gray-200 text-[#8B95A1] text-xs">닫기</button>
              </div>
            )}

            {/* 발행 내역 */}
            <div className="rounded-2xl bg-white border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <p className="text-[#191F28] font-bold text-sm">발행 내역</p>
              </div>
              <div className="divide-y divide-gray-100">
                {invoices.map(inv => (
                  <div key={inv.id} className="px-5 py-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                        <FileText size={15} className="text-emerald-400"/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[#191F28] text-sm font-medium truncate">{inv.client}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                            inv.status==='입금완료'?'bg-emerald-500/20 text-emerald-400':
                            inv.status==='미수금'?'bg-red-50 text-red-500':
                            'bg-[#EBF3FF] text-[#3182F6]'
                          }`}>{inv.status}</span>
                        </div>
                        <p className="text-[#8B95A1] text-xs mt-0.5">{inv.id} · {inv.item} · 마감 {inv.due}</p>
                      </div>
                      <p className="text-[#191F28] font-bold text-sm flex-shrink-0">{inv.amount.toLocaleString()}원</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => handleDownloadPDF(inv)} disabled={downloadingId===inv.id}
                        className="py-2.5 rounded-xl bg-[#EBF3FF] hover:bg-blue-100 text-[#3182F6] text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-blue-100">
                        <Download size={13}/>{downloadingId===inv.id?'생성중...':'PDF 다운로드'}
                      </button>
                      <button onClick={() => handleSendKakao(inv)}
                        className="py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-600 text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-amber-100">
                        <Send size={13}/>카카오 전송
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── 근태 관리 ── */}
        {activeTab === 'employee' && (
          <>
            <div className="rounded-2xl bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-100 p-5">
              <div className="flex items-center gap-2 mb-1">
                <Users size={16} className="text-[#3182F6]"/>
                <h3 className="text-[#191F28] font-bold text-sm">근태 & 계약 관리</h3>
              </div>
              <p className="text-[#8B95A1] text-xs">출퇴근 기록 · 모바일 근로계약서 · 급여 자동 계산</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                {label:'출근', value:'2명', color:'text-emerald-400', bg:'bg-emerald-50'},
                {label:'근무중', value:'1명', color:'text-[#3182F6]', bg:'bg-[#EBF3FF]'},
                {label:'휴무', value:'1명', color:'text-gray-400', bg:'bg-[#F8FAFB]'},
              ].map(stat => (
                <div key={stat.label} className={`${stat.bg} rounded-2xl p-3.5 border border-gray-100 text-center`}>
                  <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-[#8B95A1] text-xs mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
            <div className="rounded-2xl bg-white border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <p className="text-[#191F28] font-bold text-sm">오늘 출퇴근 현황</p>
                <p className="text-[#8B95A1] text-xs">2026.04.12</p>
              </div>
              <div className="divide-y divide-gray-100">
                {employees.map((emp,i) => (
                  <div key={i} className="px-5 py-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#EBF3FF] flex items-center justify-center flex-shrink-0 text-sm font-bold text-[#3182F6]">{emp.name[0]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[#191F28] text-sm font-medium">{emp.name}</p>
                        <span className="text-xs text-gray-500">{emp.role}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[#8B95A1] text-xs flex items-center gap-1"><Clock size={10}/>출근 {emp.checkIn}</span>
                        {emp.checkOut!=='-' && <span className="text-[#8B95A1] text-xs">퇴근 {emp.checkOut}</span>}
                      </div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-xl font-medium ${
                      emp.status==='근무중'?'bg-[#EBF3FF] text-[#3182F6]':
                      emp.status==='퇴근'?'bg-emerald-500/20 text-emerald-400':
                      'bg-[#F8FAFB] text-gray-500'
                    }`}>{emp.status}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-white border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard size={15} className="text-amber-400"/>
                <h3 className="text-[#191F28] font-bold text-sm">이번달 급여 예상</h3>
              </div>
              <div className="space-y-3">
                {[
                  {name:'김알바', hours:'52시간', wage:12000, total:624000},
                  {name:'이직원', hours:'160시간', wage:15000, total:2400000},
                ].map((emp,i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[#F8FAFB]">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-xs font-bold text-amber-400">{emp.name[0]}</div>
                    <div className="flex-1">
                      <p className="text-[#191F28] text-sm font-medium">{emp.name}</p>
                      <p className="text-[#8B95A1] text-xs">{emp.hours} · 시급 {emp.wage.toLocaleString()}원</p>
                    </div>
                    <p className="text-amber-400 font-bold text-sm">{emp.total.toLocaleString()}원</p>
                  </div>
                ))}
                <div className="border-t border-gray-100 pt-3 flex justify-between">
                  <p className="text-[#8B95A1] text-sm">총 급여</p>
                  <p className="text-[#191F28] font-black text-lg">3,024,000원</p>
                </div>
              </div>
            </div>
            <button className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 text-[#191F28] font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20">
              <ClipboardList size={16}/>모바일 근로계약서 작성
            </button>
          </>
        )}

        {/* ── 지원금 봇 ── */}
        {activeTab === 'support' && (
          <>
            <div className="rounded-2xl bg-gradient-to-r bg-amber-50 border border-amber-100 p-5">
              <div className="flex items-center gap-2 mb-1">
                <Bell size={16} className="text-amber-400"/>
                <h3 className="text-[#191F28] font-bold text-sm">정부지원금 알림 봇</h3>
              </div>
              <p className="text-[#8B95A1] text-xs">부천시·정부 맞춤 지원금 자동 알림 & 신청 대행 연결</p>
            </div>
            <div className="rounded-2xl bg-white border border-blue-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Zap size={14} className="text-[#3182F6]"/>
                <p className="text-[#191F28] font-bold text-sm">AI 맞춤 추천</p>
              </div>
              <p className="text-[#8B95A1] text-sm leading-relaxed">
                하랑마케팅 카페 기준으로 <span className="text-[#3182F6] font-medium">3개 지원금</span>을 신청할 수 있어요.
                이번 달 마감이 임박한 고용유지 지원금을 먼저 확인해보세요!
              </p>
            </div>
            <div className="space-y-3">
              {govSupports.map((support,i) => (
                <div key={i} className="rounded-2xl bg-white border border-gray-100 p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          support.category==='자금'?'bg-emerald-500/20 text-emerald-400':
                          support.category==='창업'?'bg-[#EBF3FF] text-[#3182F6]':
                          'bg-[#EBF3FF] text-[#3182F6]'
                        }`}>{support.category}</span>
                        {support.status==='마감임박' && (
                          <span className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full font-medium animate-pulse">마감임박!</span>
                        )}
                      </div>
                      <p className="text-[#191F28] font-bold text-sm">{support.title}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-2.5 rounded-xl bg-[#F8FAFB]">
                      <p className="text-[#8B95A1] text-xs">지원금액</p>
                      <p className="text-emerald-400 font-bold text-sm mt-0.5">{support.amount}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#F8FAFB]">
                      <p className="text-[#8B95A1] text-xs">신청 마감</p>
                      <p className="text-[#191F28] font-bold text-sm mt-0.5">{support.deadline}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-400 hover:text-[#191F28] text-xs font-medium transition-all">자세히 보기</button>
                    <button className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#191F28] text-xs font-bold transition-all flex items-center justify-center gap-1.5">
                      <Check size={12}/>신청하기
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
