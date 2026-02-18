import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Assets from './pages/Assets'
import Teams from './pages/Teams'
import Projects from './pages/Projects'
import Allocations from './pages/Allocations'
import Matching from './pages/Matching'
import Analytics from './pages/Analytics'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/"            element={<Dashboard />} />
        <Route path="/assets"      element={<Assets />} />
        <Route path="/teams"       element={<Teams />} />
        <Route path="/projects"    element={<Projects />} />
        <Route path="/allocations" element={<Allocations />} />
        <Route path="/matching"    element={<Matching />} />
        <Route path="/analytics"   element={<Analytics />} />
      </Routes>
    </Layout>
  )
}