import Sidebar from '../components/Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Sidebar />
      <main className="md:ml-[220px]">
        {children}
      </main>
    </div>
  )
}
