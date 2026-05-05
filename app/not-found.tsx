import Link from 'next/link';
import { MapPin } from 'lucide-react';

export default function NotFound() {
 return (
 <div className="min-h-screen bg-[#F8FAFB] flex items-center justify-center p-4">
 <div className="w-full max-w-md">
 <div className="bg-white rounded-2xl p-8 shadow-sm">
 {/* Icon */}
 <div className="flex justify-center mb-6">
 <div className="bg-[#3182F6]/10 rounded-full p-4 w-16 h-16 flex items-center justify-center">
 <MapPin className="w-8 h-8 text-[#3182F6]" strokeWidth={1.5} />
 </div>
 </div>

 {/* Heading */}
 <h1 className="text-3xl font-bold text-[#191F28] text-center mb-3">
 페이지를 찾을 수 없어요
 </h1>

 {/* Description */}
 <p className="text-[#575C66] text-center text-sm leading-relaxed mb-8">
 요청하신 페이지가 존재하지 않습니다.
 <br />
 주소를 다시 확인해주세요.
 </p>

 {/* Error Code */}
 <div className="text-center mb-8">
 <span className="inline-block bg-[#F3F5F7] text-[#3182F6] font-semibold px-3 py-1 rounded-full text-sm">
 404
 </span>
 </div>

 {/* Back to Home Button */}
 <Link
 href="/"
 className="w-full bg-[#3182F6] hover:bg-[#2A6FE0] text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 text-center"
 >
 홈으로 돌아가기
 </Link>
 </div>
 </div>
 </div>
 );
}
