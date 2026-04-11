'use client';

import { useState, useRef } from 'react';
import {
  Camera, Receipt, Star, Copy, Check, ChevronRight,
  ChevronLeft, Sparkles, Gift, MapPin,
  ImagePlus, X, Loader2, ThumbsUp, ExternalLink, AlertCircle
} from 'lucide-react';

const STORE_DATA = {
  id: 'harang-cafe-001',
  name: '하랑마케팅 카페',
  category: '카페 · 디저트',
  address: '경기도 부천시 소사구 신중동',
  mainKeyword: '부천 맛집',
  subKeywords: ['가성비', '회식장소', '신중동카페'],
  tone: 'gen-z',
  reward: '로컬루션 포인트 2,000P',
  naverUrl: 'https://naver.me/example',
  coverColor: 'from-orange-400 via-pink-400 to-violet-500',
};

type UploadedFile = { file: File; preview: string; type: 'receipt' | 'food' };

// ✅ 모든 이미지를 JPEG로 변환 (HEIC 포함)
const convertToJpeg = (file: File): Promise<{ base64: string; mediaType: string }> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      // 최대 1200px로 리사이즈 (API 용량 절약)
      const maxSize = 1200;
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = (height / width) * maxSize;
          width = maxSize;
        } else {
          width = (width / height) * maxSize;
          height = maxSize;
        }
      }
      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
      resolve({ base64, mediaType: 'image/jpeg' });
    };

    img.onerror = () => {
      // 변환 실패 시 원본 base64로 폴백
      URL.revokeObjectURL(url);
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve({ base64: result.split(',')[1], mediaType: 'image/jpeg' });
      };
      reader.readAsDataURL(file);
    };

    img.src = url;
  });
};

export default function CustomerReviewPage() {
  const [step, setStep] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
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

  const handleFileUpload = (files: FileList | null, type: 'receipt' | 'food') => {
    if (!files) return;
    const newFiles: UploadedFile[] = Array.from(files).map(file => ({
      file,
      preview: URL.createObjectURL(file),
      type,
    }));
    setUploadedFiles(prev => [...prev, ...newFiles]);
    setError('');
  };

  const removeFile = (file: UploadedFile) => {
    setUploadedFiles(prev => prev.filter(f => f !== file));
  };

  const receipts = uploadedFiles.filter(f => f.type === 'receipt');
  const foodPhotos = uploadedFiles.filter(f => f.type === 'food');

  const generateReview = async () => {
    setError('');
    setStep(2);
    setAnalysisProgress(0);

    try {
      // ── Step 1: 영수증 OCR 분석 ──────────────────────────────
      setAnalysisStep('🧾 영수증에서 메뉴를 읽는 중...');
      setAnalysisProgress(20);

      const receiptContents: object[] = [];
      for (const f of receipts) {
        const { base64, mediaType } = await convertToJpeg(f.file);
        receiptContents.push({
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: base64 },
        });
      }

      let menuInfo = '';
      if (receipts.length > 0) {
        const ocrResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || '',
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 400,
            messages: [{
              role: 'user',
              content: [
                ...receiptContents,
                {
                  type: 'text',
                  text: `이 영수증 사진을 분석해서 아래 형식으로만 답해줘. 다른 설명 없이 JSON만 출력:
{
  "items": ["메뉴명1 가격", "메뉴명2 가격"],
  "total": "총액",
  "store": "매장명(있으면)"
}
메뉴가 안 보이면 items를 빈 배열로.`
                }
              ],
            }],
          }),
        });

        const ocrData = await ocrResponse.json();
        const ocrText = ocrData.content?.[0]?.text || '{}';

        try {
          const clean = ocrText.replace(/```json|```/g, '').trim();
          const parsed = JSON.parse(clean);
          const items: string[] = parsed.items || [];
          setExtractedMenu(items);
          menuInfo = items.length > 0
            ? `주문 메뉴: ${items.join(', ')} / 총액: ${parsed.total || '미확인'}`
            : '영수증에서 메뉴를 확인하기 어려웠습니다.';
        } catch {
          menuInfo = ocrText;
        }
      }

      setAnalysisProgress(50);

      // ── Step 2: 음식 사진 분석 ──────────────────────────────
      setAnalysisStep('📸 음식 사진을 분석하는 중...');

      const foodContents: object[] = [];
      for (const f of foodPhotos) {
        const { base64, mediaType } = await convertToJpeg(f.file);
        foodContents.push({
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: base64 },
        });
      }

      let photoDesc = '';
      if (foodPhotos.length > 0) {
        const photoResponse = await fetch('https://api.anthropic.com/v1/messages', {
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
                {
                  type: 'text',
                  text: '이 음식/매장 사진을 보고 맛있어 보이는 포인트, 비주얼 특징을 2~3줄로 간결하게 설명해줘. 리뷰에 쓸 수 있는 생생한 묘사로.'
                }
              ],
            }],
          }),
        });

        const photoData = await photoResponse.json();
        photoDesc = photoData.content?.[0]?.text || '';
      }

      setAnalysisProgress(75);

      // ── Step 3: 최종 SEO 리뷰 생성 ──────────────────────────
      setAnalysisStep('✨ SEO 최적화 리뷰를 작성하는 중...');

      const toneGuide =
        STORE_DATA.tone === 'gen-z' ? 'Z세대 감성, 힙하고 트렌디한 말투, 이모지 2~3개 자연스럽게' :
        STORE_DATA.tone === 'mom' ? '맘카페 찐후기 스타일, 따뜻하고 신뢰감 있는 말투' :
        '진지한 미식가 스타일, 음식 묘사 풍부하고 격조 있게';

      const reviewResponse = await fetch('https://api.anthropic.com/v1/messages', {
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
            content: `당신은 맛집 리뷰 전문가입니다. 아래 정보를 종합해 네이버 플레이스 SEO 최적화 리뷰를 작성하세요.

[매장 정보]
- 매장명: ${STORE_DATA.name}
- 카테고리: ${STORE_DATA.category}
- 위치: ${STORE_DATA.address}
- 대표 키워드: ${STORE_DATA.mainKeyword}
- 서브 키워드: ${STORE_DATA.subKeywords.join(', ')}
- 별점: ${rating}점

[영수증 OCR 결과]
${menuInfo || '영수증 없음'}

[음식 사진 분석]
${photoDesc || '사진 없음'}

[작성 규칙]
- 말투: ${toneGuide}
- 길이: 180~250자
- 대표 키워드 "${STORE_DATA.mainKeyword}" 첫 문단에 자연스럽게 포함
- 서브 키워드 2개 이상 자연스럽게 포함
- 영수증에서 파악한 실제 메뉴명과 가격 언급 (있을 경우)
- 음식 사진 비주얼 묘사 반영 (있을 경우)
- 재방문 의사로 마무리
- 리뷰 본문만 출력 (제목, 설명 없이)`,
          }],
        }),
      });

      const reviewData = await reviewResponse.json();
      const review = reviewData.content?.[0]?.text || '리뷰 생성에 실패했습니다.';
      setAnalysisProgress(100);
      setGeneratedReview(review);
      setStep(3);

    } catch (err) {
      console.error(err);
      setError('분석 중 오류가 발생했어요. API 키를 확인하거나 다시 시도해 주세요.');
      setStep(1);
    }
  };

  const copyReview = () => {
    navigator.clipboard.writeText(generatedReview);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // ── 인트로 ───────────────────────────────────────────────────
  if (step === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className={`bg-gradient-to-br ${STORE_DATA.coverColor} px-6 pt-14 pb-10 relative overflow-hidden`}>
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
          <div className="relative text-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-4 border border-white/30">
              <span className="text-3xl">☕</span>
            </div>
            <h1 className="text-white font-black text-2xl">{STORE_DATA.name}</h1>
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <MapPin size={13} className="text-white/70" />
              <p className="text-white/70 text-sm">{STORE_DATA.address}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 px-5 -mt-5">
          <div className="bg-white rounded-3xl shadow-2xl shadow-black/10 p-6 border border-gray-100">
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-6">
              <Gift size={18} className="text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-amber-600 font-semibold">리뷰 작성 완료 시 즉시 지급!</p>
                <p className="text-sm font-bold text-amber-800">{STORE_DATA.reward}</p>
              </div>
            </div>

            <h2 className="text-gray-900 font-black text-xl mb-1">1분만에 리뷰 완성! ✨</h2>
            <p className="text-gray-500 text-sm mb-6">영수증 + 사진만 올리면 AI가 리뷰를 써드려요</p>

            <div className="space-y-3 mb-7">
              {[
                { emoji: '🧾', title: '영수증 사진 올리기', desc: '카메라 촬영 또는 갤러리에서 선택 가능' },
                { emoji: '📸', title: '음식 사진 추가 (선택)', desc: '사진이 있으면 리뷰가 훨씬 생생해져요' },
                { emoji: '🤖', title: 'AI가 메뉴 분석 + 리뷰 완성', desc: '영수증 OCR → 메뉴 추출 → SEO 리뷰 자동 생성' },
                { emoji: '📋', title: '복사 → 네이버에 붙여넣기', desc: '원터치 복사 후 네이버 플레이스에 바로 등록!' },
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
              className={`w-full py-4 rounded-2xl bg-gradient-to-r ${STORE_DATA.coverColor} text-white font-black text-base shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2`}>
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

  // ── 업로드 화면 ──────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-100 px-5 py-4 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setStep(0)} className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center">
              <ChevronLeft size={18} className="text-gray-600" />
            </button>
            <div className="flex-1">
              <p className="text-xs text-gray-400">{STORE_DATA.name}</p>
              <h2 className="text-gray-900 font-bold text-base leading-none">사진 업로드</h2>
            </div>
            <div className="flex gap-1">
              {[1,2,3].map(i => (
                <div key={i} className={`h-1.5 rounded-full transition-all ${i === 1 ? 'w-6 bg-violet-500' : 'w-1.5 bg-gray-200'}`} />
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 py-6 space-y-5 pb-36">

          {/* 별점 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-gray-700 font-bold text-sm mb-3">방문 만족도</p>
            <div className="flex gap-2 justify-center">
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

          {/* 영수증 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <Receipt size={16} className="text-violet-500" />
              <p className="text-gray-700 font-bold text-sm">영수증 사진</p>
              <span className="text-xs bg-red-50 text-red-400 px-2 py-0.5 rounded-full font-medium border border-red-100">필수</span>
            </div>
            <p className="text-xs text-gray-400 mb-4">AI가 메뉴와 가격을 자동으로 읽어 리뷰에 반영해요</p>

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
                      <p className="text-xs text-violet-500 mt-0.5">✓ OCR 분석 예정</p>
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
                    <button onClick={() => removeFile(f)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-800 rounded-full flex items-center justify-center shadow">
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
              receipts.length > 0 ? `bg-gradient-to-r ${STORE_DATA.coverColor}` : 'bg-gray-200 text-gray-400'
            }`}>
            <Sparkles size={20} />
            AI 리뷰 자동 생성하기
          </button>
          {receipts.length === 0 && <p className="text-center text-xs text-gray-400 mt-2">영수증 사진을 먼저 업로드해주세요</p>}
        </div>
      </div>
    );
  }

  // ── 분석 중 화면 ─────────────────────────────────────────────
  if (step === 2) {
    const steps = [
      { label: '영수증 OCR — 메뉴 & 가격 추출', done: analysisProgress >= 30 },
      { label: '음식 사진 비주얼 분석', done: analysisProgress >= 55 },
      { label: 'SEO 키워드 자동 매핑', done: analysisProgress >= 75 },
      { label: '최적화 리뷰 문장 생성', done: analysisProgress >= 100 },
    ];

    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-8">
        <div className="text-center w-full max-w-sm">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${STORE_DATA.coverColor} opacity-20 animate-ping`} />
            <div className={`relative w-24 h-24 rounded-full bg-gradient-to-br ${STORE_DATA.coverColor} flex items-center justify-center shadow-xl`}>
              <Sparkles size={32} className="text-white animate-spin" />
            </div>
          </div>

          <h2 className="text-gray-900 font-black text-2xl mb-1">AI 분석 중...</h2>
          <p className="text-gray-500 text-sm mb-2">{analysisStep || '잠시만 기다려주세요!'}</p>

          {/* 프로그레스 바 */}
          <div className="w-full bg-gray-100 rounded-full h-2 mb-8">
            <div
              className={`h-2 rounded-full bg-gradient-to-r ${STORE_DATA.coverColor} transition-all duration-500`}
              style={{ width: `${analysisProgress}%` }}
            />
          </div>

          <div className="space-y-3 text-left">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                  s.done ? `bg-gradient-to-br ${STORE_DATA.coverColor}` : 'bg-gray-100'
                }`}>
                  {s.done
                    ? <Check size={12} className="text-white" />
                    : <Loader2 size={12} className="text-gray-400 animate-spin" />
                  }
                </div>
                <p className={`text-sm transition-all ${s.done ? 'text-gray-800 font-semibold' : 'text-gray-400'}`}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── 완료 화면 ────────────────────────────────────────────────
  if (step === 3) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className={`bg-gradient-to-br ${STORE_DATA.coverColor} px-5 pt-12 pb-8 text-center relative overflow-hidden`}>
          <div className="absolute inset-0 bg-black/10" />
          <div className="relative">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-sm border border-white/30">
              <ThumbsUp size={24} className="text-white" />
            </div>
            <h2 className="text-white font-black text-xl">리뷰 완성! 🎉</h2>
            <p className="text-white/70 text-sm mt-1">복사 후 네이버 플레이스에 붙여넣기만 하면 돼요</p>
          </div>
        </div>

        <div className="px-5 py-5 space-y-4 pb-32">

          {/* 추출된 메뉴 태그 */}
          {extractedMenu.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs font-bold text-gray-500 mb-2">🧾 영수증에서 찾은 메뉴</p>
              <div className="flex flex-wrap gap-1.5">
                {extractedMenu.map((menu, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 bg-violet-50 text-violet-700 rounded-lg font-medium border border-violet-100">
                    {menu}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 생성된 리뷰 */}
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
              {[STORE_DATA.mainKeyword, ...STORE_DATA.subKeywords].map(kw => (
                <span key={kw} className="text-xs px-2 py-1 bg-violet-50 text-violet-600 rounded-lg font-medium border border-violet-100">#{kw}</span>
              ))}
            </div>
          </div>

          <button onClick={copyReview}
            className={`w-full py-4 rounded-2xl font-black text-base transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg ${
              copied ? 'bg-emerald-500 text-white' : `bg-gradient-to-r ${STORE_DATA.coverColor} text-white`
            }`}>
            {copied ? <><Check size={20} />클립보드에 복사됨!</> : <><Copy size={20} />리뷰 전체 복사하기</>}
          </button>

          <a href={STORE_DATA.naverUrl} target="_blank" rel="noopener noreferrer"
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
                  <span className="font-bold">{STORE_DATA.reward}</span>를 즉시 드려요!
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