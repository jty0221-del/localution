'use client'

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
} from 'lucide-react'

const AGENT_URL = 'http://127.0.0.1:7777'

type AgentStatus = 'checking' | 'connected' | 'disconnected'
type UploadState = 'idle' | 'running' | 'success' | 'error'

export default function YoutubeCommunityPage() {
  const [agentStatus, setAgentStatus]   = useState<AgentStatus>('checking')
  const [channelUrl, setChannelUrl]     = useState('')
  const [profileName, setProfileName]   = useState('Default')
  const [postText, setPostText]         = useState('')
  const [commentText, setCommentText]   = useState('')
  const [imageFile, setImageFile]       = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadState, setUploadState]   = useState<UploadState>('idle')
  const [logs, setLogs]                 = useState<string[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)

  const logsEndRef  = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 에이전트 연결 상태 주기적 확인 (10초마다)
  useEffect(() => {
    checkAgent()
    const id = setInterval(checkAgent, 10_000)
    return () => clearInterval(id)
  }, [])

  // 새 로그 추가될 때 자동 스크롤
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  async function checkAgent() {
    try {
      const res = await fetch(`${AGENT_URL}/health`, {
        signal: AbortSignal.timeout(2500),
      })
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
      reader.onloadend = () => {
        const result = reader.result as string
        // "data:image/jpeg;base64,XXXX" 에서 XXXX 부분만 추출
        resolve(result.split(',')[1])
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function handleUpload() {
    if (!channelUrl.trim() || !postText.trim() || !commentText.trim()) return
    if (agentStatus !== 'connected') return

    setUploadState('running')
    setLogs(['업로드를 시작합니다...'])

    // 이미지 base64 변환
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
      // 에이전트에 업로드 작업 시작 요청
      const res = await fetch(`${AGENT_URL}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_url:   channelUrl.trim(),
          post_text:     postText,
          comment_text:  commentText,
          profile_name:  profileName || 'Default',
          image_base64:  imageBase64,
          image_filename: imageFilename,
        }),
      })

      if (!res.ok) {
        throw new Error(`에이전트 오류: ${res.status}`)
      }

      const { task_id } = await res.json()

      // SSE로 진행 상태 실시간 수신
      const eventSource = new EventSource(`${AGENT_URL}/progress/${task_id}`)

      eventSource.onmessage = (e) => {
        const data = JSON.parse(e.data)

        if (data.type === 'log') {
          setLogs(prev => [...prev, data.message])
        }

        if (data.type === 'done') {
          eventSource.close()
          if (data.success) {
            setUploadState('success')
            setLogs(prev => [...prev, '모든 작업이 완료되었습니다!'])
          } else {
            setUploadState('error')
            setLogs(prev => [...prev, `실패: ${data.error || '알 수 없는 오류'}`])
          }
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
    <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6">

      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-red-700 shadow-sm flex items-center justify-center flex-shrink-0">
          <Youtube size={16} className="text-white" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-black text-[#191F28]">유튜브 커뮤니티 업로드</h1>
          <p className="text-xs text-[#8B95A1] mt-0.5">로컬 에이전트를 통해 커뮤니티 탭에 자동 게시 · 댓글 작성 · 고정</p>
        </div>
      </div>

      {/* 에이전트 연결 상태 */}
      <div className={
        'flex items-center justify-between px-4 py-3 rounded-2xl mb-6 border ' +
        (agentStatus === 'connected'
          ? 'bg-[#F0FDF4] border-[#BBF7D0]'
          : agentStatus === 'disconnected'
          ? 'bg-[#FFF1F2] border-[#FECDD3]'
          : 'bg-[#F8F9FA] border-[#E5E8EB]')
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
            (agentStatus === 'connected' ? 'text-[#059669]' :
             agentStatus === 'disconnected' ? 'text-[#DC2626]' : 'text-[#8B95A1]')
          }>
            {agentStatus === 'connected' ? '에이전트 연결됨'
              : agentStatus === 'disconnected' ? '에이전트 미연결'
              : '연결 확인 중...'}
          </span>
          {agentStatus === 'disconnected' && (
            <span className="text-xs text-[#8B95A1]">· 에이전트를 먼저 실행해 주세요</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {agentStatus === 'disconnected' && (
            <a
              href="/marketing/youtube-community#download"
              className="flex items-center gap-1.5 text-xs font-semibold text-[#3182F6] hover:underline"
            >
              <Download size={12} strokeWidth={2.5} />
              에이전트 받기
            </a>
          )}
          <button
            onClick={checkAgent}
            className="flex items-center gap-1.5 text-xs text-[#8B95A1] hover:text-[#4E5968] px-2 py-1 rounded-lg hover:bg-white transition-all"
          >
            <RefreshCw size={12} strokeWidth={2.5} />
            재확인
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">

        {/* 왼쪽: 입력 폼 */}
        <div className="space-y-4">

          {/* 채널 URL */}
          <div className="bg-white rounded-2xl border border-[#E5E8EB] p-4 md:p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center flex-shrink-0">
                <Link2 size={12} className="text-white" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-bold text-[#191F28]">채널 설정</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#4E5968] mb-1.5">
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

              {/* 고급 설정 토글 */}
              <button
                onClick={() => setShowAdvanced(v => !v)}
                className="flex items-center gap-1.5 text-xs text-[#8B95A1] hover:text-[#4E5968] transition-colors"
              >
                <Settings size={11} strokeWidth={2.5} />
                고급 설정 {showAdvanced ? '닫기' : '(크롬 프로필)'}
              </button>

              {showAdvanced && (
                <div>
                  <label className="block text-xs font-semibold text-[#4E5968] mb-1.5">
                    크롬 프로필 이름
                  </label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={e => setProfileName(e.target.value)}
                    placeholder="Default"
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-[#E5E8EB] focus:outline-none focus:ring-2 focus:ring-[#3182F6]/20 focus:border-[#3182F6] transition-all bg-[#F8F9FA]"
                  />
                  <p className="text-[11px] text-[#B0B8C1] mt-1">
                    크롬 주소창에서 chrome://version/ 입력 후 Profile Path 확인
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 게시물 본문 */}
          <div className="bg-white rounded-2xl border border-[#E5E8EB] p-4 md:p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center flex-shrink-0">
                <Youtube size={12} className="text-white" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-bold text-[#191F28]">게시물 본문</span>
              <span className="text-[#DC2626] text-xs">*</span>
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
          <div className="bg-white rounded-2xl border border-[#E5E8EB] p-4 md:p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                <ImageIcon size={12} className="text-white" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-bold text-[#191F28]">이미지 첨부</span>
              <span className="text-xs text-[#8B95A1]">(선택사항)</span>
            </div>

            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="첨부 이미지 미리보기"
                  className="w-full max-h-48 object-cover rounded-xl border border-[#E5E8EB]"
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
                className="w-full h-24 rounded-xl border-2 border-dashed border-[#E5E8EB] flex flex-col items-center justify-center gap-1.5 hover:border-[#3182F6] hover:bg-[#EFF6FF] transition-all group"
              >
                <Upload size={18} className="text-[#B0B8C1] group-hover:text-[#3182F6]" strokeWidth={2} />
                <span className="text-xs text-[#B0B8C1] group-hover:text-[#3182F6]">클릭하여 이미지 선택</span>
                <span className="text-[10px] text-[#D1D5DB]">JPG, PNG, GIF, WEBP</span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          {/* 고정 댓글 */}
          <div className="bg-white rounded-2xl border border-[#E5E8EB] p-4 md:p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center flex-shrink-0">
                <MessageSquare size={12} className="text-white" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-bold text-[#191F28]">고정 댓글</span>
              <span className="text-[#DC2626] text-xs">*</span>
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
                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-sm hover:shadow-md hover:from-red-600 hover:to-red-700 active:scale-[0.99]'
                : 'bg-[#F2F4F6] text-[#B0B8C1] cursor-not-allowed')
            }
          >
            {uploadState === 'running' ? (
              <>
                <RefreshCw size={15} className="animate-spin" strokeWidth={2.5} />
                업로드 진행 중...
              </>
            ) : (
              <>
                <Upload size={15} strokeWidth={2.5} />
                자동 업로드 시작
              </>
            )}
          </button>

          {agentStatus === 'disconnected' && (
            <p className="text-xs text-center text-[#DC2626]">
              에이전트가 실행 중이어야 업로드가 가능합니다.
            </p>
          )}
        </div>

        {/* 오른쪽: 진행 로그 + 다운로드 안내 */}
        <div className="space-y-4">

          {/* 진행 로그 */}
          <div className="bg-white rounded-2xl border border-[#E5E8EB] shadow-sm overflow-hidden">
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

            <div className="h-72 md:h-80 overflow-y-auto p-4 bg-[#FAFAFA] font-mono text-xs space-y-1.5">
              {logs.length === 0 ? (
                <p className="text-[#B0B8C1] text-center mt-16">업로드를 시작하면 진행 상황이 여기에 표시됩니다.</p>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[#B0B8C1] flex-shrink-0 select-none">
                      {String(i + 1).padStart(2, '0')}.
                    </span>
                    <span className={
                      log.includes('오류') || log.includes('실패') || log.includes('Error')
                        ? 'text-[#DC2626]'
                        : log.includes('완료') || log.includes('성공')
                        ? 'text-[#059669]'
                        : 'text-[#4E5968]'
                    }>
                      {log}
                    </span>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>

          {/* 에이전트 다운로드 안내 */}
          <div id="download" className="bg-white rounded-2xl border border-[#E5E8EB] p-4 md:p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#3182F6] to-[#2563EB] flex items-center justify-center flex-shrink-0">
                <Download size={12} className="text-white" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-bold text-[#191F28]">에이전트 설치 안내</span>
            </div>

            <div className="space-y-2 text-xs text-[#4E5968]">
              <p className="font-semibold text-[#191F28]">처음 사용하는 경우</p>

              <div className="bg-[#F8F9FA] rounded-xl p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#3182F6] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                  <div>
                    <p className="font-semibold">에이전트 파일 다운로드</p>
                    <p className="text-[#8B95A1]">담당자에게 문의하거나 공유된 링크에서 받으세요.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#3182F6] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                  <div>
                    <p className="font-semibold">유튜브커뮤니티_에이전트.exe 실행</p>
                    <p className="text-[#8B95A1]">더블클릭하면 터미널 창이 열리면서 에이전트가 시작됩니다.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#3182F6] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                  <div>
                    <p className="font-semibold">이 페이지에서 업로드</p>
                    <p className="text-[#8B95A1]">위쪽에 "에이전트 연결됨"이 표시되면 사용 가능합니다.</p>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-[#B0B8C1] pt-1">
                에이전트는 내 PC에서만 실행되며 외부로 정보가 전송되지 않습니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
