'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Star, QrCode, Users,
  Calculator, MapPin, MessageCircle, ChevronRight,
  Bell, Settings, LogOut, Sparkles
} from 'lucide-react';

const menuItems = [
  { href: '/', label: '대시보드', icon: LayoutDashboard },
  { href: '/review-admin', label: 'AI 리뷰·마케팅', icon: Star },
  { href: '/qr-admin', label: 'QR 리뷰 관리', icon: QrCode },
  { href: '/crm', label: 'CRM·고객관리', icon: Users },
  { href: '/admin-biz', label: '정산·행정', icon: Calculator },
  { href: '/local', label: '로컬 시너지', icon: MapPin },
  { href: '/community', label: '커뮤니티', icon: MessageCircle },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`h-screen sticky top-0 flex flex-col bg-white border-r border-[#E5EAF2] transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}>

      {/* 로고 */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[#E5EAF2]">
        <div className="w-8 h-8 rounded-xl bg-[#3182F6] flex items-center justify-center flex-shrink-0">
          <MapPin size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-[#191F28] font-black text-sm leading-none">로컬루션</p>
            <p className="text-[#8B95A1] text-xs mt-0.5">AI 만능 비서</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto w-6 h-6 rounded-lg hover:bg-[#F2F4F6] flex items-center justify-center transition-all flex-shrink-0">
          <ChevronRight size={14} className={`text-[#8B95A1] transition-transform ${collapsed ? '' : 'rotate-180'}`} />
        </button>
      </div>

      {/* PRO 배지 */}
      {!collapsed && (
        <div className="mx-4 mt-4 p-3 rounded-2xl bg-gradient-to-r from-[#3182F6] to-[#1B6EF3] flex items-center gap-2.5">
          <Sparkles size={14} className="text-white flex-shrink-0" />
          <div>
            <p className="text-white text-xs font-bold leading-none">PRO 멤버십</p>
            <p className="text-blue-200 text-xs mt-0.5">모든 기능 사용 중</p>
          </div>
        </div>
      )}

      {/* 메뉴 */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                isActive
                  ? 'bg-[#EBF3FF] text-[#3182F6]'
                  : 'text-[#8B95A1] hover:bg-[#F8FAFB] hover:text-[#191F28]'
              }`}>
              <Icon size={18} className={`flex-shrink-0 ${isActive ? 'text-[#3182F6]' : 'text-[#8B95A1] group-hover:text-[#191F28]'}`} />
              {!collapsed && (
                <span className={`text-sm font-medium ${isActive ? 'text-[#3182F6] font-bold' : ''}`}>
                  {item.label}
                </span>
              )}
              {!collapsed && isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#3182F6]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* 하단 */}
      <div className="px-3 py-4 border-t border-[#E5EAF2] space-y-1">
        {[
          { icon: Bell, label: '알림' },
          { icon: Settings, label: '설정' },
        ].map(item => {
          const Icon = item.icon;
          return (
            <button key={item.label}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#8B95A1] hover:bg-[#F8FAFB] hover:text-[#191F28] transition-all">
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          );
        })}

        {/* 사용자 프로필 */}
        {!collapsed && (
          <div className="flex items-center gap-3 px-3 py-2.5 mt-2 rounded-xl bg-[#F8FAFB]">
            <div className="w-8 h-8 rounded-full bg-[#3182F6] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">전</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[#191F28] text-xs font-bold truncate">전태영</p>
              <p className="text-[#8B95A1] text-xs truncate">하랑마케팅</p>
            </div>
            <LogOut size={14} className="text-[#B0B8C1] flex-shrink-0" />
          </div>
        )}
      </div>
    </aside>
  );
}
