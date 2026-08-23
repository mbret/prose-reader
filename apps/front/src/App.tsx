import { lazy, memo, type ReactNode, Suspense } from "react"
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
  useLocation,
} from "react-router"
import { Provider } from "./components/ui/provider"
import { DEMO_BASE_PATH } from "./constants"
import { LandingScreen } from "./landing/LandingScreen"

/**
 * The demo pulls the whole reading engine (and its pdf/zip dependencies) with
 * it. Keep it out of the landing page bundle.
 */
const DemoRoutes = lazy(() => import("./demo/DemoRoutes"))

/**
 * The landing page is only designed for a light color scheme, the demo follows
 * the user preference.
 */
const ColorScheme = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation()
  const isDemo =
    pathname === DEMO_BASE_PATH || pathname.startsWith(`${DEMO_BASE_PATH}/`)

  return (
    <Provider forcedTheme={isDemo ? undefined : "light"}>{children}</Provider>
  )
}

export const App = memo(() => {
  return (
    <Router>
      <ColorScheme>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<LandingScreen />} />
            <Route path={`${DEMO_BASE_PATH}/*`} element={<DemoRoutes />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ColorScheme>
    </Router>
  )
})
