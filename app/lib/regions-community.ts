// app/lib/regions-community.ts
// 커뮤니티 지역 게시판 시드 (15차-13 · 전국 230개 시·군·구 풀세트)
// ─────────────────────────────────────────────────────
export type CommunityRegion = {
  id: string
  label: string
  parent_label: string | null  // 시/도. null = 전국
  sort_order: number
  // 대표 좌표 (시청·구청 기준 근사치)
  lat?: number
  lng?: number
}

export const COMMUNITY_REGIONS: CommunityRegion[] = [
  // 전국
  { id: 'nationwide',         label: '전국',      parent_label: null,    sort_order:   0 },

  // 서울특별시 25개 자치구 ───────────────────────────
  { id: 'seoul-jongno',       label: '종로구',    parent_label: '서울',  sort_order:  10, lat: 37.57305, lng: 126.97919 },
  { id: 'seoul-junggu',       label: '중구',      parent_label: '서울',  sort_order:  11, lat: 37.56379, lng: 126.99760 },
  { id: 'seoul-yongsan',      label: '용산구',    parent_label: '서울',  sort_order:  12, lat: 37.53249, lng: 126.99043 },
  { id: 'seoul-seongdong',    label: '성동구',    parent_label: '서울',  sort_order:  13, lat: 37.56340, lng: 127.03687 },
  { id: 'seoul-gwangjin',     label: '광진구',    parent_label: '서울',  sort_order:  14, lat: 37.53863, lng: 127.08245 },
  { id: 'seoul-dongdaemun',   label: '동대문구',  parent_label: '서울',  sort_order:  15, lat: 37.57444, lng: 127.03986 },
  { id: 'seoul-jungnang',     label: '중랑구',    parent_label: '서울',  sort_order:  16, lat: 37.60630, lng: 127.09265 },
  { id: 'seoul-seongbuk',     label: '성북구',    parent_label: '서울',  sort_order:  17, lat: 37.58913, lng: 127.01703 },
  { id: 'seoul-gangbuk',      label: '강북구',    parent_label: '서울',  sort_order:  18, lat: 37.63947, lng: 127.02558 },
  { id: 'seoul-dobong',       label: '도봉구',    parent_label: '서울',  sort_order:  19, lat: 37.66877, lng: 127.04717 },
  { id: 'seoul-nowon',        label: '노원구',    parent_label: '서울',  sort_order:  20, lat: 37.65425, lng: 127.05653 },
  { id: 'seoul-eunpyeong',    label: '은평구',    parent_label: '서울',  sort_order:  21, lat: 37.60269, lng: 126.92870 },
  { id: 'seoul-seodaemun',    label: '서대문구',  parent_label: '서울',  sort_order:  22, lat: 37.57926, lng: 126.93693 },
  { id: 'seoul-mapo',         label: '마포구',    parent_label: '서울',  sort_order:  23, lat: 37.56628, lng: 126.90192 },
  { id: 'seoul-yangcheon',    label: '양천구',    parent_label: '서울',  sort_order:  24, lat: 37.51682, lng: 126.86652 },
  { id: 'seoul-gangseo',      label: '강서구',    parent_label: '서울',  sort_order:  25, lat: 37.55096, lng: 126.84952 },
  { id: 'seoul-guro',         label: '구로구',    parent_label: '서울',  sort_order:  26, lat: 37.49541, lng: 126.88734 },
  { id: 'seoul-geumcheon',    label: '금천구',    parent_label: '서울',  sort_order:  27, lat: 37.45667, lng: 126.89557 },
  { id: 'seoul-yeongdeungpo', label: '영등포구',  parent_label: '서울',  sort_order:  28, lat: 37.52647, lng: 126.89616 },
  { id: 'seoul-dongjak',      label: '동작구',    parent_label: '서울',  sort_order:  29, lat: 37.51246, lng: 126.93981 },
  { id: 'seoul-gwanak',       label: '관악구',    parent_label: '서울',  sort_order:  30, lat: 37.47639, lng: 126.95144 },
  { id: 'seoul-seocho',       label: '서초구',    parent_label: '서울',  sort_order:  31, lat: 37.48376, lng: 127.03253 },
  { id: 'seoul-gangnam',      label: '강남구',    parent_label: '서울',  sort_order:  32, lat: 37.51723, lng: 127.04733 },
  { id: 'seoul-songpa',       label: '송파구',    parent_label: '서울',  sort_order:  33, lat: 37.51447, lng: 127.10590 },
  { id: 'seoul-gangdong',     label: '강동구',    parent_label: '서울',  sort_order:  34, lat: 37.53011, lng: 127.12366 },

  // 부산광역시 16개 (15구 1군) ─────────────────────────
  { id: 'busan-junggu',       label: '중구',      parent_label: '부산',  sort_order:  40, lat: 35.10620, lng: 129.03220 },
  { id: 'busan-seogu',        label: '서구',      parent_label: '부산',  sort_order:  41, lat: 35.09798, lng: 129.02423 },
  { id: 'busan-donggu',       label: '동구',      parent_label: '부산',  sort_order:  42, lat: 35.12915, lng: 129.04546 },
  { id: 'busan-yeongdo',      label: '영도구',    parent_label: '부산',  sort_order:  43, lat: 35.09117, lng: 129.06804 },
  { id: 'busan-busanjin',     label: '부산진구',  parent_label: '부산',  sort_order:  44, lat: 35.16287, lng: 129.05336 },
  { id: 'busan-dongnae',      label: '동래구',    parent_label: '부산',  sort_order:  45, lat: 35.19698, lng: 129.08389 },
  { id: 'busan-namgu',        label: '남구',      parent_label: '부산',  sort_order:  46, lat: 35.13654, lng: 129.08443 },
  { id: 'busan-bukgu',        label: '북구',      parent_label: '부산',  sort_order:  47, lat: 35.19745, lng: 129.01159 },
  { id: 'busan-haeundae',     label: '해운대구',  parent_label: '부산',  sort_order:  48, lat: 35.16312, lng: 129.16361 },
  { id: 'busan-saha',         label: '사하구',    parent_label: '부산',  sort_order:  49, lat: 35.10465, lng: 128.97487 },
  { id: 'busan-geumjeong',    label: '금정구',    parent_label: '부산',  sort_order:  50, lat: 35.24222, lng: 129.09225 },
  { id: 'busan-gangseo',      label: '강서구',    parent_label: '부산',  sort_order:  51, lat: 35.21230, lng: 128.98021 },
  { id: 'busan-yeonje',       label: '연제구',    parent_label: '부산',  sort_order:  52, lat: 35.17641, lng: 129.07971 },
  { id: 'busan-suyeong',      label: '수영구',    parent_label: '부산',  sort_order:  53, lat: 35.14546, lng: 129.11321 },
  { id: 'busan-sasang',       label: '사상구',    parent_label: '부산',  sort_order:  54, lat: 35.15252, lng: 128.99141 },
  { id: 'busan-gijang',       label: '기장군',    parent_label: '부산',  sort_order:  55, lat: 35.24469, lng: 129.22235 },

  // 대구광역시 9개 (7구 2군, 군위군은 2023 대구 편입) ──
  { id: 'daegu-junggu',       label: '중구',      parent_label: '대구',  sort_order:  60, lat: 35.86907, lng: 128.60623 },
  { id: 'daegu-donggu',       label: '동구',      parent_label: '대구',  sort_order:  61, lat: 35.88670, lng: 128.63542 },
  { id: 'daegu-seogu',        label: '서구',      parent_label: '대구',  sort_order:  62, lat: 35.87196, lng: 128.55908 },
  { id: 'daegu-namgu',        label: '남구',      parent_label: '대구',  sort_order:  63, lat: 35.84610, lng: 128.59675 },
  { id: 'daegu-bukgu',        label: '북구',      parent_label: '대구',  sort_order:  64, lat: 35.88496, lng: 128.58309 },
  { id: 'daegu-suseong',      label: '수성구',    parent_label: '대구',  sort_order:  65, lat: 35.85822, lng: 128.63012 },
  { id: 'daegu-dalseo',       label: '달서구',    parent_label: '대구',  sort_order:  66, lat: 35.82989, lng: 128.53280 },
  { id: 'daegu-dalseong',     label: '달성군',    parent_label: '대구',  sort_order:  67, lat: 35.77442, lng: 128.43121 },
  { id: 'daegu-gunwi',        label: '군위군',    parent_label: '대구',  sort_order:  68, lat: 36.24351, lng: 128.57282 },

  // 인천광역시 10개 (8구 2군) ─────────────────────────
  { id: 'incheon-junggu',     label: '중구',      parent_label: '인천',  sort_order:  70, lat: 37.47218, lng: 126.62170 },
  { id: 'incheon-donggu',     label: '동구',      parent_label: '인천',  sort_order:  71, lat: 37.47392, lng: 126.64326 },
  { id: 'incheon-michuhol',   label: '미추홀구',  parent_label: '인천',  sort_order:  72, lat: 37.46327, lng: 126.64994 },
  { id: 'incheon-yeonsu',     label: '연수구',    parent_label: '인천',  sort_order:  73, lat: 37.41077, lng: 126.67821 },
  { id: 'incheon-songdo',     label: '송도(연수구)', parent_label: '인천', sort_order: 74, lat: 37.38260, lng: 126.65650 },
  { id: 'incheon-namdong',    label: '남동구',    parent_label: '인천',  sort_order:  75, lat: 37.44725, lng: 126.73148 },
  { id: 'incheon-bupyeong',   label: '부평구',    parent_label: '인천',  sort_order:  76, lat: 37.50704, lng: 126.72270 },
  { id: 'incheon-gyeyang',    label: '계양구',    parent_label: '인천',  sort_order:  77, lat: 37.53727, lng: 126.73609 },
  { id: 'incheon-seogu',      label: '서구',      parent_label: '인천',  sort_order:  78, lat: 37.54375, lng: 126.67579 },
  { id: 'incheon-ganghwa',    label: '강화군',    parent_label: '인천',  sort_order:  79, lat: 37.74742, lng: 126.48771 },
  { id: 'incheon-ongjin',     label: '옹진군',    parent_label: '인천',  sort_order:  80, lat: 37.44665, lng: 126.65061 },

  // 광주광역시 5개 구 ──────────────────────────────────
  { id: 'gwangju-donggu',     label: '동구',      parent_label: '광주',  sort_order:  85, lat: 35.14575, lng: 126.91494 },
  { id: 'gwangju-seogu',      label: '서구',      parent_label: '광주',  sort_order:  86, lat: 35.15191, lng: 126.89040 },
  { id: 'gwangju-namgu',      label: '남구',      parent_label: '광주',  sort_order:  87, lat: 35.13360, lng: 126.90385 },
  { id: 'gwangju-bukgu',      label: '북구',      parent_label: '광주',  sort_order:  88, lat: 35.17430, lng: 126.91224 },
  { id: 'gwangju-gwangsan',   label: '광산구',    parent_label: '광주',  sort_order:  89, lat: 35.13986, lng: 126.79383 },

  // 대전광역시 5개 구 ──────────────────────────────────
  { id: 'daejeon-donggu',     label: '동구',      parent_label: '대전',  sort_order:  95, lat: 36.31269, lng: 127.45505 },
  { id: 'daejeon-junggu',     label: '중구',      parent_label: '대전',  sort_order:  96, lat: 36.32552, lng: 127.42144 },
  { id: 'daejeon-seogu',      label: '서구',      parent_label: '대전',  sort_order:  97, lat: 36.35484, lng: 127.38331 },
  { id: 'daejeon-yuseong',    label: '유성구',    parent_label: '대전',  sort_order:  98, lat: 36.36256, lng: 127.35677 },
  { id: 'daejeon-daedeok',    label: '대덕구',    parent_label: '대전',  sort_order:  99, lat: 36.34662, lng: 127.41576 },

  // 울산광역시 5개 (4구 1군) ─────────────────────────
  { id: 'ulsan-junggu',       label: '중구',      parent_label: '울산',  sort_order: 105, lat: 35.56941, lng: 129.33266 },
  { id: 'ulsan-namgu',        label: '남구',      parent_label: '울산',  sort_order: 106, lat: 35.54417, lng: 129.33013 },
  { id: 'ulsan-donggu',       label: '동구',      parent_label: '울산',  sort_order: 107, lat: 35.50463, lng: 129.41631 },
  { id: 'ulsan-bukgu',        label: '북구',      parent_label: '울산',  sort_order: 108, lat: 35.58262, lng: 129.36128 },
  { id: 'ulsan-ulju',         label: '울주군',    parent_label: '울산',  sort_order: 109, lat: 35.52202, lng: 129.24236 },

  // 세종특별자치시 ──────────────────────────────────────
  { id: 'sejong-city',        label: '세종시',    parent_label: '세종',  sort_order: 115, lat: 36.48096, lng: 127.28937 },

  // 경기도 31개 시·군 ──────────────────────────────────
  { id: 'gyeonggi-suwon',     label: '수원시',    parent_label: '경기',  sort_order: 120, lat: 37.26367, lng: 127.02865 },
  { id: 'gyeonggi-seongnam',  label: '성남시',    parent_label: '경기',  sort_order: 121, lat: 37.42008, lng: 127.12677 },
  { id: 'gyeonggi-bundang',   label: '성남 분당구', parent_label: '경기', sort_order: 122, lat: 37.38230, lng: 127.11900 },
  { id: 'gyeonggi-goyang',    label: '고양시',    parent_label: '경기',  sort_order: 123, lat: 37.65816, lng: 126.83222 },
  { id: 'gyeonggi-yongin',    label: '용인시',    parent_label: '경기',  sort_order: 124, lat: 37.24131, lng: 127.17759 },
  { id: 'gyeonggi-bucheon',   label: '부천시',    parent_label: '경기',  sort_order: 125, lat: 37.50342, lng: 126.76573 },
  { id: 'gyeonggi-ansan',     label: '안산시',    parent_label: '경기',  sort_order: 126, lat: 37.32355, lng: 126.82389 },
  { id: 'gyeonggi-anyang',    label: '안양시',    parent_label: '경기',  sort_order: 127, lat: 37.39477, lng: 126.95698 },
  { id: 'gyeonggi-pyeongtaek',label: '평택시',    parent_label: '경기',  sort_order: 128, lat: 36.99194, lng: 127.11286 },
  { id: 'gyeonggi-siheung',   label: '시흥시',    parent_label: '경기',  sort_order: 129, lat: 37.38036, lng: 126.80276 },
  { id: 'gyeonggi-hwaseong',  label: '화성시',    parent_label: '경기',  sort_order: 130, lat: 37.19951, lng: 126.83109 },
  { id: 'gyeonggi-paju',      label: '파주시',    parent_label: '경기',  sort_order: 131, lat: 37.76075, lng: 126.77988 },
  { id: 'gyeonggi-uijeongbu', label: '의정부시',  parent_label: '경기',  sort_order: 132, lat: 37.73824, lng: 127.03386 },
  { id: 'gyeonggi-namyangju', label: '남양주시',  parent_label: '경기',  sort_order: 133, lat: 37.63607, lng: 127.21652 },
  { id: 'gyeonggi-gimpo',     label: '김포시',    parent_label: '경기',  sort_order: 134, lat: 37.61578, lng: 126.71579 },
  { id: 'gyeonggi-gwangju',   label: '광주시',    parent_label: '경기',  sort_order: 135, lat: 37.42937, lng: 127.25539 },
  { id: 'gyeonggi-gwangmyeong',label:'광명시',    parent_label: '경기',  sort_order: 136, lat: 37.47878, lng: 126.86470 },
  { id: 'gyeonggi-gunpo',     label: '군포시',    parent_label: '경기',  sort_order: 137, lat: 37.36142, lng: 126.93506 },
  { id: 'gyeonggi-osan',      label: '오산시',    parent_label: '경기',  sort_order: 138, lat: 37.14981, lng: 127.07746 },
  { id: 'gyeonggi-icheon',    label: '이천시',    parent_label: '경기',  sort_order: 139, lat: 37.27233, lng: 127.44220 },
  { id: 'gyeonggi-yangju',    label: '양주시',    parent_label: '경기',  sort_order: 140, lat: 37.78539, lng: 127.04572 },
  { id: 'gyeonggi-anseong',   label: '안성시',    parent_label: '경기',  sort_order: 141, lat: 37.00804, lng: 127.27957 },
  { id: 'gyeonggi-guri',      label: '구리시',    parent_label: '경기',  sort_order: 142, lat: 37.59435, lng: 127.12953 },
  { id: 'gyeonggi-pocheon',   label: '포천시',    parent_label: '경기',  sort_order: 143, lat: 37.89486, lng: 127.20046 },
  { id: 'gyeonggi-uiwang',    label: '의왕시',    parent_label: '경기',  sort_order: 144, lat: 37.34482, lng: 126.96844 },
  { id: 'gyeonggi-hanam',     label: '하남시',    parent_label: '경기',  sort_order: 145, lat: 37.53901, lng: 127.21470 },
  { id: 'gyeonggi-yeoju',     label: '여주시',    parent_label: '경기',  sort_order: 146, lat: 37.29792, lng: 127.63703 },
  { id: 'gyeonggi-dongducheon',label:'동두천시',  parent_label: '경기',  sort_order: 147, lat: 37.90339, lng: 127.06060 },
  { id: 'gyeonggi-gwacheon',  label: '과천시',    parent_label: '경기',  sort_order: 148, lat: 37.42950, lng: 126.98773 },
  { id: 'gyeonggi-gapyeong',  label: '가평군',    parent_label: '경기',  sort_order: 149, lat: 37.83152, lng: 127.50954 },
  { id: 'gyeonggi-yangpyeong',label: '양평군',    parent_label: '경기',  sort_order: 150, lat: 37.49183, lng: 127.48759 },
  { id: 'gyeonggi-yeoncheon', label: '연천군',    parent_label: '경기',  sort_order: 151, lat: 38.09644, lng: 127.07475 },

  // 강원특별자치도 18개 (7시 11군) ─────────────────────
  { id: 'gangwon-chuncheon',  label: '춘천시',    parent_label: '강원',  sort_order: 160, lat: 37.88116, lng: 127.72989 },
  { id: 'gangwon-wonju',      label: '원주시',    parent_label: '강원',  sort_order: 161, lat: 37.34208, lng: 127.92067 },
  { id: 'gangwon-gangneung',  label: '강릉시',    parent_label: '강원',  sort_order: 162, lat: 37.75199, lng: 128.87578 },
  { id: 'gangwon-donghae',    label: '동해시',    parent_label: '강원',  sort_order: 163, lat: 37.52477, lng: 129.11432 },
  { id: 'gangwon-taebaek',    label: '태백시',    parent_label: '강원',  sort_order: 164, lat: 37.16411, lng: 128.98574 },
  { id: 'gangwon-sokcho',     label: '속초시',    parent_label: '강원',  sort_order: 165, lat: 38.20706, lng: 128.59145 },
  { id: 'gangwon-samcheok',   label: '삼척시',    parent_label: '강원',  sort_order: 166, lat: 37.44998, lng: 129.16615 },
  { id: 'gangwon-hongcheon',  label: '홍천군',    parent_label: '강원',  sort_order: 167, lat: 37.69622, lng: 127.88850 },
  { id: 'gangwon-hoengseong', label: '횡성군',    parent_label: '강원',  sort_order: 168, lat: 37.49140, lng: 127.98512 },
  { id: 'gangwon-yeongwol',   label: '영월군',    parent_label: '강원',  sort_order: 169, lat: 37.18360, lng: 128.46119 },
  { id: 'gangwon-pyeongchang',label: '평창군',    parent_label: '강원',  sort_order: 170, lat: 37.37073, lng: 128.39031 },
  { id: 'gangwon-jeongseon',  label: '정선군',    parent_label: '강원',  sort_order: 171, lat: 37.38045, lng: 128.66082 },
  { id: 'gangwon-cheorwon',   label: '철원군',    parent_label: '강원',  sort_order: 172, lat: 38.14667, lng: 127.31317 },
  { id: 'gangwon-hwacheon',   label: '화천군',    parent_label: '강원',  sort_order: 173, lat: 38.10614, lng: 127.70825 },
  { id: 'gangwon-yanggu',     label: '양구군',    parent_label: '강원',  sort_order: 174, lat: 38.10975, lng: 127.98897 },
  { id: 'gangwon-inje',       label: '인제군',    parent_label: '강원',  sort_order: 175, lat: 38.06978, lng: 128.17034 },
  { id: 'gangwon-goseong',    label: '고성군',    parent_label: '강원',  sort_order: 176, lat: 38.37838, lng: 128.46809 },
  { id: 'gangwon-yangyang',   label: '양양군',    parent_label: '강원',  sort_order: 177, lat: 38.07536, lng: 128.61802 },

  // 충청북도 11개 (3시 8군) ────────────────────────────
  { id: 'chungbuk-cheongju',  label: '청주시',    parent_label: '충북',  sort_order: 185, lat: 36.64205, lng: 127.48926 },
  { id: 'chungbuk-chungju',   label: '충주시',    parent_label: '충북',  sort_order: 186, lat: 36.99090, lng: 127.92599 },
  { id: 'chungbuk-jecheon',   label: '제천시',    parent_label: '충북',  sort_order: 187, lat: 37.13292, lng: 128.19103 },
  { id: 'chungbuk-boeun',     label: '보은군',    parent_label: '충북',  sort_order: 188, lat: 36.48933, lng: 127.72932 },
  { id: 'chungbuk-okcheon',   label: '옥천군',    parent_label: '충북',  sort_order: 189, lat: 36.30649, lng: 127.57172 },
  { id: 'chungbuk-yeongdong', label: '영동군',    parent_label: '충북',  sort_order: 190, lat: 36.17496, lng: 127.77665 },
  { id: 'chungbuk-jeungpyeong',label:'증평군',    parent_label: '충북',  sort_order: 191, lat: 36.78471, lng: 127.58202 },
  { id: 'chungbuk-jincheon',  label: '진천군',    parent_label: '충북',  sort_order: 192, lat: 36.85533, lng: 127.43608 },
  { id: 'chungbuk-goesan',    label: '괴산군',    parent_label: '충북',  sort_order: 193, lat: 36.81608, lng: 127.78919 },
  { id: 'chungbuk-eumseong',  label: '음성군',    parent_label: '충북',  sort_order: 194, lat: 36.93980, lng: 127.69011 },
  { id: 'chungbuk-danyang',   label: '단양군',    parent_label: '충북',  sort_order: 195, lat: 36.98483, lng: 128.36574 },

  // 충청남도 15개 (8시 7군) ────────────────────────────
  { id: 'chungnam-cheonan',   label: '천안시',    parent_label: '충남',  sort_order: 200, lat: 36.81450, lng: 127.14883 },
  { id: 'chungnam-gongju',    label: '공주시',    parent_label: '충남',  sort_order: 201, lat: 36.44656, lng: 127.11899 },
  { id: 'chungnam-boryeong',  label: '보령시',    parent_label: '충남',  sort_order: 202, lat: 36.33346, lng: 126.61282 },
  { id: 'chungnam-asan',      label: '아산시',    parent_label: '충남',  sort_order: 203, lat: 36.78967, lng: 127.00157 },
  { id: 'chungnam-seosan',    label: '서산시',    parent_label: '충남',  sort_order: 204, lat: 36.78485, lng: 126.45003 },
  { id: 'chungnam-nonsan',    label: '논산시',    parent_label: '충남',  sort_order: 205, lat: 36.18747, lng: 127.09885 },
  { id: 'chungnam-gyeryong',  label: '계룡시',    parent_label: '충남',  sort_order: 206, lat: 36.27472, lng: 127.24869 },
  { id: 'chungnam-dangjin',   label: '당진시',    parent_label: '충남',  sort_order: 207, lat: 36.88971, lng: 126.64573 },
  { id: 'chungnam-geumsan',   label: '금산군',    parent_label: '충남',  sort_order: 208, lat: 36.10883, lng: 127.48790 },
  { id: 'chungnam-buyeo',     label: '부여군',    parent_label: '충남',  sort_order: 209, lat: 36.27599, lng: 126.90984 },
  { id: 'chungnam-seocheon',  label: '서천군',    parent_label: '충남',  sort_order: 210, lat: 36.07974, lng: 126.69197 },
  { id: 'chungnam-cheongyang',label: '청양군',    parent_label: '충남',  sort_order: 211, lat: 36.45890, lng: 126.80205 },
  { id: 'chungnam-hongseong', label: '홍성군',    parent_label: '충남',  sort_order: 212, lat: 36.60125, lng: 126.66090 },
  { id: 'chungnam-yesan',     label: '예산군',    parent_label: '충남',  sort_order: 213, lat: 36.68085, lng: 126.84391 },
  { id: 'chungnam-taean',     label: '태안군',    parent_label: '충남',  sort_order: 214, lat: 36.74556, lng: 126.29796 },

  // 전북특별자치도 14개 (6시 8군) ───────────────────────
  { id: 'jeonbuk-jeonju',     label: '전주시',    parent_label: '전북',  sort_order: 220, lat: 35.82424, lng: 127.14749 },
  { id: 'jeonbuk-gunsan',     label: '군산시',    parent_label: '전북',  sort_order: 221, lat: 35.96783, lng: 126.73692 },
  { id: 'jeonbuk-iksan',      label: '익산시',    parent_label: '전북',  sort_order: 222, lat: 35.94813, lng: 126.95794 },
  { id: 'jeonbuk-jeongeup',   label: '정읍시',    parent_label: '전북',  sort_order: 223, lat: 35.56988, lng: 126.85590 },
  { id: 'jeonbuk-namwon',     label: '남원시',    parent_label: '전북',  sort_order: 224, lat: 35.41650, lng: 127.39040 },
  { id: 'jeonbuk-gimje',      label: '김제시',    parent_label: '전북',  sort_order: 225, lat: 35.80363, lng: 126.88079 },
  { id: 'jeonbuk-wanju',      label: '완주군',    parent_label: '전북',  sort_order: 226, lat: 35.89116, lng: 127.13870 },
  { id: 'jeonbuk-jinan',      label: '진안군',    parent_label: '전북',  sort_order: 227, lat: 35.79159, lng: 127.42434 },
  { id: 'jeonbuk-muju',       label: '무주군',    parent_label: '전북',  sort_order: 228, lat: 35.90701, lng: 127.66081 },
  { id: 'jeonbuk-jangsu',     label: '장수군',    parent_label: '전북',  sort_order: 229, lat: 35.64728, lng: 127.52114 },
  { id: 'jeonbuk-imsil',      label: '임실군',    parent_label: '전북',  sort_order: 230, lat: 35.61781, lng: 127.28899 },
  { id: 'jeonbuk-sunchang',   label: '순창군',    parent_label: '전북',  sort_order: 231, lat: 35.37453, lng: 127.13727 },
  { id: 'jeonbuk-gochang',    label: '고창군',    parent_label: '전북',  sort_order: 232, lat: 35.43573, lng: 126.70197 },
  { id: 'jeonbuk-buan',       label: '부안군',    parent_label: '전북',  sort_order: 233, lat: 35.73161, lng: 126.73321 },

  // 전라남도 22개 (5시 17군) ───────────────────────────
  { id: 'jeonnam-mokpo',      label: '목포시',    parent_label: '전남',  sort_order: 240, lat: 34.81181, lng: 126.39247 },
  { id: 'jeonnam-yeosu',      label: '여수시',    parent_label: '전남',  sort_order: 241, lat: 34.76037, lng: 127.66274 },
  { id: 'jeonnam-suncheon',   label: '순천시',    parent_label: '전남',  sort_order: 242, lat: 34.95051, lng: 127.48708 },
  { id: 'jeonnam-naju',       label: '나주시',    parent_label: '전남',  sort_order: 243, lat: 35.01583, lng: 126.71080 },
  { id: 'jeonnam-gwangyang',  label: '광양시',    parent_label: '전남',  sort_order: 244, lat: 34.94065, lng: 127.69562 },
  { id: 'jeonnam-damyang',    label: '담양군',    parent_label: '전남',  sort_order: 245, lat: 35.32114, lng: 126.98848 },
  { id: 'jeonnam-gokseong',   label: '곡성군',    parent_label: '전남',  sort_order: 246, lat: 35.28154, lng: 127.29235 },
  { id: 'jeonnam-gurye',      label: '구례군',    parent_label: '전남',  sort_order: 247, lat: 35.20246, lng: 127.46277 },
  { id: 'jeonnam-goheung',    label: '고흥군',    parent_label: '전남',  sort_order: 248, lat: 34.61125, lng: 127.28476 },
  { id: 'jeonnam-boseong',    label: '보성군',    parent_label: '전남',  sort_order: 249, lat: 34.77133, lng: 127.08008 },
  { id: 'jeonnam-hwasun',     label: '화순군',    parent_label: '전남',  sort_order: 250, lat: 35.06449, lng: 126.98646 },
  { id: 'jeonnam-jangheung',  label: '장흥군',    parent_label: '전남',  sort_order: 251, lat: 34.68164, lng: 126.90702 },
  { id: 'jeonnam-gangjin',    label: '강진군',    parent_label: '전남',  sort_order: 252, lat: 34.64195, lng: 126.76742 },
  { id: 'jeonnam-haenam',     label: '해남군',    parent_label: '전남',  sort_order: 253, lat: 34.57350, lng: 126.59944 },
  { id: 'jeonnam-yeongam',    label: '영암군',    parent_label: '전남',  sort_order: 254, lat: 34.80014, lng: 126.69682 },
  { id: 'jeonnam-muan',       label: '무안군',    parent_label: '전남',  sort_order: 255, lat: 34.99050, lng: 126.48172 },
  { id: 'jeonnam-hampyeong',  label: '함평군',    parent_label: '전남',  sort_order: 256, lat: 35.06583, lng: 126.51650 },
  { id: 'jeonnam-yeonggwang', label: '영광군',    parent_label: '전남',  sort_order: 257, lat: 35.27741, lng: 126.51214 },
  { id: 'jeonnam-jangseong',  label: '장성군',    parent_label: '전남',  sort_order: 258, lat: 35.30175, lng: 126.78824 },
  { id: 'jeonnam-wando',      label: '완도군',    parent_label: '전남',  sort_order: 259, lat: 34.31067, lng: 126.75444 },
  { id: 'jeonnam-jindo',      label: '진도군',    parent_label: '전남',  sort_order: 260, lat: 34.48670, lng: 126.26315 },
  { id: 'jeonnam-sinan',      label: '신안군',    parent_label: '전남',  sort_order: 261, lat: 34.83333, lng: 126.35183 },

  // 경상북도 22개 (10시 12군 · 군위군은 2023 대구 편입) ─
  { id: 'gyeongbuk-pohang',   label: '포항시',    parent_label: '경북',  sort_order: 270, lat: 36.01931, lng: 129.34357 },
  { id: 'gyeongbuk-gyeongju', label: '경주시',    parent_label: '경북',  sort_order: 271, lat: 35.85642, lng: 129.22457 },
  { id: 'gyeongbuk-gimcheon', label: '김천시',    parent_label: '경북',  sort_order: 272, lat: 36.13975, lng: 128.11362 },
  { id: 'gyeongbuk-andong',   label: '안동시',    parent_label: '경북',  sort_order: 273, lat: 36.56800, lng: 128.72940 },
  { id: 'gyeongbuk-gumi',     label: '구미시',    parent_label: '경북',  sort_order: 274, lat: 36.11955, lng: 128.34474 },
  { id: 'gyeongbuk-yeongju',  label: '영주시',    parent_label: '경북',  sort_order: 275, lat: 36.80578, lng: 128.62383 },
  { id: 'gyeongbuk-yeongcheon',label:'영천시',    parent_label: '경북',  sort_order: 276, lat: 35.97322, lng: 128.93858 },
  { id: 'gyeongbuk-sangju',   label: '상주시',    parent_label: '경북',  sort_order: 277, lat: 36.41102, lng: 128.15917 },
  { id: 'gyeongbuk-mungyeong',label: '문경시',    parent_label: '경북',  sort_order: 278, lat: 36.58697, lng: 128.18699 },
  { id: 'gyeongbuk-gyeongsan',label: '경산시',    parent_label: '경북',  sort_order: 279, lat: 35.82503, lng: 128.74142 },
  { id: 'gyeongbuk-uiseong',  label: '의성군',    parent_label: '경북',  sort_order: 280, lat: 36.35267, lng: 128.69696 },
  { id: 'gyeongbuk-cheongsong',label:'청송군',    parent_label: '경북',  sort_order: 281, lat: 36.43478, lng: 129.05656 },
  { id: 'gyeongbuk-yeongyang',label: '영양군',    parent_label: '경북',  sort_order: 282, lat: 36.66673, lng: 129.11254 },
  { id: 'gyeongbuk-yeongdeok',label: '영덕군',    parent_label: '경북',  sort_order: 283, lat: 36.41479, lng: 129.36542 },
  { id: 'gyeongbuk-cheongdo', label: '청도군',    parent_label: '경북',  sort_order: 284, lat: 35.64728, lng: 128.73422 },
  { id: 'gyeongbuk-goryeong', label: '고령군',    parent_label: '경북',  sort_order: 285, lat: 35.72881, lng: 128.26304 },
  { id: 'gyeongbuk-seongju',  label: '성주군',    parent_label: '경북',  sort_order: 286, lat: 35.91920, lng: 128.28375 },
  { id: 'gyeongbuk-chilgok',  label: '칠곡군',    parent_label: '경북',  sort_order: 287, lat: 35.99538, lng: 128.40196 },
  { id: 'gyeongbuk-yecheon',  label: '예천군',    parent_label: '경북',  sort_order: 288, lat: 36.65783, lng: 128.45287 },
  { id: 'gyeongbuk-bonghwa',  label: '봉화군',    parent_label: '경북',  sort_order: 289, lat: 36.89371, lng: 128.73265 },
  { id: 'gyeongbuk-uljin',    label: '울진군',    parent_label: '경북',  sort_order: 290, lat: 36.99326, lng: 129.40051 },
  { id: 'gyeongbuk-ulleung',  label: '울릉군',    parent_label: '경북',  sort_order: 291, lat: 37.48446, lng: 130.90568 },

  // 경상남도 18개 (8시 10군) ───────────────────────────
  { id: 'gyeongnam-changwon', label: '창원시',    parent_label: '경남',  sort_order: 300, lat: 35.22828, lng: 128.68175 },
  { id: 'gyeongnam-jinju',    label: '진주시',    parent_label: '경남',  sort_order: 301, lat: 35.18029, lng: 128.10778 },
  { id: 'gyeongnam-tongyeong',label: '통영시',    parent_label: '경남',  sort_order: 302, lat: 34.85428, lng: 128.43329 },
  { id: 'gyeongnam-sacheon',  label: '사천시',    parent_label: '경남',  sort_order: 303, lat: 35.00375, lng: 128.06417 },
  { id: 'gyeongnam-gimhae',   label: '김해시',    parent_label: '경남',  sort_order: 304, lat: 35.22895, lng: 128.88957 },
  { id: 'gyeongnam-miryang',  label: '밀양시',    parent_label: '경남',  sort_order: 305, lat: 35.50392, lng: 128.74645 },
  { id: 'gyeongnam-geoje',    label: '거제시',    parent_label: '경남',  sort_order: 306, lat: 34.88043, lng: 128.62135 },
  { id: 'gyeongnam-yangsan',  label: '양산시',    parent_label: '경남',  sort_order: 307, lat: 35.33493, lng: 129.03693 },
  { id: 'gyeongnam-uiryeong', label: '의령군',    parent_label: '경남',  sort_order: 308, lat: 35.32210, lng: 128.26168 },
  { id: 'gyeongnam-haman',    label: '함안군',    parent_label: '경남',  sort_order: 309, lat: 35.27244, lng: 128.40641 },
  { id: 'gyeongnam-changnyeong',label:'창녕군',   parent_label: '경남',  sort_order: 310, lat: 35.54486, lng: 128.49381 },
  { id: 'gyeongnam-goseong',  label: '고성군',    parent_label: '경남',  sort_order: 311, lat: 34.97278, lng: 128.32279 },
  { id: 'gyeongnam-namhae',   label: '남해군',    parent_label: '경남',  sort_order: 312, lat: 34.83769, lng: 127.89224 },
  { id: 'gyeongnam-hadong',   label: '하동군',    parent_label: '경남',  sort_order: 313, lat: 35.06729, lng: 127.75131 },
  { id: 'gyeongnam-sancheong',label: '산청군',    parent_label: '경남',  sort_order: 314, lat: 35.41527, lng: 127.87346 },
  { id: 'gyeongnam-hamyang',  label: '함양군',    parent_label: '경남',  sort_order: 315, lat: 35.52051, lng: 127.72534 },
  { id: 'gyeongnam-geochang', label: '거창군',    parent_label: '경남',  sort_order: 316, lat: 35.68677, lng: 127.90949 },
  { id: 'gyeongnam-hapcheon', label: '합천군',    parent_label: '경남',  sort_order: 317, lat: 35.56693, lng: 128.16558 },

  // 제주특별자치도 2개 시 ───────────────────────────────
  { id: 'jeju-city',          label: '제주시',    parent_label: '제주',  sort_order: 325, lat: 33.49962, lng: 126.53122 },
  { id: 'jeju-seogwipo',      label: '서귀포시',  parent_label: '제주',  sort_order: 326, lat: 33.25375, lng: 126.56096 },
]

/** id → 라벨 */
export function regionLabel(id: string | null | undefined): string {
  if (!id) return '전국'
  const r = COMMUNITY_REGIONS.find(x => x.id === id)
  if (!r) return '전국'
  return r.parent_label ? `${r.parent_label} ${r.label}` : r.label
}

/** 시/도 기준으로 그룹핑 */
export function groupedRegions(): Array<{ parent: string | null; items: CommunityRegion[] }> {
  const map = new Map<string | null, CommunityRegion[]>()
  for (const r of COMMUNITY_REGIONS) {
    const key = r.parent_label ?? null
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(r)
  }
  return Array.from(map.entries()).map(([parent, items]) => ({ parent, items }))
}

// ─────────────────────────────────────────────────────
// 위치기반 (당근식 근처 지역 추천)
// ─────────────────────────────────────────────────────
/** Haversine 거리(km) */
export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const s1 = Math.sin(dLat / 2)
  const s2 = Math.sin(dLng / 2)
  const c = s1 * s1 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * s2 * s2
  return 2 * R * Math.asin(Math.sqrt(c))
}

/** 내 좌표에서 가까운 순으로 정렬된 지역 목록(전국 제외) */
export function nearestRegions(
  lat: number,
  lng: number,
  limit = 5,
): Array<CommunityRegion & { distance_km: number }> {
  return COMMUNITY_REGIONS
    .filter(r => r.lat != null && r.lng != null)
    .map(r => ({ ...r, distance_km: haversineKm(lat, lng, r.lat!, r.lng!) }))
    .sort((a, b) => a.distance_km - b.distance_km)
    .slice(0, limit)
}
