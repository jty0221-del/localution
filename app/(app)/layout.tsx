import Sidebar from '../components/Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F2F4F6]">
      <Sidebar />
      <main className="md:ml-[220px]">
        {children}
      </main>
    </div>
  )
}
