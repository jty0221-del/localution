'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Camera, Receipt, Star, Copy, Check, ChevronRight,
  ChevronLeft, Sparkles, Gift, MapPin,
  ImagePlus, X, Loader2, ThumbsUp, ExternalLink, AlertCircle
} from 'lucide-react';

// ✅ Supabase 클라이언트
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type StoreData = {
  id: string;
  name: string;
  category: string;
  address: string;
  main_keyword: string;
  sub_keywords: string[];
  tone: string;
  reward_enabled: boolean;
  reward_text: string;
  naver_url: string;
  cover_color: string;
};

const GENDER_OPTIONS = [
  { id: 'male', label: '남성', emoji: '👨' },
  { id: 'female', label: '여성', emoji: '👩' },
  { id: 'none', label: '선택 안 함', emoji: '🙂' },
];

const AGE_OPTIONS = [
  { id: '10s', label: '10대', emoji: '🧒' },
  { id: '20s', label: '20대', emoji: '🧑' },
  { id: '30s', label: '30대', emoji: '👨‍💼' },
  { id: '40s', label: '40대', emoji: '👩‍💼' },
  { id: '50s', label: '50대+', emoji: '🧓' },
];

const TONE_OPTIONS = [
  { id: 'gen-z', emoji: '🔥', label: 'Z세대 힙', desc: '트렌디하고 솔직한 말투' },
  { id: 'friendly', emoji: '😊', label: '친근한 이웃', desc: '따뜻하고 편안한 말투' },
  { id: 'mom', emoji: '💛', label: '맘카페 찐후기', desc: '신뢰감 있는 엄마 말투' },
  { id: 'gourmet', emoji: '🍷', label: '미식가', desc: '격조 있고 전문적인 말투' },
  { id: 'simple', emoji: '✍️', label: '심플 & 팩트', desc: '짧고 명확한 핵심 위주' },
  { id: 'excited', emoji: '🎉', label: '신나는 후기', desc: '감탄사 많고 에너지 넘침' },
];

type UploadedFile = { file: File; preview: string; type: 'receipt' | 'food' };

const convertToJpeg = (file: File): Promise<{ base64: string; mediaType: string }> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const maxSize = 1200;
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        if (width > height) { height = (height / width) * maxSize; width = maxSize; }
        else { width = (width / height) * maxSize; height = maxSize; }
      }
      canvas.width = width; canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve({ base64: canvas.toDataURL('image/jpeg', 0.85).split(',')[1], mediaType: 'image/jpeg' });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      const reader = new FileReader();
      reader.onload = () => resolve({ base64: (reader.result as string).split(',')[1], mediaType: 'image/jpeg' });
      reader.readAsDataURL(file);
    };
    img.src = url;
  });
};

const analyzePriceLevel = (items: string[], total: string): string => {
  try {
    const totalNum = parseInt(total.replace(/[^0-9]/g, '')) || 0;
    const menuCount = items.length || 1;
    const perPerson = totalNum / menuCount;
    if (totalNum === 0) return 'unknown';
    if (perPerson <= 6000) return 'very_cheap';
    if (perPerson <= 12000) return 'cheap';
    if (perPerson <= 20000) return 'normal';
    if (perPerson <= 35000) return 'expensive';
    return 'premium';
  } catch { return 'unknown'; }
};

const getPriceExpression = (level: string): string => {
  const map: Record<string, string> = {
    'very_cheap': '가격이 부담 없어서 자주 오고 싶은 곳이에요. 이 퀄리티에 이 가격이라니 진짜 가성비 맛집',
    'cheap': '가격 대비 퀄리티가 훌륭해서 만족스러웠어요. 가성비 면에서 확실히 합격',
    'normal': '가격이 적당한 편이라 부담 없이 즐길 수 있었어요',
    'expensive': '가격대가 있는 편이지만 그만한 가치가 충분히 있었어요. 분위기와 맛을 생각하면 납득이 되는 곳',
    'premium': '가격이 높은 편이지만 퀄리티와 경험을 생각하면 충분히 그럴만한 가치가 있는 곳이에요',
    'unknown': '가격 대비 만족도가 높았어요',
  };
  return map[level] || map['unknown'];
};

export default function CustomerReviewPage() {
  // ✅ DB에서 불러온 매장 정보
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [storeLoading, setStoreLoading] = useState(true);

  const [step, setStep] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [gender, setGender] = useState('none');
  const [age, setAge] = useState('20s');
  const [tone, setTone] = useState('friendly');
  const [analysisStep, setAnalysisStep] = useState('');
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [generatedReview, setGeneratedReview] = useState('');
  const [extractedMenu, setExtractedMenu] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const receiptCameraRef = useRef<HTMLInputElement>(null);
  const receiptGalleryRef = useRef<HTMLInputElement>(null);
  const foodCameraRef = useRef<HTMLInputElement>(null);
  const foodGalleryRef = useRef<HTMLInputElement>(null);

  // ✅ URL에서 storeId 추출 → DB 조회
  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    const storeId = pathParts[pathParts.length - 1];
    loadStore(storeId);
  }, []);

  const loadStore = async (storeId: string) => {
    try {
      let { data } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .single();

      // UUID 매칭 실패 시 첫 번째 매장으로 폴백 (테스트용)
      if (!data) {
        const result = await supabase.from('stores').select('*').limit(1).single();
        data = result.data;
      }

      if (data) {
        setStoreData(data);
        // QR 스캔 로그 기록
        await supabase.from('qr_scans').insert({ store_id: data.id });
      }
    } catch (err) {
      console.error('매장 정보 로드 실패:', err);
    } finally {
      setStoreLoading(false);
    }
  };

  const handleFileUpload = (files: FileList | null, type: 'receipt' | 'food') => {
    if (!files) return;
    setUploadedFiles(prev => [...prev, ...Array.from(files).map(file => ({
      file, preview: URL.createObjectURL(file), type,
    }))]);
    setError('');
  };

  const removeFile = (file: UploadedFile) => setUploadedFiles(prev => prev.filter(f => f !== file));
  const receipts = uploadedFiles.filter(f => f.type === 'receipt');
  const foodPhotos = uploadedFiles.filter(f => f.type === 'food');

  const getTonePrompt = () => {
    const genderText = gender === 'male' ? '남성' : gender === 'female' ? '여성' : '';
    const ageText = AGE_OPTIONS.find(a => a.id === age)?.label || '20대';
    const base = `작성자는 ${genderText} ${ageText} 고객입니다.`;
    const toneMap: Record<string, string> = {
      'gen-z': `${base} Z세대 감성, 힙하고 트렌디한 말투, 줄임말 자연스럽게, 이모지 1~2개만`,
      'friendly': `${base} 친근하고 따뜻한 이웃 말투, 자연스러운 구어체`,
      'mom': `${base} 맘카페 스타일, 꼼꼼하고 신뢰감 있는 말투`,
      'gourmet': `${base} 진지한 미식가 스타일, 음식 묘사 풍부하고 격조 있게`,
      'simple': `${base} 핵심만 짧게, 팩트 위주, 군더더기 없이 깔끔하게`,
      'excited': `${base} 감탄사 많고 에너지 넘치는 말투, 신난 후기 스타일`,
    };
    return toneMap[tone] || toneMap['friendly'];
  };

  const generateReview = async () => {
    if (!storeData) return;
    setError('');
    setStep(2);
    setAnalysisProgress(0);

    const STORE = {
      id: storeData.id,
      name: storeData.name,
      category: storeData.category || '',
      address: storeData.address || '',
      mainKeyword: storeData.main_keyword || '',
      subKeywords: storeData.sub_keywords || [],
      tone: storeData.tone || 'friendly',
      reward: storeData.reward_text || '',
      naverUrl: storeData.naver_url || '#',
      coverColor: storeData.cover_color || 'from-orange-400 via-pink-400 to-violet-500',
    };

    try {
      // ── Step 1: 영수증 OCR ──────────────────────────────────
      setAnalysisStep('🧾 영수증에서 메뉴를 읽는 중...');
      setAnalysisProgress(10);

      const receiptContents: object[] = [];
      for (const f of receipts) {
        const { base64, mediaType } = await convertToJpeg(f.file);
        receiptContents.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } });
      }

      let menuOnlyInfo = '';
      let priceExpression = '';
      let menuWithPriceList: string[] = [];

      if (receipts.length > 0) {
        const ocrRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || '',
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 500,
            messages: [{
              role: 'user',
              content: [
                ...receiptContents,
                { type: 'text', text: `영수증 사진을 분석해줘.

[중요 규칙]
- 메뉴명은 실제 음식/음료 이름으로 정확히 교정 (예: 지몽→자몽, 아아→아이스아메리카노)
- 가격은 내부 계산용으로만 추출

아래 JSON 형식으로만 출력 (설명 없이):
{"items":["교정된 메뉴명"],"itemsWithPrice":["메뉴명 가격원"],"total":"총액원","store":"매장명"}` }
              ],
            }],
          }),
        });

        const ocrData = await ocrRes.json();
        try {
          const parsed = JSON.parse(ocrData.content?.[0]?.text?.replace(/```json|```/g, '').trim() || '{}');
          const menuNames: string[] = parsed.items || [];
          menuWithPriceList = parsed.itemsWithPrice || [];
          const extractedTotal = parsed.total || '';

          setExtractedMenu(menuWithPriceList.length > 0 ? menuWithPriceList : menuNames);
          menuOnlyInfo = menuNames.length > 0 ? `주문 메뉴: ${menuNames.join(', ')}` : '메뉴 확인 어려움';
          const priceLevel = analyzePriceLevel(menuWithPriceList, extractedTotal);
          priceExpression = getPriceExpression(priceLevel);
        } catch {
          menuOnlyInfo = '영수증 분석 완료';
          priceExpression = '가격 대비 만족도가 높았어요';
        }
      }

      setAnalysisProgress(30);

      // ── Step 2: 음식 사진 분석 ──────────────────────────────
      setAnalysisStep('📸 음식 사진을 분석하는 중...');

      const foodContents: object[] = [];
      for (const f of foodPhotos) {
        const { base64, mediaType } = await convertToJpeg(f.file);
        foodContents.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } });
      }

      let photoDesc = '';
      if (foodPhotos.length > 0) {
        const photoRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || '',
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 200,
            messages: [{
              role: 'user',
              content: [
                ...foodContents,
                { type: 'text', text: '음식/매장 사진을 보고 맛있어 보이는 포인트와 비주얼 특징을 리뷰에 쓸 수 있는 생생한 묘사로 2~3줄만 써줘. 이모지나 별점 기호는 절대 쓰지 마.' }
              ],
            }],
          }),
        });
        const photoData = await photoRes.json();
        photoDesc = photoData.content?.[0]?.text || '';
      }

      setAnalysisProgress(50);

      // ── Step 3: 리뷰 초안 생성 ──────────────────────────────
      setAnalysisStep('✍️ 리뷰 초안을 작성하는 중...');

      const toneGuide = getTonePrompt();
      const genderLabel = gender === 'male' ? '남성' : gender === 'female' ? '여성' : '';
      const ageLabel = AGE_OPTIONS.find(a => a.id === age)?.label || '20대';

      const draftRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || '',
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 600,
          messages: [{
            role: 'user',
            content: `당신은 실제 맛집 방문 후기를 쓰는 ${ageLabel} ${genderLabel} 고객입니다. 네이버 플레이스에 올릴 리뷰를 작성하세요.

[매장 정보]
- 매장명: ${STORE.name}
- 위치: ${STORE.address}
- 대표 키워드: ${STORE.mainKeyword}
- 서브 키워드: ${STORE.subKeywords.join(', ')}
- 별점: ${rating}점

[주문한 메뉴 (메뉴명만, 가격 언급 금지)]
${menuOnlyInfo || '정보 없음'}

[가격에 대한 표현]
${priceExpression || ''}

[음식 사진 분석]
${photoDesc || '사진 없음'}

[말투 스타일]
${toneGuide}

[절대 지켜야 할 규칙]
- 가격 숫자 절대 언급 금지
- 별점 이모지(★☆⭐) 절대 사용 금지
- "안녕하세요", "방문했어요" 같은 뻔한 시작 금지
- 문단 사이 줄바꿈 한 번만
- 실제 사람이 쓴 것처럼 자연스럽게
- 대표 키워드 "${STORE.mainKeyword}" 첫 문단에 자연스럽게 포함
- 서브 키워드 2개 이상 자연스럽게 녹이기
- 메뉴명 자연스럽게 언급 (가격 없이)
- 재방문 의사로 마무리
- 리뷰 본문만 출력
- 길이: 150~220자`,
          }],
        }),
      });

      const draftData = await draftRes.json();
      const draft = draftData.content?.[0]?.text || '';
      setAnalysisProgress(75);

      // ── Step 4: AI 퇴고 & 검수 ──────────────────────────────
      setAnalysisStep('🔍 맞춤법 · 자연스러움 검수 중...');

      const reviewRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || '',
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 600,
          messages: [{
            role: 'user',
            content: `아래 네이버 플레이스 리뷰 초안을 퇴고해줘.

[초안]
${draft}

[퇴고 기준]
1. 맞춤법 & 띄어쓰기 교정
2. 어색한 문장 자연스럽게 수정
3. 별점 이모지(★☆⭐) 있으면 제거
4. 가격 숫자 있으면 제거 (가성비 표현으로 대체)
5. 문단 사이 줄바꿈 1회만
6. 광고 같은 표현 → 실제 후기처럼 순화
7. 느낌표 두 개 이상(!!) 금지
8. 150~220자 유지

퇴고된 리뷰 본문만 출력 (설명 없이)`,
          }],
        }),
      });

      const reviewData = await reviewRes.json();
      const finalReview = reviewData.content?.[0]?.text || draft;
      setAnalysisProgress(100);

      // ✅ Step 9: 생성된 리뷰 Supabase DB에 저장
      await supabase.from('generated_reviews').insert({
        store_id: STORE.id,
        review_text: finalReview,
        rating: rating,
        menu_items: extractedMenu,
        gender: gender,
        age_group: age,
        tone: tone,
      });

      setGeneratedReview(finalReview);
      setStep(3);

    } catch (err) {
      console.error(err);
      setError('오류가 발생했어요. 다시 시도해 주세요.');
      setStep(1);
    }
  };

  const copyReview = () => {
    navigator.clipboard.writeText(generatedReview);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // ── 로딩 중 ─────────────────────────────────────────────────
  if (storeLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-violet-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Sparkles size={28} className="text-white animate-spin" />
          </div>
          <p className="text-gray-500 text-sm font-medium">매장 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // ── 매장 없음 ────────────────────────────────────────────────
  if (!storeData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-4xl mb-4">😢</p>
          <h2 className="text-gray-800 font-bold text-lg mb-2">매장을 찾을 수 없어요</h2>
          <p className="text-gray-500 text-sm">QR코드를 다시 스캔해 주세요</p>
        </div>
      </div>
    );
  }

  // ✅ DB 데이터 → 컴포넌트용 변수
  const STORE = {
    id: storeData.id,
    name: storeData.name,
    category: storeData.category || '',
    address: storeData.address || '',
    mainKeyword: storeData.main_keyword || '',
    subKeywords: storeData.sub_keywords || [],
    tone: storeData.tone || 'friendly',
    reward: storeData.reward_text || '',
    naverUrl: storeData.naver_url || '#',
    coverColor: storeData.cover_color || 'from-orange-400 via-pink-400 to-violet-500',
  };

  // ── 인트로 ──────────────────────────────────────────────────
  if (step === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className={`bg-gradient-to-br ${STORE.coverColor} px-6 pt-14 pb-10 relative overflow-hidden`}>
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
          <div className="relative text-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-4 border border-white/30">
              <span className="text-3xl">☕</span>
            </div>
            <h1 className="text-white font-black text-2xl">{STORE.name}</h1>
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <MapPin size={13} className="text-white/70" />
              <p className="text-white/70 text-sm">{STORE.address}</p>
            </div>
          </div>
        </div>
        <div className="flex-1 px-5 -mt-5">
          <div className="bg-white rounded-3xl shadow-2xl shadow-black/10 p-6 border border-gray-100">
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-6">
              <Gift size={18} className="text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-amber-600 font-semibold">리뷰 작성 완료 시 즉시 지급!</p>
                <p className="text-sm font-bold text-amber-800">{STORE.reward}</p>
              </div>
            </div>
            <h2 className="text-gray-900 font-black text-xl mb-1">1분만에 리뷰 완성! ✨</h2>
            <p className="text-gray-500 text-sm mb-6">영수증 + 사진만 올리면 AI가 내 스타일로 써드려요</p>
            <div className="space-y-3 mb-7">
              {[
                { emoji: '🧾', title: '영수증 사진 올리기', desc: '카메라 촬영 또는 갤러리 선택 가능' },
                { emoji: '👤', title: '내 스타일 설정', desc: '성별 · 나이대 · 말투를 선택하면 AI가 맞춤 리뷰 작성' },
                { emoji: '🤖', title: 'AI 맞춤 리뷰 + 검수', desc: 'OCR 분석 → 초안 작성 → 맞춤법 · 자연스러움 퇴고' },
                { emoji: '📋', title: '복사 → 네이버 붙여넣기', desc: '원터치 복사 후 바로 등록!' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0 text-lg">{item.emoji}</div>
                  <div className="pt-0.5">
                    <p className="text-gray-800 text-sm font-bold">{item.title}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setStep(1)}
              className={`w-full py-4 rounded-2xl bg-gradient-to-r ${STORE.coverColor} text-white font-black text-base shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2`}>
              <Camera size={20} />리뷰 작성 시작하기<ChevronRight size={18} />
            </button>
            <p className="text-center text-xs text-gray-400 mt-3">평균 소요시간 <span className="font-bold text-gray-600">1분 이내</span> · 개인정보 수집 없음</p>
          </div>
        </div>
        <div className="py-6 text-center">
          <p className="text-xs text-gray-300">Powered by <span className="font-bold text-violet-400">Localution AI</span></p>
        </div>
      </div>
    );
  }

  // ── 업로드 + 스타일 설정 ────────────────────────────────────
  if (step === 1) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-100 px-5 py-4 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setStep(0)} className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center">
              <ChevronLeft size={18} className="text-gray-600" />
            </button>
            <div className="flex-1">
              <p className="text-xs text-gray-400">{STORE.name}</p>
              <h2 className="text-gray-900 font-bold text-base leading-none">사진 · 스타일 설정</h2>
            </div>
            <div className="flex gap-1">
              {[1,2,3].map(i => (
                <div key={i} className={`h-1.5 rounded-full transition-all ${i === 1 ? 'w-6 bg-violet-500' : 'w-1.5 bg-gray-200'}`} />
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 py-5 space-y-4 pb-36">
          {/* 별점 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-gray-700 font-bold text-sm mb-3">방문 만족도</p>
            <div className="flex gap-1.5 justify-center">
              {[1,2,3,4,5].map(star => (
                <button key={star} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)} onClick={() => setRating(star)}>
                  <Star size={38} className={`transition-colors ${star <= (hoverRating || rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                </button>
              ))}
            </div>
            <p className="text-center text-sm font-bold text-amber-500 mt-2">
              {rating === 5 ? '최고예요! 🔥' : rating === 4 ? '좋아요 👍' : rating === 3 ? '보통이에요' : rating === 2 ? '별로였어요' : '실망했어요'}
            </p>
          </div>

          {/* 성별 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-gray-700 font-bold text-sm mb-3">👤 성별</p>
            <div className="grid grid-cols-3 gap-2">
              {GENDER_OPTIONS.map(g => (
                <button key={g.id} onClick={() => setGender(g.id)}
                  className={`flex flex-col items-center gap-1.5 py-3.5 rounded-2xl border-2 transition-all ${gender === g.id ? 'border-violet-500 bg-violet-50' : 'border-gray-100 bg-gray-50'}`}>
                  <span className="text-2xl">{g.emoji}</span>
                  <span className={`text-xs font-bold ${gender === g.id ? 'text-violet-600' : 'text-gray-500'}`}>{g.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 나이대 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-gray-700 font-bold text-sm mb-3">🎂 나이대</p>
            <div className="grid grid-cols-5 gap-2">
              {AGE_OPTIONS.map(a => (
                <button key={a.id} onClick={() => setAge(a.id)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 transition-all ${age === a.id ? 'border-pink-400 bg-pink-50' : 'border-gray-100 bg-gray-50'}`}>
                  <span className="text-xl">{a.emoji}</span>
                  <span className={`text-xs font-bold ${age === a.id ? 'text-pink-600' : 'text-gray-500'}`}>{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 말투 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-gray-700 font-bold text-sm mb-3">✍️ 리뷰 말투</p>
            <div className="grid grid-cols-2 gap-2">
              {TONE_OPTIONS.map(t => (
                <button key={t.id} onClick={() => setTone(t.id)}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all ${tone === t.id ? 'border-orange-400 bg-orange-50' : 'border-gray-100 bg-gray-50'}`}>
                  <span className="text-2xl flex-shrink-0">{t.emoji}</span>
                  <div className="min-w-0">
                    <p className={`text-xs font-bold leading-none ${tone === t.id ? 'text-orange-600' : 'text-gray-700'}`}>{t.label}</p>
                    <p className="text-gray-400 text-xs mt-0.5 leading-tight">{t.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-xs text-gray-500 font-medium mb-1">✨ 선택된 스타일</p>
              <div className="flex items-center gap-2">
                <span className="text-lg">{GENDER_OPTIONS.find(g => g.id === gender)?.emoji}</span>
                <span className="text-sm font-bold text-gray-700">
                  {AGE_OPTIONS.find(a => a.id === age)?.label}
                  {gender !== 'none' ? ` ${GENDER_OPTIONS.find(g => g.id === gender)?.label}` : ''}
                </span>
                <span className="text-gray-300">·</span>
                <span className="text-lg">{TONE_OPTIONS.find(t2 => t2.id === tone)?.emoji}</span>
                <span className="text-sm text-gray-600">{TONE_OPTIONS.find(t2 => t2.id === tone)?.label}</span>
              </div>
            </div>
          </div>

          {/* 영수증 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <Receipt size={16} className="text-violet-500" />
              <p className="text-gray-700 font-bold text-sm">영수증 사진</p>
              <span className="text-xs bg-red-50 text-red-400 px-2 py-0.5 rounded-full font-medium border border-red-100">필수</span>
            </div>
            <p className="text-xs text-gray-400 mb-4">메뉴 파악 + 가격대 분석 → 리뷰에 자연스럽게 반영</p>
            <input ref={receiptCameraRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={e => handleFileUpload(e.target.files, 'receipt')} />
            <input ref={receiptGalleryRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFileUpload(e.target.files, 'receipt')} />
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button onClick={() => receiptCameraRef.current?.click()}
                className="flex flex-col items-center gap-2 py-6 rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/50 active:bg-violet-100 transition-all">
                <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center">
                  <Camera size={22} className="text-violet-500" />
                </div>
                <p className="text-violet-600 font-bold text-sm">카메라 촬영</p>
                <p className="text-violet-400 text-xs">지금 바로 찍기</p>
              </button>
              <button onClick={() => receiptGalleryRef.current?.click()}
                className="flex flex-col items-center gap-2 py-6 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 active:bg-gray-100 transition-all">
                <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
                  <ImagePlus size={22} className="text-gray-500" />
                </div>
                <p className="text-gray-600 font-bold text-sm">갤러리 선택</p>
                <p className="text-gray-400 text-xs">저장된 사진 올리기</p>
              </button>
            </div>
            {receipts.length > 0 && (
              <div className="space-y-2">
                {receipts.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 bg-violet-50 rounded-xl border border-violet-100">
                    <img src={f.preview} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" alt="receipt" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-600 truncate">{f.file.name}</p>
                      <p className="text-xs text-violet-500 mt-0.5">✓ 메뉴 분석 + 가격대 판단 예정</p>
                    </div>
                    <button onClick={() => removeFile(f)}><X size={16} className="text-gray-400" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 음식/매장 사진 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <Camera size={16} className="text-pink-500" />
              <p className="text-gray-700 font-bold text-sm">음식 · 매장 사진</p>
              <span className="text-xs bg-gray-50 text-gray-400 px-2 py-0.5 rounded-full font-medium border border-gray-100">선택</span>
            </div>
            <p className="text-xs text-gray-400 mb-4">AI가 사진을 보고 맛있는 포인트를 리뷰에 담아요</p>
            <input ref={foodCameraRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={e => handleFileUpload(e.target.files, 'food')} />
            <input ref={foodGalleryRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFileUpload(e.target.files, 'food')} />
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button onClick={() => foodCameraRef.current?.click()}
                className="flex flex-col items-center gap-2 py-6 rounded-2xl border-2 border-dashed border-pink-200 bg-pink-50/50 active:bg-pink-100 transition-all">
                <div className="w-12 h-12 bg-pink-100 rounded-2xl flex items-center justify-center">
                  <Camera size={22} className="text-pink-500" />
                </div>
                <p className="text-pink-600 font-bold text-sm">카메라 촬영</p>
                <p className="text-pink-400 text-xs">지금 바로 찍기</p>
              </button>
              <button onClick={() => foodGalleryRef.current?.click()}
                className="flex flex-col items-center gap-2 py-6 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 active:bg-gray-100 transition-all">
                <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
                  <ImagePlus size={22} className="text-gray-500" />
                </div>
                <p className="text-gray-600 font-bold text-sm">갤러리 선택</p>
                <p className="text-gray-400 text-xs">저장된 사진 올리기</p>
              </button>
            </div>
            {foodPhotos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {foodPhotos.map((f, i) => (
                  <div key={i} className="relative aspect-square">
                    <img src={f.preview} className="w-full h-full rounded-xl object-cover" alt="food" />
                    <button onClick={() => removeFile(f)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-800 rounded-full flex items-center justify-center shadow">
                      <X size={11} className="text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-2">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-5">
          <button onClick={generateReview} disabled={receipts.length === 0}
            className={`w-full py-4 rounded-2xl font-black text-base text-white shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${
              receipts.length > 0 ? `bg-gradient-to-r ${STORE.coverColor}` : 'bg-gray-200 text-gray-400'
            }`}>
            <Sparkles size={20} />AI 맞춤 리뷰 생성하기
          </button>
          {receipts.length === 0 && <p className="text-center text-xs text-gray-400 mt-2">영수증 사진을 먼저 업로드해주세요</p>}
        </div>
      </div>
    );
  }

  // ── 분석 중 ─────────────────────────────────────────────────
  if (step === 2) {
    const steps = [
      { label: '영수증 OCR — 메뉴 추출 & 가격대 분석', done: analysisProgress >= 25 },
      { label: '음식 사진 비주얼 분석', done: analysisProgress >= 45 },
      { label: '맞춤 리뷰 초안 작성', done: analysisProgress >= 70 },
      { label: '맞춤법 · 자연스러움 검수 완료', done: analysisProgress >= 100 },
    ];
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-8">
        <div className="text-center w-full max-w-sm">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${STORE.coverColor} opacity-20 animate-ping`} />
            <div className={`relative w-24 h-24 rounded-full bg-gradient-to-br ${STORE.coverColor} flex items-center justify-center shadow-xl`}>
              <Sparkles size={32} className="text-white animate-spin" />
            </div>
          </div>
          <h2 className="text-gray-900 font-black text-2xl mb-1">AI 분석 중...</h2>
          <p className="text-gray-500 text-sm mb-2">{analysisStep || '잠시만 기다려주세요!'}</p>
          <div className="flex items-center justify-center gap-2 mb-5">
            <span className="text-sm bg-violet-50 border border-violet-100 text-violet-600 px-3 py-1 rounded-full font-medium">
              {AGE_OPTIONS.find(a => a.id === age)?.emoji} {AGE_OPTIONS.find(a => a.id === age)?.label}
            </span>
            <span className="text-sm bg-orange-50 border border-orange-100 text-orange-600 px-3 py-1 rounded-full font-medium">
              {TONE_OPTIONS.find(t => t.id === tone)?.emoji} {TONE_OPTIONS.find(t => t.id === tone)?.label}
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 mb-8">
            <div className={`h-2 rounded-full bg-gradient-to-r ${STORE.coverColor} transition-all duration-700`} style={{ width: `${analysisProgress}%` }} />
          </div>
          <div className="space-y-3 text-left">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${s.done ? `bg-gradient-to-br ${STORE.coverColor}` : 'bg-gray-100'}`}>
                  {s.done ? <Check size={12} className="text-white" /> : <Loader2 size={12} className="text-gray-400 animate-spin" />}
                </div>
                <p className={`text-sm ${s.done ? 'text-gray-800 font-semibold' : 'text-gray-400'}`}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── 완료 ────────────────────────────────────────────────────
  if (step === 3) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className={`bg-gradient-to-br ${STORE.coverColor} px-5 pt-12 pb-8 text-center relative overflow-hidden`}>
          <div className="absolute inset-0 bg-black/10" />
          <div className="relative">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-sm border border-white/30">
              <ThumbsUp size={24} className="text-white" />
            </div>
            <h2 className="text-white font-black text-xl">리뷰 완성! 🎉</h2>
            <p className="text-white/70 text-sm mt-1">복사 후 네이버 플레이스에 붙여넣기만 하면 돼요</p>
            <div className="flex items-center justify-center gap-2 mt-3">
              <span className="text-xs bg-white/20 text-white px-2.5 py-1 rounded-full font-medium">
                {GENDER_OPTIONS.find(g => g.id === gender)?.emoji} {gender !== 'none' ? GENDER_OPTIONS.find(g => g.id === gender)?.label : ''} {AGE_OPTIONS.find(a => a.id === age)?.label}
              </span>
              <span className="text-xs bg-white/20 text-white px-2.5 py-1 rounded-full font-medium">
                {TONE_OPTIONS.find(t => t.id === tone)?.emoji} {TONE_OPTIONS.find(t => t.id === tone)?.label}
              </span>
            </div>
          </div>
        </div>

        <div className="px-5 py-5 space-y-4 pb-32">
          {extractedMenu.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs font-bold text-gray-500 mb-2">🧾 영수증에서 찾은 메뉴</p>
              <div className="flex flex-wrap gap-1.5">
                {extractedMenu.map((menu, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 bg-violet-50 text-violet-700 rounded-lg font-medium border border-violet-100">{menu}</span>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">※ 가격은 가격대 판단에만 활용됩니다 (리뷰 미노출)</p>
            </div>
          )}

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-violet-500" />
                <p className="text-gray-700 font-bold text-sm">AI 생성 리뷰</p>
              </div>
              <div className="flex gap-0.5">
                {[...Array(rating)].map((_, i) => <Star key={i} size={13} className="text-amber-400 fill-amber-400" />)}
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{generatedReview}</p>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {[STORE.mainKeyword, ...STORE.subKeywords].map(kw => (
                <span key={kw} className="text-xs px-2 py-1 bg-violet-50 text-violet-600 rounded-lg font-medium border border-violet-100">#{kw}</span>
              ))}
            </div>
          </div>

          <button onClick={copyReview}
            className={`w-full py-4 rounded-2xl font-black text-base transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg ${
              copied ? 'bg-emerald-500 text-white' : `bg-gradient-to-r ${STORE.coverColor} text-white`
            }`}>
            {copied ? <><Check size={20} />클립보드에 복사됨!</> : <><Copy size={20} />리뷰 전체 복사하기</>}
          </button>

          <a href={STORE.naverUrl} target="_blank" rel="noopener noreferrer"
            className="w-full py-4 rounded-2xl font-bold text-sm border-2 border-emerald-500 text-emerald-600 flex items-center justify-center gap-2 bg-white active:bg-emerald-50 transition-all">
            <ExternalLink size={18} />네이버 플레이스 열기 (붙여넣기)
          </a>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <Gift size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-800 font-bold text-sm">보상 지급 안내</p>
                <p className="text-amber-600 text-xs mt-0.5 leading-relaxed">
                  네이버 플레이스에 리뷰 등록 후 사장님께 화면을 보여주시면<br />
                  <span className="font-bold">{STORE.reward}</span>를 즉시 드려요!
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-5">
          <button onClick={() => { setStep(1); setGeneratedReview(''); setCopied(false); setExtractedMenu([]); }}
            className="w-full py-3 rounded-2xl font-bold text-sm border border-gray-200 text-gray-500 active:bg-gray-50 transition-all">
            다시 생성하기
          </button>
        </div>
      </div>
    );
  }

  return null;
}