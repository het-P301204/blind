import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left sidebar */}
      <Sidebar />

      {/* Right column */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar />
        <main className="overflow-y-auto flex-1 bg-obsidian">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
