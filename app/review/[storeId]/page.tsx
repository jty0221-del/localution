'use client';

import { useState, useRef } from 'react';
import {
  Camera, Receipt, Star, Copy, Check, ChevronRight,
  ChevronLeft, Sparkles, Gift, MapPin,
  ImagePlus, X, Loader2, ThumbsUp, ExternalLink
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

export default function CustomerReviewPage() {
  const [step, setStep] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState('');
  const [generatedReview, setGeneratedReview] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const receiptInputRef = useRef<HTMLInputElement>(null);
  const foodInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (files: FileList | null, type: 'receipt' | 'food') => {
    if (!files) return;
    const newFiles: UploadedFile[] = Array.from(files).map(file => ({
      file,
      preview: URL.createObjectURL(file),
      type,
    }));
    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (idx: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const receipts = uploadedFiles.filter(f => f.type === 'receipt');
  const foodPhotos = uploadedFiles.filter(f => f.type === 'food');

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const generateReview = async () => {
    setIsAnalyzing(true);
    setError('');
    setStep(2);

    try {
      const imageContents: object[] = [];

      setAnalysisStep('📸 사진을 분석하는 중...');
      for (const uploaded of uploadedFiles) {
        const base64 = await fileToBase64(uploaded.file);
        imageContents.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: uploaded.file.type,
            data: base64,
          },
        });
      }

      setAnalysisStep('🧾 영수증에서 메뉴를 찾는 중...');
      await new Promise(r => setTimeout(r, 800));
      setAnalysisStep('✨ SEO 키워드를 녹여 리뷰를 쓰는 중...');

      const toneGuide =
        STORE_DATA.tone === 'gen-z' ? 'Z세대 힙하고 트렌디한 말투, 이모지 자연스럽게 2~3개' :
        STORE_DATA.tone === 'mom' ? '맘카페 스타일 따뜻하고 신뢰감 있는 말투' :
        '격조 있는 미식가 스타일, 음식 묘사 풍부하게';

      const prompt = `당신은 맛집 리뷰 전문가입니다. 아래 정보를 바탕으로 네이버 플레이스에 올릴 SEO 최적화 리뷰를 작성하세요.

[매장 정보]
- 매장명: ${STORE_DATA.name}
- 카테고리: ${STORE_DATA.category}
- 위치: ${STORE_DATA.address}
- 대표 키워드: ${STORE_DATA.mainKeyword}
- 서브 키워드: ${STORE_DATA.subKeywords.join(', ')}

[업로드된 사진]
${receipts.length > 0 ? '- 영수증 사진 포함: 메뉴명과 가격을 파악해 리뷰에 자연스럽게 반영하세요.' : ''}
${foodPhotos.length > 0 ? '- 음식/매장 사진 포함: 비주얼을 생생하게 묘사하세요.' : ''}

[별점]: ${rating}점

[작성 규칙]
- 말투: ${toneGuide}
- 길이: 150~250자 (네이버 플레이스 최적)
- 대표 키워드 "${STORE_DATA.mainKeyword}"를 자연스럽게 첫 문단에 포함
- 서브 키워드 중 2개 이상 자연스럽게 포함
- 구체적인 메뉴명, 가격, 분위기 언급
- 재방문 의사 표현으로 마무리
- 리뷰 본문만 출력 (설명, 제목 없이)`;

      // 🔑 Claude Vision API 연동
      const response = await fetch('https://api.anthropic.com/v1/messages', {
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
            content: [
              ...imageContents,
              { type: 'text', text: prompt }
            ],
          }],
        }),
      });

      const data = await response.json();
      const review = data.content?.[0]?.text || '리뷰 생성에 실패했습니다.';
      setGeneratedReview(review);
      setStep(3);

    } catch {
      setError('분석 중 오류가 발생했어요. 다시 시도해 주세요.');
      setStep(1);
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep('');
    }
  };

  const copyReview = () => {
    navigator.clipboard.writeText(generatedReview);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // ── 인트로 화면 ──
  if (step === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className={`bg-gradient-to-br ${STORE_DATA.coverColor} px-6 pt-14 pb-10 relative overflow-hidden`}>
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-5 -left-5 w-32 h-32 bg-white/10 rounded-full blur-xl" />
          <div className="relative text-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl border border-white/30">
              <span className="text-3xl">☕</span>
            </div>
            <h1 className="text-white font-black text-2xl leading-tight">{STORE_DATA.name}</h1>
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <MapPin size={13} className="text-white/70" />
              <p className="text-white/70 text-sm">{STORE_DATA.address}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 px-5 -mt-5 relative">
          <div className="bg-white rounded-3xl shadow-2xl shadow-black/10 p-6 border border-gray-100">
            <div className="flex items-center gap-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl px-4 py-3 mb-6">
              <Gift size={18} className="text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-amber-600 font-semibold">리뷰 작성 완료 시 즉시 지급!</p>
                <p className="text-sm font-bold text-amber-800">{STORE_DATA.reward}</p>
              </div>
            </div>

            <h2 className="text-gray-900 font-black text-xl mb-1">1분만에 리뷰 완성! ✨</h2>
            <p className="text-gray-500 text-sm mb-6">영수증 사진 하나면 AI가 리뷰를 대신 써드려요</p>

            <div className="space-y-3 mb-7">
              {[
                { emoji: '🧾', title: '영수증 사진 찍기', desc: '계산서 or 영수증을 카메라로 찍어주세요' },
                { emoji: '📸', title: '맛있는 사진 추가 (선택)', desc: '음식이나 매장 사진을 추가하면 리뷰가 더 풍부해져요' },
                { emoji: '🤖', title: 'AI가 리뷰 자동 완성', desc: 'SEO 최적화 리뷰를 10초 안에 써드려요' },
                { emoji: '📋', title: '복사 → 네이버에 붙여넣기', desc: '클립보드에 복사 후 네이버 플레이스에 붙여넣기만!' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0 text-lg">
                    {item.emoji}
                  </div>
                  <div className="pt-0.5">
                    <p className="text-gray-800 text-sm font-bold">{item.title}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep(1)}
              className={`w-full py-4 rounded-2xl bg-gradient-to-r ${STORE_DATA.coverColor} text-white font-black text-base shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2`}
            >
              <Camera size={20} />
              리뷰 작성 시작하기
              <ChevronRight size={18} />
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

  // ── 업로드 화면 ──
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

        <div className="px-5 py-6 space-y-5 pb-32">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-gray-700 font-bold text-sm mb-3">방문 만족도</p>
            <div className="flex gap-2 justify-center">
              {[1,2,3,4,5].map(star => (
                <button key={star} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)} onClick={() => setRating(star)} className="transition-transform active:scale-90">
                  <Star size={36} className={`transition-colors ${star <= (hoverRating || rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                </button>
              ))}
            </div>
            <p className="text-center text-sm font-bold text-amber-500 mt-2">
              {rating === 5 ? '최고예요! 🔥' : rating === 4 ? '좋아요 👍' : rating === 3 ? '보통이에요' : rating === 2 ? '별로였어요' : '실망했어요'}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Receipt size={16} className="text-violet-500" />
              <p className="text-gray-700 font-bold text-sm">영수증 사진</p>
              <span className="text-xs bg-red-50 text-red-400 px-2 py-0.5 rounded-full font-medium border border-red-100">필수</span>
            </div>
            <p className="text-xs text-gray-400 mb-3">AI가 메뉴와 가격을 자동으로 읽어요</p>
            <input ref={receiptInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={e => handleFileUpload(e.target.files, 'receipt')} />
            {receipts.length === 0 ? (
              <button onClick={() => receiptInputRef.current?.click()} className="w-full border-2 border-dashed border-violet-200 rounded-2xl py-8 flex flex-col items-center gap-2 bg-violet-50/50 active:bg-violet-100 transition-all">
                <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center">
                  <Receipt size={22} className="text-violet-500" />
                </div>
                <p className="text-violet-600 font-bold text-sm">영수증 촬영하기</p>
                <p className="text-violet-400 text-xs">탭하면 카메라가 열려요</p>
              </button>
            ) : (
              <div className="space-y-2">
                {receipts.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl">
                    <img src={f.preview} className="w-12 h-12 rounded-xl object-cover" alt="receipt" />
                    <p className="flex-1 text-xs text-gray-600 truncate">{f.file.name}</p>
                    <button onClick={() => removeFile(uploadedFiles.indexOf(f))}><X size={16} className="text-gray-400" /></button>
                  </div>
                ))}
                <button onClick={() => receiptInputRef.current?.click()} className="w-full py-2 text-xs text-violet-500 font-medium">+ 추가</button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Camera size={16} className="text-pink-500" />
              <p className="text-gray-700 font-bold text-sm">음식 · 매장 사진</p>
              <span className="text-xs bg-gray-50 text-gray-400 px-2 py-0.5 rounded-full font-medium border border-gray-100">선택</span>
            </div>
            <p className="text-xs text-gray-400 mb-3">사진이 있으면 리뷰가 훨씬 더 생생해져요</p>
            <input ref={foodInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={e => handleFileUpload(e.target.files, 'food')} />
            <div className="grid grid-cols-3 gap-2">
              {foodPhotos.map((f, i) => (
                <div key={i} className="relative aspect-square">
                  <img src={f.preview} className="w-full h-full rounded-xl object-cover" alt="food" />
                  <button onClick={() => removeFile(uploadedFiles.indexOf(f))} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-800 rounded-full flex items-center justify-center">
                    <X size={11} className="text-white" />
                  </button>
                </div>
              ))}
              <button onClick={() => foodInputRef.current?.click()} className="aspect-square border-2 border-dashed border-pink-200 rounded-xl flex flex-col items-center justify-center gap-1 bg-pink-50/50">
                <ImagePlus size={20} className="text-pink-400" />
                <span className="text-xs text-pink-400 font-medium">추가</span>
              </button>
            </div>
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-600 text-sm text-center">{error}</div>}
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-5">
          <button onClick={generateReview} disabled={receipts.length === 0}
            className={`w-full py-4 rounded-2xl font-black text-base text-white shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${receipts.length > 0 ? `bg-gradient-to-r ${STORE_DATA.coverColor}` : 'bg-gray-200 text-gray-400'}`}>
            <Sparkles size={20} />
            AI 리뷰 자동 생성하기
          </button>
          {receipts.length === 0 && <p className="text-center text-xs text-gray-400 mt-2">영수증 사진을 먼저 업로드해주세요</p>}
        </div>
      </div>
    );
  }

  // ── 분석 중 화면 ──
  if (step === 2) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-8">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${STORE_DATA.coverColor} opacity-20 animate-ping`} />
            <div className={`relative w-24 h-24 rounded-full bg-gradient-to-br ${STORE_DATA.coverColor} flex items-center justify-center shadow-xl`}>
              <Sparkles size={32} className="text-white animate-spin" />
            </div>
          </div>
          <h2 className="text-gray-900 font-black text-2xl mb-2">AI 분석 중...</h2>
          <p className="text-gray-500 text-sm mb-8">{analysisStep || '사진을 열심히 분석하고 있어요!'}</p>
          <div className="space-y-3 text-left w-full max-w-xs mx-auto">
            {['영수증에서 메뉴 정보 추출', '음식 사진 비주얼 분석', 'SEO 키워드 자동 매핑', '최적화 리뷰 문장 생성'].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${i < 2 ? `bg-gradient-to-br ${STORE_DATA.coverColor}` : 'bg-gray-100'}`}>
                  {i < 2 ? <Check size={11} className="text-white" /> : <Loader2 size={11} className="text-gray-400 animate-spin" />}
                </div>
                <p className={`text-sm ${i < 2 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── 완료 화면 ──
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
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-violet-500" />
                <p className="text-gray-700 font-bold text-sm">AI 생성 리뷰</p>
              </div>
              <div className="flex gap-1">
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
            className={`w-full py-4 rounded-2xl font-black text-base transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg ${copied ? 'bg-emerald-500 text-white' : `bg-gradient-to-r ${STORE_DATA.coverColor} text-white`}`}>
            {copied ? <><Check size={20} /> 클립보드에 복사됨!</> : <><Copy size={20} /> 리뷰 전체 복사하기</>}
          </button>

          <a href={STORE_DATA.naverUrl} target="_blank" rel="noopener noreferrer"
            className="w-full py-4 rounded-2xl font-bold text-sm border-2 border-emerald-500 text-emerald-600 flex items-center justify-center gap-2 bg-white active:bg-emerald-50 transition-all">
            <ExternalLink size={18} />
            네이버 플레이스 열기 (붙여넣기)
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

          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <p className="text-gray-600 font-bold text-xs mb-3">📋 마지막 단계</p>
            <div className="space-y-2">
              {['위 버튼으로 리뷰 복사', '네이버 플레이스 버튼 탭', '리뷰 쓰기 → 붙여넣기', '사장님께 화면 보여주기 → 보상 수령!'].map((s, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-gradient-to-br ${STORE_DATA.coverColor} text-white`}>{i+1}</div>
                  <p className="text-gray-600 text-xs">{s}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-5">
          <button onClick={() => { setStep(1); setGeneratedReview(''); setCopied(false); }}
            className="w-full py-3 rounded-2xl font-bold text-sm border border-gray-200 text-gray-500 active:bg-gray-50 transition-all">
            다시 생성하기
          </button>
        </div>
      </div>
    );
  }

  return null;
}
