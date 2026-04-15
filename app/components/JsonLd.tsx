export default function JsonLd() {
  const org = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: '로컬루션',
    alternateName: 'Localution',
    url: 'https://www.localution.co.kr',
    logo: 'https://www.localution.co.kr/logo.png',
    description: '소상공인·자영업자를 위한 AI 기반 마케팅 자동화 플랫폼',
    foundingDate: '2024',
    founder: { '@type': 'Person', name: '전태영' },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: 'Korean',
      url: 'https://www.localution.co.kr/inquiry',
    },
    sameAs: [
      'https://blog.naver.com/localution',
      'https://www.instagram.com/localution',
    ],
  }

  const software = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: '로컬루션',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, iOS, Android',
    url: 'https://www.localution.co.kr',
    description: '네이버 플레이스·구글·배민 리뷰 AI 자동 답글, QR 리뷰 자동화, CRM 고객관리, AI 정산·행정 올인원 마케팅 플랫폼',
    offers: {
      '@type': 'Offer',
      price: '9900',
      priceCurrency: 'KRW',
      priceValidUntil: '2025-12-31',
      description: '소상공인 플랜 - 월 9,900원부터',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '2400',
      bestRating: '5',
    },
    featureList: [
      'AI 리뷰 자동 답글',
      'QR 리뷰 자동화',
      'CRM 고객관리',
      'AI 정산·행정',
      '네이버 플레이스 관리',
      '키워드 분석',
    ],
  }

  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: '로컬루션',
    url: 'https://www.localution.co.kr',
    description: '소상공인·자영업자 AI 마케팅 자동화 플랫폼',
    inLanguage: 'ko-KR',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://www.localution.co.kr/community?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  }

  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '로컬루션은 어떤 서비스인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '로컬루션은 소상공인·자영업자를 위한 AI 마케팅 자동화 플랫폼입니다. 네이버, 구글, 배달의민족, 카카오, 쿠팡이츠 리뷰 자동 답글, QR 리뷰 생성, CRM 고객관리, AI 정산을 한 곳에서 관리할 수 있어요.',
        },
      },
      {
        '@type': 'Question',
        name: '네이버 플레이스 리뷰 관리가 가능한가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '네. 네이버 플레이스 리뷰를 AI가 자동으로 분석하고 맞춤 답글을 생성합니다. 답글률 100% 유지, SEO 키워드 자동 삽입, 말투 선택(따뜻한/전문적/유쾌한/심플) 기능을 제공합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '요금제는 어떻게 되나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '기능별 구독제로 AI 리뷰 답글, CRM, 정산 등 필요한 기능만 선택해 월 9,900원부터 시작할 수 있습니다. 3개 이상 선택 시 10%, 5개 이상 15%, 8개 이상 20% 할인이 적용됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'QR 리뷰 자동화는 어떻게 작동하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'QR 코드를 매장에 부착하면, 손님이 스캔 후 간단한 정보 입력만으로 AI가 맞춤 리뷰를 생성해줍니다. 생성된 리뷰를 네이버, 구글, 카카오에 원클릭으로 등록할 수 있습니다.',
        },
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(software) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }}
      />
    </>
  )
}
