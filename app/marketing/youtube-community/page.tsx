'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import {
 Youtube,
 CheckCircle2,
 AlertCircle,
 Upload,
 RefreshCw,
 X,
 Image as ImageIcon,
 MessageSquare,
 Link2,
 Download,
 Settings,
 ChevronDown,
 ChevronRight,
} from 'lucide-react'
import Sidebar from '../../components/Sidebar'
import PageHeader from '../../components/PageHeader'
import Footer from '../../components/Footer'
import Link from 'next/link'

const AGENT_URL = 'http://127.0.0.1:7777'

type AgentStatus = 'checking' | 'connected' | 'disconnected'
type UploadState = 'idle' | 'running' | 'success' | 'error'

export default function YoutubeCommunityPage() {
 const [agentStatus, setAgentStatus] = useState<AgentStatus>('checking')
 const [channelUrl, setChannelUrl] = useState('')
 const [profileName, setProfileName] = useState('Default')
 const [postText, setPostText] = useState('')
 const [commentText, setCommentText] = useState('')
 const [imageFile, setImageFile] = useState<File | null>(null)
 const [imagePreview, setImagePreview] = useState<string | null>(null)
 const [uploadState, setUploadState] = useState<UploadState>('idle')
 const [logs, setLogs] = useState<string[]>([])
 const [showAdvanced, setShowAdvanced] = useState(false)
 const [showGuide, setShowGuide] = useState(false)

 const logsEndRef = useRef<HTMLDivElement>(null)
 const fileInputRef = useRef<HTMLInputElement>(null)

 useEffect(() => {
 checkAgent()
 const id = setInterval(checkAgent, 10_000)
 return () => clearInterval(id)
 }, [])

 useEffect(() => {
 logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
 }, [logs])

 async function checkAgent() {
 try {
 const res = await fetch(`${AGENT_URL}/health`, { signal: AbortSignal.timeout(2500) })
 setAgentStatus(res.ok ? 'connected' : 'disconnected')
 } catch {
 setAgentStatus('disconnected')
 }
 }

 function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
 const file = e.target.files?.[0]
 if (!file) return
 setImageFile(file)
 const reader = new FileReader()
 reader.onloadend = () => setImagePreview(reader.result as string)
 reader.readAsDataURL(file)
 }

 function removeImage() {
 setImageFile(null)
 setImagePreview(null)
 if (fileInputRef.current) fileInputRef.current.value = ''
 }

 async function fileToBase64(file: File): Promise<string> {
 return new Promise((resolve, reject) => {
 const reader = new FileReader()
 reader.onloadend = () => resolve((reader.result as string).split(',')[1])
 reader.onerror = reject
 reader.readAsDataURL(file)
 })
 }

 async function handleUpload() {
 if (!channelUrl.trim() || !postText.trim() || !commentText.trim()) return
 if (agentStatus !== 'connected') return

 setUploadState('running')
 setLogs(['업로드를 시작합니다...'])

 let imageBase64: string | null = null
 let imageFilename: string | null = null
 if (imageFile) {
 try {
 imageBase64 = await fileToBase64(imageFile)
 imageFilename = imageFile.name
 } catch {
 setLogs(prev => [...prev, '이미지 변환 중 오류가 발생했습니다.'])
 setUploadState('error')
 return
 }
 }

 try {
 const res = await fetch(`${AGENT_URL}/upload`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 channel_url: channelUrl.trim(),
 post_text: postText,
 comment_text: commentText,
 profile_name: profileName || 'Default',
 image_base64: imageBase64,
 image_filename: imageFilename,
 }),
 })
 if (!res.ok) throw new Error(`에이전트 오류: ${res.status}`)

 const { task_id } = await res.json()
 const eventSource = new EventSource(`${AGENT_URL}/progress/${task_id}`)

 eventSource.onmessage = (e) => {
 const data = JSON.parse(e.data)
 if (data.type === 'log') setLogs(prev => [...prev, data.message])
 if (data.type === 'done') {
 eventSource.close()
 setUploadState(data.success ? 'success' : 'error')
 if (!data.success) setLogs(prev => [...prev, `실패: ${data.error || '알 수 없는 오류'}`])
 else setLogs(prev => [...prev, '모든 작업이 완료되었습니다!'])
 }
 }
 eventSource.onerror = () => {
 eventSource.close()
 setUploadState('error')
 setLogs(prev => [...prev, '에이전트와 연결이 끊어졌습니다.'])
 }
 } catch (err: any) {
 setUploadState('error')
 setLogs(prev => [...prev, `오류: ${err.message}`])
 }
 }

 const canUpload =
 agentStatus === 'connected' &&
 channelUrl.trim() &&
 postText.trim() &&
 commentText.trim() &&
 uploadState !== 'running'

 return (
 <div className="min-h-screen bg-[#F8F9FA]">
 <Sidebar />

 <div className="md:ml-[220px] flex flex-col min-h-screen">
 <PageHeader
 variant="youtube"
 icon={<Youtube size={28} className="text-white" strokeWidth={2.5} />}
 title="유튜브 커뮤니티 업로드"
 subtitle="로컬 에이전트를 통해 커뮤니티 탭에 자동 게시 · 댓글 작성 · 고정"
 />

 <main className="flex-1 px-4 md:px-6 py-6 max-w-5xl mx-auto w-full space-y-4">

 {/* 에이전트 연결 상태 */}
 <div className={
 'flex items-center justify-between px-4 py-3 rounded-2xl border ' +
 (agentStatus === 'connected'
 ? 'bg-[#F0FDF4] border-[#BBF7D0]'
 : agentStatus === 'disconnected'
 ? 'bg-[#FFF1F2] border-[#FECDD3]'
 : 'bg-white border-[#E5E8EB]')
 }>
 <div className="flex items-center gap-2.5">
 {agentStatus === 'connected' ? (
 <CheckCircle2 size={16} className="text-[#059669]" strokeWidth={2.5} />
 ) : agentStatus === 'disconnected' ? (
 <AlertCircle size={16} className="text-[#DC2626]" strokeWidth={2.5} />
 ) : (
 <RefreshCw size={14} className="text-[#8B95A1] animate-spin" strokeWidth={2.5} />
 )}
 <span className={
 'text-sm font-semibold ' +
 (agentStatus === 'connected' ? 'text-[#059669]'
 : agentStatus === 'disconnected' ? 'text-[#DC2626]'
 : 'text-[#8B95A1]')
 }>
 {agentStatus === 'connected' ? '에이전트 연결됨'
 : agentStatus === 'disconnected' ? '에이전트 미연결'
 : '연결 확인 중...'}
 </span>
 {agentStatus === 'disconnected' && (
 <span className="text-xs text-[#8B95A1] hidden sm:inline">· 에이전트를 먼저 실행해 주세요</span>
 )}
 </div>
 <button
 onClick={checkAgent}
 className="flex items-center gap-1.5 text-xs text-[#8B95A1] hover:text-[#4E5968] px-2.5 py-1.5 rounded-lg hover:bg-white transition-all"
 >
 <RefreshCw size={12} strokeWidth={2.5} />
 재확인
 </button>
 </div>

 {/* 미연결 시 실행 안내 */}
 {agentStatus === 'disconnected' && (
 <div className="rounded-2xl border border-[#FECDD3] overflow-hidden">
 <button
 onClick={() => setShowGuide(v => !v)}
 className="w-full flex items-center justify-between px-4 py-3 bg-[#FFF1F2] hover:bg-[#FFE4E6] transition-colors text-left"
 >
 <div className="flex items-center gap-2">
 <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center flex-shrink-0">
 <Download size={11} className="text-white" strokeWidth={2.5} />
 </div>
 <span className="text-sm font-semibold text-[#DC2626]">에이전트 실행 방법 보기</span>
 </div>
 <ChevronDown
 size={16}
 className={'text-[#DC2626] transition-transform ' + (showGuide ? 'rotate-180' : '')}
 strokeWidth={2.5}
 />
 </button>
 {showGuide && (
 <div className="px-4 py-4 bg-white space-y-3">
 {[
 { step: '1', title: '에이전트 파일 다운로드', desc: '아래 다운로드 페이지에서 yt_community_agent.exe 를 받으세요.' },
 { step: '2', title: 'yt_community_agent.exe 실행', desc: '파일을 더블클릭하면 터미널 창이 열리며 에이전트가 시작됩니다. 창을 닫지 마세요.' },
 { step: '3', title: '이 페이지에서 연결 확인', desc: '위쪽 상태 표시줄이 초록색 "에이전트 연결됨"으로 바뀌면 사용할 수 있습니다.' },
 ].map(({ step, title, desc }) => (
 <div key={step} className="flex items-start gap-3">
 <span className="w-5 h-5 rounded-full bg-[#FF0000] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{step}</span>
 <div>
 <p className="text-xs font-semibold text-[#191F28]">{title}</p>
 <p className="text-[11px] text-[#8B95A1] mt-0.5">{desc}</p>
 </div>
 </div>
 ))}
 <p className="text-[11px] text-[#B0B8C1] pt-2 border-t border-[#F2F4F6]">
 에이전트는 내 PC에서만 실행되며 외부로 정보가 전송되지 않습니다.
 </p>
 <Link
 href="/marketing/youtube-community/download"
 className="flex items-center justify-center gap-1.5 w-full mt-1 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold hover:from-red-600 hover:to-red-700 transition-all"
 >
 <Download size={12} strokeWidth={2.5} />
 다운로드 페이지로 이동
 <ChevronRight size={11} strokeWidth={2.5} />
 </Link>
 </div>
 )}
 </div>
 )}

 {/* 메인 그리드 */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">

 {/* 왼쪽: 입력 폼 */}
 <div className="space-y-4">

 {/* 채널 설정 */}
 <div className="bg-white rounded-2xl shadow-sm border border-[#E5E8EB] p-5">
 <div className="flex items-center gap-2 mb-4">
 <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center flex-shrink-0">
 <Link2 size={13} className="text-white" strokeWidth={2.5} />
 </div>
 <span className="text-sm font-bold text-[#191F28]">채널 설정</span>
 </div>

 <div className="space-y-3">
 <div>
 <label className="block text-xs font-semibold text-[#8B95A1] mb-1.5">
 채널 URL <span className="text-[#DC2626]">*</span>
 </label>
 <input
 type="url"
 value={channelUrl}
 onChange={e => setChannelUrl(e.target.value)}
 placeholder="https://www.youtube.com/@내채널"
 className="w-full px-3 py-2.5 text-sm rounded-xl border border-[#E5E8EB] focus:outline-none focus:ring-2 focus:ring-[#FF0000]/20 focus:border-[#FF0000] transition-all bg-[#F8F9FA] placeholder:text-[#B0B8C1]"
 />
 </div>

 <button
 onClick={() => setShowAdvanced(v => !v)}
 className="flex items-center gap-1.5 text-xs text-[#8B95A1] hover:text-[#4E5968] transition-colors"
 >
 <Settings size={11} strokeWidth={2.5} />
 고급 설정 {showAdvanced ? '닫기' : '(크롬 프로필)'}
 </button>

 {showAdvanced && (
 <div>
 <label className="block text-xs font-semibold text-[#8B95A1] mb-1.5">크롬 프로필 이름</label>
 <input
 type="text"
 value={profileName}
 onChange={e => setProfileName(e.target.value)}
 placeholder="Default"
 className="w-full px-3 py-2.5 text-sm rounded-xl border border-[#E5E8EB] focus:outline-none focus:ring-2 focus:ring-[#3182F6]/20 focus:border-[#3182F6] transition-all bg-[#F8F9FA]"
 />
 <p className="text-[11px] text-[#B0B8C1] mt-1.5">
 chrome://version/ 에서 Profile Path 마지막 폴더명 확인
 </p>
 </div>
 )}
 </div>
 </div>

 {/* 게시물 본문 */}
 <div className="bg-white rounded-2xl shadow-sm border border-[#E5E8EB] p-5">
 <div className="flex items-center gap-2 mb-4">
 <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center flex-shrink-0">
 <Youtube size={13} className="text-white" strokeWidth={2.5} />
 </div>
 <span className="text-sm font-bold text-[#191F28]">게시물 본문</span>
 <span className="text-[#DC2626] text-xs ml-0.5">*</span>
 </div>
 <textarea
 value={postText}
 onChange={e => setPostText(e.target.value)}
 rows={5}
 placeholder="커뮤니티 탭에 올릴 내용을 입력하세요..."
 className="w-full px-3 py-2.5 text-sm rounded-xl border border-[#E5E8EB] focus:outline-none focus:ring-2 focus:ring-[#FF0000]/20 focus:border-[#FF0000] transition-all bg-[#F8F9FA] placeholder:text-[#B0B8C1] resize-none"
 />
 <p className="text-[11px] text-[#B0B8C1] mt-1.5 text-right">{postText.length}자</p>
 </div>

 {/* 이미지 첨부 */}
 <div className="bg-white rounded-2xl shadow-sm border border-[#E5E8EB] p-5">
 <div className="flex items-center gap-2 mb-4">
 <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center flex-shrink-0">
 <ImageIcon size={13} className="text-white" strokeWidth={2.5} />
 </div>
 <span className="text-sm font-bold text-[#191F28]">이미지 첨부</span>
 <span className="text-xs text-[#8B95A1]">(선택사항)</span>
 </div>

 {imagePreview ? (
 <div className="relative">
 <img
 src={imagePreview}
 alt="첨부 이미지 미리보기"
 className="w-full max-h-44 object-cover rounded-xl border border-[#E5E8EB]"
 />
 <button
 onClick={removeImage}
 className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-[#FFF1F2] transition-colors"
 >
 <X size={12} className="text-[#DC2626]" strokeWidth={2.5} />
 </button>
 <p className="text-[11px] text-[#8B95A1] mt-1.5">{imageFile?.name}</p>
 </div>
 ) : (
 <button
 onClick={() => fileInputRef.current?.click()}
 className="w-full h-20 rounded-xl border-2 border-dashed border-[#E5E8EB] flex flex-col items-center justify-center gap-1.5 hover:border-[#3182F6] hover:bg-[#EFF6FF] transition-all group"
 >
 <Upload size={16} className="text-[#B0B8C1] group-hover:text-[#3182F6]" strokeWidth={2} />
 <span className="text-xs text-[#B0B8C1] group-hover:text-[#3182F6]">클릭하여 이미지 선택</span>
 </button>
 )}
 <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
 </div>

 {/* 고정 댓글 */}
 <div className="bg-white rounded-2xl shadow-sm border border-[#E5E8EB] p-5">
 <div className="flex items-center gap-2 mb-4">
 <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center flex-shrink-0">
 <MessageSquare size={13} className="text-white" strokeWidth={2.5} />
 </div>
 <span className="text-sm font-bold text-[#191F28]">고정 댓글</span>
 <span className="text-[#DC2626] text-xs ml-0.5">*</span>
 </div>
 <input
 type="text"
 value={commentText}
 onChange={e => setCommentText(e.target.value)}
 placeholder="게시물에 자동으로 달리고 고정될 첫 번째 댓글"
 className="w-full px-3 py-2.5 text-sm rounded-xl border border-[#E5E8EB] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/20 focus:border-[#F59E0B] transition-all bg-[#F8F9FA] placeholder:text-[#B0B8C1]"
 />
 </div>

 {/* 업로드 버튼 */}
 <button
 onClick={handleUpload}
 disabled={!canUpload}
 className={
 'w-full py-3.5 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 ' +
 (canUpload
 ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-sm hover:shadow-md active:scale-[0.99]'
 : 'bg-[#F2F4F6] text-[#B0B8C1] cursor-not-allowed')
 }
 >
 {uploadState === 'running' ? (
 <><RefreshCw size={15} className="animate-spin" strokeWidth={2.5} />업로드 진행 중...</>
 ) : (
 <><Upload size={15} strokeWidth={2.5} />자동 업로드 시작</>
 )}
 </button>

 {agentStatus === 'disconnected' && (
 <p className="text-xs text-center text-[#DC2626]">에이전트가 실행 중이어야 업로드가 가능합니다.</p>
 )}
 </div>

 {/* 오른쪽: 진행 로그 + 설치 안내 */}
 <div className="space-y-4">

 {/* 진행 로그 */}
 <div className="bg-white rounded-2xl shadow-sm border border-[#E5E8EB] overflow-hidden">
 <div className="flex items-center justify-between px-4 py-3 border-b border-[#F2F4F6]">
 <span className="text-sm font-bold text-[#191F28]">진행 상태</span>
 {uploadState === 'success' && (
 <span className="flex items-center gap-1.5 text-xs font-semibold text-[#059669]">
 <CheckCircle2 size={13} strokeWidth={2.5} />완료
 </span>
 )}
 {uploadState === 'error' && (
 <span className="flex items-center gap-1.5 text-xs font-semibold text-[#DC2626]">
 <AlertCircle size={13} strokeWidth={2.5} />오류
 </span>
 )}
 {uploadState === 'running' && (
 <span className="flex items-center gap-1.5 text-xs font-semibold text-[#3182F6]">
 <RefreshCw size={13} className="animate-spin" strokeWidth={2.5} />실행 중
 </span>
 )}
 </div>
 <div className="h-64 md:h-72 overflow-y-auto p-4 bg-[#FAFAFA] font-mono text-xs space-y-1.5">
 {logs.length === 0 ? (
 <p className="text-[#B0B8C1] text-center mt-14">업로드를 시작하면 진행 상황이 표시됩니다.</p>
 ) : (
 logs.map((log, i) => (
 <div key={i} className="flex items-start gap-2">
 <span className="text-[#B0B8C1] flex-shrink-0 select-none">{String(i + 1).padStart(2, '0')}.</span>
 <span className={
 log.includes('오류') || log.includes('실패') ? 'text-[#DC2626]'
 : log.includes('완료') || log.includes('성공') ? 'text-[#059669]'
 : 'text-[#4E5968]'
 }>{log}</span>
 </div>
 ))
 )}
 <div ref={logsEndRef} />
 </div>
 </div>

 {/* 에이전트 설치 안내 */}
 <div id="download" className="bg-white rounded-2xl shadow-sm border border-[#E5E8EB] p-5">
 <div className="flex items-center gap-2 mb-4">
 <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#3182F6] to-[#2563EB] flex items-center justify-center flex-shrink-0">
 <Download size={13} className="text-white" strokeWidth={2.5} />
 </div>
 <span className="text-sm font-bold text-[#191F28]">에이전트 설치 안내</span>
 </div>

 <div className="space-y-3">
 {[
 { step: '1', title: '에이전트 파일 다운로드', desc: '담당자에게 문의하거나 공유된 링크에서 받으세요.' },
 { step: '2', title: 'yt_community_agent.exe 실행', desc: '더블클릭하면 터미널 창이 열리며 에이전트가 시작됩니다.' },
 { step: '3', title: '이 페이지에서 업로드', desc: '위쪽에 "에이전트 연결됨" 초록 표시 확인 후 사용하세요.' },
 ].map(({ step, title, desc }) => (
 <div key={step} className="flex items-start gap-3">
 <span className="w-5 h-5 rounded-full bg-[#3182F6] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{step}</span>
 <div>
 <p className="text-xs font-semibold text-[#191F28]">{title}</p>
 <p className="text-[11px] text-[#8B95A1] mt-0.5">{desc}</p>
 </div>
 </div>
 ))}
 <p className="text-[11px] text-[#B0B8C1] pt-1 border-t border-[#F2F4F6]">
 에이전트는 내 PC에서만 실행되며 외부로 정보가 전송되지 않습니다.
 </p>
 </div>
 </div>
 </div>
 </div>
 </main>

 <Footer />
 </div>
 </div>
 )
}
