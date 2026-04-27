'use client'
export const dynamic = 'force-dynamic'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import Sidebar from '../../components/Sidebar'
import PageHeader from '../../components/PageHeader'
import Footer from '../../components/Footer'
import { nearestRegions, COMMUNITY_REGIONS } from '../../lib/regions-community'

// ── 대·중·소 분류 계층 ─────────────────────────────────────────
interface SubItem { name: string; keywords: string[] }
interface MidCategory { name: string; subs: SubItem[] }
interface TopCategory { name: string; mids: MidCategory[] }

const CATEGORY_TREE: TopCategory[] = [
  {
    name: '음식점', mids: [
      { name: '한식', subs: [
        { name: '백반·정식', keywords: ['백반', '정식', '한식뷔페', '집밥', '가정식'] },
        { name: '국밥·탕', keywords: ['국밥', '순댓국', '설렁탕', '곰탕', '해장국'] },
        { name: '고기구이', keywords: ['삼겹살', '소고기', '갈비', '돼지갈비', '한우'] },
        { name: '찌개·전골', keywords: ['찌개', '부대찌개', '김치찌개', '순두부', '전골'] },
        { name: '냉면·국수', keywords: ['냉면', '국수', '칼국수', '막국수', '비빔냉면'] },
        { name: '한정식', keywords: ['한정식', '궁중요리', '코스한식', '전통음식', '사찰음식'] },
      ]},
      { name: '중식', subs: [
        { name: '짜장·짬뽕', keywords: ['짜장면', '짬뽕', '중국집', '차돌짬뽕', '볶음밥'] },
        { name: '마라·훠궈', keywords: ['마라탕', '훠궈', '마라샹궈', '마라', '훠궈뷔페'] },
        { name: '딤섬·코스', keywords: ['딤섬', '중식코스', '광둥요리', '북경오리', '연회'] },
        { name: '탕수육·기타', keywords: ['탕수육', '깐풍기', '유산슬', '양장피', '팔보채'] },
      ]},
      { name: '일식', subs: [
        { name: '초밥·스시', keywords: ['초밥', '스시', '오마카세', '회전초밥', '스시뷔페'] },
        { name: '라멘·우동', keywords: ['라멘', '우동', '소바', '츠케멘', '돈코츠라멘'] },
        { name: '돈카츠·덮밥', keywords: ['돈카츠', '카츠동', '규동', '오야코동', '텐동'] },
        { name: '이자카야', keywords: ['이자카야', '야키토리', '꼬치', '일식주점', '오뎅'] },
        { name: '회·해산물', keywords: ['회', '해산물', '모둠회', '광어', '참치'] },
      ]},
      { name: '양식', subs: [
        { name: '파스타·피자', keywords: ['파스타', '피자', '화덕피자', '리조또', '뇨끼'] },
        { name: '스테이크·그릴', keywords: ['스테이크', '그릴', '립', '통삼겹', '바베큐'] },
        { name: '버거', keywords: ['버거', '수제버거', '스매시버거', '햄버거', '감자튀김'] },
        { name: '샐러드·비건', keywords: ['샐러드', '비건', '채식', '포케', '그레인볼'] },
      ]},
      { name: '분식·패스트푸드', subs: [
        { name: '분식', keywords: ['분식', '떡볶이', '순대', '튀김', '라볶이'] },
        { name: '치킨', keywords: ['치킨', '후라이드', '양념치킨', '닭강정', '닭발'] },
        { name: '도시락·김밥', keywords: ['도시락', '김밥', '주먹밥', '충무김밥', '삼각김밥'] },
        { name: '샌드위치', keywords: ['샌드위치', '서브웨이', '베이글', '토스트', '랩'] },
      ]},
      { name: '아시안', subs: [
        { name: '베트남', keywords: ['쌀국수', '베트남음식', '반미', '분짜', '포'] },
        { name: '태국', keywords: ['팟타이', '태국음식', '쏨땀', '카오팟', '똠양꿍'] },
        { name: '인도·중동', keywords: ['인도음식', '커리', '난', '케밥', '할랄'] },
        { name: '멕시칸', keywords: ['타코', '부리또', '나초', '멕시칸', '퀘사디아'] },
      ]},
    ]
  },
  {
    name: '카페·디저트', mids: [
      { name: '카페', subs: [
        { name: '커피전문점', keywords: ['카페', '커피', '아메리카노', '라떼', '핸드드립'] },
        { name: '브런치카페', keywords: ['브런치카페', '브런치', '에그베네딕트', '팬케이크', '와플'] },
        { name: '감성카페', keywords: ['감성카페', '인스타카페', '뷰카페', '루프탑카페', '야경카페'] },
        { name: '스터디카페', keywords: ['스터디카페', '공부카페', '독서실카페', '24시카페', '조용한카페'] },
        { name: '애견·테마카페', keywords: ['애견카페', '고양이카페', '테마카페', '키즈카페', '보드게임카페'] },
      ]},
      { name: '디저트', subs: [
        { name: '케이크·마카롱', keywords: ['케이크', '마카롱', '디저트카페', '커스텀케이크', '레이어케이크'] },
        { name: '빙수·아이스크림', keywords: ['빙수', '아이스크림', '젤라또', '소프트아이스크림', '팥빙수'] },
        { name: '도넛·와플', keywords: ['도넛', '와플', '크로플', '츄러스', '버블와플'] },
        { name: '타르트·쿠키', keywords: ['타르트', '쿠키', '브라우니', '스콘', '휘낭시에'] },
      ]},
      { name: '베이커리', subs: [
        { name: '일반빵집', keywords: ['베이커리', '빵집', '식빵', '바게트', '소금빵'] },
        { name: '크루아상', keywords: ['크루아상', '버터크루아상', '크루아상카페', '페이스트리', '덴마크'] },
        { name: '마카롱·프렌치', keywords: ['마카롱', '프렌치베이커리', '에클레어', '파리브레스트', '밀푀유'] },
      ]},
      { name: '음료·주스', subs: [
        { name: '버블티·밀크티', keywords: ['버블티', '밀크티', '타피오카', '흑당밀크티', '과일버블티'] },
        { name: '주스·스무디', keywords: ['주스', '스무디', '착즙주스', '과일주스', '그린스무디'] },
        { name: '전통음료', keywords: ['전통차', '식혜', '수정과', '한방차', '오미자'] },
      ]},
    ]
  },
  {
    name: '주류·술집', mids: [
      { name: '한국식술집', subs: [
        { name: '포장마차·포차', keywords: ['포차', '포장마차', '야장', '호프포차', '야외포차'] },
        { name: '호프·맥주', keywords: ['호프', '맥줏집', '생맥주', '수제맥주', '크래프트비어'] },
        { name: '막걸리·전통주', keywords: ['막걸리', '전통주', '동동주', '막걸리집', '전통주바'] },
        { name: '소주방·반주', keywords: ['소주방', '반주', '소맥', '치맥', '삼겹살소주'] },
      ]},
      { name: '일식술집', subs: [
        { name: '이자카야', keywords: ['이자카야', '야키토리', '꼬치구이', '일식바', '사케바'] },
        { name: '오뎅바', keywords: ['오뎅바', '오뎅', '관동요리', '어묵바', '따뜻한술집'] },
      ]},
      { name: '서양식바', subs: [
        { name: '와인바', keywords: ['와인바', '와인', '내추럴와인', '와인셀러', '비스트로'] },
        { name: '칵테일바', keywords: ['칵테일바', '바', '스피크이지', '위스키바', '진바'] },
        { name: '루프탑바', keywords: ['루프탑바', '루프탑', '야경바', '테라스바', '스카이바'] },
      ]},
    ]
  },
  {
    name: '뷰티', mids: [
      { name: '헤어', subs: [
        { name: '미용실·헤어샵', keywords: ['미용실', '헤어샵', '헤어살롱', '단발컷', '남자미용실'] },
        { name: '염색·펌', keywords: ['염색', '펌', '탈색', '매직', '볼륨매직'] },
        { name: '남성전용', keywords: ['남자미용실', '바버샵', '남성헤어', '이발소', '페이드컷'] },
      ]},
      { name: '네일', subs: [
        { name: '네일샵', keywords: ['네일', '젤네일', '네일샵', '아크릴', '빌더젤'] },
        { name: '네일아트', keywords: ['네일아트', '3D네일', '핸드페인팅', '오로라네일', '그라데이션'] },
        { name: '페디큐어', keywords: ['페디큐어', '발관리', '풋케어', '발각질', '발각질제거'] },
      ]},
      { name: '피부·관리', subs: [
        { name: '피부관리샵', keywords: ['피부관리', '피부샵', '에스테틱', '페이셜', '트러블케어'] },
        { name: '왁싱·제모', keywords: ['왁싱', '제모', '레이저제모', '비키니왁싱', '전신왁싱'] },
        { name: '눈썹·속눈썹', keywords: ['눈썹문신', '반영구눈썹', '속눈썹연장', '눈썹정리', '아이래쉬'] },
      ]},
      { name: '기타뷰티', subs: [
        { name: '타투·피어싱', keywords: ['타투', '문신', '피어싱', '헤나', '바디아트'] },
        { name: '메이크업', keywords: ['메이크업', '웨딩메이크업', '속눈썹', '반영구화장', '뷰티샵'] },
      ]},
    ]
  },
  {
    name: '의료·건강', mids: [
      { name: '병원·의원', subs: [
        { name: '내과·가정의학과', keywords: ['내과', '가정의학과', '소화기내과', '건강검진', '종합검진'] },
        { name: '정형외과·재활', keywords: ['정형외과', '재활의학과', '도수치료', '물리치료', '통증클리닉'] },
        { name: '소아과', keywords: ['소아청소년과', '소아과', '아이병원', '영유아검진', '예방접종'] },
        { name: '안과', keywords: ['안과', '라식', '라섹', '스마일라식', '백내장'] },
        { name: '이비인후과', keywords: ['이비인후과', '코막힘', '비염', '편도', '중이염'] },
        { name: '산부인과', keywords: ['산부인과', '여성의원', '산전검사', '임신', '부인과'] },
        { name: '성형외과', keywords: ['성형외과', '쌍꺼풀', '코성형', '지방흡입', '윤곽'] },
        { name: '정신건강', keywords: ['정신건강의학과', '심리상담', '상담센터', '우울증', '불안장애'] },
      ]},
      { name: '치과', subs: [
        { name: '임플란트', keywords: ['임플란트', '치과', '임플란트치과', '뼈이식', '즉시임플란트'] },
        { name: '교정', keywords: ['교정', '투명교정', '치아교정', '브라켓', '인비절라인'] },
        { name: '미용치과', keywords: ['라미네이트', '치아미백', '베니어', '치아성형', '앞니성형'] },
        { name: '소아치과', keywords: ['소아치과', '어린이치과', '불소', '치아홈메우기', '유치'] },
        { name: '일반치과', keywords: ['스케일링', '충치', '신경치료', '발치', '틀니'] },
      ]},
      { name: '한방', subs: [
        { name: '한의원', keywords: ['한의원', '침', '한약', '추나', '첩약'] },
        { name: '다이어트한방', keywords: ['다이어트한의원', '한방다이어트', '체형교정', '비만클리닉', '봉침'] },
      ]},
      { name: '피부과', subs: [
        { name: '일반피부과', keywords: ['피부과', '여드름', '기미', '주근깨', '아토피'] },
        { name: '미용피부과', keywords: ['레이저', '보톡스', '필러', '리프팅', '피부클리닉'] },
      ]},
      { name: '동물의료', subs: [
        { name: '동물병원', keywords: ['동물병원', '수의사', '강아지병원', '고양이병원', '반려동물병원'] },
        { name: '24시동물병원', keywords: ['24시동물병원', '응급동물병원', '야간동물병원', '동물응급'] },
      ]},
      { name: '약국·기타', subs: [
        { name: '약국', keywords: ['약국', '약국추천', '24시약국', '야간약국', '조제약국'] },
        { name: '건강센터', keywords: ['영양제', '건강기능식품', '비타민', '한방보약', '건강원'] },
      ]},
    ]
  },
  {
    name: '운동·피트니스', mids: [
      { name: '피트니스', subs: [
        { name: '헬스장', keywords: ['헬스장', '헬스클럽', '피트니스센터', '근처헬스', '24시헬스'] },
        { name: 'PT·퍼스널트레이닝', keywords: ['PT', '퍼스널트레이닝', '다이어트PT', '바디프로필', '1:1트레이닝'] },
        { name: '크로스핏', keywords: ['크로스핏', 'CrossFit', '기능성훈련', '왓스박스', '그룹트레이닝'] },
      ]},
      { name: '스튜디오', subs: [
        { name: '필라테스', keywords: ['필라테스', '그룹필라테스', '개인필라테스', '재활필라테스', '필라테스스튜디오'] },
        { name: '요가', keywords: ['요가', '핫요가', '아쉬탕가', '명상요가', '요가원'] },
        { name: '댄스·방송댄스', keywords: ['댄스학원', '방송댄스', '힙합', '걸스힙합', '댄스스튜디오'] },
        { name: '발레', keywords: ['발레', '성인발레', '발레학원', '클래식발레', '컨템포러리'] },
      ]},
      { name: '수상·실내스포츠', subs: [
        { name: '수영장', keywords: ['수영장', '수영', '수영강습', '어린이수영', '성인수영'] },
        { name: '클라이밍', keywords: ['클라이밍', '볼더링', '인공암벽', '클라이밍짐', '리드'] },
        { name: '복싱·격투기', keywords: ['복싱', '무에타이', '주짓수', '격투기', 'MMA'] },
        { name: '배드민턴·테니스', keywords: ['배드민턴', '테니스', '배드민턴장', '테니스장', '스쿼시'] },
      ]},
      { name: '골프', subs: [
        { name: '골프연습장', keywords: ['골프연습장', '타석', '인도어골프', '실내골프연습장', '골프'] },
        { name: '스크린골프', keywords: ['스크린골프', '골프존', '카카오골프', '스크린', '실내골프'] },
        { name: '골프레슨', keywords: ['골프레슨', '골프강습', '1:1레슨', '초보골프', '골프코치'] },
      ]},
    ]
  },
  {
    name: '교육', mids: [
      { name: '입시·학습', subs: [
        { name: '입시학원', keywords: ['입시학원', '수능', '내신', '재수학원', '대입'] },
        { name: '영어학원', keywords: ['영어학원', '영어회화', '토익', '토플', '영어유치원'] },
        { name: '수학학원', keywords: ['수학학원', '수학', '중등수학', '고등수학', '수학과외'] },
        { name: '과외', keywords: ['과외', '1:1과외', '방문과외', '온라인과외', '수학과외'] },
      ]},
      { name: '예체능', subs: [
        { name: '미술학원', keywords: ['미술학원', '입시미술', '수채화', '드로잉', '미술'] },
        { name: '음악학원', keywords: ['음악학원', '피아노학원', '바이올린', '기타', '보컬'] },
        { name: '태권도·무술', keywords: ['태권도', '합기도', '유도', '검도', '무술'] },
        { name: '수영·체육', keywords: ['수영강습', '체육학원', '어린이체육', '유아체육', '줄넘기'] },
      ]},
      { name: '자기계발', subs: [
        { name: '코딩·IT', keywords: ['코딩학원', '프로그래밍', '파이썬', '앱개발', '웹개발'] },
        { name: '외국어', keywords: ['중국어학원', '일본어학원', '제2외국어', '스페인어', '프랑스어'] },
        { name: '자격증', keywords: ['자격증학원', '공인중개사', '요리학원', '바리스타', '자격증'] },
      ]},
      { name: '독서·공부공간', subs: [
        { name: '독서실', keywords: ['독서실', '열람실', '스터디룸', '코인독서실', '공부방'] },
        { name: '스터디카페', keywords: ['스터디카페', '스터디', '공부카페', '24시스터디카페', '카페스터디'] },
      ]},
      { name: '유아·아동', subs: [
        { name: '어린이집·유치원', keywords: ['어린이집', '유치원', '놀이학교', '보육원', '유아교육'] },
        { name: '키즈카페', keywords: ['키즈카페', '어린이카페', '놀이방', '실내놀이터', '어린이놀이공간'] },
      ]},
    ]
  },
  {
    name: '생활편의', mids: [
      { name: '수리·관리', subs: [
        { name: '가전수리', keywords: ['가전수리', '전자제품수리', '세탁기수리', 'TV수리', '에어컨수리'] },
        { name: '휴대폰수리', keywords: ['휴대폰수리', '핸드폰수리', '액정수리', '아이폰수리', '삼성수리'] },
        { name: '자전거수리', keywords: ['자전거수리', '자전거샵', '자전거점검', '자전거튜닝', 'MTB수리'] },
      ]},
      { name: '청소·이사', subs: [
        { name: '청소업체', keywords: ['청소업체', '집청소', '입주청소', '이사청소', '가사도우미'] },
        { name: '이사업체', keywords: ['이사', '포장이사', '원룸이사', '이삿짐센터', '반포장이사'] },
        { name: '에어컨청소', keywords: ['에어컨청소', '에어컨세척', '에어컨분해청소', '스탠드에어컨', '벽걸이에어컨'] },
      ]},
      { name: '세탁·수선', subs: [
        { name: '세탁소', keywords: ['세탁소', '드라이클리닝', '이불세탁', '세탁물수거', '런드리'] },
        { name: '수선집', keywords: ['수선', '옷수선', '지퍼수선', '가방수선', '신발수선'] },
      ]},
      { name: '반려동물', subs: [
        { name: '반려동물미용', keywords: ['강아지미용', '고양이미용', '펫샵', '애견미용', '펫그루밍'] },
        { name: '동물훈련·돌봄', keywords: ['강아지훈련', '펫시터', '동물훈련', '반려견훈련', '펫호텔'] },
      ]},
    ]
  },
  {
    name: '숙박·여행', mids: [
      { name: '숙박', subs: [
        { name: '호텔', keywords: ['호텔', '5성호텔', '비즈니스호텔', '부티크호텔', '호텔숙박'] },
        { name: '모텔·펜션', keywords: ['모텔', '펜션', '풀빌라', '독채', '게스트하우스'] },
        { name: '글램핑·캠핑', keywords: ['글램핑', '캠핑장', '오토캠핑', '카라반', '야영장'] },
        { name: '에어비앤비', keywords: ['에어비앤비', '단기렌탈', '민박', '숙소', '홈스테이'] },
      ]},
      { name: '여행', subs: [
        { name: '여행사', keywords: ['여행사', '패키지여행', '해외여행', '국내여행', '단체여행'] },
        { name: '렌터카', keywords: ['렌터카', '차량대여', '단기렌트', '장기렌트', '승합차렌트'] },
      ]},
    ]
  },
  {
    name: '쇼핑', mids: [
      { name: '식품·생활', subs: [
        { name: '편의점·마트', keywords: ['편의점', '마트', '슈퍼마켓', '로컬마트', '식료품점'] },
        { name: '꽃집', keywords: ['꽃집', '플라워샵', '화원', '꽃배달', '웨딩꽃'] },
        { name: '건강식품', keywords: ['건강식품', '유기농', '건강원', '두부', '전통시장'] },
      ]},
      { name: '패션·뷰티', subs: [
        { name: '옷가게', keywords: ['옷가게', '의류', '빈티지', '편집샵', '스트릿패션'] },
        { name: '신발·가방', keywords: ['신발가게', '가방샵', '운동화', '명품가방', '핸드백'] },
        { name: '안경·귀금속', keywords: ['안경점', '귀금속', '보석', '시계', '주얼리'] },
      ]},
      { name: '인테리어·생활용품', subs: [
        { name: '가구·인테리어', keywords: ['가구', '인테리어소품', '홈퍼니싱', '리모델링', '인테리어'] },
        { name: '문구·서점', keywords: ['문구점', '서점', '책방', '독립서점', '책카페'] },
      ]},
    ]
  },
]

// 소분류 키워드 map
const KEYWORD_MAP: Record<string, string[]> = {}
for (const top of CATEGORY_TREE) {
  for (const mid of top.mids) {
    for (const sub of mid.subs) {
      KEYWORD_MAP[sub.name] = sub.keywords
    }
  }
}

function getSuffixes(subName: string, fallback: string): string[] {
  return KEYWORD_MAP[subName] || [fallback, fallback + ' 추천', fallback + ' 예약', fallback + ' 근처', fallback + ' 후기']
}

// ── 업체 컨텍스트 ──────────────────────────────────────────────
interface BizContext { region: string; regionGu: string; category: string; businessName: string }
const DEFAULT_CTX: BizContext = { region: '강남', regionGu: '강남구', category: '맛집', businessName: '내 가게' }

function readBizContext(): BizContext {
  if (typeof window === 'undefined') return DEFAULT_CTX
  try {
    const raw1 = localStorage.getItem('localution.store_info')
    const raw2 = localStorage.getItem('localution_store')
    const p: Record<string, string> = raw1 ? JSON.parse(raw1) : raw2 ? JSON.parse(raw2) : {}
    const addrSrc = [p?.location, p?.address, p?.branch, p?.storeName, p?.name].filter(Boolean).join(' ')
    let region = DEFAULT_CTX.region, regionGu = DEFAULT_CTX.regionGu
    const gu = addrSrc.match(/([가-힣]{1,4})(구|군)/)
    if (gu) { region = gu[1]; regionGu = gu[1] + gu[2] }
    const businessName = p?.name || p?.storeName || DEFAULT_CTX.businessName
    const category = p?.category || p?.industry || DEFAULT_CTX.category
    return { region, regionGu, category, businessName }
  } catch { return DEFAULT_CTX }
}

function getRankColor(rank: number | null): string {
  if (rank === null) return 'text-[#8B95A1]'
  if (rank <= 3)  return 'text-[#3182F6] font-black'
  if (rank <= 5)  return 'text-[#12B76A] font-bold'
  if (rank <= 10) return 'text-[#F59E0B] font-bold'
  if (rank <= 20) return 'text-[#F04452] font-semibold'
  return 'text-[#8B95A1] font-medium'
}
function getRankBg(rank: number | null): string {
  if (rank === null) return ''
  if (rank <= 3)  return 'bg-[#EFF6FF]'
  if (rank <= 5)  return 'bg-[#ECFDF5]'
  if (rank <= 10) return 'bg-[#FFFBEB]'
  if (rank <= 20) return 'bg-[#FFF1F2]'
  return ''
}

function loadHistory(): Record<string, number[]> {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem('localution.rank_history') || '{}') } catch { return {} }
}
function saveHistory(keyword: string, rank: number | null) {
  if (typeof window === 'undefined' || rank === null) return
  try {
    const h = loadHistory()
    if (!h[keyword]) h[keyword] = []
    h[keyword] = [rank, ...h[keyword]].slice(0, 7)
    localStorage.setItem('localution.rank_history', JSON.stringify(h))
  } catch {}
}

interface RankResult {
  keyword: string; relatedKw: string; subCategory: string
  rank: number | null; prevRank: number | null
  loading: boolean; error?: string; matchedTitle?: string; scannedAt?: string
}

function RankCard({ result, onRefresh }: { result: RankResult; onRefresh: () => void }) {
  const diff = result.prevRank !== null && result.rank !== null ? result.prevRank - result.rank : null
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-[#F2F4F6] hover:border-[#3182F6] transition-colors">
      <div className="px-4 py-3 border-b border-[#F2F4F6] flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#F2F4F6] text-[#4E5968] font-medium">{result.subCategory}</span>
          <span className="text-sm font-bold text-[#191F28]">📍 {result.keyword}</span>
          <span className="text-[11px] text-[#3182F6] font-medium">→ {result.relatedKw}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {result.loading ? (
            <span className="w-5 h-5 border-2 border-[#3182F6] border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              {result.rank !== null ? (
                <span className={`text-sm font-black px-2.5 py-1 rounded-lg ${getRankBg(result.rank)} ${getRankColor(result.rank)}`}>{result.rank}위</span>
              ) : (
                <span className="text-xs px-2.5 py-1 rounded-lg bg-[#F2F4F6] text-[#8B95A1]">{result.error ? '오류' : '100위 밖'}</span>
              )}
              {diff !== null && (
                <span className={`text-[11px] font-bold ${diff > 0 ? 'text-[#12B76A]' : diff < 0 ? 'text-[#F04452]' : 'text-[#8B95A1]'}`}>
                  {diff > 0 ? '▲' + diff : diff < 0 ? '▼' + Math.abs(diff) : '–'}
                </span>
              )}
              <button onClick={onRefresh} className="text-[11px] text-[#8B95A1] hover:text-[#3182F6] px-1.5 py-0.5 rounded" title="새로고침">↻</button>
            </>
          )}
        </div>
      </div>
      <div className="px-4 py-3 text-xs">
        {result.loading ? (
          <p className="text-[#8B95A1] animate-pulse">네이버 검색 중...</p>
        ) : result.rank !== null ? (
          <div className="space-y-1">
            <p className="text-[#4E5968]"><span className="text-[#8B95A1]">매칭: </span><span className="font-medium text-[#191F28]">{result.matchedTitle || '—'}</span></p>
            {result.prevRank !== null && <p className="text-[#8B95A1]">직전 순위: {result.prevRank}위</p>}
            {result.scannedAt && <p className="text-[#8B95A1]">측정: {result.scannedAt}</p>}
          </div>
        ) : (
          <p className="text-[#8B95A1]">{result.error ? '⚠ ' + result.error : '100위 이내에 없음'}</p>
        )}
      </div>
    </div>
  )
}

// ── 지역 드롭다운 ─────────────────────────────────────────────
function RegionSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const groups = useMemo(() => {
    const map: Record<string, { label: string }[]> = {}
    for (const r of COMMUNITY_REGIONS) {
      if (!r.parent_label) continue
      if (!map[r.parent_label]) map[r.parent_label] = []
      map[r.parent_label].push({ label: r.label })
    }
    return map
  }, [])
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="text-sm border border-[#E5E8EB] rounded-lg px-2.5 py-1.5 bg-white text-[#191F28] font-medium focus:outline-none focus:border-[#3182F6] max-w-[150px]">
      {Object.entries(groups).map(([parent, regions]) => (
        <optgroup key={parent} label={parent}>
          {regions.map(r => <option key={r.label} value={r.label}>{r.label}</option>)}
        </optgroup>
      ))}
    </select>
  )
}

// ── 3단계 카테고리 선택기 ─────────────────────────────────────
function CategorySelector({
  topVal, midVal, subVal, customVal,
  onTopChange, onMidChange, onSubChange, onCustomChange,
}: {
  topVal: string; midVal: string; subVal: string; customVal: string
  onTopChange: (v: string) => void
  onMidChange: (v: string) => void
  onSubChange: (v: string) => void
  onCustomChange: (v: string) => void
}) {
  const isCustom = topVal === '직접입력'
  const inputRef = useRef<HTMLInputElement>(null)

  const mids = useMemo(() => CATEGORY_TREE.find(t => t.name === topVal)?.mids || [], [topVal])
  const subs = useMemo(() => mids.find(m => m.name === midVal)?.subs || [], [mids, midVal])

  useEffect(() => { if (isCustom) setTimeout(() => inputRef.current?.focus(), 50) }, [isCustom])

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-xs text-[#8B95A1] font-medium shrink-0">업종</span>

      {/* 대분류 */}
      <select value={topVal} onChange={e => onTopChange(e.target.value)}
        className="text-sm border border-[#E5E8EB] rounded-lg px-2.5 py-1.5 bg-white text-[#191F28] font-medium focus:outline-none focus:border-[#3182F6] max-w-[120px]">
        {CATEGORY_TREE.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
        <option value="직접입력">✏ 직접입력</option>
      </select>

      {/* 중분류 */}
      {!isCustom && mids.length > 0 && (
        <>
          <span className="text-[#D1D6DB] text-xs">›</span>
          <select value={midVal} onChange={e => onMidChange(e.target.value)}
            className="text-sm border border-[#E5E8EB] rounded-lg px-2.5 py-1.5 bg-white text-[#191F28] font-medium focus:outline-none focus:border-[#3182F6] max-w-[130px]">
            {mids.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
          </select>
        </>
      )}

      {/* 소분류 */}
      {!isCustom && subs.length > 0 && (
        <>
          <span className="text-[#D1D6DB] text-xs">›</span>
          <select value={subVal} onChange={e => onSubChange(e.target.value)}
            className="text-sm border border-[#3182F6] rounded-lg px-2.5 py-1.5 bg-[#EFF6FF] text-[#3182F6] font-semibold focus:outline-none focus:border-[#1B64DA] max-w-[140px]">
            {subs.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
          </select>
        </>
      )}

      {/* 직접입력 */}
      {isCustom && (
        <input ref={inputRef}
          value={customVal}
          onChange={e => onCustomChange(e.target.value)}
          onKeyDown={e => e.key === 'Escape' && onTopChange(CATEGORY_TREE[0].name)}
          placeholder="업종 직접 입력..."
          className="text-sm border border-[#3182F6] rounded-lg px-2.5 py-1.5 bg-white text-[#191F28] focus:outline-none w-[150px]"
        />
      )}
    </div>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────
export default function KeywordRankPage() {
  const [ctx, setCtx] = useState<BizContext>(DEFAULT_CTX)
  const [region, setRegion] = useState('강남구')
  const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'ok' | 'denied' | 'unavailable' | 'timeout' | 'unsupported'>('idle')

  // 3단계 선택 상태
  const [topCat, setTopCat]   = useState('음식점')
  const [midCat, setMidCat]   = useState('한식')
  const [subCat, setSubCat]   = useState('백반·정식')
  const [customCat, setCustomCat] = useState('')

  const [search, setSearch]     = useState('')
  const [scanning, setScanning] = useState(false)
  const [lastUpdated, setLastUpdated] = useState('')
  const [results, setResults]   = useState<RankResult[]>([])

  // 대분류 변경 → 중분류·소분류 자동 리셋
  const handleTopChange = useCallback((v: string) => {
    setTopCat(v)
    if (v === '직접입력') return
    const tree = CATEGORY_TREE.find(t => t.name === v)
    const firstMid = tree?.mids[0]
    const firstSub = firstMid?.subs[0]
    setMidCat(firstMid?.name || '')
    setSubCat(firstSub?.name || '')
  }, [])

  // 중분류 변경 → 소분류 자동 리셋
  const handleMidChange = useCallback((v: string) => {
    setMidCat(v)
    const tree = CATEGORY_TREE.find(t => t.name === topCat)
    const mid = tree?.mids.find(m => m.name === v)
    setSubCat(mid?.subs[0]?.name || '')
  }, [topCat])

  // 현재 활성 소분류명 (직접입력이면 customCat)
  const activeSubName = topCat === '직접입력' ? customCat : subCat
  const activeSuffixes = getSuffixes(activeSubName, activeSubName)

  useEffect(() => {
    const c = readBizContext()
    setCtx(c); setRegion(c.regionGu)
    const onChange = () => { const nc = readBizContext(); setCtx(nc); setRegion(nc.regionGu) }
    window.addEventListener('localution:user-change', onChange)
    window.addEventListener('storage', onChange)
    return () => { window.removeEventListener('localution:user-change', onChange); window.removeEventListener('storage', onChange) }
  }, [])

  // 내 위치 찾기
  const requestGeoLocation = useCallback(() => {
    if (!navigator?.geolocation) { setGeoStatus('unsupported'); return }
    setGeoStatus('loading')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        try {
          const list = nearestRegions(pos.coords.latitude, pos.coords.longitude, 3)
          if (list[0]) setRegion(list[0].label)
          setGeoStatus('ok')
        } catch { setGeoStatus('unavailable') }
      },
      (err) => {
        if (err.code === 1) setGeoStatus('denied')
        else if (err.code === 3) setGeoStatus('timeout')
        else setGeoStatus('unavailable')
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
    )
  }, [])

  // 지역 단축 (구/군/시 제거)
  const regionShort = useMemo(() =>
    region.replace(/(구|군|시)$/, '').replace(/\(.*?\)$/, '').trim()
  , [region])

  // 키워드 목록 생성
  const keywords = useMemo(() => {
    const suffixes = activeSuffixes
    const label = activeSubName || '맛집'
    return [
      { keyword: regionShort + ' ' + (suffixes[0] || label), relatedKw: regionShort + ' ' + (suffixes[0] || label) + ' 추천', subCategory: activeSubName },
      { keyword: ctx.businessName + ' ' + regionShort,       relatedKw: regionShort + ' ' + (suffixes[0] || label) + ' 상위노출', subCategory: activeSubName },
      { keyword: regionShort + '역 ' + (suffixes[0] || label), relatedKw: regionShort + '역 ' + (suffixes[2] || label), subCategory: activeSubName },
      { keyword: regionShort + ' ' + (suffixes[3] || label), relatedKw: regionShort + ' ' + (suffixes[3] || label) + ' 추천', subCategory: activeSubName },
      { keyword: regionShort + ' ' + (suffixes[1] || label), relatedKw: regionShort + ' ' + (suffixes[1] || label) + ' 장소', subCategory: activeSubName },
      { keyword: regionShort + ' ' + (suffixes[4] || label), relatedKw: regionShort + ' ' + (suffixes[4] || label) + ' 후기', subCategory: activeSubName },
    ]
  }, [regionShort, activeSuffixes, activeSubName, ctx.businessName])

  useEffect(() => {
    const history = loadHistory()
    setResults(keywords.map(kw => ({ ...kw, rank: null, prevRank: history[kw.keyword]?.[0] ?? null, loading: false })))
  }, [keywords])

  const fetchRank = useCallback(async (keyword: string, businessName: string) => {
    try {
      const res = await fetch('/api/naver-rank?keyword=' + encodeURIComponent(keyword) + '&businessName=' + encodeURIComponent(businessName))
      const data = await res.json()
      return { rank: data.rank ?? null, matchedTitle: data.matchedTitle, error: data.error }
    } catch { return { rank: null, error: '네트워크 오류' } }
  }, [])

  const refreshOne = useCallback(async (idx: number) => {
    const kw = results[idx]; if (!kw) return
    setResults(prev => prev.map((r, i) => i === idx ? { ...r, loading: true } : r))
    const { rank, matchedTitle, error } = await fetchRank(kw.keyword, ctx.businessName)
    saveHistory(kw.keyword, rank)
    const history = loadHistory()
    setResults(prev => prev.map((r, i) => i === idx ? {
      ...r, loading: false, prevRank: history[kw.keyword]?.[1] ?? null,
      rank, matchedTitle, error, scannedAt: new Date().toLocaleString('ko-KR'),
    } : r))
  }, [results, ctx.businessName, fetchRank])

  const handleScan = useCallback(async () => {
    if (scanning) return
    setScanning(true)
    setResults(prev => prev.map(r => ({ ...r, loading: true })))
    const history = loadHistory()
    const allResults = await Promise.all(keywords.map(kw => fetchRank(kw.keyword, ctx.businessName)))
    const now = new Date().toLocaleString('ko-KR')
    setResults(keywords.map((kw, i) => {
      const { rank, matchedTitle, error } = allResults[i]
      saveHistory(kw.keyword, rank)
      return { ...kw, rank, prevRank: history[kw.keyword]?.[0] ?? null, matchedTitle, error, loading: false, scannedAt: now }
    }))
    setLastUpdated(now)
    setScanning(false)
  }, [scanning, keywords, ctx.businessName, fetchRank])

  const top10Count = results.filter(r => r.rank !== null && r.rank <= 10).length
  const filtered = results.filter(r => search === '' || r.keyword.includes(search) || r.relatedKw.includes(search))

  const geoMsg: Record<string, string> = {
    denied: '위치 권한 차단됨 — 브라우저 설정에서 허용해 주세요.',
    unavailable: '위치를 확인할 수 없어요.',
    timeout: '위치 찾기 타임아웃 — 다시 시도해 주세요.',
    unsupported: '이 브라우저는 위치 기능을 지원하지 않아요.',
  }

  return (
    <div className="flex min-h-screen bg-[#F2F4F6]">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-[220px] flex flex-col min-h-screen pt-16 md:pt-0 min-w-0">
        <PageHeader icon="📈" title="키워드 순위"
          subtitle="네이버 검색에서 내 업체가 몇 위인지 — 지역·업종별 실시간 확인"
          variant="sky"
        />

        {/* 필터 바 */}
        <div className="bg-white border-b border-[#E5E8EB] px-4 py-3 sticky top-0 z-20">
          <div className="flex items-center gap-2 flex-wrap">

            {/* 지역 + 내 위치 */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-[#8B95A1] font-medium">지역</span>
              <RegionSelect value={region} onChange={setRegion} />
              <button onClick={requestGeoLocation} disabled={geoStatus === 'loading'}
                title="내 위치 기반 자동 선택"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E5E8EB] text-xs font-medium text-[#4E5968] hover:border-[#3182F6] hover:text-[#3182F6] transition-colors disabled:opacity-50 shrink-0">
                {geoStatus === 'loading'
                  ? <span className="w-3 h-3 border-2 border-[#3182F6] border-t-transparent rounded-full animate-spin" />
                  : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3"/>
                      <line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/>
                      <line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>
                    </svg>
                }
                내 위치
              </button>
            </div>

            {/* 3단계 업종 선택 */}
            <CategorySelector
              topVal={topCat} midVal={midCat} subVal={subCat} customVal={customCat}
              onTopChange={handleTopChange} onMidChange={handleMidChange}
              onSubChange={setSubCat} onCustomChange={setCustomCat}
            />

            {/* 키워드 검색 */}
            <div className="flex-1 min-w-[140px]">
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="키워드 검색..."
                className="w-full text-sm border border-[#E5E8EB] rounded-lg px-3 py-1.5 bg-white text-[#191F28] focus:outline-none focus:border-[#3182F6]"
              />
            </div>

            <button onClick={handleScan} disabled={scanning}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#3182F6] text-white text-sm font-semibold hover:bg-[#1B64DA] transition-colors disabled:opacity-60 shrink-0">
              {scanning
                ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />스캐닝...</>
                : '🔍 스캐닝'}
            </button>

            {lastUpdated && <span className="text-[11px] text-[#8B95A1] ml-auto shrink-0">마지막: {lastUpdated}</span>}
          </div>

          {/* 상태 메시지 */}
          {geoMsg[geoStatus] && <p className="text-[11px] text-[#F04452] mt-1.5">{geoMsg[geoStatus]}</p>}
          {geoStatus === 'ok' && <p className="text-[11px] text-[#12B76A] mt-1.5">✓ 위치 기반으로 <strong>{region}</strong>이 선택됐어요</p>}
        </div>

        {/* 업체 안내 배너 */}
        <div className="bg-[#EFF6FF] border-b border-[#BFDBFE] px-6 py-2">
          <p className="text-[11px] text-[#1D4ED8]">
            🔍 <strong>업체:</strong> {ctx.businessName} &nbsp;·&nbsp;
            <strong>지역:</strong> {region} &nbsp;·&nbsp;
            <strong>업종:</strong> {topCat !== '직접입력' ? topCat + ' › ' + midCat + ' › ' + subCat : customCat || '직접입력'} &nbsp;·&nbsp;
            <a href="/settings" className="underline">설정에서 변경 →</a>
          </p>
        </div>

        {/* 통계 바 */}
        <div className="bg-white border-b border-[#F2F4F6] px-6 py-2">
          <div className="flex items-center gap-4 text-xs flex-wrap">
            <span className="text-[#8B95A1]">
              키워드 <strong className="text-[#191F28]">{results.length}개</strong>
              {results.some(r => r.rank !== null) && <> · 상위 10위 <strong className="text-[#3182F6]">{top10Count}개</strong></>}
            </span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#EFF6FF]"/><span className="text-[#3182F6]">1~3위</span></span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#ECFDF5]"/><span className="text-[#12B76A]">4~5위</span></span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#FFFBEB]"/><span className="text-[#F59E0B]">6~10위</span></span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#FFF1F2]"/><span className="text-[#F04452]">11~20위</span></span>
            </div>
          </div>
        </div>

        {/* 카드 그리드 */}
        <div className="flex-1 p-6">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-[#8B95A1]">
              <p className="text-lg font-bold mb-1">검색 결과 없음</p>
              <p className="text-sm">다른 키워드로 검색해 보세요</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {filtered.map((result, i) => (
                <RankCard key={result.keyword} result={result} onRefresh={() => refreshOne(i)} />
              ))}
            </div>
          )}
          {!scanning && results.every(r => r.rank === null && !r.error) && (
            <div className="mt-8 flex flex-col items-center gap-2 text-[#8B95A1]">
              <p className="text-sm">🔍 <strong className="text-[#3182F6]">스캐닝</strong> 버튼을 눌러 실제 네이버 순위를 확인하세요</p>
              <p className="text-xs">업체명이 다르면 <a href="/settings" className="text-[#3182F6] underline">설정 → 매장 정보</a>에서 수정해 주세요</p>
            </div>
          )}
        </div>

        <Footer />
      </main>
    </div>
  )
}
