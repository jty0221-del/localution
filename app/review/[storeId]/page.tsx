'use client';

import { useState, useRef } from 'react';
import {
  Star, Camera, Upload, Loader2, Copy, Check,
  ChevronRight, ChevronLeft, Sparkles, Gift,
  MapPin, ExternalLink, X, Image
} from 'lucide-react';

const STORE_INFO = {
  name: '하랑마케팅 카페',
  address: '경기도 부천시 소사구 신중동',
  category: '카페',
  reward: '리뷰 작성 시 음료 1잔 무료!',
  naverUrl: 'https://naver.me/example',
  googleUrl: 'https://g.page/example',
  kakaoUrl: 'https://place.map.kakao.com/example',
};

const STEPS = ['정보 입력', '사진 업로드', '리뷰 생성', '등록하기'];

const ageGroups = ['10대', '20대', '30대', '40대', '50대 이상'];
const genderOptions = [{ id: 'male', label: '남성', emoji: '👨' }, { id: 'female', label: '여성', emoji: '👩' }];
const visitTypes = ['혼자', '친구와', '연인과', '가족과', '동료와'];
const toneOptions = [
  { id: 'natural', label: '자연스럽게', emoji: '😊' },
  { id: 'cute', label: '귀엽게', emoji: '🥰' },
  { id: 'formal', label: '정중하게', emoji: '🤵' },
  { id: 'trendy', label: '트렌디하게', emoji: '✨' },
];

export default function CustomerReviewPage() {
  const [step, setStep] = useState(0);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [visitType, setVisitType] = useState('');
  const [tone, setTone] = useState('natural');
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [generatedReview, setGeneratedReview] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toBase64 = (file: File): Promise<string> => new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > 3) {
      alert('사진은 최대 3장까지 업로드 가능해요!');
      return;
    }
    files.forEach(file => {
      setPhotoFiles(prev => [...prev, file]);
      setPhotos(prev => [...prev, URL.createObjectURL(file)]);
    });
  };

  const removePhoto = (idx: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
    setPhotoFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const generateReview = async () => {
    setIsGenerating(true);
    setGeneratedReview('');

    const toneGuide: Record<string, string> = {
      natural: '자연스럽고 솔직한 말투',
      cute: '귀엽고 친근한 이모지 활용 말투',
      formal: '정중하고 격식 있는 말투',
      trendy: 'MZ세대 트렌디한 말투',
    };

    try {
      const messages: object[] = [];
      const content: object[] = [];

      // 사진이 있으면 Vision AI 분석
      if (photoFiles.length > 0) {
        for (const file of photoFiles) {
          const base64 = await toBase64(file);
          content.push({
            type: 'image',
            source: { type: 'base64', media_type: file.type, data: base64 }
          });
        }
      }

      content.push({
        type: 'text',
        text: `당신은 ${STORE_INFO.category} 방문 고객입니다.

아래 정보를 바탕으로 네이버 플레이스에 올릴 리뷰를 작성해주세요.

매장명: ${STORE_INFO.name}
방문자 정보: ${age} ${gender === 'male' ? '남성' : '여성'}, ${visitType} 방문
별점: ${rating}점
말투: ${toneGuide[tone]}
${photoFiles.length > 0 ? '첨부된 사진을 참고해서 음식/음료/공간을 구체적으로 언급해주세요.' : ''}

규칙:
- 3~5문장으로 자연스럽게
- "${STORE_INFO.address.split(' ').slice(-1)[0]}" 지역명 자연스럽게 포함
- 방문자 특성에 맞는 포인트 강조
- 재방문 의사 표현으로 마무리
- 리뷰 내용만 출력 (다른 설명 없이)`
      });

      messages.push({ role: 'user', content });

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
          max_tokens: 400,
          messages,
        })
      });

      const data = await response.json();
      setGeneratedReview(data.content?.[0]?.text || '리뷰 생성 실패');
    } catch {
      setGeneratedReview('오류가 발생했어요. 다시 시도해주세요.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyAndOpen = (platform: string, url: string) => {
    navigator.clipboard.writeText(generatedReview);
    setCopied(platform);
    setSelectedPlatform(platform);
    setTimeout(() => {
      window.open(url, '_blank');
    }, 500);
  };

  const canNext = () => {
    if (step === 0) return rating > 0 && age && gender && visitType;
    if (step === 1) return true;
    if (step === 2) return generatedReview.length > 0;
    return true;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFB] flex flex-col max-w-md mx-auto">

      {/* 매장 헤더 */}
      <div className="bg-gradient-to-br from-[#3182F6] to-[#1B6EF3] px-5 pt-12 pb-8">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
            <MapPin size={16} className="text-white" />
          </div>
          <span className="text-blue-100 text-xs">{STORE_INFO.address}</span>
        </div>
        <h1 className="text-white font-black text-2xl mb-1">{STORE_INFO.name}</h1>
        <div className="flex items-center gap-2 mt-3 bg-white/15 rounded-2xl px-4 py-2.5">
          <Gift size={15} className="text-amber-300 flex-shrink-0" />
          <p className="text-white text-sm font-medium">{STORE_INFO.reward}</p>
        </div>
      </div>

      {/* 스텝 인디케이터 */}
      <div className="bg-white border-b border-[#E5EAF2] px-5 py-4">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                i < step ? 'bg-[#00C073] text-white' :
                i === step ? 'bg-[#3182F6] text-white' :
                'bg-[#F2F4F6] text-[#B0B8C1]'
              }`}>
                {i < step ? <Check size={12} /> : i + 1}
              </div>
              <span className={`text-xs font-bold hidden sm:block ${i === step ? 'text-[#3182F6]' : 'text-[#B0B8C1]'}`}>{s}</span>
              {i < STEPS.length - 1 && (
                <div className={`w-6 h-0.5 mx-1 transition-all ${i < step ? 'bg-[#00C073]' : 'bg-[#E5EAF2]'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 컨텐츠 */}
      <div className="flex-1 px-5 py-6 space-y-5">

        {/* ── Step 0: 기본 정보 ── */}
        {step === 0 && (
          <>
            {/* 별점 */}
            <div className="bg-white rounded-2xl border border-[#E5EAF2] p-5">
              <p className="text-[#191F28] font-bold text-sm mb-4 text-center">오늘 방문은 어떠셨나요?</p>
              <div className="flex justify-center gap-3 mb-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    className="transition-transform hover:scale-110 active:scale-95">
                    <Star
                      size={40}
                      className={`transition-colors ${star <= (hoverRating || rating) ? 'text-amber-400 fill-amber-400' : 'text-[#E5EAF2]'}`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-center text-sm font-bold text-[#8B95A1]">
                {rating === 0 ? '별점을 선택해주세요' :
                 rating === 1 ? '😢 아쉬웠어요' :
                 rating === 2 ? '😐 보통이었어요' :
                 rating === 3 ? '🙂 괜찮았어요' :
                 rating === 4 ? '😊 좋았어요' : '🤩 최고였어요!'}
              </p>
            </div>

            {/* 성별 */}
            <div className="bg-white rounded-2xl border border-[#E5EAF2] p-5">
              <p className="text-[#191F28] font-bold text-sm mb-3">성별</p>
              <div className="grid grid-cols-2 gap-2">
                {genderOptions.map(g => (
                  <button key={g.id} onClick={() => setGender(g.id)}
                    className={`py-3 rounded-xl border-2 font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                      gender === g.id ? 'border-[#3182F6] bg-[#EBF3FF] text-[#3182F6]' : 'border-[#E5EAF2] text-[#8B95A1]'
                    }`}>
                    <span className="text-xl">{g.emoji}</span>{g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 연령대 */}
            <div className="bg-white rounded-2xl border border-[#E5EAF2] p-5">
              <p className="text-[#191F28] font-bold text-sm mb-3">연령대</p>
              <div className="grid grid-cols-5 gap-2">
                {ageGroups.map(a => (
                  <button key={a} onClick={() => setAge(a)}
                    className={`py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${
                      age === a ? 'border-[#3182F6] bg-[#EBF3FF] text-[#3182F6]' : 'border-[#E5EAF2] text-[#8B95A1]'
                    }`}>
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* 방문 유형 */}
            <div className="bg-white rounded-2xl border border-[#E5EAF2] p-5">
              <p className="text-[#191F28] font-bold text-sm mb-3">누구와 방문하셨나요?</p>
              <div className="grid grid-cols-3 gap-2">
                {visitTypes.map(v => (
                  <button key={v} onClick={() => setVisitType(v)}
                    className={`py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${
                      visitType === v ? 'border-[#3182F6] bg-[#EBF3FF] text-[#3182F6]' : 'border-[#E5EAF2] text-[#8B95A1]'
                    }`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* 말투 */}
            <div className="bg-white rounded-2xl border border-[#E5EAF2] p-5">
              <p className="text-[#191F28] font-bold text-sm mb-3">리뷰 말투 선택</p>
              <div className="grid grid-cols-2 gap-2">
                {toneOptions.map(t => (
                  <button key={t.id} onClick={() => setTone(t.id)}
                    className={`py-3 rounded-xl border-2 text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      tone === t.id ? 'border-[#3182F6] bg-[#EBF3FF] text-[#3182F6]' : 'border-[#E5EAF2] text-[#8B95A1]'
                    }`}>
                    <span>{t.emoji}</span>{t.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Step 1: 사진 업로드 ── */}
        {step === 1 && (
          <>
            <div className="bg-white rounded-2xl border border-[#E5EAF2] p-5">
              <div className="flex items-center gap-2 mb-2">
                <Camera size={16} className="text-[#3182F6]" />
                <p className="text-[#191F28] font-bold text-sm">사진 업로드 (선택)</p>
              </div>
              <p className="text-[#8B95A1] text-xs mb-4">음식, 음료, 매장 사진을 올리면 AI가 더 구체적인 리뷰를 작성해드려요!</p>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {photos.map((photo, idx) => (
                  <div key={idx} className="relative aspect-square">
                    <img src={photo} alt="" className="w-full h-full object-cover rounded-xl" />
                    <button onClick={() => removePhoto(idx)}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center">
                      <X size={10} className="text-white" />
                    </button>
                  </div>
                ))}
                {photos.length < 3 && (
                  <button onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-xl border-2 border-dashed border-[#E5EAF2] hover:border-[#3182F6] flex flex-col items-center justify-center gap-1 transition-all">
                    <Image size={20} className="text-[#B0B8C1]" />
                    <span className="text-[#B0B8C1] text-xs">추가</span>
                  </button>
                )}
              </div>

              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />

              <button onClick={() => fileInputRef.current?.click()}
                className="w-full py-3.5 rounded-xl border-2 border-dashed border-[#E5EAF2] hover:border-[#3182F6] text-[#8B95A1] hover:text-[#3182F6] text-sm font-bold flex items-center justify-center gap-2 transition-all">
                <Upload size={16} />사진 선택하기 (최대 3장)
              </button>
            </div>

            <div className="bg-[#EBF3FF] rounded-2xl p-4 border border-blue-100">
              <p className="text-[#3182F6] text-xs font-bold mb-2">📸 이런 사진이 좋아요!</p>
              <div className="space-y-1.5">
                {['주문한 음식이나 음료', '매장 내부 분위기', '인상적인 디테일 (플레이팅 등)'].map((tip, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#3182F6] flex-shrink-0" />
                    <p className="text-[#3182F6] text-xs">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Step 2: 리뷰 생성 ── */}
        {step === 2 && (
          <>
            <div className="bg-white rounded-2xl border border-[#E5EAF2] p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-[#3182F6]" />
                <p className="text-[#191F28] font-bold text-sm">AI 리뷰 생성</p>
              </div>

              {/* 선택 정보 요약 */}
              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  `⭐ ${rating}점`,
                  gender === 'male' ? '👨 남성' : '👩 여성',
                  `${age}`,
                  visitType,
                  toneOptions.find(t => t.id === tone)?.label || '',
                  photos.length > 0 ? `📸 ${photos.length}장` : ''
                ].filter(Boolean).map((item, i) => (
                  <span key={i} className="text-xs bg-[#F2F4F6] text-[#8B95A1] px-2.5 py-1 rounded-lg font-medium">{item}</span>
                ))}
              </div>

              {!generatedReview && !isGenerating && (
                <button onClick={generateReview}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-[#3182F6] to-[#1B6EF3] text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-200">
                  <Sparkles size={16} />AI 리뷰 자동 생성하기
                </button>
              )}

              {isGenerating && (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <Loader2 size={32} className="animate-spin text-[#3182F6]" />
                  <p className="text-[#8B95A1] text-sm font-medium">
                    {photos.length > 0 ? '사진 분석 중...' : 'AI가 리뷰를 작성하고 있어요...'}
                  </p>
                </div>
              )}

              {generatedReview && !isGenerating && (
                <div>
                  <div className="p-4 rounded-xl bg-[#F8FAFB] border border-[#E5EAF2] mb-3">
                    <p className="text-[#191F28] text-sm leading-relaxed whitespace-pre-line">{generatedReview}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={generateReview}
                      className="flex-1 py-2.5 rounded-xl border border-[#E5EAF2] text-[#8B95A1] text-xs font-bold hover:bg-[#F2F4F6] transition-all">
                      다시 생성
                    </button>
                    <button onClick={() => { navigator.clipboard.writeText(generatedReview); setCopied('all'); setTimeout(() => setCopied(''), 2000); }}
                      className="flex-1 py-2.5 rounded-xl bg-[#EBF3FF] text-[#3182F6] text-xs font-bold flex items-center justify-center gap-1.5 transition-all">
                      {copied === 'all' ? <><Check size={12} />복사됨!</> : <><Copy size={12} />리뷰 복사</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Step 3: 등록하기 ── */}
        {step === 3 && (
          <>
            <div className="bg-white rounded-2xl border border-[#E5EAF2] p-5">
              <p className="text-[#191F28] font-black text-base mb-1 text-center">리뷰를 등록해주세요! 🎉</p>
              <p className="text-[#8B95A1] text-xs text-center mb-5">버튼을 누르면 리뷰가 복사되고 해당 앱이 열려요</p>

              <div className="p-4 rounded-xl bg-[#F8FAFB] border border-[#E5EAF2] mb-5">
                <p className="text-[#191F28] text-sm leading-relaxed whitespace-pre-line">{generatedReview}</p>
              </div>

              <div className="space-y-3">
                {[
                  { name: '네이버 플레이스', emoji: '🟢', color: 'bg-[#03C75A] hover:bg-[#02b350]', url: STORE_INFO.naverUrl, desc: '네이버 지도 리뷰' },
                  { name: '구글 맵', emoji: '📍', color: 'bg-[#4285F4] hover:bg-[#3367D6]', url: STORE_INFO.googleUrl, desc: 'Google Maps 리뷰' },
                  { name: '카카오 맵', emoji: '💛', color: 'bg-[#FEE500] hover:bg-[#F0D800]', url: STORE_INFO.kakaoUrl, desc: '카카오맵 리뷰', textColor: 'text-[#191F28]' },
                ].map(platform => (
                  <button key={platform.name}
                    onClick={() => copyAndOpen(platform.name, platform.url)}
                    className={`w-full ${platform.color} ${platform.textColor || 'text-white'} py-4 rounded-2xl font-bold text-sm flex items-center justify-between px-5 transition-all active:scale-95 shadow-sm`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{platform.emoji}</span>
                      <div className="text-left">
                        <p className="font-black">{platform.name}</p>
                        <p className="text-xs opacity-70">{platform.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {copied === platform.name ? (
                        <span className="text-xs bg-white/20 px-2 py-1 rounded-lg">복사됨 ✓</span>
                      ) : (
                        <ExternalLink size={16} className="opacity-70" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 리워드 */}
            <div className="bg-gradient-to-r from-amber-400 to-orange-400 rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl flex-shrink-0">
                  🎁
                </div>
                <div>
                  <p className="text-white font-black text-sm">리뷰 등록 완료!</p>
                  <p className="text-amber-100 text-xs mt-0.5">{STORE_INFO.reward}</p>
                  <p className="text-amber-100 text-xs mt-1">카운터에서 직원에게 보여주세요 😊</p>
                </div>
              </div>
            </div>
          </>
        )}

      </div>

      {/* 하단 버튼 */}
      <div className="bg-white border-t border-[#E5EAF2] px-5 py-4 flex gap-3">
        {step > 0 && (
          <button onClick={() => setStep(step - 1)}
            className="w-12 h-12 rounded-xl border border-[#E5EAF2] flex items-center justify-center flex-shrink-0">
            <ChevronLeft size={20} className="text-[#8B95A1]" />
          </button>
        )}
        {step < 3 && (
          <button
            onClick={() => {
              if (step === 1) { setStep(2); }
              else if (step === 2 && generatedReview) { setStep(3); }
              else if (step === 2 && !generatedReview) { generateReview(); }
              else { setStep(step + 1); }
            }}
            disabled={!canNext()}
            className="flex-1 py-3.5 rounded-xl bg-[#3182F6] hover:bg-[#1B6EF3] disabled:opacity-40 text-white font-black text-sm flex items-center justify-center gap-2 transition-all">
            {step === 2 && !generatedReview ? <><Sparkles size={15} />AI 리뷰 생성</> :
             step === 2 && generatedReview ? <>다음 단계 <ChevronRight size={15} /></> :
             <>다음 <ChevronRight size={15} /></>}
          </button>
        )}
        {step === 3 && (
          <button onClick={() => { setStep(0); setRating(0); setAge(''); setGender(''); setVisitType(''); setPhotos([]); setPhotoFiles([]); setGeneratedReview(''); setCopied(''); }}
            className="flex-1 py-3.5 rounded-xl bg-[#F2F4F6] text-[#8B95A1] font-bold text-sm transition-all">
            처음으로
          </button>
        )}
      </div>
    </div>
  );
}
