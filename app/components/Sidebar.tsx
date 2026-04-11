'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Star, Users, Calculator,
  MapPin, MessageSquare, Settings, Crown,
  ChevronRight, Bell, Menu, X, QrCode,
  Zap, TrendingUp
} from 'lucide-react';

const menuItems = [
  {
    icon: LayoutDashboard,
    label: '대시보드',
    href: '/',
    badge: null,
  },
  {
    icon: Star,
    label: 'AI 리뷰·마케팅',
    href: '/review',
    badge: '3',
  },
  {
    icon: QrCode,
    label: 'QR 리뷰 관리',
    href: '/qr-admin',
    badge: null,
  },
  {
    icon: Users,
    label: 'CRM·고객관리',
    href: '/crm',
    badge: null,
  },
  {
    icon: Calculator,
    label: '정산·행정',
    href: '/admin-biz',
    badge: null,
  },
  {
    icon: MapPin,
    label: '로컬 시너지',
    href: '/local',
    badge: 'NEW',
  },
  {
    icon: MessageSquare,
    label: '커뮤니티',
    href: '/community',
    badge: null,
  },
];

const quickStats = [
  { label: '오늘 리뷰', value: '3건', color: 'text-violet-400' },
  { label: '이번달 매출', value: '482만', color: 'text-emerald-400' },
];

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const SidebarContent = () => (
    <div className="flex flex-col h-full">

      {/* 로고 */}
      <div className="p-5 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <MapPin size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-base leading-none">로컬루션</h1>
              <p className="text-violet-400 text-xs mt-0.5">Localution AI</p>
            </div>
          </div>
          {/* 모바일 닫기 버튼 */}
          <button
            className="lg:hidden text-gray-400 hover:text-white"
            onClick={() => setMobileOpen(false)}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* PRO 배지 */}
      <div className="mx-4 mt-4">
        <div className="p-3 rounded-xl bg-gradient-to-r from-violet-600/20 to-purple-600/20 border border-violet-500/20">
          <div className="flex items-center gap-2">
            <Crown size={13} className="text-yellow-400" />
            <span className="text-xs text-white font-medium">PRO 멤버십</span>
            <span className="ml-auto text-xs text-violet-400">활성 중</span>
          </div>
        </div>
      </div>

      {/* 퀵 스탯 */}
      <div className="mx-4 mt-3 grid grid-cols-2 gap-2">
        {quickStats.map((stat) => (
          <div key={stat.label} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-center">
            <p className={`text-sm font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-gray-600 text-xs mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* 구분선 + 라벨 */}
      <div className="px-5 pt-5 pb-2">
        <p className="text-gray-600 text-xs font-semibold tracking-widest uppercase">메뉴</p>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={17} className={isActive ? 'text-white' : 'text-gray-500 group-hover:text-white'} />
              <span className="text-sm font-medium flex-1">{item.label}</span>
              {item.badge && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  item.badge === 'NEW'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                    : 'bg-pink-500 text-white'
                }`}>
                  {item.badge}
                </span>
              )}
              {isActive && <ChevronRight size={13} className="text-white/60" />}
            </Link>
          );
        })}
      </nav>

      {/* AI 업그레이드 배너 */}
      <div className="mx-4 my-3">
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#1a1035] to-[#120d2a] border border-violet-500/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 to-transparent" />
          <div className="relative">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Zap size={12} className="text-yellow-400" />
              <span className="text-yellow-400 text-xs font-semibold">AI 인사이트</span>
            </div>
            <p className="text-white text-xs leading-relaxed">
              이번 주 <span className="text-violet-300 font-semibold">리뷰 전환율</span>이<br />
              지난주보다 <span className="text-emerald-400 font-bold">+18%</span> 올랐어요! 🎉
            </p>
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp size={11} className="text-emerald-400" />
              <span className="text-emerald-400 text-xs font-medium">성장 중</span>
            </div>
          </div>
        </div>
      </div>

      {/* 하단 프로필 */}
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            전
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold leading-none">전태영 사장님</p>
            <p className="text-gray-500 text-xs mt-0.5 truncate">하랑마케팅</p>
          </div>
          <button className="text-gray-500 hover:text-white transition-colors">
            <Settings size={16} />
          </button>
        </div>

        {/* 알림 버튼 */}
        <butto
        